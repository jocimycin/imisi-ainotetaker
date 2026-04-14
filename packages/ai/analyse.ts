// packages/ai/analyse.ts
// Claude Sonnet — meeting analysis engine

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface MeetingMetadata {
  title: string
  date: string
  platform: string
  durationMinutes: number
  attendees: Array<{ name: string; email?: string }>
}

export interface AnalysisResult {
  tldr: string
  key_points: string[]
  decisions: Array<{ decision: string; context: string }>
  action_items: Array<{
    text: string
    assignee_name: string | null
    assignee_email: string | null
    due_date: string | null
    priority: 'low' | 'medium' | 'high'
    source_quote: string | null
  }>
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

const SYSTEM_PROMPT = `You are Imisi, an intelligent meeting assistant.
Analyse the provided meeting transcript and return a structured JSON object.
Respond ONLY with valid JSON. No preamble, no markdown fences, no extra text.

Rules:
- tldr: 2-3 sentence plain-language summary of what happened and what was decided
- key_points: 4-8 bullet points covering the most important topics discussed
- decisions: only include things that were clearly agreed upon, not discussed
- action_items: tasks with a clear owner or implied owner; extract due dates if mentioned
- priority: 'high' if deadline is imminent or explicitly urgent, 'low' if vague future item
- source_quote: verbatim phrase from transcript that triggered the action item
- sentiment: overall energy and tone of the meeting

JSON schema:
{
  "tldr": "string",
  "key_points": ["string"],
  "decisions": [{"decision": "string", "context": "string"}],
  "action_items": [
    {
      "text": "string",
      "assignee_name": "string | null",
      "assignee_email": "string | null",
      "due_date": "YYYY-MM-DD | null",
      "priority": "low | medium | high",
      "source_quote": "string | null"
    }
  ],
  "topics": ["string"],
  "sentiment": "positive | neutral | negative"
}`

export async function analyseMeeting(
  transcript: string,
  metadata: MeetingMetadata
): Promise<AnalysisResult> {
  const userContent = `Meeting: ${metadata.title}
Date: ${metadata.date}
Platform: ${metadata.platform}
Duration: ${metadata.durationMinutes} minutes
Attendees: ${metadata.attendees.map((a) => a.name).join(', ')}

TRANSCRIPT:
${transcript}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    return JSON.parse(raw) as AnalysisResult
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${raw.slice(0, 200)}`)
  }
}

// Ask Imisi a question about a specific meeting (post-call QA)
export async function askAboutMeeting(
  transcript: string,
  question: string,
  context: { title: string; date: string }
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `You are Imisi, a meeting intelligence assistant. 
Answer questions about the meeting transcript concisely and accurately.
Only use information from the transcript. If something is not mentioned, say so.
Cite the relevant speaker or section when possible.`,
    messages: [
      {
        role: 'user',
        content: `Meeting: ${context.title} on ${context.date}

TRANSCRIPT:
${transcript}

Question: ${question}`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
