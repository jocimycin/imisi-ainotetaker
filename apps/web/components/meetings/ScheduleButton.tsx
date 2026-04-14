'use client'
// components/meetings/ScheduleButton.tsx
import { useState } from 'react'
import { ScheduleModal } from './ScheduleModal'

export function ScheduleButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
      >
        + Schedule Imisi
      </button>
      {open && <ScheduleModal onClose={() => setOpen(false)} />}
    </>
  )
}
