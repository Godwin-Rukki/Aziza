'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBookFile } from '@/lib/idb'
import { createClient } from '@/lib/supabase/client'
import { TTSPanel } from '@/components/tts-panel'
import { markTodayRead } from '@/lib/streak'

type BookRow = {
  id: string
  title: string
  author: string | null
  format: string
  cover_data: string | null
  progress_pct: number | null
}

// ── EPUB helpers ─────────────────────────────────────────────────────────────

function resolvePath(base: string, rel: string): string {
  if (!rel || rel.startsWith('data:') || rel.startsWith('http')) return rel
  const parts = (base + '/' + rel).split('/')
  const out: string[] = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else if (p !== '.') out.push(p)
  }
  return out.join('/')
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(blob)
  })
}

// Literal string replacement — avoids `$` pattern issues in CSS/image content
function strReplace(src: string, search: string, replacement: string): string {
  return src.split(search).join(replacement)
}

async function buildChapterHtml(
  zip: any,
  opfDir: string,
  chapterHref: string,
  fontSize: string,
): Promise<{ html: string; text: string }> {
  // Strip fragment identifier before file lookup
  const hrefNoFrag = chapterHref.split('#')[0]
  const chapterPath = opfDir ? `${opfDir}/${hrefNoFrag}` : hrefNoFrag
  const chapterFile = zip.file(chapterPath) ?? zip.file(hrefNoFrag)
  if (!chapterFile) return { html: `<p style="color:#888;padding:1rem">Chapter not found: ${chapterPath}</p>`, text: '' }

  let html: string = await chapterFile.async('text')
  const chapterDir  = hrefNoFrag.split('/').slice(0, -1).join('/')
  const baseDir     = [opfDir, chapterDir].filter(Boolean).join('/')

  // Inline linked stylesheets (handle both attribute orders)
  const cssRe = /<link\b[^>]+>/gi
  for (const tag of [...html.matchAll(cssRe)].map(m => m[0])) {
    const isStylesheet = /rel=["']stylesheet["']/i.test(tag)
    const hrefMatch    = tag.match(/href=["']([^"']+)["']/i)
    if (!isStylesheet || !hrefMatch) continue
    const cssPath = resolvePath(baseDir, hrefMatch[1])
    const cssFile = zip.file(cssPath)
    if (cssFile) {
      const css = await cssFile.async('text')
      html = strReplace(html, tag, `<style>${css}</style>`)
    }
  }

  // Inline images (src and xlink:href) — use literal replacement
  const imgRe = /(<(?:img|image)\b[^>]+(?:src|xlink:href)=["'])([^"'#][^"']*)(['"])/gi
  for (const m of [...html.matchAll(imgRe)]) {
    const imgPath = resolvePath(baseDir, m[2])
    const imgFile = zip.file(imgPath)
    if (imgFile) {
      try {
        const blob    = await imgFile.async('blob')
        const dataUrl = await blobToDataUrl(blob)
        html = strReplace(html, m[0], `${m[1]}${dataUrl}${m[3]}`)
      } catch {}
    }
  }

  // Default fallback style injected FIRST (book's own CSS overrides it)
  const defaultCss = `<style id="aziza-defaults">
    body { background: #F5F0E8; color: #1A1410; }
  </style>`
  // Layout CSS injected LAST — only structural, no color override
  const layoutCss = `<style id="aziza-layout">
    img { max-width: 100% !important; height: auto !important; }
    body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.75;
           padding: 1.2rem 1.5rem; margin: 0; font-size: ${fontSize}; }
    p    { margin: 0 0 0.8em; }
  </style>`
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, m => `${m}${defaultCss}`)
    html = html.replace(/<\/head>/i, `${layoutCss}</head>`)
  } else if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${defaultCss}${layoutCss}</head>`)
  } else {
    html = `<html><head>${defaultCss}${layoutCss}</head><body>${html}</body></html>`
  }

  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return { html, text }
}

function xmlEls(doc: Document, localName: string): Element[] {
  return [...doc.getElementsByTagName('*')].filter(
    el => el.localName.toLowerCase() === localName.toLowerCase()
  )
}

async function parseEpubStructure(zip: any): Promise<{
  opfDir: string
  chapters: string[]
  firstRealIdx: number
}> {
  const parser = new DOMParser()

  // container.xml → OPF path (handle both " and ' quotes, any namespace)
  const containerXml = await zip.file('META-INF/container.xml')?.async('text') ?? ''
  const containerDoc = parser.parseFromString(containerXml, 'text/xml')
  const rootfileEl   = xmlEls(containerDoc, 'rootfile')[0]
  const opfPath      = rootfileEl?.getAttribute('full-path') ?? ''
  if (!opfPath) throw new Error('Invalid EPUB: cannot find rootfile in container.xml')

  const opfDir  = opfPath.split('/').slice(0, -1).join('/')
  const opfFile = zip.file(opfPath)
  if (!opfFile) throw new Error(`Invalid EPUB: OPF not found at "${opfPath}"`)
  const opfXml  = await opfFile.async('text')
  const opfDoc  = parser.parseFromString(opfXml, 'text/xml')

  // Build manifest: id → {href, mediaType} (use localName to ignore namespace prefixes)
  const manifest: Record<string, { href: string; mt: string }> = {}
  for (const el of xmlEls(opfDoc, 'item')) {
    const id = el.getAttribute('id')
    const href = el.getAttribute('href')
    const mt   = el.getAttribute('media-type') ?? ''
    if (id && href) manifest[id] = { href: decodeURIComponent(href), mt }
  }

  // Spine: ordered HTML chapter hrefs only
  const HTML_MT = /xhtml|html/i
  const chapters: string[] = []
  for (const el of xmlEls(opfDoc, 'itemref')) {
    const idref = el.getAttribute('idref')
    if (!idref) continue
    const item = manifest[idref]
    if (!item) continue
    // Include if media-type is xhtml/html, or if we have no media-type info but href looks like HTML
    if (HTML_MT.test(item.mt) || (!item.mt && /\.x?html?$/i.test(item.href))) {
      chapters.push(item.href)
    }
  }

  if (chapters.length === 0) throw new Error('EPUB has no readable chapters.')

  const SKIP        = /cover|toc|nav|index|copyright|halftitle|title/i
  const firstRealIdx = Math.max(0, chapters.findIndex(h => !SKIP.test(h)))
  return { opfDir, chapters, firstRealIdx }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookReader({ book }: { book: BookRow }) {
  const router   = useRouter()
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const pdfDocRef   = useRef<any>(null)
  const iframeRef   = useRef<HTMLIFrameElement>(null)
  const currentBlobRef = useRef<string | null>(null)
  const touchStartX = useRef<number>(0)
  const supabase    = createClient()

  // EPUB state
  const zipRef      = useRef<any>(null)
  const opfDirRef   = useRef('')
  const chaptersRef = useRef<string[]>([])

  const [loading,      setLoading]      = useState(true)
  const [loadingPct,   setLoadingPct]   = useState(0)
  const [error,        setError]        = useState<string | null>(null)
  const [chapterIdx,   setChapterIdx]   = useState(0)
  const [chapterTotal, setChapterTotal] = useState(0)
  const [iframeSrc,    setIframeSrc]    = useState<string | null>(null)
  const [pdfPage,      setPdfPage]      = useState(1)
  const [pdfTotal,     setPdfTotal]     = useState(0)
  const [pdfRendering, setPdfRendering] = useState(false)
  const [pageLabel,    setPageLabel]    = useState('')
  const [progress,     setProgress]     = useState(book.progress_pct ?? 0)
  const [ttsText,      setTtsText]      = useState('')
  const [showTTS,      setShowTTS]      = useState(false)
  const [ttsAutoPlay,  setTtsAutoPlay]  = useState(0)
  const chapterIdxRef  = useRef(0)
  const ttsTextRef     = useRef('')

  useEffect(() => { chapterIdxRef.current = chapterIdx }, [chapterIdx])

  useEffect(() => { markTodayRead() }, [])

  async function saveProgress(pct: number) {
    const rounded = Math.min(100, Math.max(0, Math.round(pct)))
    setProgress(rounded)
    await supabase.from('book_metadata').update({ progress_pct: rounded }).eq('id', book.id)
  }

  // ── EPUB ────────────────────────────────────────────────────────────────────

  const goToChapter = useCallback(async (idx: number) => {
    const chapters = chaptersRef.current
    if (idx < 0 || idx >= chapters.length) return
    const fontSizePref = localStorage.getItem('aziza_font_size') ?? 'md'
    const fontSize = fontSizePref === 'sm' ? '0.9em' : fontSizePref === 'lg' ? '1.2em' : '1.05em'

    const { html, text } = await buildChapterHtml(
      zipRef.current, opfDirRef.current, chapters[idx], fontSize
    )

    // Revoke previous blob URL
    if (currentBlobRef.current) URL.revokeObjectURL(currentBlobRef.current)
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    currentBlobRef.current = url

    setIframeSrc(url)
    setChapterIdx(idx)
    ttsTextRef.current = text
    setTtsText(text)
    setPageLabel(`Ch ${idx + 1} / ${chapters.length}`)
    await saveProgress((idx / Math.max(1, chapters.length - 1)) * 100)
    setTimeout(() => iframeRef.current?.contentWindow?.scrollTo(0, 0), 100)
  }, [])

  // Called by TTSPanel when it finishes reading a chapter — advance to next chapter with text
  const onTTSEnd = useCallback(async () => {
    const total = chaptersRef.current.length
    let next = chapterIdxRef.current + 1
    // Skip image-only / very short chapters (no text to read)
    while (next < total) {
      await goToChapter(next)
      if (ttsTextRef.current.trim().length > 30) break
      next++
    }
    if (next < total) setTtsAutoPlay(c => c + 1)
  }, [goToChapter])

  useEffect(() => {
    if (book.format !== 'epub') return
    const t = setTimeout(() => {
      setError('Loading timed out. File may be corrupted or too large.')
      setLoading(false)
    }, 30000)
    ;(async () => {
      try {
        setLoadingPct(10)
        const buf = await getBookFile(book.id)
        if (!buf) throw new Error('Book file not found locally — try uploading again.')
        setLoadingPct(25)

        const { default: JSZip } = await import('jszip')
        const zip = await (JSZip as any).loadAsync(buf, {
          onUpdate: (m: any) => setLoadingPct(25 + Math.round((m.percent ?? 0) * 0.35)),
        })
        zipRef.current = zip
        setLoadingPct(62)

        const { opfDir, chapters, firstRealIdx } = await parseEpubStructure(zip)
        opfDirRef.current   = opfDir
        chaptersRef.current = chapters
        setChapterTotal(chapters.length)
        setLoadingPct(75)

        const startIdx = book.progress_pct && book.progress_pct < 99
          ? Math.round((book.progress_pct / 100) * (chapters.length - 1))
          : firstRealIdx

        await goToChapter(startIdx)
        clearTimeout(t)
        setLoadingPct(100)
        setLoading(false)
      } catch (e: any) {
        clearTimeout(t)
        setError(e.message ?? 'Failed to load EPUB')
        setLoading(false)
      }
    })()
    return () => {
      clearTimeout(t)
      if (currentBlobRef.current) URL.revokeObjectURL(currentBlobRef.current)
    }
  }, [])

  // ── PDF ─────────────────────────────────────────────────────────────────────

  const renderPdfPage = useCallback(async (pdf: any, pageNum: number) => {
    if (!canvasRef.current || !pdf) return
    setPdfRendering(true)
    try {
      const page   = await pdf.getPage(pageNum)
      const container = canvasRef.current.parentElement!
      const scale  = Math.min((container.clientWidth / page.getViewport({ scale: 1 }).width) * 0.95, 2)
      const vp     = page.getViewport({ scale })
      const canvas = canvasRef.current
      canvas.width  = vp.width
      canvas.height = vp.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
      await saveProgress((pageNum / pdf.numPages) * 100)
      try {
        const tc = await page.getTextContent()
        setTtsText(tc.items.map((i: any) => ('str' in i ? i.str : '')).join(' '))
      } catch {}
    } finally {
      setPdfRendering(false)
    }
  }, [])

  useEffect(() => {
    if (book.format !== 'pdf') return
    const t = setTimeout(() => {
      setError('Loading timed out. File may be corrupted.')
      setLoading(false)
    }, 25000)
    ;(async () => {
      try {
        setLoadingPct(15)
        const buf = await getBookFile(book.id)
        if (!buf) throw new Error('Book file not found locally — try uploading again.')
        setLoadingPct(40)

        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const task = pdfjsLib.getDocument({ data: new Uint8Array(buf) })
        task.onProgress = (p: any) => {
          if (p.total) setLoadingPct(40 + Math.round((p.loaded / p.total) * 45))
        }
        const pdf = await task.promise
        clearTimeout(t)
        pdfDocRef.current = pdf
        setPdfTotal(pdf.numPages)
        setPageLabel(`1 / ${pdf.numPages}`)

        const startPage = book.progress_pct && book.progress_pct < 99
          ? Math.max(1, Math.round((book.progress_pct / 100) * pdf.numPages))
          : 1
        setPdfPage(startPage)
        setLoadingPct(100)
        setLoading(false)
        await renderPdfPage(pdf, startPage)

        // Generate cover thumbnail from page 1 on first open
        if (!book.cover_data) {
          try {
            const p1    = await pdf.getPage(1)
            const vp    = p1.getViewport({ scale: 0.4 })
            const cv    = document.createElement('canvas')
            cv.width    = vp.width
            cv.height   = vp.height
            await p1.render({ canvasContext: cv.getContext('2d')!, viewport: vp, canvas: cv }).promise
            const thumb = cv.toDataURL('image/jpeg', 0.75)
            await supabase.from('book_metadata').update({ cover_data: thumb }).eq('id', book.id)
          } catch {}
        }
      } catch (e: any) {
        clearTimeout(t)
        setError(e.message ?? 'Failed to load PDF')
        setLoading(false)
      }
    })()
  }, [])

  // ── Navigation ───────────────────────────────────────────────────────────────

  const goPrev = useCallback(() => {
    if (book.format === 'epub') {
      goToChapter(chapterIdx - 1)
    } else if (book.format === 'pdf') {
      setPdfPage(p => {
        const next = Math.max(1, p - 1)
        setPageLabel(`${next} / ${pdfTotal}`)
        renderPdfPage(pdfDocRef.current, next)
        return next
      })
    }
  }, [book.format, chapterIdx, pdfTotal, goToChapter, renderPdfPage])

  const goNext = useCallback(() => {
    if (book.format === 'epub') {
      goToChapter(chapterIdx + 1)
    } else if (book.format === 'pdf') {
      setPdfPage(p => {
        const next = Math.min(pdfTotal, p + 1)
        setPageLabel(`${next} / ${pdfTotal}`)
        renderPdfPage(pdfDocRef.current, next)
        return next
      })
    }
  }, [book.format, chapterIdx, pdfTotal, goToChapter, renderPdfPage])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPrev()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [goNext, goPrev])

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd   = (e: React.TouchEvent) => {
    const d = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(d) > 50) d > 0 ? goNext() : goPrev()
  }

  const isReader = ['epub', 'pdf'].includes(book.format)

  // ── Render ───────────────────────────────────────────────────────────────────

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
        <button onClick={() => router.back()} className="p-2 rounded-lg shrink-0" style={{ color: '#A8947C' }} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ fontFamily: "'Yeseva One', serif" }}>{book.title}</div>
          {book.author && <div className="text-[0.68rem] truncate" style={{ color: '#6A5840' }}>{book.author}</div>}
        </div>

        {pageLabel && !loading && (
          <div className="text-[0.72rem] shrink-0 tabular-nums" style={{ color: '#6A5840' }}>{pageLabel}</div>
        )}

        {isReader && !loading && !error && (
          <button
            onClick={() => setShowTTS(v => !v)}
            className="p-2 rounded-lg shrink-0"
            style={{ background: showTTS ? 'rgba(200,133,42,0.15)' : 'transparent', color: showTTS ? '#C8852A' : '#6A5840' }}
            aria-label="Listen"
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

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 z-10" style={{ background: '#0C0B09' }}>
            {book.cover_data ? (
              <img src={book.cover_data} alt={book.title} className="w-24 rounded-xl shadow-2xl" style={{ aspectRatio: '2/3', objectFit: 'cover', opacity: 0.85 }} />
            ) : (
              <div className="w-24 rounded-xl flex items-center justify-center" style={{ aspectRatio: '2/3', background: '#1C1915' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C8852A" strokeWidth="1.2" opacity="0.5">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                </svg>
              </div>
            )}
            <div className="w-full max-w-[220px] text-center">
              <div className="text-base font-semibold mb-1 truncate" style={{ fontFamily: "'Yeseva One', serif", color: '#F0E8D8' }}>{book.title}</div>
              <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ background: '#252118' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, loadingPct)}%`, background: '#C8852A' }} />
              </div>
              <div className="text-xs tabular-nums" style={{ color: '#6A5840' }}>{loadingPct < 100 ? `${loadingPct}%` : 'Almost there…'}</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C8852A" strokeWidth="1.2" opacity="0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm" style={{ color: '#E07060' }}>{error}</p>
            <button onClick={() => router.back()} className="mt-2 px-5 py-2 rounded-xl text-sm font-medium" style={{ background: '#1C1915', color: '#A8947C' }}>
              Back to library
            </button>
          </div>
        )}

        {/* EPUB iframe */}
        {book.format === 'epub' && !loading && iframeSrc && (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            sandbox="allow-same-origin"
            title="Book content"
          />
        )}

        {/* PDF canvas */}
        {book.format === 'pdf' && !loading && !error && (
          <div className="w-full h-full overflow-auto flex justify-center p-4 relative">
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', height: 'auto', boxShadow: '0 8px 48px rgba(0,0,0,0.7)', borderRadius: 4 }}
            />
            {pdfRendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg className="animate-spin w-6 h-6" style={{ color: '#C8852A' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Unsupported format */}
        {!['epub','pdf'].includes(book.format) && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-3">
            <p className="text-sm" style={{ color: '#A8947C' }}>{book.format.toUpperCase()} reading is not supported yet.</p>
            <button onClick={() => router.back()} className="px-5 py-2 rounded-xl text-sm" style={{ background: '#1C1915', color: '#A8947C' }}>Back</button>
          </div>
        )}
      </div>

      {/* Bottom nav — hidden when TTS open (TTS has its own chapter nav) */}
      {!loading && !error && isReader && !showTTS && (
        <div className="flex items-center gap-4 px-5 py-4 border-t shrink-0" style={{ borderColor: '#2E2820', background: '#131210' }}>
          <button onClick={goPrev} className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0" style={{ background: '#1C1915', color: '#A8947C' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#252118' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: '#C8852A' }} />
            </div>
            <div className="text-[0.62rem] text-right tabular-nums" style={{ color: '#6A5840' }}>{Math.round(progress)}% complete</div>
          </div>
          <button onClick={goNext} className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0" style={{ background: '#1C1915', color: '#A8947C' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}

      {/* TTS panel */}
      {showTTS && (
        <TTSPanel
          text={ttsText}
          onClose={() => setShowTTS(false)}
          onEnd={onTTSEnd}
          autoPlay={ttsAutoPlay}
          onPrev={goPrev}
          onNext={goNext}
          canPrev={book.format === 'epub' ? chapterIdx > 0 : pdfPage > 1}
          canNext={book.format === 'epub' ? chapterIdx < chapterTotal - 1 : pdfPage < pdfTotal}
        />
      )}
    </div>
  )
}
