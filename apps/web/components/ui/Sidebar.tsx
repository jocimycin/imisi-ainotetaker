'use client'
// components/ui/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const NAV = [
  { href: '/dashboard',             label: 'Dashboard' },
  { href: '/dashboard/meetings',    label: 'Meetings' },
  { href: '/dashboard/transcripts', label: 'Transcripts' },
  { href: '/dashboard/actions',     label: 'Action items' },
  { href: '/dashboard/summaries',   label: 'Summaries' },
  { href: '/dashboard/settings',    label: 'Settings' },
]

interface SidebarProps {
  user: { full_name?: string | null; email?: string | null; plan?: string | null } | null
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ user, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside
      className={clsx(
        // Desktop: always visible, relative in flow
        'lg:relative lg:translate-x-0 lg:flex lg:flex-col lg:w-52 lg:flex-shrink-0',
        // Mobile: fixed drawer
        'fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-gray-50 border-r border-gray-100 min-h-screen',
        'transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-base font-medium tracking-tight">Imisi</div>
          <div className="text-xs text-gray-400 mt-0.5">meeting intelligence</div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
          aria-label="Close menu"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
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
              onClick={onClose}
              className={clsx(
                'flex items-center gap-2.5 px-4 py-2 text-sm transition-colors',
                active
                  ? 'text-gray-900 font-medium bg-white border-r-2 border-brand-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', active ? 'bg-brand-600' : 'bg-gray-300')} />
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
