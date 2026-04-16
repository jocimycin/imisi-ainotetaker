'use client'
// components/settings/BillingPanel.tsx

import { useState } from 'react'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    features: ['5 meetings / month', '60 min recording', 'Basic summaries'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12/mo',
    features: ['100 meetings / month', '2000 min recording', 'Full AI analysis', 'Action item push'],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$39/mo',
    features: ['Unlimited meetings', 'Unlimited recording', 'Everything in Pro', 'Team workspace'],
  },
]

interface BillingPanelProps {
  currentPlan: string
  hasStripeCustomer: boolean
}

export function BillingPanel({ currentPlan, hasStripeCustomer }: BillingPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function upgrade(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Billing</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Current plan: <span className="text-brand-700 font-medium capitalize">{currentPlan}</span>
          </p>
        </div>
        {hasStripeCustomer && (
          <button
            onClick={openPortal}
            disabled={loading === 'portal'}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading === 'portal' ? 'Opening...' : 'Manage billing'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan
          const isUpgrade = ['pro', 'team'].includes(plan.id) && plan.id !== currentPlan

          return (
            <div key={plan.id} className={`p-4 ${isCurrent ? 'bg-brand-50/50' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800">{plan.name}</span>
                {isCurrent && (
                  <span className="text-xs px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded font-medium">
                    Current
                  </span>
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">{plan.price}</p>
              <ul className="space-y-1 mb-3">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-gray-500 flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-teal-500 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {isUpgrade && (
                <button
                  onClick={() => upgrade(plan.id)}
                  disabled={loading === plan.id}
                  className="w-full text-xs py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
