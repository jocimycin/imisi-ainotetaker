'use client'
// components/notes/MeetingNotesEditor.tsx
// Timestamped notes editor for live meetings.
// Auto-saves with 800ms debounce. Cmd+Enter inserts a new timestamped block.

import { useCallback, useEffect, useRef, useState } from 'react'
import { NoteTimestamp } from './NoteTimestamp'

interface NoteEntry {
  text: string
  meeting_ms: number | null
  sort_order: number
}

interface MeetingNotesEditorProps {
  meetingId: string
  /** ISO string of when the meeting started — used to compute meeting-relative timestamps */
  startedAt: string | null
}

const SAVE_DEBOUNCE_MS = 800

function getMeetingMs(startedAt: string | null): number | null {
  if (!startedAt) return null
  return Date.now() - new Date(startedAt).getTime()
}

export function MeetingNotesEditor({ meetingId, startedAt }: MeetingNotesEditorProps) {
  const [entries, setEntries] = useState<NoteEntry[]>([])
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing notes on mount
  useEffect(() => {
    fetch(`/api/meetings/${meetingId}/notes`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.note_entries && data.note_entries.length > 0) {
          setEntries(
            [...data.note_entries].sort((a: NoteEntry, b: NoteEntry) => a.sort_order - b.sort_order)
          )
        } else {
          // Start with one blank entry
          setEntries([{ text: '', meeting_ms: getMeetingMs(startedAt), sort_order: 0 }])
        }
        setLoaded(true)
      })
      .catch(() => {
        setEntries([{ text: '', meeting_ms: getMeetingMs(startedAt), sort_order: 0 }])
        setLoaded(true)
      })
  }, [meetingId, startedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback((nextEntries: NoteEntry[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving('saving')
      try {
        const content = nextEntries.map((e) => e.text).join('\n\n')
        await fetch(`/api/meetings/${meetingId}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, entries: nextEntries }),
        })
        setSaving('saved')
        setTimeout(() => setSaving('idle'), 1500)
      } catch {
        setSaving('error')
      }
    }, SAVE_DEBOUNCE_MS)
  }, [meetingId])

  const updateEntry = (index: number, text: string) => {
    const next = entries.map((e, i) => (i === index ? { ...e, text } : e))
    setEntries(next)
    save(next)
  }

  const addEntry = (afterIndex: number) => {
    const newEntry: NoteEntry = {
      text: '',
      meeting_ms: getMeetingMs(startedAt),
      sort_order: afterIndex + 1,
    }
    const next = [
      ...entries.slice(0, afterIndex + 1),
      newEntry,
      ...entries.slice(afterIndex + 1).map((e) => ({ ...e, sort_order: e.sort_order + 1 })),
    ]
    setEntries(next)
    // Focus the new textarea on next tick
    setTimeout(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('[data-note-entry]')
      textareas[afterIndex + 1]?.focus()
    }, 10)
    save(next)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      addEntry(index)
    }
    // Auto-grow textarea
    const ta = e.currentTarget
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }

  if (!loaded) {
    return (
      <div className="p-4 text-sm text-gray-400">Loading notes…</div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium">Your Notes</h2>
        <div className="flex items-center gap-2">
          {saving === 'saving' && (
            <span className="text-[11px] text-gray-400">Saving…</span>
          )}
          {saving === 'saved' && (
            <span className="text-[11px] text-teal-500">Saved</span>
          )}
          {saving === 'error' && (
            <span className="text-[11px] text-red-400">Save failed</span>
          )}
          <span className="text-[11px] text-gray-300">⌘ + ↵ new entry</span>
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {entries.map((entry, i) => (
          <div key={i} className="flex flex-col gap-1 px-4 py-3">
            <NoteTimestamp meetingMs={entry.meeting_ms} />
            <textarea
              data-note-entry
              value={entry.text}
              onChange={(e) => updateEntry(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder="Type a note…"
              rows={1}
              className="w-full resize-none text-sm text-gray-700 placeholder:text-gray-300 bg-transparent focus:outline-none leading-relaxed overflow-hidden"
              style={{ height: 'auto', minHeight: '1.5rem' }}
              onInput={(e) => {
                const ta = e.currentTarget
                ta.style.height = 'auto'
                ta.style.height = `${ta.scrollHeight}px`
              }}
            />
          </div>
        ))}
      </div>

      {/* Add entry button */}
      <div className="px-4 py-2 border-t border-gray-100">
        <button
          onClick={() => addEntry(entries.length - 1)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          + Add note
        </button>
      </div>
    </div>
  )
}
