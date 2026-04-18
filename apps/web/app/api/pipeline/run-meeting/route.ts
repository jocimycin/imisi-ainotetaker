// app/api/pipeline/run-meeting/route.ts
// Called by QStash immediately after a meeting ends (both bot and local recording paths).
// Replaces the Inngest onMeetingEnded function.

import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { runMeetingPipeline, type PipelineInput } from '@/lib/pipeline-runner'

export const maxDuration = 300 // 5 min — Vercel Pro / Fluid compute

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

  const input = JSON.parse(body) as PipelineInput

  try {
    const result = await runMeetingPipeline(input)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[pipeline/run-meeting] Error:', err.message)
    // Return 500 so QStash retries automatically (it retries on 5xx)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
