// apps/web/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDistanceToNow, isToday, format } from 'date-fns'
import { MeetingCard } from '@/components/meetings/MeetingCard'
import { ActionRow } from '@/components/actions/ActionRow'
import { StatCard } from '@/components/ui/StatCard'
import { ScheduleButton } from '@/components/meetings/ScheduleButton'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Fetch today's and upcoming meetings
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .eq('user_id', user.id)
    .gte('started_at', todayStart.toISOString())
    .order('started_at', { ascending: true })
    .limit(5)

  // Fetch open action items
  const { data: actions } = await supabase
    .from('action_items')
    .select('*, meetings(title)')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .order('due_date', { ascending: true })
    .limit(5)

  // Fetch stats
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { count: weekMeetings } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('started_at', weekAgo.toISOString())

  const { count: openActions } = await supabase
    .from('action_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'open')

  const { data: hoursData } = await supabase
    .from('meetings')
    .select('duration_seconds')
    .eq('user_id', user.id)
    .gte('started_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const hoursRecorded = hoursData
    ? Math.round(hoursData.reduce((acc, m) => acc + (m.duration_seconds ?? 0), 0) / 360) / 10
    : 0

  const { count: summariesSent } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">{greeting}, {firstName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <ScheduleButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Meetings this week" value={weekMeetings ?? 0} sub={`${meetings?.filter(m => isToday(new Date(m.started_at!))).length ?? 0} today`} />
        <StatCard label="Open action items" value={openActions ?? 0} sub="across all meetings" />
        <StatCard label="Hours recorded" value={hoursRecorded} sub="this month" />
        <StatCard label="Summaries sent" value={summariesSent ?? 0} sub="all time" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Today's meetings</h2>
            <a href="/dashboard/meetings" className="text-xs text-brand-600 hover:underline">See all</a>
          </div>
          <div className="space-y-2">
            {meetings?.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                No meetings scheduled today
              </p>
            )}
            {meetings?.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Action items</h2>
            <a href="/dashboard/actions" className="text-xs text-brand-600 hover:underline">View all {openActions}</a>
          </div>
          <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
            {actions?.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No open action items</p>
            )}
            {actions?.map(action => (
              <ActionRow key={action.id} action={action} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
