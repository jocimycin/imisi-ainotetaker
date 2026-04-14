// apps/web/app/api/meetings/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/worker/jobs/pipeline'
import { detectPlatform } from '@imisi/bots/recall/client'
import { z } from 'zod'

const ScheduleSchema = z.object({
  title: z.string().min(1),
  joinUrl: z.string().url(),
  startAt: z.string().datetime(),
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

  const { title, joinUrl, startAt, attendees } = parsed.data
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

  // Dispatch the Inngest job to join at the right time
  await inngest.send({
    name: 'imisi/meeting.schedule-bot',
    data: { meetingId: meeting.id },
  })

  return NextResponse.json({ meeting })
}
