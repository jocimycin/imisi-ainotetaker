'use client'
// components/settings/IntegrationsPanel.tsx

const INTEGRATIONS = [
  {
    provider: 'google',
    label: 'Google',
    description: 'Google Meet + Google Calendar auto-scheduling',
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
    provider: 'zoom',
    label: 'Zoom',
    description: 'Join Zoom meetings directly',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#2D8CFF">
        <path d="M15 10.5v3L19 17V7l-4 3.5zM5 7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5z"/>
      </svg>
    ),
  },
  {
    provider: 'zoho',
    label: 'Zoho',
    description: 'Zoho Meeting and Cliq support',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24">
        <rect width="24" height="24" rx="4" fill="#E42527"/>
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Z</text>
      </svg>
    ),
  },
]

interface IntegrationsPanelProps {
  connectedProviders: string[]
}

export function IntegrationsPanel({ connectedProviders }: IntegrationsPanelProps) {
  function connect(provider: string) {
    window.location.href = `/api/auth/connect/${provider}`
  }

  function disconnect(provider: string) {
    fetch(`/api/integrations/${provider}`, { method: 'DELETE' })
      .then(() => window.location.reload())
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-medium">Platform integrations</h2>
        <p className="text-xs text-gray-400 mt-0.5">Connect your meeting platforms so Imisi can join automatically</p>
      </div>
      <div className="divide-y divide-gray-50">
        {INTEGRATIONS.map((integration) => {
          const connected = connectedProviders.includes(integration.provider)
          return (
            <div key={integration.provider} className="flex items-center justify-between px-4 py-3.5">
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
          )
        })}
      </div>
    </div>
  )
}
