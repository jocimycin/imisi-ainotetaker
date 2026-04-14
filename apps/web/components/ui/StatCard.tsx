// components/ui/StatCard.tsx
interface StatCardProps {
  label: string
  value: number | string
  sub?: string
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-gray-100 rounded-lg p-3.5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-medium text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
