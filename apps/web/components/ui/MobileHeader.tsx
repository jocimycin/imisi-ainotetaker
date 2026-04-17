'use client'
// components/ui/MobileHeader.tsx
interface MobileHeaderProps {
  onMenuClick: () => void
  userInitials: string
}

export function MobileHeader({ onMenuClick, userInitials }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-sidebar-bg border-b border-sidebar-border lg:hidden">
      <button
        onClick={onMenuClick}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sidebar-nav hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Open menu"
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M1 1h14M1 6h14M1 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-brand-600 flex items-center justify-center">
          <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
            <path d="M1 5c0-2.21 2.24-4 5-4s5 1.79 5 4-2.24 4-5 4a5.4 5.4 0 0 1-2-.38L1 9.5V7.2A3.9 3.9 0 0 1 1 5Z" fill="white"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">Imisi</span>
      </div>

      <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-600/40 flex items-center justify-center text-xs font-semibold text-brand-200">
        {userInitials}
      </div>
    </header>
  )
}
