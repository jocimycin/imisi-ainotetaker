// app/dashboard/meetings/[id]/document/page.tsx
// Smart document page (4C) — shows the merged notes + transcript document.
// Falls back to "document not ready" if the pipeline hasn't produced document_json yet.

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { MeetingDocument } from '@/components/meetings/MeetingDocument'
import { ExportMenu } from '@/components/meetings/ExportMenu'
import type { DocumentResult } from '@imisi/ai/analyse'

export default async function MeetingDocumentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!meeting) notFound()

  const [{ data: summary }, { data: actions }] = await Promise.all([
    supabase.from('summaries').select('*').eq('meeting_id', params.id).single(),
    supabase.from('action_items').select('*').eq('meeting_id', params.id).order('created_at'),
  ])

  const durationMin = meeting.duration_seconds ? Math.round(meeting.duration_seconds / 60) : null
  const dateStr = meeting.started_at ? format(new Date(meeting.started_at), 'EEEE d MMMM yyyy, h:mm a') : ''
  const attendees = (meeting.attendees as Array<{ name: string }>) ?? []
  const speakerNames = attendees.map((a) => a.name)

  // Navigation tabs (shared across meeting detail sub-pages)
  const tabs = [
    { label: 'Document', href: `/dashboard/meetings/${params.id}/document`, active: true },
    { label: 'Transcript', href: `/dashboard/meetings/${params.id}`, active: false },
    { label: 'Actions', href: `/dashboard/meetings/${params.id}#actions`, active: false },
    { label: 'Ask Imisi', href: `/dashboard/meetings/${params.id}#ask`, active: false },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
          <a href="/dashboard/meetings" className="hover:text-gray-600 transition-colors">Meetings</a>
          <span className="text-gray-200">/</span>
          <a href={`/dashboard/meetings/${params.id}`} className="hover:text-gray-600 transition-colors truncate max-w-xs">
            {meeting.title ?? 'Untitled meeting'}
          </a>
          <span className="text-gray-200">/</span>
          <span className="text-gray-500">Document</span>
        </p>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{meeting.title ?? 'Untitled meeting'}</h1>
          {summary?.document_json && (
            <ExportMenu document={summary.document_json as unknown as DocumentResult} meetingTitle={meeting.title ?? 'Meeting'} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {tabs.map((tab) => (
          <a
            key={tab.label}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab.active
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Document content */}
      {summary?.document_json ? (
        <MeetingDocument
          document={summary.document_json as unknown as DocumentResult}
          actions={actions ?? []}
          meetingTitle={meeting.title ?? 'Untitled meeting'}
          date={dateStr}
          durationMin={durationMin}
          speakers={speakerNames}
        />
      ) : meeting.status === 'complete' && summary && !summary.document_json ? (
        /* Meeting complete but no user notes were taken — show standard summary */
        <div className="bg-surface-card border border-gray-100/80 rounded-2xl p-6 shadow-card space-y-4">
          <p className="text-sm text-gray-500">
            No meeting document — this meeting was processed without in-meeting notes.
            A smart document is generated when you take notes during the meeting.
          </p>
          {summary.tldr && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Summary</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{summary.tldr}</p>
            </div>
          )}
          <a href={`/dashboard/meetings/${params.id}`} className="inline-block text-sm text-brand-600 hover:underline">
            View full meeting details →
          </a>
        </div>
      ) : (
        <div className="border border-amber-100 bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
          {meeting.status === 'processing'
            ? 'Imisi is generating the meeting document. Check back in a moment.'
            : 'Document not yet available.'}
        </div>
      )}
    </div>
  )
}
