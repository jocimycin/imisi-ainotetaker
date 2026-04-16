// lib/calendar/microsoft.ts — Microsoft Graph API calendar events
import { extractJoinUrl } from './extractJoinUrl'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

export interface CalendarEvent {
  id: string
  summary: string | null
  startIso: string
  joinUrl: string
}

export async function refreshMicrosoftToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'Calendars.Read offline_access',
    }),
  })
  if (!res.ok) throw new Error(`Microsoft token refresh failed: ${await res.text()}`)
  return res.json()
}

export async function listUpcomingEvents(
  accessToken: string,
  deltaLink?: string | null
): Promise<{ events: CalendarEvent[]; nextDeltaLink: string | null }> {
  const now = new Date()
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  let url: string
  if (deltaLink) {
    url = deltaLink
  } else {
    const startDateTime = now.toISOString()
    const endDateTime = twoHoursLater.toISOString()
    url = `${GRAPH_BASE}/me/calendarView/delta?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=50`
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'odata.maxpagesize=50',
    },
  })

  if (!res.ok) throw new Error(`Microsoft Graph API error ${res.status}: ${await res.text()}`)

  const data = await res.json()
  const events: CalendarEvent[] = []

  for (const item of data.value ?? []) {
    if (!item.start?.dateTime) continue // skip all-day events
    const startIso: string = item.start.dateTime + (item.start.timeZone ? '' : 'Z')

    const startMs = new Date(startIso).getTime()
    if (startMs < now.getTime() || startMs > twoHoursLater.getTime()) continue

    // Teams meeting URL comes from onlineMeeting or body/location
    const joinUrl = extractJoinUrl([
      item.onlineMeeting?.joinUrl,
      item.location?.displayName,
      item.bodyPreview,
    ])
    if (!joinUrl) continue

    events.push({
      id: item.id,
      summary: item.subject ?? null,
      startIso,
      joinUrl,
    })
  }

  // Follow @odata.nextLink pages, then return @odata.deltaLink
  const nextDeltaLink: string | null =
    data['@odata.deltaLink'] ?? data['@odata.nextLink'] ?? null

  return { events, nextDeltaLink }
}
