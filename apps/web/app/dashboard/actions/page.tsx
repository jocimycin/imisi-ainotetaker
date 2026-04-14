// apps/web/app/dashboard/actions/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ActionRow } from '@/components/actions/ActionRow'

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let query = supabase
    .from('action_items')
    .select('*, meetings(title, id)')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(100)

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  if (searchParams.priority) {
    query = query.eq('priority', searchParams.priority)
  }

  const { data: actions } = await query

  const open   = actions?.filter((a) => a.status === 'open') ?? []
  const inProg = actions?.filter((a) => a.status === 'in_progress') ?? []
  const done   = actions?.filter((a) => a.status === 'done') ?? []

  const overdue = open.filter(
    (a) => a.due_date && new Date(a.due_date) < new Date()
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Action items</h1>
        <div className="flex gap-3 text-xs text-gray-400">
          <span>{open.length} open</span>
          <span>{inProg.length} in progress</span>
          <span>{done.length} done</span>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-red-100">
            <h2 className="text-xs font-medium text-red-700 uppercase tracking-wider">
              Overdue ({overdue.length})
            </h2>
          </div>
          <div className="divide-y divide-red-50">
            {overdue.map((action) => (
              <ActionRow key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {open.filter((a) => !overdue.includes(a)).length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Open</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {open
              .filter((a) => !overdue.includes(a))
              .map((action) => (
                <ActionRow key={action.id} action={action} />
              ))}
          </div>
        </div>
      )}

      {inProg.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">In progress</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {inProg.map((action) => (
              <ActionRow key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden opacity-60">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Done ({done.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {done.map((action) => (
              <ActionRow key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {(actions?.length ?? 0) === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">No action items yet</p>
          <p className="text-gray-300 text-xs mt-1">Imisi will extract tasks automatically after each meeting</p>
        </div>
      )}
    </div>
  )
}
