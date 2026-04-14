'use client'
// components/meetings/AskImisi.tsx
import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED = [
  'What were the main decisions made?',
  'Who has action items from this meeting?',
  'What was agreed about the timeline?',
]

export function AskImisi({ meetingId }: { meetingId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function ask(question: string) {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      const res = await fetch(`/api/meetings/${meetingId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer ?? 'No answer found.' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center">
          <span className="text-brand-700 text-xs font-medium">I</span>
        </div>
        <h2 className="text-sm font-medium">Ask Imisi</h2>
        <span className="text-xs text-gray-400">Ask anything about this meeting</span>
      </div>

      {messages.length === 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-full text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`text-sm rounded-xl px-3 py-2 max-w-[80%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-3 py-2">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder="Ask about this meeting..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-300"
          disabled={loading}
        />
        <button
          onClick={() => ask(input)}
          disabled={!input.trim() || loading}
          className="text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          Ask
        </button>
      </div>
    </div>
  )
}
