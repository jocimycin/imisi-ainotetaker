'use client'
// components/meetings/ScheduleModal.tsx
import { useState } from 'react'

type Mode = 'now' | 'later'

const PLATFORM_HINTS: Array<{ match: RegExp; label: string }> = [
  { match: /meet\.google\.com/,  label: 'Google Meet'  },
  { match: /zoom\.us/,           label: 'Zoom'         },
  { match: /teams\.microsoft/,   label: 'Teams'        },
  { match: /zoho\.com/,          label: 'Zoho'         },
]

function detectLabel(url: string): string | null {
  for (const { match, label } of PLATFORM_HINTS) {
    if (match.test(url)) return label
  }
  return null
}

function isUrl(val: string) {
  try { new URL(val); return true } catch { return false }
}

export function ScheduleModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('now')
  const [title, setTitle] = useState('')
  const [joinUrl, setJoinUrl] = useState('')
  const [startAt, setStartAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [error, setError] = useState('')

  const platformLabel = detectLabel(joinUrl)

  function handleUrlChange(val: string) {
    setJoinUrl(val)
    setUrlError('')
    // Auto-fill title from platform label if title is empty
    if (!title && detectLabel(val)) {
      setTitle(detectLabel(val)!)
    }
  }

  function handleTitleChange(val: string) {
    // If user pastes a URL into the title field, move it to the URL field
    if (isUrl(val) && !joinUrl) {
      setJoinUrl(val)
      setTitle(detectLabel(val) ?? '')
      return
    }
    setTitle(val)
  }

  async function submit() {
    setError('')
    setUrlError('')

    if (!joinUrl) {
      setUrlError('Paste the meeting join link here.')
      return
    }
    if (!isUrl(joinUrl)) {
      setUrlError('That doesn\'t look like a valid URL — paste the full meeting link.')
      return
    }
    if (mode === 'later' && !startAt) {
      setError('Please choose a start time.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/meetings/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || (platformLabel ? `${platformLabel} meeting` : 'Meeting'),
          joinUrl,
          startAt: mode === 'now' ? new Date().toISOString() : startAt,
          attendees: [],
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Failed to schedule')
      }
      onClose()
      window.location.reload()
    } catch (err: any) {
      setError(err.message ?? 'Failed to schedule meeting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className="fixed inset-0 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium">Send Imisi to a meeting</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
          {(['now', 'later'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'now' ? 'Join now' : 'Schedule for later'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* URL first — it's what users have ready */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Meeting join link</label>
            <input
              type="text"
              value={joinUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste your Zoom, Teams, Meet, or Zoho URL"
              autoFocus
              className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none ${
                urlError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-brand-300'
              }`}
            />
            {urlError
              ? <p className="text-xs text-red-500 mt-1">{urlError}</p>
              : platformLabel
                ? <p className="text-xs text-teal-600 mt-1">Detected: {platformLabel}</p>
                : <p className="text-xs text-gray-400 mt-1">Platform detected automatically from the URL.</p>
            }
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Meeting title <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={platformLabel ? `${platformLabel} meeting` : 'e.g. Weekly team standup'}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-300"
            />
          </div>

          {mode === 'later' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Start time</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(new Date(e.target.value).toISOString())}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-300"
              />
            </div>
          )}

          {mode === 'now' && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              Imisi will attempt to join the meeting immediately. Make sure the meeting is already open and accepting participants.
            </p>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 text-sm py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 text-sm py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading
                ? mode === 'now' ? 'Sending Imisi…' : 'Scheduling…'
                : mode === 'now' ? 'Send Imisi now' : 'Schedule Imisi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
