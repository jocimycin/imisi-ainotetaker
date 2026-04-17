// components/ui/StatCard.tsx
interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="bg-surface-card rounded-2xl p-4 shadow-card border border-gray-100/80">
      <p className="text-xs text-gray-400 font-medium mb-2.5 tracking-wide">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight leading-none ${accent ? 'text-brand-600' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}
