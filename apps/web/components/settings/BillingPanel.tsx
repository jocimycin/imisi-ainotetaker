// components/settings/BillingPanel.tsx
// STUB — billing UI ready, Stripe integration not yet active

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

export function BillingPanel({ currentPlan }: BillingPanelProps) {
  return (
    <div className="bg-surface-card border border-gray-100/80 rounded-2xl overflow-hidden shadow-card">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Billing</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Current plan: <span className="text-brand-700 font-medium capitalize">{currentPlan}</span>
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full font-medium">
          Payments coming soon
        </span>
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
                <div className="w-full text-xs py-1.5 rounded-lg border border-dashed border-gray-200 text-gray-400 text-center">
                  Coming soon
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
