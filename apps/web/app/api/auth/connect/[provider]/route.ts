// app/api/auth/connect/[provider]/route.ts
// Initiates OAuth for Google, Microsoft, Notion, Asana, Jira
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SCOPES: Record<string, string[]> = {
  google: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'offline',
  ],
  microsoft: [
    'https://graph.microsoft.com/Calendars.Read',
    'offline_access',
    'openid',
    'email',
  ],
  notion: ['read_content', 'update_content', 'insert_content'],
  asana: [],   // Asana uses its own scope negotiation
  jira: [],    // Jira uses Atlassian OAuth 2.0
}

const AUTH_URLS: Record<string, string> = {
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
  microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  notion: 'https://api.notion.com/v1/oauth/authorize',
  asana: 'https://app.asana.com/-/oauth_authorize',
  jira: 'https://auth.atlassian.com/authorize',
}

const CLIENT_IDS: Record<string, string | undefined> = {
  google: process.env.GOOGLE_CLIENT_ID,
  microsoft: process.env.MICROSOFT_CLIENT_ID,
  notion: process.env.NOTION_CLIENT_ID,
  asana: process.env.ASANA_CLIENT_ID,
  jira: process.env.JIRA_CLIENT_ID,
}

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider

  if (!AUTH_URLS[provider]) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = CLIENT_IDS[provider]
  if (!clientId) {
    return NextResponse.json({ error: `${provider} client ID not configured` }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/connect/callback?provider=${provider}`

  // Store state = base64(userId:provider) for CSRF validation
  const state = Buffer.from(`${user.id}:${provider}`).toString('base64url')

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    access_type: 'offline',   // Google: get refresh token
    prompt: 'consent',        // Google/Microsoft: force consent to get refresh token
  })

  if (provider === 'microsoft') {
    authParams.delete('access_type')
    authParams.set('response_mode', 'query')
  }

  if (provider === 'notion') {
    authParams.delete('access_type')
    authParams.delete('prompt')
    authParams.set('owner', 'user')
  }

  if (provider === 'jira') {
    authParams.delete('access_type')
    authParams.delete('prompt')
    authParams.set('audience', 'api.atlassian.com')
    authParams.set('scope', 'read:jira-work write:jira-work offline_access')
  }

  const scopes = SCOPES[provider]
  if (scopes?.length) {
    authParams.set('scope', scopes.join(' '))
  }

  return NextResponse.redirect(`${AUTH_URLS[provider]}?${authParams}`)
}
