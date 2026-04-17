'use client'
// components/ui/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1 8.5L7.5 2 14 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.5 7v6.5h4V10h2v3.5h4V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/meetings',
    label: 'Meetings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M5 1v2M10 1v2M1 6.5h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/transcripts',
    label: 'Transcripts',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M3 3.5h9M3 6.5h9M3 9.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <rect x="1" y="1" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/actions',
    label: 'Action items',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1.5 4.5L3.5 6.5 6.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1.5 9.5l2 2 3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 5h5M9 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/summaries',
    label: 'Summaries',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1L9.5 5.5H14L10.5 8.5 11.5 13 7.5 10.5 3.5 13 4.5 8.5 1 5.5H5.5L7.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.4 3.4l.7.7M10.9 10.9l.7.7M10.9 4.1l-.7.7M4.1 10.9l-.7.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
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
        'flex flex-col bg-sidebar-bg border-r border-sidebar-border min-h-screen',
        // Desktop: always visible, relative in flow
        'lg:relative lg:translate-x-0 lg:w-52 lg:flex-shrink-0',
        // Mobile: fixed drawer
        'fixed inset-y-0 left-0 z-40 w-64',
        'transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5c0-2.21 2.24-4 5-4s5 1.79 5 4-2.24 4-5 4a5.4 5.4 0 0 1-2-.38L1 9.5V7.2A3.9 3.9 0 0 1 1 5Z" fill="white"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Imisi</span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden w-6 h-6 flex items-center justify-center rounded text-sidebar-text hover:text-white"
          aria-label="Close menu"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2">
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
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5',
                active
                  ? 'bg-sidebar-navActiveBg text-sidebar-navActive font-medium'
                  : 'text-sidebar-nav hover:text-white hover:bg-white/5'
              )}
            >
              <span className={clsx('flex-shrink-0', active ? 'text-white' : 'text-sidebar-text')}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-600/40 flex items-center justify-center text-xs font-semibold text-brand-200 flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.full_name ?? 'User'}</p>
            <p className="text-xs text-sidebar-text capitalize">{user?.plan ?? 'free'} plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
