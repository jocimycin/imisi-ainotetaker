// apps/web/app/api/webhooks/recall/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/worker/jobs/pipeline'
import { createClient } from '@/lib/supabase/server'

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

        // Trigger the processing pipeline via Inngest
        await inngest.send({
          name: 'imisi/meeting.ended',
          data: { meetingId: meeting.id, botId: data.bot_id },
        })
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
  }

  return NextResponse.json({ received: true })
}
