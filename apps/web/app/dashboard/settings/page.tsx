// apps/web/app/dashboard/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntegrationsPanel } from '@/components/settings/IntegrationsPanel'
import { BillingPanel } from '@/components/settings/BillingPanel'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, plan, stripe_customer_id')
    .eq('id', user.id)
    .single() as { data: { full_name?: string | null; email: string; plan?: string | null; stripe_customer_id?: string | null } | null; error: unknown }

  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider, created_at, token_expires_at, calendar_sync_enabled, task_push_enabled, calendar_last_synced_at')
    .eq('user_id', user.id)

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="bg-surface-card border border-gray-100/80 rounded-2xl overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium">Profile</h2>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Name</label>
            <p className="text-sm text-gray-800">{profile?.full_name ?? 'Not set'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Email</label>
            <p className="text-sm text-gray-800">{profile?.email}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Plan</label>
            <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-medium capitalize">
              {profile?.plan ?? 'free'}
            </span>
          </div>
        </div>
      </div>

      <IntegrationsPanel
        connectedProviders={integrations?.map((i) => i.provider) ?? []}
        integrations={(integrations ?? []) as any}
      />

      <BillingPanel
        currentPlan={profile?.plan ?? 'free'}
        hasStripeCustomer={!!profile?.stripe_customer_id}
      />

      <div className="bg-surface-card border border-gray-100/80 rounded-2xl overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium">Notifications</h2>
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: 'Summary email after each meeting', default: true },
            { label: 'Action item reminder emails', default: true },
            { label: 'Bot joining confirmation', default: false },
          ].map((pref) => (
            <label key={pref.label} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">{pref.label}</span>
              <div className={`w-9 h-5 rounded-full relative transition-colors ${pref.default ? 'bg-brand-600' : 'bg-gray-200'}`}>
                <div className={`absolute w-3.5 h-3.5 bg-white rounded-full top-0.5 transition-transform ${pref.default ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
