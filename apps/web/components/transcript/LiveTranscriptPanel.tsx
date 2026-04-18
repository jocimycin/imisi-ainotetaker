'use client'
// components/transcript/LiveTranscriptPanel.tsx
// Real-time transcript panel — subscribes to transcript_segments via Supabase Realtime.
// Rendered on the meeting detail page when meeting.status === 'live'.

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeToTranscriptSegments, type LiveSegment } from '@/lib/supabase/realtime'
import { clsx } from 'clsx'

const SPEAKER_COLORS = [
  'bg-brand-50 text-brand-800',
  'bg-teal-50 text-teal-800',
  'bg-amber-50 text-amber-800',
  'bg-pink-50 text-pink-800',
  'bg-green-50 text-green-800',
]

function formatMs(ms: number | null) {
  if (ms === null) return '--:--'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function LiveTranscriptPanel({ meetingId }: { meetingId: string }) {
  const [segments, setSegments] = useState<LiveSegment[]>([])
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Initial load of any segments already in DB (e.g. page refresh mid-meeting)
  useEffect(() => {
    supabase
      .from('transcript_segments')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('segment_index', { ascending: true })
      .then(({ data }) => {
        if (data) setSegments(data as LiveSegment[])
        setConnected(true)
      })
  }, [meetingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToTranscriptSegments(supabase, meetingId, (payload) => {
      const incoming = payload.new as LiveSegment
      setSegments((prev) => {
        const idx = prev.findIndex((s) => s.segment_index === incoming.segment_index)
        if (idx >= 0) {
          // Overwrite partial with updated or final segment
          const next = [...prev]
          next[idx] = incoming
          return next
        }
        return [...prev, incoming].sort((a, b) => a.segment_index - b.segment_index)
      })
    })
    return unsubscribe
  }, [meetingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom as new segments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments.length])

  const speakers = Array.from(new Set(segments.map((s) => s.speaker ?? 'Unknown')))
  const speakerColorMap = Object.fromEntries(
    speakers.map((s, i) => [s, SPEAKER_COLORS[i % SPEAKER_COLORS.length]])
  )

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <h2 className="text-sm font-medium">Live Transcript</h2>
        </div>
        <span className="text-xs text-gray-400">
          {connected ? `${segments.length} segments` : 'Connecting…'}
        </span>
      </div>

      {/* Segments */}
      <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
        {segments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            Waiting for transcript…
          </p>
        )}
        {segments.map((seg) => (
          <div
            key={`${seg.segment_index}-${seg.is_final}`}
            className={clsx(
              'flex gap-3 px-4 py-3 transition-colors',
              seg.is_final ? 'hover:bg-gray-50' : 'bg-amber-50/40'
            )}
          >
            <span className="text-xs text-gray-300 w-10 flex-shrink-0 pt-0.5 font-mono">
              {formatMs(seg.start_ms)}
            </span>
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 h-fit',
                speakerColorMap[seg.speaker ?? 'Unknown']
              )}
            >
              {seg.speaker ?? 'Unknown'}
            </span>
            <p className={clsx(
              'text-sm leading-relaxed flex-1',
              seg.is_final ? 'text-gray-700' : 'text-gray-400 italic'
            )}>
              {seg.text}
              {!seg.is_final && (
                <span className="ml-1 inline-flex gap-0.5">
                  <span className="animate-bounce w-1 h-1 bg-gray-300 rounded-full [animation-delay:0ms]" />
                  <span className="animate-bounce w-1 h-1 bg-gray-300 rounded-full [animation-delay:150ms]" />
                  <span className="animate-bounce w-1 h-1 bg-gray-300 rounded-full [animation-delay:300ms]" />
                </span>
              )}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
