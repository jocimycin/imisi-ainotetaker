// app/api/billing/checkout/route.ts
// POST { planId: 'pro' | 'team' } → returns Stripe Checkout URL
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getStripe, PLANS } from '@/lib/stripe'
import type { Database } from '@/types/database'

function getServiceSupabase() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await req.json()
  const plan = PLANS[planId as keyof typeof PLANS]
  if (!plan || !plan.priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const serviceSupabase = getServiceSupabase()
  const { data: profile } = await serviceSupabase
    .from('users')
    .select('stripe_customer_id, email, full_name')
    .eq('id', user.id)
    .single() as { data: { stripe_customer_id?: string | null; email: string; full_name?: string | null } | null; error: unknown }

  const stripe = getStripe()

  // Create or reuse Stripe customer
  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await serviceSupabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?upgraded=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    metadata: { supabase_user_id: user.id, plan_id: planId },
  })

  return NextResponse.json({ url: session.url })
}
