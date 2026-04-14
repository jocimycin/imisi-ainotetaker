'use client'
// components/meetings/ScheduleModal.tsx
import { useState } from 'react'

export function ScheduleModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [joinUrl, setJoinUrl] = useState('')
  const [startAt, setStartAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!title || !joinUrl || !startAt) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/meetings/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, joinUrl, startAt, attendees: [] }),
      })
      if (!res.ok) throw new Error('Failed to schedule')
      onClose()
      window.location.reload()
    } catch {
      setError('Failed to schedule meeting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ minHeight: '400px', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className="fixed inset-0 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium">Schedule Imisi</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Meeting title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly team standup"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Meeting join link</label>
            <input
              type="url"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              placeholder="Zoom, Teams, Meet, or Zoho URL"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-300"
            />
            <p className="text-xs text-gray-400 mt-1">Imisi detects the platform automatically from the URL.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Start time</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(new Date(e.target.value).toISOString())}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-300"
            />
          </div>

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
              {loading ? 'Scheduling...' : 'Schedule Imisi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
