'use client'
// components/meetings/MeetingCard.tsx
import Link from 'next/link'
import { clsx } from 'clsx'
import { format, isToday, isTomorrow } from 'date-fns'
import type { Meeting } from '@/types/database'

const PLATFORM_LABELS: Record<string, string> = {
  zoom: 'Zoom',
  teams: 'Teams',
  meet: 'Meet',
  google_meet: 'Meet',
  zoho: 'Zoho',
  other: 'Meeting',
}

const STATUS_CONFIG = {
  live:       { label: 'Live',       bar: 'bg-teal-500', pill: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500 animate-pulse' },
  scheduled:  { label: 'Scheduled',  bar: 'bg-brand-400', pill: 'bg-brand-50 text-brand-700', dot: 'bg-brand-400' },
  processing: { label: 'Processing', bar: 'bg-amber-400', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400 animate-pulse' },
  complete:   { label: 'Complete',   bar: 'bg-gray-300', pill: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  joining:    { label: 'Joining',    bar: 'bg-teal-500', pill: 'bg-teal-50 text-teal-700', dot: 'bg-teal-400 animate-pulse' },
  failed:     { label: 'Failed',     bar: 'bg-red-400', pill: 'bg-red-50 text-red-700', dot: 'bg-red-400' },
}

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const status = STATUS_CONFIG[meeting.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.scheduled
  const platform = PLATFORM_LABELS[meeting.platform] ?? 'Meeting'
  const isActive = meeting.status === 'live' || meeting.status === 'joining'

  const timeStr = meeting.started_at
    ? isToday(new Date(meeting.started_at))
      ? format(new Date(meeting.started_at), 'h:mm a')
      : isTomorrow(new Date(meeting.started_at))
        ? `Tomorrow, ${format(new Date(meeting.started_at), 'h:mm a')}`
        : format(new Date(meeting.started_at), 'EEE d MMM, h:mm a')
    : ''

  const attendees = (meeting.attendees as Array<{ name: string }>) ?? []

  return (
    <Link href={`/dashboard/meetings/${meeting.id}`}>
      <div
        className={clsx(
          'group bg-surface-card rounded-xl border overflow-hidden shadow-card hover:shadow-card-hover transition-all cursor-pointer',
          isActive ? 'border-teal-200' : 'border-gray-100/80 hover:border-gray-200'
        )}
      >
        {/* Status bar — 3px top accent */}
        <div className={clsx('h-0.5', status.bar)} />

        <div className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-1 flex-1">
              {meeting.title ?? 'Untitled meeting'}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1', status.pill)}>
                <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', status.dot)} />
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
            <span>{timeStr}</span>
            {attendees.length > 0 && (
              <>
                <span className="text-gray-200">·</span>
                <span>{attendees.length} participant{attendees.length !== 1 ? 's' : ''}</span>
              </>
            )}
            {meeting.duration_seconds && (
              <>
                <span className="text-gray-200">·</span>
                <span>{Math.round(meeting.duration_seconds / 60)} min</span>
              </>
            )}
            <span className="text-gray-200">·</span>
            <span className="text-gray-400">{platform}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
