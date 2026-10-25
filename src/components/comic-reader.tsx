'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBookFile } from '@/lib/idb'
import { createClient } from '@/lib/supabase/client'

type ComicRow = {
  id: string
  title: string
  author: string | null
  format: string
  cover_data: string | null
  progress_pct: number | null
}

export function ComicReader({ comic }: { comic: ComicRow }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [pages, setPages]       = useState<string[]>([]) // data URLs
  const [current, setCurrent]   = useState(0)
  const [progress, setProgress] = useState(comic.progress_pct ?? 0)
  const [mode, setMode]         = useState<'single' | 'scroll'>('single')
  const containerRef = useRef<HTMLDivElement>(null)

  async function saveProgress(pct: number) {
    const rounded = Math.min(100, Math.max(0, Math.round(pct)))
    setProgress(rounded)
    await supabase.from('book_metadata').update({ progress_pct: rounded }).eq('id', comic.id)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const buf = await getBookFile(comic.id)
        if (!buf) throw new Error('Comic file not in local storage — add it again.')

        const { default: JSZip } = await import('jszip')
        const zip = await JSZip.loadAsync(buf)

        const imageNames = Object.keys(zip.files)
          .filter(name => /\.(jpe?g|png|webp|gif)$/i.test(name) && !zip.files[name].dir)
          .sort()

        if (imageNames.length === 0) throw new Error('No images found in this CBZ file.')

        const dataUrls: string[] = []
        for (const name of imageNames) {
          const blob = await zip.files[name].async('blob')
          const url  = URL.createObjectURL(blob)
          dataUrls.push(url)
        }

        setPages(dataUrls)

        const startPage = comic.progress_pct && comic.progress_pct < 99
          ? Math.max(0, Math.round((comic.progress_pct / 100) * dataUrls.length) - 1)
          : 0
        setCurrent(startPage)
        setLoading(false)
      } catch (e: any) {
        setError(e.message ?? 'Failed to load comic')
        setLoading(false)
      }
    })()
  }, [])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => { pages.forEach(url => URL.revokeObjectURL(url)) }
  }, [pages])

  function goPrev() {
    const next = Math.max(0, current - 1)
    setCurrent(next)
    saveProgress((next / Math.max(1, pages.length - 1)) * 100)
    containerRef.current?.scrollTo({ top: 0 })
  }

  function goNext() {
    const next = Math.min(pages.length - 1, current + 1)
    setCurrent(next)
    saveProgress((next / Math.max(1, pages.length - 1)) * 100)
    containerRef.current?.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, pages.length])

  return (
    <div className="flex flex-col h-screen" style={{ background: '#080608', color: '#F0E8D8' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: '#2A1A2A', background: '#100810' }}
      >
        <button onClick={() => router.back()} className="p-2 rounded-lg shrink-0" style={{ color: '#A8947C' }} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ fontFamily: "'Yeseva One', serif" }}>{comic.title}</div>
          {comic.author && <div className="text-[0.68rem] truncate" style={{ color: '#6A5840' }}>{comic.author}</div>}
        </div>

        {pages.length > 0 && (
          <div className="text-[0.72rem] shrink-0 tabular-nums" style={{ color: '#6A5840' }}>
            {current + 1} / {pages.length}
          </div>
        )}

        {/* Mode toggle */}
        <button
          onClick={() => setMode(m => m === 'single' ? 'scroll' : 'single')}
          className="p-2 rounded-lg shrink-0 transition-colors"
          style={{ color: '#6A5840' }}
          title={mode === 'single' ? 'Switch to scroll mode' : 'Switch to page mode'}
        >
          {mode === 'single' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin w-8 h-8" style={{ color: '#C83060' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-3">
            <p className="text-sm" style={{ color: '#E07060' }}>{error}</p>
            <button onClick={() => router.back()} className="px-5 py-2 rounded-xl text-sm" style={{ background: '#1C1915', color: '#A8947C' }}>
              Back to comics
            </button>
          </div>
        )}

        {!loading && !error && pages.length > 0 && (
          mode === 'single' ? (
            // Single page mode
            <div className="flex items-center justify-center w-full h-full p-2">
              <img
                src={pages[current]}
                alt={`Page ${current + 1}`}
                className="max-w-full max-h-full object-contain"
                style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.8)' }}
              />
            </div>
          ) : (
            // Scroll mode — all pages stacked
            <div className="flex flex-col items-center gap-1 py-2">
              {pages.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Page ${i + 1}`}
                  className="w-full"
                  style={{ maxWidth: 800, display: 'block' }}
                  onLoad={() => {
                    if (i === current) saveProgress((i / Math.max(1, pages.length - 1)) * 100)
                  }}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Bottom bar — single page mode only */}
      {!loading && !error && pages.length > 0 && mode === 'single' && (
        <div
          className="flex items-center gap-4 px-5 py-4 border-t shrink-0"
          style={{ borderColor: '#2A1A2A', background: '#100810' }}
        >
          <button
            onClick={goPrev}
            disabled={current === 0}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
            style={{ background: '#1C1218', color: current === 0 ? '#3A2838' : '#A8947C' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2A1A2A' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: '#C83060' }} />
            </div>
            <div className="text-[0.62rem] text-right tabular-nums" style={{ color: '#6A5840' }}>{Math.round(progress)}% read</div>
          </div>

          <button
            onClick={goNext}
            disabled={current === pages.length - 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
            style={{ background: '#1C1218', color: current === pages.length - 1 ? '#3A2838' : '#A8947C' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
