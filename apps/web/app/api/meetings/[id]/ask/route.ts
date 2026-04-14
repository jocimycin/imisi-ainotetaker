// apps/web/app/api/meetings/[id]/ask/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { askAboutMeeting } from '@imisi/ai/analyse'
import type { Meeting, Transcript } from '@/types/database'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json()
  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  // Verify meeting belongs to user
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', params.id)
    .single() as { data: Meeting | null; error: unknown }

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: transcript } = await supabase
    .from('transcripts')
    .select('*')
    .eq('meeting_id', params.id)
    .single() as { data: Transcript | null; error: unknown }

  if (!transcript?.raw_text) {
    return NextResponse.json({ error: 'No transcript available' }, { status: 404 })
  }

  const answer = await askAboutMeeting(transcript.raw_text, question, {
    title: meeting.title ?? 'Meeting',
    date: meeting.started_at ?? '',
  })

  return NextResponse.json({ answer })
}
