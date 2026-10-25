'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  {
    href: '/app',
    label: 'Library',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
  },
  {
    href: '/app/reader',
    label: 'Now Playing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="12" cy="12" r="2"/>
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      </svg>
    ),
  },
  {
    href: '/app/comics',
    label: 'Comics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <rect x="2" y="2" width="9" height="9" rx="1.5"/>
        <rect x="13" y="2" width="9" height="9" rx="1.5"/>
        <rect x="2" y="13" width="9" height="9" rx="1.5"/>
        <rect x="13" y="13" width="9" height="9" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/app/habits',
    label: 'Habits',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    href: '/app/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
]

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = email[0].toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0C0B09' }}>
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r" style={{ background: '#131210', borderColor: '#2E2820' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b" style={{ borderColor: '#2E2820' }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 animate-glow-pulse relative overflow-hidden"
            style={{ background: '#C8852A', color: '#0C0B09', fontFamily: "'Yeseva One', serif" }}
          >
            A
            <span className="absolute top-0 left-0 h-full w-[30%] bg-white/10 rotate-[25deg] translate-x-[-50%]" />
          </div>
          <div className="font-bold text-base tracking-wide" style={{ color: '#F0E8D8', fontFamily: "'Yeseva One', serif" }}>Aziza</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: active ? 'rgba(200,133,42,0.12)' : 'transparent',
                  color: active ? '#E09A40' : '#A8947C',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-t" style={{ borderColor: '#2E2820' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: '#2C4A30', color: '#4A8050' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#F0E8D8' }}>
              {email.split('@')[0]}
            </div>
            <div className="text-[0.68rem] truncate" style={{ color: '#6A5840' }}>{email}</div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ color: '#6A5840' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t z-50"
        style={{ background: '#131210', borderColor: '#2E2820' }}
      >
        <div className="flex justify-around py-2">
          {NAV.map(item => {
            const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-4 py-1 text-[0.6rem] uppercase tracking-[0.08em] transition-colors"
                style={{ color: active ? '#C8852A' : '#6A5840' }}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
