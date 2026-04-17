'use client'
// apps/web/app/auth/login/page.tsx
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
      },
    })
  }

  async function signInWithMicrosoft() {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid email profile Calendars.Read',
      },
    })
  }

  return (
    <div className="min-h-screen bg-sidebar-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 mb-4 shadow-lg">
            <svg width="22" height="18" viewBox="0 0 12 10" fill="none">
              <path d="M1 5c0-2.21 2.24-4 5-4s5 1.79 5 4-2.24 4-5 4a5.4 5.4 0 0 1-2-.38L1 9.5V7.2A3.9 3.9 0 0 1 1 5Z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Imisi</h1>
          <p className="text-sm text-sidebar-nav mt-1">Your meeting intelligence assistant</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3 backdrop-blur-sm">
          <h2 className="text-sm font-medium text-center text-white/80 mb-4">Sign in to continue</h2>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-white/20 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={signInWithMicrosoft}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Continue with Microsoft
          </button>
        </div>

        <p className="text-center text-xs text-sidebar-text mt-5">
          By signing in you agree to Imisi&apos;s terms of service.
        </p>
      </div>
    </div>
  )
}
