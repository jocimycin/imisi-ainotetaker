// app/api/meetings/record/route.ts
// Creates a meeting row for an in-browser local recording (source = 'local_recording').
// Called before the audio upload — returns a meetingId the client uses as the storage path.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      platform: 'other',
      source: 'local_recording',
      status: 'live',
      started_at: new Date().toISOString(),
      attendees: [],
    })
    .select('id')
    .single()

  if (error || !meeting) {
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }

  return NextResponse.json({ meetingId: meeting.id })
}
