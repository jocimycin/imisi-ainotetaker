// lib/pipeline-runner.ts
// Core post-meeting processing pipeline — no Inngest dependency.
// Called from /api/pipeline/run-meeting (via QStash) after both:
//   - Bot path: Recall.ai bot.call_ended webhook
//   - Local path: AssemblyAI transcription completed webhook

import { createClient } from '@supabase/supabase-js'
import { analyseMeeting } from '@imisi/ai/analyse'
import { getBotTranscript } from '@imisi/bots/recall/client'
import { sendSummaryEmail } from '@/worker/jobs/send-summary-email'
import type { Database } from '@/types/database'

export interface PipelineInput {
  meetingId: string
  // Bot path: pass botId, leave segments/rawText/language undefined
  botId?: string
  // Local recording path: pass segments + rawText directly (from AssemblyAI)
  segments?: Array<{ speaker: string; text: string; start_ms: number; end_ms: number }>
  rawText?: string
  language?: string
}

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function runMeetingPipeline(input: PipelineInput) {
  const { meetingId, botId, segments: prebuiltSegments, rawText: prebuiltRawText, language: prebuiltLanguage } = input
  const supabase = getServiceSupabase()

  // 1. Mark as processing
  await supabase.from('meetings').update({ status: 'processing' }).eq('id', meetingId)

  // 2. Get transcript
  let formatted: Array<{ speaker: string; text: string; start_ms: number; end_ms: number }>
  let rawText: string

  if (prebuiltSegments && prebuiltRawText) {
    // Local recording path — AssemblyAI already parsed for us
    formatted = prebuiltSegments
    rawText = prebuiltRawText
  } else {
    // Bot path — fetch from Recall.ai and normalise
    const recallTranscript = await getBotTranscript(botId!)
    formatted = recallTranscript.map((seg: any) => ({
      speaker: seg.speaker ?? 'Unknown',
      text: seg.words.map((w: any) => w.text).join(' '),
      start_ms: (seg.words[0]?.start_timestamp ?? 0) * 1000,
      end_ms: (seg.words[seg.words.length - 1]?.end_timestamp ?? 0) * 1000,
    }))
    rawText = formatted.map((s) => `${s.speaker}: ${s.text}`).join('\n')
  }

  // 3. Store transcript
  await supabase.from('transcripts').insert({
    meeting_id: meetingId,
    raw_text: rawText,
    segments: formatted,
    word_count: rawText.split(' ').length,
    language: prebuiltLanguage ?? 'en',
  })

  // 4. Run AI analysis
  const { data: meeting } = await supabase
    .from('meetings')
    .select('title, started_at, platform, attendees, duration_seconds')
    .eq('id', meetingId)
    .single()

  if (!meeting) throw new Error(`Meeting ${meetingId} not found`)

  const analysis = await analyseMeeting(rawText, {
    title: meeting.title ?? 'Untitled meeting',
    date: meeting.started_at ?? new Date().toISOString(),
    platform: meeting.platform,
    durationMinutes: Math.round((meeting.duration_seconds ?? 0) / 60),
    attendees: (meeting.attendees as any[]) ?? [],
  })

  // 5. Store summary
  await supabase.from('summaries').insert({
    meeting_id: meetingId,
    tldr: analysis.tldr,
    key_points: analysis.key_points,
    decisions: analysis.decisions,
    topics: analysis.topics,
    sentiment: analysis.sentiment,
    model_used: 'claude-sonnet-4-6',
  })

  // 6. Store action items
  const { data: meetingRow } = await supabase
    .from('meetings')
    .select('user_id')
    .eq('id', meetingId)
    .single()

  if (meetingRow && analysis.action_items.length > 0) {
    await supabase.from('action_items').insert(
      analysis.action_items.map((item) => ({
        meeting_id: meetingId,
        user_id: meetingRow.user_id,
        text: item.text,
        assignee_name: item.assignee_name,
        assignee_email: item.assignee_email,
        due_date: item.due_date,
        priority: item.priority,
        source_quote: item.source_quote,
      }))
    )
  }

  // 7. Send summary email
  await sendSummaryEmail(meetingId, analysis)

  // 8. Mark complete
  await supabase.from('meetings').update({ status: 'complete' }).eq('id', meetingId)

  return { meetingId, actionsCreated: analysis.action_items.length }
}
