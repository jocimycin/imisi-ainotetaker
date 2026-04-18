// app/api/meetings/[id]/notes/route.ts
// GET  — load the user's notes for a meeting (creates a row if none exists)
// PATCH — save updated note content (debounced from the editor)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meetingId = params.id

  // Verify the meeting belongs to the user
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let { data: notes } = await supabase
    .from('meeting_notes')
    .select('*, note_entries(*)')
    .eq('meeting_id', meetingId)
    .eq('user_id', user.id)
    .order('created_at', { referencedTable: 'note_entries', ascending: true })
    .single()

  // Auto-create a notes row on first access
  if (!notes) {
    const { data: created } = await supabase
      .from('meeting_notes')
      .insert({ meeting_id: meetingId, user_id: user.id, content: '' })
      .select('*, note_entries(*)')
      .single()
    notes = created
  }

  return NextResponse.json(notes)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meetingId = params.id
  const body = await req.json() as {
    content?: string
    content_json?: object
    entries?: Array<{ text: string; meeting_ms: number | null; sort_order: number }>
  }

  // Verify ownership
  const { data: notes } = await supabase
    .from('meeting_notes')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('user_id', user.id)
    .single()

  if (!notes) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update note content
  await supabase
    .from('meeting_notes')
    .update({
      content: body.content ?? '',
      content_json: body.content_json ?? null,
    })
    .eq('id', notes.id)

  // Replace note entries if provided (full replacement on each save)
  if (Array.isArray(body.entries)) {
    await supabase.from('note_entries').delete().eq('note_id', notes.id)
    if (body.entries.length > 0) {
      await supabase.from('note_entries').insert(
        body.entries.map((e) => ({
          meeting_id: meetingId,
          note_id: notes.id,
          text: e.text,
          meeting_ms: e.meeting_ms,
          sort_order: e.sort_order,
        }))
      )
    }
  }

  return NextResponse.json({ saved: true })
}
