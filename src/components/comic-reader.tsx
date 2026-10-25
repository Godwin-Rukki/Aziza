'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBookFile } from '@/lib/idb'
import { createClient } from '@/lib/supabase/client'
import { markTodayRead } from '@/lib/streak'

type ComicRow = {
  id: string
  title: string
  author: string | null
  format: string
  cover_data: string | null
  progress_pct: number | null
}

export function ComicReader({ comic }: { comic: ComicRow }) {
  const router  = useRouter()
  const supabase = createClient()

  const zipRef        = useRef<any>(null)
  const imageNamesRef = useRef<string[]>([])
  const urlCache      = useRef<Map<number, string>>(new Map())

  const [loading,    setLoading]    = useState(true)
  const [loadingPct, setLoadingPct] = useState(0)
  const [error,      setError]      = useState<string | null>(null)
  const [pageCount,  setPageCount]  = useState(0)
  const [current,    setCurrent]    = useState(0)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [progress,   setProgress]   = useState(comic.progress_pct ?? 0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { markTodayRead() }, [])

  async function getPageUrl(idx: number): Promise<string> {
    const cached = urlCache.current.get(idx)
    if (cached) return cached
    const name = imageNamesRef.current[idx]
    if (!name || !zipRef.current) return ''
    const blob = await zipRef.current.files[name].async('blob')
    const url  = URL.createObjectURL(blob)
    urlCache.current.set(idx, url)
    // Keep cache small — evict pages more than 3 away from current
    if (urlCache.current.size > 6) {
      for (const [key, objUrl] of urlCache.current) {
        if (Math.abs(key - idx) > 3) {
          URL.revokeObjectURL(objUrl)
          urlCache.current.delete(key)
          break
        }
      }
    }
    return url
  }

  const goToPage = useCallback(async (idx: number) => {
    const total = imageNamesRef.current.length
    if (idx < 0 || idx >= total) return
    const url = await getPageUrl(idx)
    setCurrentUrl(url)
    setCurrent(idx)
    const pct = Math.round((idx / Math.max(1, total - 1)) * 100)
    setProgress(pct)
    await supabase.from('book_metadata').update({ progress_pct: pct }).eq('id', comic.id)
    containerRef.current?.scrollTo({ top: 0 })
    // Prefetch next two pages
    getPageUrl(idx + 1).catch(() => {})
    getPageUrl(idx + 2).catch(() => {})
  }, [comic.id])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setError('Loading timed out. The file may be too large or corrupted.')
        setLoading(false)
      }
    }, 30000)

    ;(async () => {
      try {
        const buf = await getBookFile(comic.id)
        if (!buf) throw new Error('Comic file not in local storage — add it again.')

        setLoadingPct(10)
        const { default: JSZip } = await import('jszip')

        const zip = await (JSZip as any).loadAsync(buf, {
          onUpdate: (meta: any) => setLoadingPct(10 + Math.round((meta.percent ?? 0) * 0.75)),
        })
        zipRef.current = zip

        const imageNames = Object.keys(zip.files)
          .filter(n => /\.(jpe?g|png|webp|gif)$/i.test(n) && !zip.files[n].dir)
          .sort()

        if (imageNames.length === 0) throw new Error('No images found in this CBZ file.')

        imageNamesRef.current = imageNames
        setPageCount(imageNames.length)
        setLoadingPct(88)

        const startIdx = comic.progress_pct && comic.progress_pct < 99
          ? Math.max(0, Math.round((comic.progress_pct / 100) * imageNames.length) - 1)
          : 0

        const url = await getPageUrl(startIdx)
        setCurrentUrl(url)
        setCurrent(startIdx)
        setLoadingPct(100)
        setLoading(false)
        clearTimeout(timeout)

        // Prefetch next pages
        getPageUrl(startIdx + 1).catch(() => {})
        getPageUrl(startIdx + 2).catch(() => {})
      } catch (e: any) {
        clearTimeout(timeout)
        setError(e.message ?? 'Failed to load comic')
        setLoading(false)
      }
    })()

    return () => clearTimeout(timeout)
  }, [])

  // Revoke all on unmount
  useEffect(() => {
    return () => { urlCache.current.forEach(url => URL.revokeObjectURL(url)) }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToPage(current + 1)
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goToPage(current - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, goToPage])

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

        {pageCount > 0 && !loading && (
          <div className="text-[0.72rem] shrink-0 tabular-nums" style={{ color: '#6A5840' }}>
            {current + 1} / {pageCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8" style={{ background: '#080608' }}>
            {comic.cover_data ? (
              <img
                src={comic.cover_data}
                alt={comic.title}
                className="w-24 rounded-xl shadow-2xl"
                style={{ aspectRatio: '2/3', objectFit: 'cover', opacity: 0.85 }}
              />
            ) : (
              <div className="w-24 rounded-xl flex items-center justify-center" style={{ aspectRatio: '2/3', background: '#1C1218' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C83060" strokeWidth="1.2" opacity="0.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                </svg>
              </div>
            )}
            <div className="w-full max-w-[220px] text-center">
              <div className="text-base font-semibold mb-1 truncate" style={{ fontFamily: "'Yeseva One', serif", color: '#F0E8D8' }}>
                {comic.title}
              </div>
              <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ background: '#2A1A2A' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${loadingPct}%`, background: '#C83060' }}
                />
              </div>
              <div className="text-xs tabular-nums" style={{ color: '#6A5840' }}>
                {loadingPct < 100 ? `${loadingPct}%` : 'Ready'}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C83060" strokeWidth="1.2" opacity="0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm" style={{ color: '#E07060' }}>{error}</p>
            <button onClick={() => router.back()} className="px-5 py-2 rounded-xl text-sm" style={{ background: '#1C1218', color: '#A8947C' }}>
              Back to comics
            </button>
          </div>
        )}

        {!loading && !error && currentUrl && (
          <div className="flex items-center justify-center w-full h-full p-2">
            <img
              src={currentUrl}
              alt={`Page ${current + 1}`}
              className="max-w-full max-h-full object-contain"
              style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.8)' }}
            />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {!loading && !error && pageCount > 0 && (
        <div
          className="flex items-center gap-4 px-5 py-4 border-t shrink-0"
          style={{ borderColor: '#2A1A2A', background: '#100810' }}
        >
          <button
            onClick={() => goToPage(current - 1)}
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
            onClick={() => goToPage(current + 1)}
            disabled={current === pageCount - 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
            style={{ background: '#1C1218', color: current === pageCount - 1 ? '#3A2838' : '#A8947C' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
