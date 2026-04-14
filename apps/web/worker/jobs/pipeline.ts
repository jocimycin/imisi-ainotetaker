// apps/web/worker/jobs/pipeline.ts
// Inngest job queue — post-meeting processing pipeline

import { Inngest } from 'inngest'
import { createClient } from '@supabase/supabase-js'
import { analyseMeeting } from '@imisi/ai/analyse'
import { getBotTranscript } from '@imisi/bots/recall/client'
import { sendSummaryEmail } from './send-summary-email'
import type { Database } from '@/types/database'

export const inngest = new Inngest({ id: 'imisi' })

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─────────────────────────────────────────────
// JOB 1: Triggered by Recall.ai webhook when meeting ends
// ─────────────────────────────────────────────
export const onMeetingEnded = inngest.createFunction(
  { id: 'on-meeting-ended', name: 'Process ended meeting' },
  { event: 'imisi/meeting.ended' },
  async ({ event, step }) => {
    const { meetingId, botId } = event.data
    const supabase = getServiceSupabase()

    // Step 1: Mark as processing
    await step.run('update-status-processing', async () => {
      await supabase
        .from('meetings')
        .update({ status: 'processing' })
        .eq('id', meetingId)
    })

    // Step 2: Fetch transcript from Recall.ai
    const recallTranscript = await step.run('fetch-recall-transcript', async () => {
      return getBotTranscript(botId)
    })

    // Step 3: Format and store transcript segments
    const segments = await step.run('store-transcript', async () => {
      const formatted = recallTranscript.map((seg: any) => ({
        speaker: seg.speaker ?? 'Unknown',
        text: seg.words.map((w: any) => w.text).join(' '),
        start_ms: (seg.words[0]?.start_timestamp ?? 0) * 1000,
        end_ms: (seg.words[seg.words.length - 1]?.end_timestamp ?? 0) * 1000,
      }))

      const rawText = formatted.map((s: any) => `${s.speaker}: ${s.text}`).join('\n')

      await supabase.from('transcripts').insert({
        meeting_id: meetingId,
        raw_text: rawText,
        segments: formatted,
        word_count: rawText.split(' ').length,
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

    // Step 7: Send summary email to all attendees
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

    // Wait until 2 minutes before the meeting starts
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

export const functions = [onMeetingEnded, scheduleBotJoin]
