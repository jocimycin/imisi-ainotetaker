// apps/web/worker/jobs/pipeline.ts
// Inngest job queue — post-meeting processing pipeline

import { Inngest } from 'inngest'
import { createClient } from '@supabase/supabase-js'
import { analyseMeeting } from '@imisi/ai/analyse'
import { getBotTranscript } from '@imisi/bots/recall/client'
import { sendSummaryEmail } from './send-summary-email'
import type { Database } from '@/types/database'

export const inngest = new Inngest({ id: 'imisi-ainotetaker' })

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─────────────────────────────────────────────
// JOB 1: Process a finished meeting
//
// Two entry paths share this single job:
//
//   Bot path (Recall.ai):
//     Triggered by /api/webhooks/recall when bot.call_ended fires.
//     Event data: { meetingId, botId }
//     Action: fetches transcript from Recall.ai, then runs analysis.
//
//   Local recording path (in-browser):
//     Triggered by /api/webhooks/assemblyai when transcription is complete.
//     Event data: { meetingId, segments, rawText, language }
//     Action: skips Recall.ai fetch, uses pre-parsed segments directly.
// ─────────────────────────────────────────────
export const onMeetingEnded = inngest.createFunction(
  { id: 'on-meeting-ended', name: 'Process ended meeting' },
  { event: 'imisi/meeting.ended' },
  async ({ event, step }) => {
    const {
      meetingId,
      botId,
      segments: prebuiltSegments,
      rawText: prebuiltRawText,
      language: prebuiltLanguage,
    } = event.data
    const supabase = getServiceSupabase()

    // Step 1: Mark as processing
    await step.run('update-status-processing', async () => {
      await supabase
        .from('meetings')
        .update({ status: 'processing' })
        .eq('id', meetingId)
    })

    // Step 2+3: Get transcript segments — from Recall.ai (bot) or pre-supplied (local recording)
    const segments = await step.run('store-transcript', async () => {
      let formatted: any[]
      let rawText: string

      if (prebuiltSegments && prebuiltRawText) {
        // Local recording path: AssemblyAI already parsed segments for us
        formatted = prebuiltSegments
        rawText = prebuiltRawText
      } else {
        // Bot path: fetch from Recall.ai and normalise to our segment format
        const recallTranscript = await getBotTranscript(botId)
        formatted = recallTranscript.map((seg: any) => ({
          speaker: seg.speaker ?? 'Unknown',
          text: seg.words.map((w: any) => w.text).join(' '),
          start_ms: (seg.words[0]?.start_timestamp ?? 0) * 1000,
          end_ms: (seg.words[seg.words.length - 1]?.end_timestamp ?? 0) * 1000,
        }))
        rawText = formatted.map((s: any) => `${s.speaker}: ${s.text}`).join('\n')
      }

      await supabase.from('transcripts').insert({
        meeting_id: meetingId,
        raw_text: rawText,
        segments: formatted,
        word_count: rawText.split(' ').length,
        language: prebuiltLanguage ?? 'en',
      })

      return { formatted, rawText }
    })

    // Step 4: Run AI analysis (Claude Sonnet)
    const analysis = await step.run('run-ai-analysis', async () => {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('title, started_at, platform, attendees, duration_seconds')
        .eq('id', meetingId)
        .single()

      if (!meeting) throw new Error(`Meeting ${meetingId} not found`)

      return analyseMeeting(segments.rawText, {
        title: meeting.title ?? 'Untitled meeting',
        date: meeting.started_at ?? new Date().toISOString(),
        platform: meeting.platform,
        durationMinutes: Math.round((meeting.duration_seconds ?? 0) / 60),
        attendees: (meeting.attendees as any[]) ?? [],
      })
    })

    // Step 5: Store summary
    await step.run('store-summary', async () => {
      await supabase.from('summaries').insert({
        meeting_id: meetingId,
        tldr: analysis.tldr,
        key_points: analysis.key_points,
        decisions: analysis.decisions,
        topics: analysis.topics,
        sentiment: analysis.sentiment,
        model_used: 'claude-sonnet-4-20250514',
      })
    })

    // Step 6: Store action items
    await step.run('store-action-items', async () => {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('user_id')
        .eq('id', meetingId)
        .single()

      if (!meeting) return

      const items = analysis.action_items.map((item) => ({
        meeting_id: meetingId,
        user_id: meeting.user_id,
        text: item.text,
        assignee_name: item.assignee_name,
        assignee_email: item.assignee_email,
        due_date: item.due_date,
        priority: item.priority,
        source_quote: item.source_quote,
      }))

      if (items.length > 0) {
        await supabase.from('action_items').insert(items)
      }
    })

    // Step 7: Send summary email
    await step.run('send-summary-email', async () => {
      await sendSummaryEmail(meetingId, analysis)
    })

    // Step 8: Mark meeting complete
    await step.run('update-status-complete', async () => {
      await supabase
        .from('meetings')
        .update({ status: 'complete' })
        .eq('id', meetingId)
    })

    return { meetingId, actionsCreated: analysis.action_items.length }
  }
)

// ─────────────────────────────────────────────
// JOB 2: Schedule bot to join a meeting
// ─────────────────────────────────────────────
export const scheduleBotJoin = inngest.createFunction(
  { id: 'schedule-bot-join', name: 'Schedule bot to join meeting' },
  { event: 'imisi/meeting.schedule-bot' },
  async ({ event, step }) => {
    const { meetingId } = event.data
    const supabase = getServiceSupabase()

    const { data: meeting } = await supabase
      .from('meetings')
      .select('join_url, title, started_at')
      .eq('id', meetingId)
      .single()

    if (!meeting?.join_url) throw new Error('No join URL for meeting')

    // Sleep until 2 minutes before start. If start is already past (Join Now mode),
    // joinTime will be in the past and we skip the sleep entirely — bot joins immediately.
    const startTime = new Date(meeting.started_at!)
    const joinTime = new Date(startTime.getTime() - 2 * 60 * 1000)
    const now = new Date()

    if (joinTime > now) {
      await step.sleepUntil('wait-until-join-time', joinTime)
    }

    await step.run('create-recall-bot', async () => {
      const { createBot } = await import('@imisi/bots/recall/client')
      const bot = await createBot({
        meetingUrl: meeting.join_url!,
        botName: 'Imisi',
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall`,
      })

      await supabase
        .from('meetings')
        .update({ bot_id: bot.id, status: 'joining' })
        .eq('id', meetingId)
    })
  }
)

// ─────────────────────────────────────────────
// JOB 3: Tracking event for local recordings submitted to AssemblyAI
// No work to do — this is just a paper trail in the Inngest dashboard showing
// the recording entered the pipeline, before the AssemblyAI webhook fires.
// ─────────────────────────────────────────────
export const onRecordingSubmitted = inngest.createFunction(
  { id: 'on-recording-submitted', name: 'Local recording submitted' },
  { event: 'imisi/recording.submitted' },
  async ({ event }) => {
    return { meetingId: event.data.meetingId, transcriptJobId: event.data.transcriptJobId }
  }
)

export const functions = [onMeetingEnded, scheduleBotJoin, onRecordingSubmitted]
