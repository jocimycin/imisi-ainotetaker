'use client'
// components/transcript/TranscriptViewer.tsx
import { useState } from 'react'
import { clsx } from 'clsx'
import type { Transcript, TranscriptSegment } from '@/types/database'

const SPEAKER_COLORS = [
  'bg-brand-50 text-brand-800',
  'bg-teal-50 text-teal-800',
  'bg-amber-50 text-amber-800',
  'bg-pink-50 text-pink-800',
  'bg-green-50 text-green-800',
]

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function TranscriptViewer({ transcript }: { transcript: Transcript }) {
  const [search, setSearch] = useState('')

  const segments = (transcript.segments as TranscriptSegment[]) ?? []

  const speakers = Array.from(new Set(segments.map((s) => s.speaker)))
  const speakerColorMap = Object.fromEntries(
    speakers.map((s, i) => [s, SPEAKER_COLORS[i % SPEAKER_COLORS.length]])
  )

  const filtered = search.trim()
    ? segments.filter((s) => s.text.toLowerCase().includes(search.toLowerCase()))
    : segments

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Transcript</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{transcript.word_count?.toLocaleString()} words</span>
          <input
            type="text"
            placeholder="Search transcript..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:border-brand-300"
          />
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No results for &quot;{search}&quot;</p>
        )}
        {filtered.map((seg, i) => (
          <div key={i} className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
            <span className="text-xs text-gray-300 w-10 flex-shrink-0 pt-0.5 font-mono">
              {formatMs(seg.start_ms)}
            </span>
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 h-fit',
                speakerColorMap[seg.speaker]
              )}
            >
              {seg.speaker}
            </span>
            <p className="text-sm text-gray-700 leading-relaxed flex-1">
              {search.trim()
                ? highlightText(seg.text, search)
                : seg.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function highlightText(text: string, query: string) {
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-100 text-yellow-900 rounded px-0.5">{part}</mark>
      : part
  )
}
