'use client'
// components/ui/MobileHeader.tsx
interface MobileHeaderProps {
  onMenuClick: () => void
  userInitials: string
}

export function MobileHeader({ onMenuClick, userInitials }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 lg:hidden">
      <button
        onClick={onMenuClick}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      <span className="text-base font-medium tracking-tight">Imisi</span>

      <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-xs font-medium text-brand-800">
        {userInitials}
      </div>
    </header>
  )
}
