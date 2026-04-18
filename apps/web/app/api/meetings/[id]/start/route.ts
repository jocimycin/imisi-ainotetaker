// app/api/meetings/[id]/start/route.ts
// Immediately dispatches a Recall.ai bot to a scheduled meeting.
// Called by the "Start Imisi" button — user-authenticated, no QStash delay.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createBot } from '@imisi/bots/recall/client'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, join_url, title, status, user_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!meeting.join_url) return NextResponse.json({ error: 'No join URL' }, { status: 400 })

  if (['live', 'joining', 'processing', 'complete'].includes(meeting.status ?? '')) {
    return NextResponse.json({ skipped: true, status: meeting.status })
  }

  const bot = await createBot({
    meetingUrl: meeting.join_url,
    botName: 'Imisi',
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall`,
  })

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await serviceSupabase
    .from('meetings')
    .update({ bot_id: bot.id, status: 'joining' })
    .eq('id', meeting.id)

  return NextResponse.json({ botId: bot.id })
}
