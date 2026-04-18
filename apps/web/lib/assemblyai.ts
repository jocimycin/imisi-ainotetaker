// lib/assemblyai.ts
// AssemblyAI transcription client — used for local recordings (in-browser captured audio).
// Recall.ai handles bot-joined meetings. This handles the IT-restricted environment path.

import type { TranscriptSegment } from '@/types/database'

const BASE = 'https://api.assemblyai.com/v2'

function headers() {
  const key = process.env.ASSEMBLYAI_API_KEY
  if (!key) throw new Error('ASSEMBLYAI_API_KEY is not set')
  return { authorization: key, 'content-type': 'application/json' }
}

/**
 * Submit a publicly-accessible audio URL to AssemblyAI for transcription.
 * Speaker diarisation is always enabled.
 *
 * @param audioUrl  A URL AssemblyAI can fetch. Use a Supabase signed URL (1hr TTL is fine).
 * @param webhookUrl  Your AssemblyAI webhook endpoint, e.g. https://yourapp.com/api/webhooks/assemblyai
 * @returns AssemblyAI transcript ID — store this in meetings.transcript_job_id
 */
export async function submitTranscription(audioUrl: string, webhookUrl: string): Promise<string> {
  const res = await fetch(`${BASE}/transcript`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,      // diarised transcript — same as Recall.ai output
      language_detection: true,  // auto-detect language
      webhook_url: webhookUrl,   // AssemblyAI POSTs here when done
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AssemblyAI submit failed: ${err}`)
  }

  const data = await res.json()
  return data.id as string
}

/**
 * Fetch a completed transcript from AssemblyAI and convert it to Imisi's
 * TranscriptSegment format (matching the Recall.ai output shape used in pipeline.ts).
 */
export async function fetchTranscript(transcriptId: string): Promise<{
  segments: TranscriptSegment[]
  rawText: string
  language: string
}> {
  const res = await fetch(`${BASE}/transcript/${transcriptId}`, {
    headers: { authorization: process.env.ASSEMBLYAI_API_KEY! },
  })

  if (!res.ok) {
    throw new Error(`AssemblyAI fetch failed: ${res.status}`)
  }

  const data = await res.json()

  if (data.status !== 'completed') {
    throw new Error(`Transcript not ready — status: ${data.status}`)
  }

  // AssemblyAI utterances have: speaker, text, start (ms), end (ms)
  const segments: TranscriptSegment[] = (data.utterances ?? []).map((u: any) => ({
    speaker: `Speaker ${u.speaker}`,
    text: u.text,
    start_ms: u.start,
    end_ms: u.end,
  }))

  const rawText = segments.map((s) => `${s.speaker}: ${s.text}`).join('\n')

  return {
    segments,
    rawText,
    language: data.language_code ?? 'en',
  }
}
