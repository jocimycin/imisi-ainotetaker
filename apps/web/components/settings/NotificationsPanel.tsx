'use client'
// components/settings/NotificationsPanel.tsx
// DB-backed notification preference toggles.

import { useState } from 'react'

const PREFS = [
  { key: 'summary_email',            label: 'Summary email after each meeting', defaultVal: true },
  { key: 'action_reminder_email',    label: 'Action item reminder emails',       defaultVal: true },
  { key: 'bot_joining_confirmation', label: 'Bot joining confirmation',          defaultVal: false },
]

export function NotificationsPanel({ preferences }: { preferences: Record<string, boolean> }) {
  const [values, setValues] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const p of PREFS) {
      map[p.key] = preferences[p.key] ?? p.defaultVal
    }
    return map
  })
  const [saving, setSaving] = useState(false)

  async function toggle(key: string) {
    const next = { ...values, [key]: !values[key] }
    setValues(next)
    setSaving(true)
    await fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: next[key] }),
    })
    setSaving(false)
  }

  return (
    <div className="bg-surface-card border border-gray-100/80 rounded-2xl overflow-hidden shadow-card">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium">Notifications</h2>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
      </div>
      <div className="p-4 space-y-3">
        {PREFS.map((pref) => (
          <label key={pref.key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700">{pref.label}</span>
            <button
              role="switch"
              aria-checked={values[pref.key]}
              onClick={() => toggle(pref.key)}
              className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
                values[pref.key] ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              <span className={`absolute w-3.5 h-3.5 bg-white rounded-full top-0.5 shadow transition-transform ${
                values[pref.key] ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </label>
        ))}
      </div>
    </div>
  )
}
