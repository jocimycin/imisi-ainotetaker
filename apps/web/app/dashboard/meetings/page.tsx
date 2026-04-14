// apps/web/app/dashboard/meetings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MeetingCard } from '@/components/meetings/MeetingCard'
import { ScheduleButton } from '@/components/meetings/ScheduleButton'

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let query = supabase
    .from('meetings')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(50)

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  const { data: meetings } = await query

  const filtered = searchParams.q
    ? meetings?.filter((m) =>
        m.title?.toLowerCase().includes(searchParams.q!.toLowerCase())
      )
    : meetings

  const STATUS_TABS = ['all', 'live', 'complete', 'scheduled', 'processing', 'failed']

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Meetings</h1>
        <ScheduleButton />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <a
              key={tab}
              href={`/dashboard/meetings${tab !== 'all' ? `?status=${tab}` : ''}`}
              className={`text-xs px-3 py-1.5 rounded-md capitalize transition-colors ${
                (searchParams.status ?? 'all') === tab
                  ? 'bg-white text-gray-900 font-medium shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </a>
          ))}
        </div>

        <form className="flex-1 min-w-[200px]">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search meetings..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-300"
          />
        </form>
      </div>

      <div className="space-y-2">
        {filtered?.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 text-sm">No meetings found</p>
            <p className="text-gray-300 text-xs mt-1">Schedule Imisi to join your next meeting</p>
          </div>
        )}
        {filtered?.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </div>
  )
}
