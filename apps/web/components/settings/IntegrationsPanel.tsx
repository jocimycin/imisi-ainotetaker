'use client'
// components/settings/IntegrationsPanel.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INTEGRATIONS = [
  {
    provider: 'google',
    label: 'Google',
    description: 'Google Meet + Google Calendar auto-scheduling',
    hasCalendar: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
    ),
  },
  {
    provider: 'microsoft',
    label: 'Microsoft',
    description: 'Microsoft Teams + Outlook Calendar auto-scheduling',
    hasCalendar: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 21 21">
        <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
        <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
        <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
      </svg>
    ),
  },
  {
    provider: 'notion',
    label: 'Notion',
    description: 'Push action items to a Notion database',
    hasCalendar: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.081.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.448-1.632z"/>
      </svg>
    ),
  },
  {
    provider: 'asana',
    label: 'Asana',
    description: 'Push action items to Asana tasks',
    hasCalendar: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24">
        <circle cx="12" cy="6" r="4" fill="#F06A6A"/>
        <circle cx="6" cy="16" r="4" fill="#F06A6A"/>
        <circle cx="18" cy="16" r="4" fill="#F06A6A"/>
      </svg>
    ),
  },
  {
    provider: 'jira',
    label: 'Jira',
    description: 'Push action items to Jira issues',
    hasCalendar: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#2684FF" d="M11.53 2.056A.27.27 0 0 0 11.32 2a.27.27 0 0 0-.21.056L2 11.375a.268.268 0 0 0 0 .378l9.11 9.19A.27.27 0 0 0 11.32 21a.27.27 0 0 0 .21-.057l9.11-9.19a.268.268 0 0 0 0-.378l-9.11-9.32zm-.21 3.578 6.22 6.285L11.32 18.2 5.1 11.92l6.22-6.285z"/>
      </svg>
    ),
  },
  {
    provider: 'zoom',
    label: 'Zoom',
    description: 'Join Zoom meetings directly',
    hasCalendar: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#2D8CFF">
        <path d="M15 10.5v3L19 17V7l-4 3.5zM5 7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5z"/>
      </svg>
    ),
  },
]

interface Integration {
  provider: string
  calendar_sync_enabled?: boolean
  task_push_enabled?: boolean
  calendar_last_synced_at?: string | null
}

interface IntegrationsPanelProps {
  connectedProviders: string[]
  integrations?: Integration[]
}

function formatLastSynced(iso: string | null | undefined): string {
  if (!iso) return 'Never synced'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function IntegrationsPanel({ connectedProviders, integrations = [] }: IntegrationsPanelProps) {
  const router = useRouter()
  const [syncStates, setSyncStates] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const i of integrations) {
      map[i.provider] = i.calendar_sync_enabled ?? true
    }
    return map
  })
  const [taskStates, setTaskStates] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const i of integrations) {
      map[i.provider] = i.task_push_enabled ?? false
    }
    return map
  })
  const [syncing, setSyncing] = useState(false)

  const lastSyncedMap: Record<string, string | null | undefined> = {}
  for (const i of integrations) {
    lastSyncedMap[i.provider] = i.calendar_last_synced_at
  }

  function connect(provider: string) {
    window.location.href = `/api/auth/connect/${provider}`
  }

  async function disconnect(provider: string) {
    await fetch(`/api/integrations/${provider}`, { method: 'DELETE' })
    window.location.reload()
  }

  async function toggleCalendarSync(provider: string, value: boolean) {
    setSyncStates((prev) => ({ ...prev, [provider]: value }))
    await fetch(`/api/integrations/${provider}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendar_sync_enabled: value }),
    })
  }

  async function toggleTaskPush(provider: string, value: boolean) {
    setTaskStates((prev) => ({ ...prev, [provider]: value }))
    await fetch(`/api/integrations/${provider}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_push_enabled: value }),
    })
  }

  async function syncNow() {
    setSyncing(true)
    await fetch('/api/integrations/sync-now', { method: 'POST' })
    setSyncing(false)
    router.refresh()
  }

  return (
    <div className="bg-surface-card border border-gray-100/80 rounded-2xl overflow-hidden shadow-card">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Platform integrations</h2>
          <p className="text-xs text-gray-400 mt-0.5">Connect your meeting platforms so Imisi can join automatically</p>
        </div>
        {connectedProviders.some((p) => ['google', 'microsoft'].includes(p)) && (
          <button
            onClick={syncNow}
            disabled={syncing}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {INTEGRATIONS.map((integration) => {
          const connected = connectedProviders.includes(integration.provider)
          const calSync = syncStates[integration.provider] ?? true
          const taskPush = taskStates[integration.provider] ?? false

          return (
            <div key={integration.provider} className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 border border-gray-100 rounded-lg flex items-center justify-center">
                    {integration.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{integration.label}</p>
                    <p className="text-xs text-gray-400">{integration.description}</p>
                  </div>
                </div>
                {connected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-teal-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                      Connected
                    </span>
                    <button
                      onClick={() => disconnect(integration.provider)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-2"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => connect(integration.provider)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors font-medium"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Sub-toggles — only shown when connected */}
              {connected && (integration.hasCalendar || !integration.hasCalendar) && (
                <div className="mt-2.5 ml-12 flex flex-wrap gap-4">
                  {integration.hasCalendar && (
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <button
                          role="switch"
                          aria-checked={calSync}
                          onClick={() => toggleCalendarSync(integration.provider, !calSync)}
                          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${calSync ? 'bg-brand-600' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${calSync ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-xs text-gray-500">Auto-schedule from calendar</span>
                      </label>
                      {calSync && (
                        <p className="text-xs text-gray-400 pl-9">
                          Last synced: <span className={lastSyncedMap[integration.provider] ? 'text-gray-500' : 'text-amber-500'}>
                            {formatLastSynced(lastSyncedMap[integration.provider])}
                          </span>
                          {!lastSyncedMap[integration.provider] && (
                            <span className="ml-1 text-amber-500">— click Sync now to start</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  {['notion', 'asana', 'jira'].includes(integration.provider) && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <button
                        role="switch"
                        aria-checked={taskPush}
                        onClick={() => toggleTaskPush(integration.provider, !taskPush)}
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${taskPush ? 'bg-brand-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${taskPush ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-xs text-gray-500">Push action items automatically</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
