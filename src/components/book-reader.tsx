'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getBookFile } from '@/lib/idb'
import { createClient } from '@/lib/supabase/client'
import { TTSPanel } from '@/components/tts-panel'

type BookRow = {
  id: string
  title: string
  author: string | null
  format: string
  cover_data: string | null
  progress_pct: number | null
}

export function BookReader({ book }: { book: BookRow }) {
  const router = useRouter()
  const epubContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const renditionRef     = useRef<any>(null)
  const pdfDocRef        = useRef<any>(null)
  const touchStartX      = useRef<number>(0)
  const supabase         = createClient()

  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [pdfPage,      setPdfPage]      = useState(1)
  const [pdfTotal,     setPdfTotal]     = useState(0)
  const [pdfRendering, setPdfRendering] = useState(false)
  const [chapterLabel, setChapterLabel] = useState('')
  const [progress,     setProgress]     = useState(book.progress_pct ?? 0)
  const [ttsText,      setTtsText]      = useState('')
  const [showTTS,      setShowTTS]      = useState(false)

  async function saveProgress(pct: number) {
    const rounded = Math.min(100, Math.max(0, Math.round(pct)))
    setProgress(rounded)
    await supabase.from('book_metadata').update({ progress_pct: rounded }).eq('id', book.id)
  }

  // ── EPUB ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (book.format !== 'epub') return
    ;(async () => {
      try {
        const buf = await getBookFile(book.id)
        if (!buf) throw new Error('Book file not in local storage — add it again.')

        const { default: ePub } = await import('epubjs')
        const epubBook = ePub(buf as ArrayBuffer)
        await epubBook.ready

        if (!epubContainerRef.current) return

        const rendition = epubBook.renderTo(epubContainerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
        } as any)

        renditionRef.current = rendition

        rendition.hooks.content.register((contents: any) => {
          const doc = contents.document
          if (!doc) return
          const style = doc.createElement('style')
          style.textContent = `
            html, body {
              background: #0C0B09 !important;
              color: #E8DCC8 !important;
              font-family: Georgia, 'Times New Roman', serif !important;
            }
            body * {
              color: #E8DCC8 !important;
              background-color: transparent !important;
            }
            a, a * { color: #C8852A !important; }
            p { line-height: 1.8 !important; font-size: 1.05em !important; }
            img { max-width: 100% !important; height: auto !important; background-color: initial !important; }
          `
          doc.head.appendChild(style)
        })

        await rendition.display()

        rendition.on('relocated', (location: any) => {
          const href = location.start?.href ?? ''
          setChapterLabel(
            href.split('/').pop()?.replace(/\.(x?html?)$/i, '').replace(/[-_]/g, ' ') ?? ''
          )
          if ((epubBook.locations as any).total > 0) {
            const pct = (epubBook.locations as any).percentageFromCfi(location.start.cfi) * 100
            saveProgress(pct)
          }
          // Extract text for TTS
          try {
            const contents = rendition.getContents() as unknown as any[]
            if (contents?.length > 0) {
              const body = contents[0].document?.body
              if (body) setTtsText(body.innerText ?? '')
            }
          } catch {}
        })

        ;(epubBook.locations as any).generate(1024).catch(() => {})
        setLoading(false)
      } catch (e: any) {
        setError(e.message ?? 'Failed to load EPUB')
        setLoading(false)
      }
    })()
  }, [])

  // ── PDF ───────────────────────────────────────────────────────────────────

  const renderPdfPage = useCallback(async (pdf: any, pageNum: number) => {
    if (!canvasRef.current || !pdf) return
    setPdfRendering(true)
    try {
      const page    = await pdf.getPage(pageNum)
      const container = canvasRef.current.parentElement!
      const scaleToFit = container.clientWidth / page.getViewport({ scale: 1 }).width
      const vp      = page.getViewport({ scale: Math.min(scaleToFit * 0.95, 2) })

      const canvas  = canvasRef.current
      canvas.width  = vp.width
      canvas.height = vp.height
      const ctx     = canvas.getContext('2d')!

      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
      await saveProgress((pageNum / pdf.numPages) * 100)

      // Extract text for TTS
      try {
        const textContent = await page.getTextContent()
        const text = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ')
        setTtsText(text)
      } catch {}
    } finally {
      setPdfRendering(false)
    }
  }, [])

  useEffect(() => {
    if (book.format !== 'pdf') return
    ;(async () => {
      try {
        const buf = await getBookFile(book.id)
        if (!buf) throw new Error('Book file not in local storage — add it again.')

        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
        pdfDocRef.current = pdf
        setPdfTotal(pdf.numPages)

        const startPage = book.progress_pct && book.progress_pct < 99
          ? Math.max(1, Math.round((book.progress_pct / 100) * pdf.numPages))
          : 1
        setPdfPage(startPage)

        setLoading(false)
        await renderPdfPage(pdf, startPage)
      } catch (e: any) {
        setError(e.message ?? 'Failed to load PDF')
        setLoading(false)
      }
    })()
  }, [])

  // ── Navigation ────────────────────────────────────────────────────────────

  const goPrev = useCallback(() => {
    if (book.format === 'epub') {
      renditionRef.current?.prev()
    } else if (book.format === 'pdf') {
      setPdfPage(p => {
        const next = Math.max(1, p - 1)
        renderPdfPage(pdfDocRef.current, next)
        return next
      })
    }
  }, [book.format, renderPdfPage])

  const goNext = useCallback(() => {
    if (book.format === 'epub') {
      renditionRef.current?.next()
    } else if (book.format === 'pdf') {
      setPdfPage(p => {
        const next = Math.min(pdfTotal, p + 1)
        renderPdfPage(pdfDocRef.current, next)
        return next
      })
    }
  }, [book.format, pdfTotal, renderPdfPage])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd   = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) delta > 0 ? goNext() : goPrev()
  }

  const pageLabel = book.format === 'pdf' && pdfTotal > 0
    ? `${pdfPage} / ${pdfTotal}`
    : chapterLabel
  const isReader = ['epub', 'pdf'].includes(book.format)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: '#0C0B09', color: '#F0E8D8' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: '#2E2820', background: '#131210' }}
      >
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg shrink-0 transition-colors"
          style={{ color: '#A8947C' }}
          aria-label="Back to library"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ fontFamily: "'Yeseva One', serif" }}>
            {book.title}
          </div>
          {book.author && (
            <div className="text-[0.68rem] truncate" style={{ color: '#6A5840' }}>{book.author}</div>
          )}
        </div>

        {pageLabel && (
          <div className="text-[0.72rem] shrink-0 tabular-nums" style={{ color: '#6A5840' }}>
            {pageLabel}
          </div>
        )}

        {/* Listen button */}
        {isReader && !loading && !error && (
          <button
            onClick={() => setShowTTS(v => !v)}
            className="p-2 rounded-lg shrink-0 transition-colors"
            style={{
              background: showTTS ? 'rgba(200,133,42,0.15)' : 'transparent',
              color: showTTS ? '#C8852A' : '#6A5840',
            }}
            aria-label="Toggle TTS"
            title="Listen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 010 7.07"/>
              <path d="M19.07 4.93a10 10 0 010 14.14"/>
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin w-8 h-8" style={{ color: '#C8852A' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C8852A" strokeWidth="1.2" opacity="0.5">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
            <p className="text-sm" style={{ color: '#E07060' }}>{error}</p>
            <button onClick={() => router.back()} className="mt-2 px-5 py-2 rounded-xl text-sm font-medium" style={{ background: '#1C1915', color: '#A8947C' }}>
              Back to library
            </button>
          </div>
        )}

        {book.format === 'epub' && (
          <div ref={epubContainerRef} className="w-full h-full" style={{ visibility: loading ? 'hidden' : 'visible' }} />
        )}

        {book.format === 'pdf' && !loading && !error && (
          <div className="w-full h-full overflow-auto flex justify-center p-4 relative">
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', height: 'auto', boxShadow: '0 8px 48px rgba(0,0,0,0.7)', borderRadius: 4 }}
            />
            {pdfRendering && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin w-6 h-6" style={{ color: '#C8852A' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </div>
            )}
          </div>
        )}

        {!['epub','pdf'].includes(book.format) && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-3">
            <div className="text-5xl opacity-40">📖</div>
            <p className="text-sm" style={{ color: '#A8947C' }}>
              {book.format.toUpperCase()} reading is coming in a future update.
            </p>
            <button onClick={() => router.back()} className="mt-2 px-5 py-2 rounded-xl text-sm font-medium" style={{ background: '#1C1915', color: '#A8947C' }}>
              Back to library
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav bar */}
      {!loading && !error && isReader && (
        <div
          className="flex items-center gap-4 px-5 py-4 border-t shrink-0"
          style={{ borderColor: '#2E2820', background: '#131210' }}
        >
          <button onClick={goPrev} className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0" style={{ background: '#1C1915', color: '#A8947C' }} aria-label="Previous">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#252118' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: '#C8852A' }} />
            </div>
            <div className="text-[0.62rem] text-right tabular-nums" style={{ color: '#6A5840' }}>{Math.round(progress)}% complete</div>
          </div>

          <button onClick={goNext} className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0" style={{ background: '#1C1915', color: '#A8947C' }} aria-label="Next">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}

      {/* TTS panel */}
      {showTTS && (
        <TTSPanel text={ttsText} onClose={() => setShowTTS(false)} />
      )}
    </div>
  )
}
