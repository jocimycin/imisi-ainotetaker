// app/api/meetings/[id]/upload-recording/route.ts
// Called after the client has uploaded audio to Supabase Storage.
// Generates a signed URL, submits to AssemblyAI, stores the transcript job ID,
// and fires the Inngest recording pipeline.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { submitTranscription } from '@/lib/assemblyai'
import { inngest } from '@/worker/jobs/pipeline'
import { z } from 'zod'
import type { Database } from '@/types/database'

const Schema = z.object({
  storagePath: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const meetingId = params.id
  const { storagePath } = parsed.data

  // Verify the meeting belongs to this user
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, source')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  if (meeting.source !== 'local_recording') {
    return NextResponse.json({ error: 'Not a local recording' }, { status: 400 })
  }

  // Generate a signed URL for AssemblyAI to fetch the audio (1-hour TTL is enough)
  const serviceSupabase = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: signedUrlData, error: signedUrlError } = await serviceSupabase.storage
    .from('recordings')
    .createSignedUrl(storagePath, 3600)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }

  // Submit to AssemblyAI — webhook fires when transcription is done
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/assemblyai`
  const transcriptJobId = await submitTranscription(signedUrlData.signedUrl, webhookUrl)

  // Store the storage path and transcript job ID
  await supabase
    .from('meetings')
    .update({
      recording_path: storagePath,
      transcript_job_id: transcriptJobId,
      status: 'processing',
      ended_at: new Date().toISOString(),
    })
    .eq('id', meetingId)

  // Fire an Inngest event so the job log shows the meeting is in the pipeline
  await inngest.send({
    name: 'imisi/recording.submitted',
    data: { meetingId, transcriptJobId },
  })

  return NextResponse.json({ ok: true, transcriptJobId })
}
