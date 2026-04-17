// apps/web/app/dashboard/summaries/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

export default async function SummariesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('summaries')
    .select(`
      *,
      meetings (id, title, started_at, platform, duration_seconds)
    `)
    .order('created_at', { ascending: false })
    .limit(40)

  const summaries = data ?? []

  const SENTIMENT_COLORS: Record<string, string> = {
    positive: 'bg-teal-50 text-teal-700',
    neutral:  'bg-gray-100 text-gray-500',
    negative: 'bg-red-50 text-red-600',
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Summaries</h1>

      {summaries.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">No summaries yet</p>
          <p className="text-gray-300 text-xs mt-1">Summaries are generated automatically after each meeting</p>
        </div>
      )}

      <div className="space-y-3">
        {summaries.map((s) => {
          const meeting = s.meetings as { id: string; title: string | null; started_at: string | null; platform: string; duration_seconds: number | null } | null
          const keyPoints = (s.key_points as string[]) ?? []
          const durationMin = meeting?.duration_seconds ? Math.round(meeting.duration_seconds / 60) : null

          return (
            <a key={s.id} href={`/dashboard/meetings/${meeting?.id}`} className="block">
              <div className="bg-surface-card border border-gray-100/80 rounded-xl p-4 hover:shadow-card-hover hover:border-gray-200 transition-all shadow-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {meeting?.title ?? 'Untitled meeting'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {meeting?.started_at && format(new Date(meeting.started_at), 'EEE d MMM yyyy, h:mm a')}
                      {durationMin && ` · ${durationMin} min`}
                      {' · '}
                      <span className="capitalize">{meeting?.platform}</span>
                    </p>
                  </div>
                  {s.sentiment && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${SENTIMENT_COLORS[s.sentiment] ?? ''}`}>
                      {s.sentiment}
                    </span>
                  )}
                </div>

                {s.tldr && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-2 line-clamp-2">{s.tldr}</p>
                )}

                {keyPoints.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {keyPoints.slice(0, 3).map((kp, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md line-clamp-1 max-w-[200px]">
                        {kp}
                      </span>
                    ))}
                    {keyPoints.length > 3 && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-md">
                        +{keyPoints.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
