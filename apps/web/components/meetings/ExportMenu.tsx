'use client'
// components/meetings/ExportMenu.tsx
// Export dropdown on the MeetingDocument page (4E).
// Supports Markdown download and clipboard copy.

import { useState } from 'react'
import type { DocumentResult } from '@imisi/ai/analyse'

interface ExportMenuProps {
  document: DocumentResult
  meetingTitle: string
}

function toMarkdown(doc: DocumentResult, meetingTitle: string): string {
  const lines: string[] = [`# ${doc.title || meetingTitle}`, '']

  if (doc.tldr) {
    lines.push(doc.tldr, '')
  }

  for (const section of doc.sections ?? []) {
    lines.push(`## ${section.heading}`, '')
    if (Array.isArray(section.content)) {
      for (const item of section.content) {
        lines.push(`- ${item}`)
      }
    } else {
      lines.push(section.content as string)
    }
    lines.push('')
  }

  if (doc.action_items?.length > 0) {
    lines.push('## Action Items', '')
    for (const item of doc.action_items) {
      const owner = item.assignee_name ? ` (${item.assignee_name})` : ''
      const due = item.due_date ? ` — due ${item.due_date}` : ''
      lines.push(`- [ ] ${item.text}${owner}${due}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function ExportMenu({ document: doc, meetingTitle }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const markdown = toMarkdown(doc, meetingTitle)

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 hover:text-gray-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Menu */}
          <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden py-1">
            <button
              onClick={downloadMarkdown}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download .md
            </button>
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Copy as Markdown'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
