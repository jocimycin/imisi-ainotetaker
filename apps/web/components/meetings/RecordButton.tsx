'use client'
// components/meetings/RecordButton.tsx
// In-browser meeting recorder — the IT-restricted-environment path.
// Uses getDisplayMedia to capture system/tab audio so all participants are recorded,
// not just the user's microphone.

import { useState } from 'react'
import { RecordingSession } from './RecordingSession'

export function RecordButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors font-medium"
      >
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Record meeting
      </button>

      {open && <RecordingSession onClose={() => setOpen(false)} />}
    </>
  )
}
