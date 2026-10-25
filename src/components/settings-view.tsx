'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearAllBookFiles } from '@/lib/idb'

const VOICES = [
  { id: 'af_heart',   label: '♀ Heart'   },
  { id: 'af_bella',   label: '♀ Bella'   },
  { id: 'af_sarah',   label: '♀ Sarah'   },
  { id: 'am_adam',    label: '♂ Adam'    },
  { id: 'am_michael', label: '♂ Michael' },
  { id: 'bf_emma',    label: '♀ Emma'    },
  { id: 'bm_george',  label: '♂ George'  },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="text-[0.68rem] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: '#6A5840' }}>
        {title}
      </div>
      <div className="rounded-2xl p-4" style={{ background: '#131210', border: '1px solid #2E2820' }}>
        {children}
      </div>
    </div>
  )
}

export function SettingsView({ email }: { email: string }) {
  const router  = useRouter()
  const [displayName, setDisplayNameState] = useState('')
  const [voice,       setVoiceState]       = useState('af_heart')
  const [fontSize,    setFontSizeState]    = useState('md')
  const [clearing,    setClearing]         = useState(false)
  const [nameSaved,   setNameSaved]        = useState(false)

  useEffect(() => {
    setDisplayNameState(localStorage.getItem('aziza_display_name') ?? '')
    setVoiceState(localStorage.getItem('aziza_default_voice') ?? 'af_heart')
    setFontSizeState(localStorage.getItem('aziza_font_size') ?? 'md')
  }, [])

  function saveDisplayName() {
    if (displayName.trim()) localStorage.setItem('aziza_display_name', displayName.trim())
    else localStorage.removeItem('aziza_display_name')
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  function setVoice(v: string) {
    setVoiceState(v)
    localStorage.setItem('aziza_default_voice', v)
  }

  function setFontSize(f: string) {
    setFontSizeState(f)
    localStorage.setItem('aziza_font_size', f)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function clearData() {
    if (!confirm('Delete all books and local data? This cannot be undone.')) return
    setClearing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('book_metadata').delete().eq('user_id', user.id)
      await clearAllBookFiles()
      localStorage.removeItem('aziza_streak_dates')
      router.push('/app')
    } catch {
      setClearing(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      <h1 className="mb-6" style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.5rem', color: '#F0E8D8' }}>
        Settings
      </h1>

      <Section title="Profile">
        <div className="mb-3">
          <label className="block text-xs mb-1.5" style={{ color: '#6A5840' }}>Display name</label>
          <div className="flex gap-2">
            <input
              value={displayName}
              onChange={e => setDisplayNameState(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
              placeholder={email.split('@')[0]}
              className="flex-1 px-3 py-2 rounded-xl text-sm"
              style={{ background: '#1C1915', border: '1px solid #2E2820', color: '#F0E8D8', outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = '#C8852A')}
              onBlur={e => (e.target.style.borderColor = '#2E2820')}
            />
            <button
              onClick={saveDisplayName}
              className="px-4 py-2 rounded-xl text-sm font-medium shrink-0"
              style={{ background: nameSaved ? 'rgba(74,128,80,0.15)' : 'rgba(200,133,42,0.12)', color: nameSaved ? '#4A8050' : '#C8852A', border: `1px solid ${nameSaved ? '#4A8050' : '#C8852A'}` }}
            >
              {nameSaved ? 'Saved' : 'Save'}
            </button>
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#4A3828' }}>Shown in your library greeting. Leave blank to use email username.</p>
        </div>
      </Section>

      <Section title="Account">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            style={{ background: '#C8852A', color: '#0C0B09' }}
          >
            {email[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#F0E8D8' }}>{email}</div>
            <div className="text-xs" style={{ color: '#6A5840' }}>Aziza account</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full py-2.5 rounded-xl text-sm font-medium"
          style={{ background: '#1A0808', color: '#E07060', border: '1px solid #3A1010' }}
        >
          Sign out
        </button>
      </Section>

      <Section title="Default voice">
        <div className="grid grid-cols-2 gap-2">
          {VOICES.map(v => (
            <button
              key={v.id}
              onClick={() => setVoice(v.id)}
              className="py-2 px-3 rounded-xl text-sm text-left transition-colors"
              style={{
                background: voice === v.id ? 'rgba(200,133,42,0.12)' : '#1C1915',
                border: `1px solid ${voice === v.id ? '#C8852A' : '#2E2820'}`,
                color: voice === v.id ? '#C8852A' : '#A8947C',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2.5" style={{ color: '#4A3828' }}>
          Used as default when you open the TTS panel
        </p>
      </Section>

      <Section title="Font size">
        <div className="flex gap-2">
          {[['sm','Small'],['md','Medium'],['lg','Large']] .map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFontSize(val)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: fontSize === val ? 'rgba(200,133,42,0.12)' : '#1C1915',
                border: `1px solid ${fontSize === val ? '#C8852A' : '#2E2820'}`,
                color: fontSize === val ? '#C8852A' : '#A8947C',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2.5" style={{ color: '#4A3828' }}>
          Applies to EPUB text rendering
        </p>
      </Section>

      <Section title="Data">
        <button
          onClick={clearData}
          disabled={clearing}
          className="w-full py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: '#1A0808',
            color: '#E07060',
            border: '1px solid #3A1010',
            opacity: clearing ? 0.6 : 1,
          }}
        >
          {clearing ? 'Clearing…' : 'Delete all books and data'}
        </button>
        <p className="text-xs mt-2.5" style={{ color: '#4A3828' }}>
          Removes all books from library and local storage. Cannot be undone.
        </p>
      </Section>
    </div>
  )
}
