// apps/web/app/dashboard/meetings/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { TranscriptViewer } from '@/components/transcript/TranscriptViewer'
import { LiveTranscriptPanel } from '@/components/transcript/LiveTranscriptPanel'
import { SummaryPanel } from '@/components/meetings/SummaryPanel'
import { ActionBoard } from '@/components/actions/ActionBoard'
import { AskImisi } from '@/components/meetings/AskImisi'
import { MeetingNotesEditor } from '@/components/notes/MeetingNotesEditor'

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
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

  const [{ data: transcript }, { data: summary }, { data: actions }] = await Promise.all([
    supabase.from('transcripts').select('*').eq('meeting_id', params.id).single(),
    supabase.from('summaries').select('*').eq('meeting_id', params.id).single(),
    supabase.from('action_items').select('*').eq('meeting_id', params.id).order('created_at'),
  ])

  const attendees = (meeting.attendees as Array<{ name: string; email?: string }>) ?? []
  const durationMin = meeting.duration_seconds ? Math.round(meeting.duration_seconds / 60) : null
  const isLive = meeting.status === 'live'

  // Tabs — Document tab only appears once a summary exists
  const tabs = [
    ...(summary?.document_json
      ? [{ label: 'Document', href: `/dashboard/meetings/${params.id}/document` }]
      : []),
    { label: 'Transcript', href: `/dashboard/meetings/${params.id}`, active: true },
    { label: 'Actions', href: `#actions` },
    { label: 'Ask Imisi', href: `#ask` },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
              <a href="/dashboard/meetings" className="hover:text-gray-600 transition-colors">Meetings</a>
              <span className="text-gray-200">/</span>
              <span className="text-gray-500 truncate max-w-xs">{meeting.title}</span>
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{meeting.title ?? 'Untitled meeting'}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {meeting.started_at && format(new Date(meeting.started_at), 'EEEE d MMMM yyyy, h:mm a')}
              {durationMin && ` · ${durationMin} min`}
              {attendees.length > 0 && ` · ${attendees.length} participants`}
              {' · '}
              <span className="capitalize">{meeting.platform}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                Live
              </span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize
              ${meeting.status === 'complete' ? 'bg-gray-100 text-gray-500' :
                meeting.status === 'live' ? 'bg-teal-50 text-teal-700' :
                'bg-brand-50 text-brand-700'}`}>
              {meeting.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {tabs.map((tab) => (
          <a
            key={tab.label}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              (tab as any).active
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Live two-panel layout (4A + 4B) */}
      {isLive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-[480px]">
            <LiveTranscriptPanel meetingId={params.id} />
          </div>
          <div className="border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-[480px]">
            <MeetingNotesEditor meetingId={params.id} startedAt={meeting.started_at} />
          </div>
        </div>
      )}

      {/* Post-meeting content */}
      {!isLive && (
        <>
          {summary && (
            <SummaryPanel summary={summary} />
          )}

          {actions && actions.length > 0 && (
            <div id="actions">
              <ActionBoard actions={actions} />
            </div>
          )}

          {transcript && (
            <div id="ask">
              <AskImisi meetingId={meeting.id} />
              <TranscriptViewer transcript={transcript} />
            </div>
          )}
        </>
      )}

      {/* Status banners */}
      {meeting.status === 'processing' && (
        <div className="border border-amber-100 bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
          Imisi is processing this meeting. Summary and transcript will appear shortly.
        </div>
      )}

      {meeting.status === 'scheduled' && (
        <div className="border border-brand-100 bg-brand-50 rounded-xl p-4 text-sm text-brand-700">
          Imisi will join this meeting automatically. You can cancel bot attendance in settings.
        </div>
      )}
    </div>
  )
}
