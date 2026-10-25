'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveBookFile } from '@/lib/idb'
import { parseBook } from '@/lib/parse-book'

type NewBook = {
  id: string
  title: string
  author: string | null
  format: string
  cover_data: string | null
  progress_pct: number
  last_opened: null
  date_added: string
}

type Props = {
  onAdded: (book: NewBook) => void
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

type Stage = 'idle' | 'parsing' | 'saving' | 'done' | 'error'

export function AddBook({ onAdded, className, style, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [msg, setMsg] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      setStage('parsing')
      setMsg(`Reading ${file.name}…`)
      const meta = await parseBook(file)

      setStage('saving')
      setMsg('Saving to library…')

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const { data: row, error } = await supabase
        .from('book_metadata')
        .insert({
          user_id:    user.id,
          title:      meta.title,
          author:     meta.author || null,
          format:     meta.format,
          cover_data: meta.cover_data,
          progress_pct: 0,
          last_opened: null,
        })
        .select('id')
        .single()

      if (error || !row) throw new Error(error?.message ?? 'Insert failed')

      // Store binary in IndexedDB (never uploaded)
      const buf = await file.arrayBuffer()
      await saveBookFile(row.id, buf)

      setStage('done')
      setMsg('')
      onAdded({
        id: row.id,
        title: meta.title,
        author: meta.author || null,
        format: meta.format,
        cover_data: meta.cover_data,
        progress_pct: 0,
        last_opened: null,
        date_added: new Date().toISOString(),
      })
    } catch (err: unknown) {
      setStage('error')
      setMsg(err instanceof Error ? err.message : 'Failed')
      setTimeout(() => { setStage('idle'); setMsg('') }, 3000)
    }
  }

  const busy = stage === 'parsing' || stage === 'saving'

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.pdf,.mobi,.cbz,.cbr"
        className="hidden"
        onChange={handleFile}
      />

      {busy && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{ background: '#1C1915', border: '1px solid #3A3128', color: '#F0E8D8' }}
        >
          <svg className="animate-spin w-4 h-4 shrink-0" style={{ color: '#C8852A' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          {msg}
        </div>
      )}

      {stage === 'error' && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{ background: '#1A0808', border: '1px solid #3A1010', color: '#E07060' }}
        >
          {msg}
        </div>
      )}

      <button
        onClick={() => !busy && inputRef.current?.click()}
        disabled={busy}
        className={className}
        style={style}
      >
        {children}
      </button>
    </>
  )
}
