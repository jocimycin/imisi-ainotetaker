'use client'
// components/actions/ActionRow.tsx
import { useState } from 'react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import type { ActionItem } from '@/types/database'

const PRIORITY_COLORS = {
  high:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low:    'bg-gray-100 text-gray-500',
}

interface ActionRowProps {
  action: ActionItem & { meetings?: { title: string | null } | null }
}

export function ActionRow({ action }: ActionRowProps) {
  const [done, setDone] = useState(action.status === 'done')
  const supabase = createClient()

  async function toggleDone() {
    const newStatus = done ? 'open' : 'done'
    setDone(!done)
    await supabase
      .from('action_items')
      .update({ status: newStatus })
      .eq('id', action.id)
  }

  const isOverdue =
    !done && action.due_date && new Date(action.due_date) < new Date()

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <button
        onClick={toggleDone}
        className={clsx(
          'w-4 h-4 rounded border flex-shrink-0 mt-0.5 transition-colors flex items-center justify-center',
          done
            ? 'bg-teal-500 border-teal-500'
            : 'border-gray-300 hover:border-brand-400'
        )}
      >
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={clsx('text-sm leading-snug', done ? 'line-through text-gray-400' : 'text-gray-800')}>
          {action.text}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {action.meetings?.title && (
            <span className="text-xs text-gray-400 truncate">{action.meetings.title}</span>
          )}
          {action.due_date && (
            <span className={clsx('text-xs', isOverdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
              {isOverdue ? 'Overdue · ' : ''}
              {new Date(action.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', PRIORITY_COLORS[action.priority])}>
            {action.priority}
          </span>
        </div>
      </div>
    </div>
  )
}
