// apps/web/app/dashboard/transcripts/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function TranscriptsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('transcripts')
    .select(`
      id,
      word_count,
      language,
      created_at,
      meetings (id, title, started_at, platform, duration_seconds, status)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const transcripts = data ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Transcripts</h1>
        <span className="text-xs text-gray-400">{transcripts.length} transcripts</span>
      </div>

      {transcripts.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">No transcripts yet</p>
          <p className="text-gray-300 text-xs mt-1">Transcripts are generated automatically after each meeting ends</p>
        </div>
      )}

      <div className="space-y-2">
        {transcripts.map((t) => {
          const meeting = t.meetings as {
            id: string
            title: string | null
            started_at: string | null
            platform: string
            duration_seconds: number | null
            status: string
          } | null
          const durationMin = meeting?.duration_seconds
            ? Math.round(meeting.duration_seconds / 60)
            : null

          return (
            <Link key={t.id} href={`/dashboard/meetings/${meeting?.id}`}>
              <div className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {meeting?.title ?? 'Untitled meeting'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {meeting?.started_at &&
                        format(new Date(meeting.started_at), 'EEE d MMM yyyy, h:mm a')}
                      {durationMin && ` · ${durationMin} min`}
                      {' · '}
                      <span className="capitalize">{meeting?.platform}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.word_count && (
                      <span className="text-xs text-gray-400">
                        {t.word_count.toLocaleString()} words
                      </span>
                    )}
                    {t.language && t.language !== 'en' && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase">
                        {t.language}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
