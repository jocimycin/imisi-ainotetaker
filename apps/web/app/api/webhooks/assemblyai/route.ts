// app/api/webhooks/assemblyai/route.ts
// AssemblyAI fires a POST here when transcription is complete.
// We fetch the full transcript, convert it to our segment format,
// and fire the shared Inngest analysis pipeline (same path as bot-joined meetings).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchTranscript } from '@/lib/assemblyai'
import { inngest } from '@/worker/jobs/pipeline'
import type { Database } from '@/types/database'

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { transcript_id, status } = body

  // Only process completed transcripts
  if (status !== 'completed') {
    if (status === 'error') {
      // Mark the meeting as failed
      const supabase = getServiceSupabase()
      await supabase
        .from('meetings')
        .update({ status: 'failed' })
        .eq('transcript_job_id', transcript_id)
    }
    return NextResponse.json({ received: true })
  }

  const supabase = getServiceSupabase()

  // Find the meeting by transcript job ID
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, user_id, duration_seconds, started_at')
    .eq('transcript_job_id', transcript_id)
    .single()

  if (!meeting) {
    // Unknown transcript ID — not from us, ignore
    return NextResponse.json({ received: true })
  }

  // Fetch and parse the transcript from AssemblyAI
  let segments, rawText, language
  try {
    ;({ segments, rawText, language } = await fetchTranscript(transcript_id))
  } catch (err: any) {
    console.error('[assemblyai webhook] fetchTranscript failed:', err.message)
    await supabase.from('meetings').update({ status: 'failed' }).eq('id', meeting.id)
    return NextResponse.json({ received: true })
  }

  // Fire the meeting.ended Inngest event with pre-parsed segments (no botId needed)
  await inngest.send({
    name: 'imisi/meeting.ended',
    data: {
      meetingId: meeting.id,
      // botId is absent — pipeline.ts checks for this to skip the Recall.ai fetch
      segments,
      rawText,
      language,
    },
  })

  return NextResponse.json({ received: true })
}
