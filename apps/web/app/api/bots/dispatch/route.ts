// app/api/bots/dispatch/route.ts
// Called by QStash (delayed) to dispatch a Recall.ai bot at join time.
// Replaces the Inngest scheduleBotJoin function.

import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { createClient } from '@supabase/supabase-js'
import { createBot } from '@imisi/bots/recall/client'
import type { Database } from '@/types/database'

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Verify the request is from QStash
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })

  const body = await req.text()
  const isValid = await receiver
    .verify({ signature: req.headers.get('upstash-signature') ?? '', body })
    .catch(() => false)

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { meetingId } = JSON.parse(body) as { meetingId: string }
  const supabase = getServiceSupabase()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('join_url, title, status')
    .eq('id', meetingId)
    .single()

  if (!meeting?.join_url) {
    return NextResponse.json({ error: 'Meeting not found or no join URL' }, { status: 404 })
  }

  // Don't dispatch if the meeting is already live, processing, complete, or failed
  if (['live', 'processing', 'complete', 'failed'].includes(meeting.status ?? '')) {
    return NextResponse.json({ skipped: true, status: meeting.status })
  }

  const bot = await createBot({
    meetingUrl: meeting.join_url,
    botName: 'Imisi',
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall`,
  })

  await supabase
    .from('meetings')
    .update({ bot_id: bot.id, status: 'joining' })
    .eq('id', meetingId)

  return NextResponse.json({ botId: bot.id })
}
