'use client'
// components/notes/NoteTimestamp.tsx
// Displays a meeting-relative timestamp (e.g. "34:12") as a soft badge.

interface NoteTimestampProps {
  meetingMs: number | null
}

function formatMeetingMs(ms: number | null): string {
  if (ms === null) return '--:--'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function NoteTimestamp({ meetingMs }: NoteTimestampProps) {
  return (
    <span className="inline-flex items-center text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 select-none">
      {formatMeetingMs(meetingMs)}
    </span>
  )
}
