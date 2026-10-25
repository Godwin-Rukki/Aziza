'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/app` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/app')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#0C0B09] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#C8852A] rounded-xl flex items-center justify-center text-[#0C0B09] font-bold text-lg shadow-[0_2px_20px_rgba(200,133,42,0.3)]">
            A
          </div>
          <div>
            <div className="font-bold text-[#F0E8D8] text-lg tracking-wide">Aziza</div>
            <div className="text-[0.6rem] uppercase tracking-[0.14em] text-[#6A5840]">Knowledge lives here</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#F0E8D8] mb-1">Create account</h1>
        <p className="text-sm text-[#A8947C] mb-8">Your library, your voice</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#A8947C] mb-1.5 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#1C1915] border border-[#2E2820] rounded-xl px-4 py-3 text-[#F0E8D8] text-sm placeholder:text-[#6A5840] focus:outline-none focus:border-[#C8852A] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8947C] mb-1.5 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#1C1915] border border-[#2E2820] rounded-xl px-4 py-3 text-[#F0E8D8] text-sm placeholder:text-[#6A5840] focus:outline-none focus:border-[#C8852A] transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A8947C] mb-1.5 uppercase tracking-wide">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full bg-[#1C1915] border border-[#2E2820] rounded-xl px-4 py-3 text-[#F0E8D8] text-sm placeholder:text-[#6A5840] focus:outline-none focus:border-[#C8852A] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-[#E07060] bg-[#1A0808] border border-[#3A1010] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8852A] hover:bg-[#E09A40] disabled:opacity-50 text-[#0C0B09] font-semibold rounded-xl py-3 text-sm transition-colors shadow-[0_2px_20px_rgba(200,133,42,0.2)]"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6A5840] mt-6">
          Already have one?{' '}
          <Link href="/login" className="text-[#C8852A] hover:text-[#E09A40] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
