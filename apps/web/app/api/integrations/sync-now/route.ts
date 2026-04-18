// app/api/integrations/sync-now/route.ts
// User-triggered calendar sync — calls the cron endpoint server-side.
// Authenticated by user session (not CRON_SECRET), used by the Settings "Sync now" button.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/sync-calendars`
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  // Call the cron endpoint directly from the server — avoids exposing CRON_SECRET to clients
  const res = await fetch(cronUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${cronSecret}` },
  })

  const result = await res.json().catch(() => ({}))
  return NextResponse.json(result, { status: res.status })
}
