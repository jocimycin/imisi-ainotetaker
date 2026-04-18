// app/api/webhooks/assemblyai/route.ts
// AssemblyAI fires a POST here when transcription is complete.
// We fetch the full transcript and dispatch the shared pipeline via QStash.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchTranscript } from '@/lib/assemblyai'
import { Client as QStashClient } from '@upstash/qstash'
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

  const supabase = getServiceSupabase()

  if (status !== 'completed') {
    if (status === 'error') {
      await supabase
        .from('meetings')
        .update({ status: 'failed' })
        .eq('transcript_job_id', transcript_id)
    }
    return NextResponse.json({ received: true })
  }

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('transcript_job_id', transcript_id)
    .single()

  if (!meeting) return NextResponse.json({ received: true })

  let segments, rawText, language
  try {
    ;({ segments, rawText, language } = await fetchTranscript(transcript_id))
  } catch (err: any) {
    console.error('[assemblyai webhook] fetchTranscript failed:', err.message)
    await supabase.from('meetings').update({ status: 'failed' }).eq('id', meeting.id)
    return NextResponse.json({ received: true })
  }

  // Dispatch pipeline via QStash (segments pre-parsed — skips Recall.ai fetch)
  if (process.env.QSTASH_TOKEN) {
    const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN! })
    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pipeline/run-meeting`,
      body: { meetingId: meeting.id, segments, rawText, language },
    })
  }

  return NextResponse.json({ received: true })
}
