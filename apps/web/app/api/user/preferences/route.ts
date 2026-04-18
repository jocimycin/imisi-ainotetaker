// app/api/user/preferences/route.ts
// PATCH — update user notification preferences

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, boolean>

  // Merge into existing preferences (don't overwrite unrelated keys)
  const { data: current } = await supabase
    .from('users')
    .select('preferences')
    .eq('id', user.id)
    .single()

  const merged = { ...(current?.preferences as object ?? {}), ...body }

  await supabase
    .from('users')
    .update({ preferences: merged })
    .eq('id', user.id)

  return NextResponse.json({ saved: true })
}
