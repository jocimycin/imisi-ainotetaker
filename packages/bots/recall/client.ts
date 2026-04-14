// packages/bots/recall/client.ts
// Recall.ai — universal meeting bot API
// Docs: https://docs.recall.ai

const RECALL_BASE = 'https://us-west-2.recall.ai/api/v1'

interface CreateBotOptions {
  meetingUrl: string
  botName?: string
  recordingMode?: 'speaker_view' | 'gallery_view' | 'audio_only'
  transcriptionOptions?: {
    provider: 'assembly_ai' | 'deepgram' | 'aws_transcribe'
    language?: string
  }
  webhookUrl?: string
}

interface RecallBot {
  id: string
  status: string
  meeting_url: string
  join_at: string | null
}

async function recallFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RECALL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Token ${process.env.RECALLAI_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Recall.ai ${res.status}: ${error}`)
  }
  return res.json()
}

// Create and send a bot to join a meeting
export async function createBot(options: CreateBotOptions): Promise<RecallBot> {
  return recallFetch('/bot/', {
    method: 'POST',
    body: JSON.stringify({
      meeting_url: options.meetingUrl,
      bot_name: options.botName ?? 'Imisi',
      recording_mode: options.recordingMode ?? 'speaker_view',
      transcription_options: options.transcriptionOptions ?? {
        provider: 'assembly_ai',
      },
      real_time_transcription: {
        destination_url: options.webhookUrl,
        partial_results: false,
      },
    }),
  })
}

// Get bot status
export async function getBot(botId: string): Promise<RecallBot> {
  return recallFetch(`/bot/${botId}/`)
}

// Stop a bot mid-meeting
export async function leaveBot(botId: string): Promise<void> {
  await recallFetch(`/bot/${botId}/leave_call/`, { method: 'POST' })
}

// Fetch the full transcript after meeting ends
export async function getBotTranscript(botId: string) {
  return recallFetch(`/bot/${botId}/transcript/`)
}

// Fetch recording download URL
export async function getBotRecording(botId: string) {
  return recallFetch(`/bot/${botId}/recording/`)
}

// Detect platform from join URL
export function detectPlatform(url: string): 'zoom' | 'teams' | 'meet' | 'zoho' | 'other' {
  if (url.includes('zoom.us')) return 'zoom'
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams'
  if (url.includes('meet.google.com')) return 'meet'
  if (url.includes('meeting.zoho.com') || url.includes('cliq.zoho.com')) return 'zoho'
  return 'other'
}
