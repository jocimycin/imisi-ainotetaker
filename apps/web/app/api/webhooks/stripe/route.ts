// app/api/webhooks/stripe/route.ts
// Stripe webhook handler — keeps user plan in sync
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import type { Database } from '@/types/database'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function syncSubscription(sub: Stripe.Subscription, supabase: ReturnType<typeof getServiceSupabase>) {
  const userId = sub.metadata?.supabase_user_id
  if (!userId) return

  // Determine plan from price ID
  const priceId = sub.items.data[0]?.price?.id
  let plan = 'free'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro'
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) plan = 'team'

  const isActive = ['active', 'trialing'].includes(sub.status)
  if (!isActive) plan = 'free'

  await supabase.from('users').update({
    plan,
    stripe_subscription_id: sub.id,
    stripe_subscription_status: sub.status,
    plan_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
  } as any).eq('id', userId)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        // Copy user metadata from session to subscription for future events
        if (session.metadata?.supabase_user_id) {
          await stripe.subscriptions.update(sub.id, {
            metadata: { supabase_user_id: session.metadata.supabase_user_id },
          })
          sub.metadata = { ...sub.metadata, supabase_user_id: session.metadata.supabase_user_id }
        }
        await syncSubscription(sub, supabase)
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await syncSubscription(sub, supabase)
      break
    }
  }

  return NextResponse.json({ received: true })
}
