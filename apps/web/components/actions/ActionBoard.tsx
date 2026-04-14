// components/actions/ActionBoard.tsx
import type { ActionItem } from '@/types/database'
import { ActionRow } from './ActionRow'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export function ActionBoard({ actions }: { actions: ActionItem[] }) {
  const sorted = [...actions].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  )
  const open = sorted.filter((a) => a.status !== 'done')
  const done = sorted.filter((a) => a.status === 'done')

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium">Action items</h2>
        <span className="text-xs text-gray-400">
          {open.length} open · {done.length} done
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {open.map((action) => (
          <ActionRow key={action.id} action={action} />
        ))}
        {done.map((action) => (
          <ActionRow key={action.id} action={action} />
        ))}
        {actions.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No action items from this meeting</p>
        )}
      </div>
    </div>
  )
}
