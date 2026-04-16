// apps/web/worker/jobs/calendarSync.ts
// Inngest cron: every 5 min — fan-out calendar sync per user with active integration

import { inngest } from './pipeline'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─────────────────────────────────────────────
// CRON: fan-out — send one sync event per user
// ─────────────────────────────────────────────
export const calendarSyncCron = inngest.createFunction(
  { id: 'calendar-sync-cron', name: 'Calendar sync cron' },
  { cron: '*/5 * * * *' },
  async ({ step }) => {
    const supabase = getServiceSupabase()

    const { data: integrations } = await supabase
      .from('integrations')
      .select('id, user_id, provider, calendar_sync_enabled')
      .in('provider', ['google', 'microsoft'])
      .eq('calendar_sync_enabled', true)

    if (!integrations?.length) return { synced: 0 }

    await step.sendEvent(
      'fan-out-calendar-syncs',
      integrations.map((i) => ({
        name: 'imisi/calendar.sync-user' as const,
        data: { integrationId: i.id, userId: i.user_id, provider: i.provider },
      }))
    )

    return { synced: integrations.length }
  }
)

// ─────────────────────────────────────────────
// JOB: sync one user's calendar
// ─────────────────────────────────────────────
export const calendarSyncUser = inngest.createFunction(
  { id: 'calendar-sync-user', name: 'Sync user calendar' },
  { event: 'imisi/calendar.sync-user' },
  async ({ event, step }) => {
    const { integrationId, userId, provider } = event.data
    const supabase = getServiceSupabase()

    // 1. Load integration tokens
    const integration = await step.run('load-integration', async () => {
      const { data } = await supabase
        .from('integrations')
        .select('access_token, refresh_token, token_expires_at, calendar_sync_cursor')
        .eq('id', integrationId)
        .single()
      return data
    })

    if (!integration?.refresh_token) throw new Error('No refresh token')

    // 2. Refresh token if needed
    const accessToken = await step.run('refresh-token', async () => {
      const expiresAt = integration.token_expires_at
        ? new Date(integration.token_expires_at).getTime()
        : 0
      const needsRefresh = Date.now() > expiresAt - 60_000

      if (!needsRefresh && integration.access_token) return integration.access_token

      if (provider === 'google') {
        const { refreshGoogleToken } = await import('@/lib/calendar/google')
        const tokens = await refreshGoogleToken(integration.refresh_token!)
        await supabase
          .from('integrations')
          .update({
            access_token: tokens.access_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          })
          .eq('id', integrationId)
        return tokens.access_token
      } else {
        const { refreshMicrosoftToken } = await import('@/lib/calendar/microsoft')
        const tokens = await refreshMicrosoftToken(integration.refresh_token!)
        await supabase
          .from('integrations')
          .update({
            access_token: tokens.access_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          })
          .eq('id', integrationId)
        return tokens.access_token
      }
    })

    // 3. Fetch upcoming events
    const { events, cursor } = await step.run('fetch-events', async () => {
      const syncCursor = (integration.calendar_sync_cursor as string | null) ?? null

      try {
        if (provider === 'google') {
          const { listUpcomingEvents } = await import('@/lib/calendar/google')
          const result = await listUpcomingEvents(accessToken, syncCursor)
          return { events: result.events, cursor: result.nextSyncToken }
        } else {
          const { listUpcomingEvents } = await import('@/lib/calendar/microsoft')
          const result = await listUpcomingEvents(accessToken, syncCursor)
          return { events: result.events, cursor: result.nextDeltaLink }
        }
      } catch (err: any) {
        // Sync token expired — reset and return empty (next run will full-fetch)
        if (err?.code === 410 || err?.message?.includes('SYNC_TOKEN_EXPIRED')) {
          await supabase
            .from('integrations')
            .update({ calendar_sync_cursor: null })
            .eq('id', integrationId)
          return { events: [], cursor: null }
        }
        throw err
      }
    })

    // 4. Upsert meetings for each event with a join URL
    const upserted = await step.run('upsert-meetings', async () => {
      if (!events.length) return 0
      let count = 0

      for (const ev of events) {
        const { error } = await supabase.from('meetings').upsert(
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
        if (!error) count++
      }
      return count
    })

    // 5. Schedule bots for newly upserted meetings (fire-and-forget)
    await step.run('schedule-bots', async () => {
      if (!upserted) return
      const { data: scheduled } = await supabase
        .from('meetings')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('started_at', new Date().toISOString())

      if (!scheduled?.length) return

      await inngest.send(
        scheduled.map((m) => ({
          name: 'imisi/meeting.schedule-bot' as const,
          data: { meetingId: m.id },
        }))
      )
    })

    // 6. Save cursor + last synced timestamp
    await step.run('save-cursor', async () => {
      await supabase
        .from('integrations')
        .update({
          calendar_sync_cursor: cursor,
          calendar_last_synced_at: new Date().toISOString(),
        })
        .eq('id', integrationId)
    })

    return { upserted }
  }
)

export const calendarFunctions = [calendarSyncCron, calendarSyncUser]
