// components/meetings/SummaryPanel.tsx
import type { Summary, Decision } from '@/types/database'

const SENTIMENT_CONFIG = {
  positive: { label: 'Positive', color: 'bg-teal-50 text-teal-700' },
  neutral:  { label: 'Neutral',  color: 'bg-gray-100 text-gray-500' },
  negative: { label: 'Negative', color: 'bg-red-50 text-red-600' },
}

export function SummaryPanel({ summary }: { summary: Summary }) {
  const sentiment = summary.sentiment
    ? SENTIMENT_CONFIG[summary.sentiment]
    : null
  const keyPoints = (summary.key_points as string[]) ?? []
  const decisions = (summary.decisions as Decision[]) ?? []

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium">Summary</h2>
        {sentiment && (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${sentiment.color}`}>
            {sentiment.label} tone
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {summary.tldr && (
          <p className="text-sm text-gray-700 leading-relaxed">{summary.tldr}</p>
        )}

        {keyPoints.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Key points</h3>
            <ul className="space-y-1.5">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-1 h-1 rounded-full bg-brand-400 flex-shrink-0 mt-2" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {decisions.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Decisions made</h3>
            <div className="space-y-2">
              {decisions.map((d, i) => (
                <div key={i} className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium text-teal-800">{d.decision}</p>
                  {d.context && (
                    <p className="text-xs text-teal-600 mt-0.5">{d.context}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
