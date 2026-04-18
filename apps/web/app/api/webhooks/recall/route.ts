// apps/web/app/api/webhooks/recall/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Client as QStashClient } from '@upstash/qstash'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getQStash() {
  return new QStashClient({ token: process.env.QSTASH_TOKEN! })
}

// Service-role client for upserts that bypass RLS (webhook has no user session)
function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { event, data } = body

  const supabase = createClient()

  switch (event) {
    case 'bot.joining_call': {
      await supabase
        .from('meetings')
        .update({ status: 'joining' })
        .eq('bot_id', data.bot_id)
      break
    }

    case 'bot.in_call_recording': {
      await supabase
        .from('meetings')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('bot_id', data.bot_id)
      break
    }

    case 'bot.call_ended': {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('id, started_at')
        .eq('bot_id', data.bot_id)
        .single()

      if (meeting) {
        const durationSeconds = meeting.started_at
          ? Math.round((Date.now() - new Date(meeting.started_at).getTime()) / 1000)
          : null

        await supabase
          .from('meetings')
          .update({
            status: 'processing',
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
          })
          .eq('id', meeting.id)

        // Dispatch pipeline via QStash (async — Vercel won't time out the webhook)
        if (process.env.QSTASH_TOKEN) {
          await getQStash().publishJSON({
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pipeline/run-meeting`,
            body: { meetingId: meeting.id, botId: data.bot_id },
          })
        }
      }
      break
    }

    case 'bot.fatal_error': {
      await supabase
        .from('meetings')
        .update({ status: 'failed' })
        .eq('bot_id', data.bot_id)
      break
    }

    // 4A — Live streaming transcript segments
    case 'transcript.partial':
    case 'transcript.final': {
      const isFinal = event === 'transcript.final'
      const seg = data // Recall.ai shape: { bot_id, words, speaker, segment_index, ... }

      // Resolve meeting_id from bot_id
      const { data: meeting } = await supabase
        .from('meetings')
        .select('id')
        .eq('bot_id', seg.bot_id)
        .single()

      if (!meeting) break

      const text = Array.isArray(seg.words)
        ? seg.words.map((w: any) => w.text).join(' ')
        : (seg.text ?? '')

      const startMs = Array.isArray(seg.words) && seg.words.length > 0
        ? Math.round((seg.words[0].start_timestamp ?? 0) * 1000)
        : null
      const endMs = Array.isArray(seg.words) && seg.words.length > 0
        ? Math.round((seg.words[seg.words.length - 1].end_timestamp ?? 0) * 1000)
        : null

      const serviceSupabase = getServiceSupabase()

      // Upsert by (meeting_id, segment_index) so partials are overwritten by finals
      await serviceSupabase.from('transcript_segments').upsert(
        {
          meeting_id: meeting.id,
          segment_index: seg.segment_index ?? 0,
          speaker: seg.speaker ?? 'Unknown',
          text,
          start_ms: startMs,
          end_ms: endMs,
          is_final: isFinal,
        },
        { onConflict: 'meeting_id,segment_index' }
      )

      // Keep is_streaming + last_segment_at fresh on the transcript row
      await serviceSupabase.from('transcripts')
        .update({ is_streaming: !isFinal, last_segment_at: new Date().toISOString() })
        .eq('meeting_id', meeting.id)

      break
    }
  }

  return NextResponse.json({ received: true })
}
