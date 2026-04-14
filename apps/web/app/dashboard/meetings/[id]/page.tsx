// apps/web/app/dashboard/meetings/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { TranscriptViewer } from '@/components/transcript/TranscriptViewer'
import { SummaryPanel } from '@/components/meetings/SummaryPanel'
import { ActionBoard } from '@/components/actions/ActionBoard'
import { AskImisi } from '@/components/meetings/AskImisi'

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">
              <a href="/dashboard/meetings" className="hover:underline">Meetings</a>
              {' / '}
              {meeting.title}
            </p>
            <h1 className="text-xl font-medium">{meeting.title ?? 'Untitled meeting'}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {meeting.started_at && format(new Date(meeting.started_at), 'EEEE d MMMM yyyy, h:mm a')}
              {durationMin && ` · ${durationMin} min`}
              {attendees.length > 0 && ` · ${attendees.length} participants`}
              {' · '}
              <span className="capitalize">{meeting.platform}</span>
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize
            ${meeting.status === 'complete' ? 'bg-gray-100 text-gray-500' :
              meeting.status === 'live' ? 'bg-teal-50 text-teal-700' :
              'bg-brand-50 text-brand-700'}`}>
            {meeting.status}
          </span>
        </div>
      </div>

      {summary && (
        <SummaryPanel summary={summary} />
      )}

      {actions && actions.length > 0 && (
        <ActionBoard actions={actions} />
      )}

      {transcript && (
        <>
          <AskImisi meetingId={meeting.id} />
          <TranscriptViewer transcript={transcript} />
        </>
      )}

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
