// app/api/auth/connect/callback/route.ts
// OAuth callback — exchanges code for tokens, upserts integrations row
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const TOKEN_URLS: Record<string, string> = {
  google: 'https://oauth2.googleapis.com/token',
  microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  notion: 'https://api.notion.com/v1/oauth/token',
  asana: 'https://app.asana.com/-/oauth_token',
  jira: 'https://auth.atlassian.com/oauth/token',
}

const CLIENT_IDS: Record<string, string | undefined> = {
  google: process.env.GOOGLE_CLIENT_ID,
  microsoft: process.env.MICROSOFT_CLIENT_ID,
  notion: process.env.NOTION_CLIENT_ID,
  asana: process.env.ASANA_CLIENT_ID,
  jira: process.env.JIRA_CLIENT_ID,
}

const CLIENT_SECRETS: Record<string, string | undefined> = {
  google: process.env.GOOGLE_CLIENT_SECRET,
  microsoft: process.env.MICROSOFT_CLIENT_SECRET,
  notion: process.env.NOTION_CLIENT_SECRET,
  asana: process.env.ASANA_CLIENT_SECRET,
  jira: process.env.JIRA_CLIENT_SECRET,
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const provider = searchParams.get('provider')
  const error = searchParams.get('error')

  const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`

  if (error || !code || !state || !provider) {
    return NextResponse.redirect(`${settingsUrl}?connect_error=${error ?? 'missing_params'}`)
  }

  // Validate state — must match the logged-in user
  const serverSupabase = createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${settingsUrl}?connect_error=unauthorized`)

  let stateUserId: string
  try {
    const decoded = Buffer.from(state, 'base64url').toString()
    stateUserId = decoded.split(':')[0]
  } catch {
    return NextResponse.redirect(`${settingsUrl}?connect_error=invalid_state`)
  }

  if (stateUserId !== user.id) {
    return NextResponse.redirect(`${settingsUrl}?connect_error=state_mismatch`)
  }

  // Exchange code for tokens
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/connect/callback?provider=${provider}`
  const clientId = CLIENT_IDS[provider]
  const clientSecret = CLIENT_SECRETS[provider]

  if (!clientId || !clientSecret || !TOKEN_URLS[provider]) {
    return NextResponse.redirect(`${settingsUrl}?connect_error=provider_not_configured`)
  }

  let tokenRes: Response
  if (provider === 'notion') {
    // Notion uses HTTP Basic auth
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    tokenRes = await fetch(TOKEN_URLS[provider], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    })
  } else {
    tokenRes = await fetch(TOKEN_URLS[provider], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
  }

  if (!tokenRes.ok) {
    console.error(`Token exchange failed for ${provider}:`, await tokenRes.text())
    return NextResponse.redirect(`${settingsUrl}?connect_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  const serviceSupabase = getServiceSupabase()

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  // Upsert integration row (service role to bypass RLS)
  const { error: upsertError } = await serviceSupabase.from('integrations').upsert(
    {
      user_id: user.id,
      provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      scopes: tokens.scope ? tokens.scope.split(/[\s,]+/) : [],
      calendar_sync_enabled: ['google', 'microsoft'].includes(provider),
    },
    { onConflict: 'user_id,provider' }
  )

  if (upsertError) {
    console.error('Integration upsert error:', upsertError)
    return NextResponse.redirect(`${settingsUrl}?connect_error=db_error`)
  }

  return NextResponse.redirect(`${settingsUrl}?connected=${provider}`)
}
