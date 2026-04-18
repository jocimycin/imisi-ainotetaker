// app/api/cron/sync-calendars/route.ts
// Vercel Cron — fires every 5 minutes (see vercel.json).
// Replaces the Inngest calendarSyncCron + calendarSyncUser pair.
// Vercel sets CRON_SECRET automatically and sends it as Authorization: Bearer <secret>.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Client as QStashClient } from '@upstash/qstash'

export const maxDuration = 300 // 5 min — Vercel Pro / Fluid compute

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Verify this is a genuine Vercel Cron call
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  const { data: integrations } = await supabase
    .from('integrations')
    .select('id, user_id, provider, access_token, refresh_token, token_expires_at, calendar_sync_cursor')
    .in('provider', ['google', 'microsoft'])
    .eq('calendar_sync_enabled', true)

  if (!integrations?.length) {
    return NextResponse.json({ synced: 0 })
  }

  let succeeded = 0
  let failed = 0

  // Process each integration sequentially — isolate failures per user
  for (const integration of integrations) {
    try {
      await syncOneIntegration(integration, supabase)
      succeeded++
    } catch (err: any) {
      console.error(`[calendar-sync] Failed for integration ${integration.id}:`, err.message)
      failed++
    }
  }

  return NextResponse.json({ succeeded, failed, total: integrations.length })
}

async function syncOneIntegration(
  integration: {
    id: string
    user_id: string
    provider: string
    access_token: string | null
    refresh_token: string | null
    token_expires_at: string | null
    calendar_sync_cursor: unknown
  },
  supabase: ReturnType<typeof getServiceSupabase>
) {
  const { id: integrationId, user_id: userId, provider } = integration

  if (!integration.refresh_token) throw new Error('No refresh token')

  // Step 1: Refresh access token if expired or about to expire
  let accessToken = integration.access_token ?? ''
  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0
  const needsRefresh = Date.now() > expiresAt - 60_000

  if (needsRefresh) {
    if (provider === 'google') {
      const { refreshGoogleToken } = await import('@/lib/calendar/google')
      const tokens = await refreshGoogleToken(integration.refresh_token!)
      accessToken = tokens.access_token
      await supabase
        .from('integrations')
        .update({
          access_token: tokens.access_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', integrationId)
    } else {
      const { refreshMicrosoftToken } = await import('@/lib/calendar/microsoft')
      const tokens = await refreshMicrosoftToken(integration.refresh_token!)
      accessToken = tokens.access_token
      await supabase
        .from('integrations')
        .update({
          access_token: tokens.access_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', integrationId)
    }
  }

  // Step 2: Fetch upcoming events (delta sync with cursor)
  const syncCursor = (integration.calendar_sync_cursor as string | null) ?? null
  let events: Array<{ id: string; summary?: string; joinUrl?: string; startIso: string }>
  let nextCursor: string | null

  try {
    if (provider === 'google') {
      const { listUpcomingEvents } = await import('@/lib/calendar/google')
      const result = await listUpcomingEvents(accessToken, syncCursor)
      events = result.events
      nextCursor = result.nextSyncToken ?? null
    } else {
      const { listUpcomingEvents } = await import('@/lib/calendar/microsoft')
      const result = await listUpcomingEvents(accessToken, syncCursor)
      events = result.events
      nextCursor = result.nextDeltaLink ?? null
    }
  } catch (err: any) {
    if (err?.code === 410 || err?.message?.includes('SYNC_TOKEN_EXPIRED')) {
      // Cursor expired — reset so next run does a full fetch
      await supabase
        .from('integrations')
        .update({ calendar_sync_cursor: null })
        .eq('id', integrationId)
      return
    }
    throw err
  }

  // Step 3: Upsert meetings for events that have a video call join URL
  if (events.length > 0) {
    for (const ev of events) {
      if (!ev.joinUrl) continue
      const { data: upserted } = await supabase
        .from('meetings')
        .upsert(
          {
            user_id: userId,
            calendar_event_id: ev.id,
            calendar_source: provider,
            title: ev.summary ?? 'Untitled meeting',
            join_url: ev.joinUrl,
            started_at: ev.startIso,
            status: 'scheduled',
            platform: provider === 'google' ? 'google_meet' : 'teams',
          },
          { onConflict: 'user_id,calendar_event_id', ignoreDuplicates: false }
        )
        .select('id, status, started_at')
        .single()

      // Dispatch bot for newly scheduled future meetings
      if (upserted && upserted.status === 'scheduled' && upserted.started_at) {
        const startTime = new Date(upserted.started_at)
        if (startTime > new Date()) {
          await scheduleBotViaQStash(upserted.id, upserted.started_at)
        }
      }
    }
  }

  // Step 4: Save cursor + update last synced timestamp
  await supabase
    .from('integrations')
    .update({
      calendar_sync_cursor: nextCursor,
      calendar_last_synced_at: new Date().toISOString(),
    })
    .eq('id', integrationId)
}

async function scheduleBotViaQStash(meetingId: string, startAt: string) {
  if (!process.env.QSTASH_TOKEN) return // QStash not configured — skip silently

  const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN })
  const joinTime = new Date(new Date(startAt).getTime() - 2 * 60 * 1000)
  const delaySeconds = Math.max(0, Math.floor((joinTime.getTime() - Date.now()) / 1000))

  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/bots/dispatch`,
    delay: delaySeconds || undefined,
    body: { meetingId },
  })
}
