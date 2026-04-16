// lib/calendar/google.ts — Google Calendar API v3
import { extractJoinUrl } from './extractJoinUrl'

const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export interface CalendarEvent {
  id: string
  summary: string | null
  startIso: string
  joinUrl: string
}

export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`)
  return res.json()
}

export async function listUpcomingEvents(
  accessToken: string,
  syncToken?: string | null
): Promise<{ events: CalendarEvent[]; nextSyncToken: string | null }> {
  const now = new Date()
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })

  if (syncToken) {
    params.set('syncToken', syncToken)
  } else {
    params.set('timeMin', now.toISOString())
    params.set('timeMax', twoHoursLater.toISOString())
  }

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  // 410 Gone = sync token expired; caller should retry without syncToken
  if (res.status === 410) throw Object.assign(new Error('SYNC_TOKEN_EXPIRED'), { code: 410 })
  if (!res.ok) throw new Error(`Google Calendar API error ${res.status}: ${await res.text()}`)

  const data = await res.json()
  const events: CalendarEvent[] = []

  for (const item of data.items ?? []) {
    if (!item.start?.dateTime) continue // skip all-day events
    const startIso: string = item.start.dateTime

    // Only care about events starting within the next 2 hours
    const startMs = new Date(startIso).getTime()
    if (startMs < now.getTime() || startMs > twoHoursLater.getTime()) continue

    // Extract join URL from multiple possible locations
    const conferenceUris = (item.conferenceData?.entryPoints ?? []).map((e: any) => e.uri)
    const joinUrl = extractJoinUrl([
      ...conferenceUris,
      item.location,
      item.description,
    ])
    if (!joinUrl) continue

    events.push({ id: item.id, summary: item.summary ?? null, startIso, joinUrl })
  }

  return { events, nextSyncToken: data.nextSyncToken ?? null }
}
