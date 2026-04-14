'use client'
// components/ui/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const NAV = [
  { href: '/dashboard',            label: 'Dashboard' },
  { href: '/dashboard/meetings',   label: 'Meetings' },
  { href: '/dashboard/transcripts',label: 'Transcripts' },
  { href: '/dashboard/actions',    label: 'Action items' },
  { href: '/dashboard/summaries',  label: 'Summaries' },
  { href: '/dashboard/settings',   label: 'Settings' },
]

interface SidebarProps {
  user: { full_name?: string | null; email?: string | null; plan?: string | null } | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className="w-52 flex-shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col min-h-screen">
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="text-base font-medium tracking-tight">Imisi</div>
        <div className="text-xs text-gray-400 mt-0.5">meeting intelligence</div>
      </div>

      <nav className="flex-1 py-2">
        {NAV.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 px-4 py-2 text-sm transition-colors',
                active
                  ? 'text-gray-900 font-medium bg-white border-r-2 border-brand-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              <span
                className={clsx(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  active ? 'bg-brand-600' : 'bg-gray-300'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-xs font-medium text-brand-800 flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{user?.full_name ?? 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.plan ?? 'free'} plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
