'use client'
// components/meetings/MeetingDocument.tsx
// Renders the smart document (4C) — merged notes + transcript + AI analysis.
// Used on /dashboard/meetings/[id]/document.

import type { DocumentResult } from '@imisi/ai/analyse'
import type { ActionItem } from '@/types/database'

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-gray-50 text-gray-500 border-gray-100',
}

interface MeetingDocumentProps {
  document: DocumentResult
  actions: ActionItem[]
  meetingTitle: string
  date: string
  durationMin: number | null
  speakers: string[]
}

export function MeetingDocument({
  document: doc,
  actions,
  meetingTitle,
  date,
  durationMin,
  speakers,
}: MeetingDocumentProps) {
  return (
    <article className="space-y-6">
      {/* Document header */}
      <div className="bg-surface-card border border-gray-100/80 rounded-2xl p-6 shadow-card">
        <h1 className="text-xl font-semibold tracking-tight mb-2">{doc.title || meetingTitle}</h1>
        <p className="text-sm text-gray-400">
          {date}
          {durationMin && ` · ${durationMin} min`}
          {speakers.length > 0 && ` · ${speakers.join(', ')}`}
        </p>
        {doc.tldr && (
          <p className="mt-4 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
            {doc.tldr}
          </p>
        )}
      </div>

      {/* Document sections from Claude */}
      {doc.sections?.map((section) => {
        if (section.heading === 'Your Notes') {
          const lines = Array.isArray(section.content) ? section.content : [section.content as string]
          return (
            <div key={section.heading} className="bg-surface-card border border-gray-100/80 rounded-2xl overflow-hidden shadow-card">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-medium">Your Notes</h2>
              </div>
              <div className="p-5 space-y-2">
                {lines.map((line, i) => {
                  // Lines may have leading "[MM:SS] " timestamp prefix
                  const match = line.match(/^\[(\d+:\d+)\]\s*(.*)/)
                  if (match) {
                    return (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="font-mono text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">
                          {match[1]}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed">{match[2]}</p>
                      </div>
                    )
                  }
                  return <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
                })}
              </div>
            </div>
          )
        }

        const items = Array.isArray(section.content) ? section.content : null
        const paragraph = typeof section.content === 'string' ? section.content : null

        return (
          <div key={section.heading} className="bg-surface-card border border-gray-100/80 rounded-2xl overflow-hidden shadow-card">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium">{section.heading}</h2>
            </div>
            <div className="p-5">
              {paragraph && (
                <p className="text-sm text-gray-700 leading-relaxed">{paragraph}</p>
              )}
              {items && (
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1 h-1 rounded-full bg-brand-400 flex-shrink-0 mt-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )
      })}

      {/* Action items */}
      {actions.length > 0 && (
        <div className="bg-surface-card border border-gray-100/80 rounded-2xl overflow-hidden shadow-card">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium">Action Items</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {actions.map((action) => (
              <div key={action.id} className="flex items-start gap-3 px-5 py-3">
                <input
                  type="checkbox"
                  defaultChecked={action.status === 'done'}
                  readOnly
                  className="mt-0.5 rounded border-gray-300 text-brand-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{action.text}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {action.assignee_name && (
                      <span className="text-[11px] text-gray-400">{action.assignee_name}</span>
                    )}
                    {action.due_date && (
                      <span className="text-[11px] text-gray-400">due {action.due_date}</span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] border px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${PRIORITY_BADGE[action.priority]}`}>
                  {action.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
