'use client'
// components/meetings/MeetingCard.tsx
import Link from 'next/link'
import { clsx } from 'clsx'
import { format, isToday } from 'date-fns'
import type { Meeting } from '@/types/database'

const PLATFORM_LABELS: Record<string, string> = {
  zoom: 'Zoom',
  teams: 'Teams',
  meet: 'Meet',
  zoho: 'Zoho',
  other: 'Meeting',
}

const PLATFORM_COLORS: Record<string, string> = {
  zoom: 'bg-blue-50 text-blue-800',
  teams: 'bg-brand-50 text-brand-800',
  meet: 'bg-green-50 text-green-800',
  zoho: 'bg-amber-50 text-amber-800',
  other: 'bg-gray-100 text-gray-600',
}

const STATUS_CONFIG = {
  live:       { label: 'Live',       color: 'bg-teal-50 text-teal-800', dot: 'bg-teal-500 animate-pulse' },
  scheduled:  { label: 'Scheduled',  color: 'bg-brand-50 text-brand-700', dot: 'bg-brand-400' },
  processing: { label: 'Processing', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400 animate-pulse' },
  complete:   { label: 'Complete',   color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  joining:    { label: 'Joining',    color: 'bg-teal-50 text-teal-700', dot: 'bg-teal-400 animate-pulse' },
  failed:     { label: 'Failed',     color: 'bg-red-50 text-red-700', dot: 'bg-red-400' },
}

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const status = STATUS_CONFIG[meeting.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.scheduled
  const platform = PLATFORM_LABELS[meeting.platform] ?? 'Meeting'
  const platformColor = PLATFORM_COLORS[meeting.platform] ?? PLATFORM_COLORS.other
  const isLive = meeting.status === 'live' || meeting.status === 'joining'

  const timeStr = meeting.started_at
    ? isToday(new Date(meeting.started_at))
      ? format(new Date(meeting.started_at), 'h:mm a')
      : format(new Date(meeting.started_at), 'MMM d, h:mm a')
    : ''

  const attendees = (meeting.attendees as Array<{ name: string }>) ?? []

  return (
    <Link href={`/dashboard/meetings/${meeting.id}`}>
      <div
        className={clsx(
          'border rounded-xl p-3.5 cursor-pointer transition-colors hover:border-gray-200',
          isLive
            ? 'border-l-[3px] border-l-teal-500 border-t-gray-100 border-r-gray-100 border-b-gray-100'
            : 'border-gray-100'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-1">
            {meeting.title ?? 'Untitled meeting'}
          </p>
          <div className="flex gap-1.5 flex-shrink-0">
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1', status.color)}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', platformColor)}>
              {platform}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          {timeStr}
          {attendees.length > 0 && ` · ${attendees.length} participant${attendees.length !== 1 ? 's' : ''}`}
          {meeting.duration_seconds && ` · ${Math.round(meeting.duration_seconds / 60)} min`}
        </p>
      </div>
    </Link>
  )
}
