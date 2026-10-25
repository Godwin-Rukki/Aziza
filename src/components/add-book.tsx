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

type Stage = 'idle' | 'reading' | 'parsing' | 'saving' | 'storing' | 'done' | 'error'

const STAGE_LABEL: Record<Stage, string> = {
  idle:    '',
  reading: 'Reading file…',
  parsing: 'Extracting cover…',
  saving:  'Saving to library…',
  storing: 'Storing locally…',
  done:    'Added to library',
  error:   '',
}

const STAGE_PCT: Record<Stage, number> = {
  idle:    0,
  reading: 15,
  parsing: 45,
  saving:  72,
  storing: 90,
  done:    100,
  error:   0,
}

export function AddBook({ onAdded, className, style, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      setStage('reading')
      // Small delay so UI renders before heavy work
      await new Promise(r => setTimeout(r, 30))

      setStage('parsing')
      const meta = await parseBook(file)

      setStage('saving')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const { data: row, error } = await supabase
        .from('book_metadata')
        .insert({
          user_id:      user.id,
          title:        meta.title,
          author:       meta.author || null,
          format:       meta.format,
          cover_data:   meta.cover_data,
          progress_pct: 0,
          last_opened:  null,
        })
        .select('id')
        .single()

      if (error || !row) throw new Error(error?.message ?? 'Insert failed')

      setStage('storing')
      const buf = await file.arrayBuffer()
      await saveBookFile(row.id, buf)

      setStage('done')
      onAdded({
        id:           row.id,
        title:        meta.title,
        author:       meta.author || null,
        format:       meta.format,
        cover_data:   meta.cover_data,
        progress_pct: 0,
        last_opened:  null,
        date_added:   new Date().toISOString(),
      })

      // Reset after brief "done" flash
      setTimeout(() => setStage('idle'), 1800)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed')
      setStage('error')
      setTimeout(() => { setStage('idle'); setErrorMsg('') }, 3500)
    }
  }

  const busy = !['idle', 'done', 'error'].includes(stage)
  const pct  = STAGE_PCT[stage]

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.pdf,.mobi"
        className="hidden"
        onChange={handleFile}
      />

      {/* Progress toast */}
      {(busy || stage === 'done') && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-2xl"
          style={{
            background: '#1C1915',
            border: '1px solid #3A3128',
            borderRadius: 14,
            minWidth: 260,
            maxWidth: 'calc(100vw - 2rem)',
            padding: '12px 16px',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#F0E8D8' }}>
              {STAGE_LABEL[stage]}
            </span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: '#C8852A' }}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2E2820' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: stage === 'done' ? '#4A8050' : '#C8852A',
              }}
            />
          </div>
        </div>
      )}

      {/* Error toast */}
      {stage === 'error' && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{ background: '#1A0808', border: '1px solid #3A1010', color: '#E07060' }}
        >
          {errorMsg}
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
