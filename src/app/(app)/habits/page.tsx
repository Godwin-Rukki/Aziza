export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center" style={{ minHeight: '60vh' }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#C8852A" strokeWidth="1.2" opacity="0.3" className="mb-5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
      <h1 style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.5rem', color: '#F0E8D8', marginBottom: '0.5rem' }}>
        Habits
      </h1>
      <p style={{ color: '#6A5840', fontSize: '0.875rem', maxWidth: 260, lineHeight: 1.6 }}>
        Reading streaks, session time, and daily goals — coming soon.
      </p>
    </div>
  )
}
