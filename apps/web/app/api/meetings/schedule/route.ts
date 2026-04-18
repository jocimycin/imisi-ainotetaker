// apps/web/app/api/meetings/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Client as QStashClient } from '@upstash/qstash'
import { detectPlatform } from '@imisi/bots/recall/client'
import { z } from 'zod'

const ScheduleSchema = z.object({
  title: z.string().min(1),
  joinUrl: z.string().url(),
  // Optional: omit or pass current time for "Join now" mode
  startAt: z.string().datetime().optional(),
  attendees: z.array(z.object({ name: z.string(), email: z.string().email().optional() })),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = ScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { title, joinUrl, attendees } = parsed.data
  const startAt = parsed.data.startAt ?? new Date().toISOString()
  const platform = detectPlatform(joinUrl)

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      title,
      join_url: joinUrl,
      platform,
      started_at: startAt,
      attendees,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error || !meeting) {
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }

  // Schedule the bot via QStash — dispatches to /api/bots/dispatch at join time
  if (process.env.QSTASH_TOKEN) {
    const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN })
    const joinTime = new Date(new Date(startAt).getTime() - 2 * 60 * 1000)
    const delaySeconds = Math.max(0, Math.floor((joinTime.getTime() - Date.now()) / 1000))

    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/bots/dispatch`,
      ...(delaySeconds > 0 ? { delay: delaySeconds } : {}),
      body: { meetingId: meeting.id },
    })
  }

  return NextResponse.json({ meeting })
}
