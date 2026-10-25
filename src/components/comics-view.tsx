'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AddBook } from '@/components/add-book'

type Comic = {
  id: string
  title: string
  author: string | null
  format: string
  cover_data: string | null
  progress_pct: number | null
  last_opened: string | null
  date_added: string
}

const COVER_STYLES = [
  { bg: '#1A0610', accent: '#C83060' },
  { bg: '#0E0A1E', accent: '#6030C0' },
  { bg: '#071018', accent: '#2060B0' },
  { bg: '#180C02', accent: '#C86020' },
  { bg: '#041410', accent: '#208060' },
  { bg: '#180808', accent: '#C03030' },
]

function ComicCover({ comic, idx }: { comic: Comic; idx: number }) {
  const style = COVER_STYLES[idx % COVER_STYLES.length]
  const pct = comic.progress_pct ?? 0

  return (
    <Link
      href={`/comics/${comic.id}`}
      className="group cursor-pointer block"
      style={{ animation: `fade-in 200ms ease ${idx * 40}ms both` }}
    >
      <div
        className="w-full rounded-xl overflow-hidden mb-2.5 relative transition-transform duration-200 group-hover:-translate-y-1"
        style={{ aspectRatio: '2/3', background: style.bg, boxShadow: '4px 8px 24px rgba(0,0,0,0.6)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: style.accent }} />
        {comic.cover_data ? (
          <img src={comic.cover_data} alt={comic.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-end p-3">
            <div className="text-center text-[0.68rem] font-bold leading-snug mb-1" style={{ color: '#E8D0D8', fontFamily: "'Yeseva One', serif" }}>
              {comic.title}
            </div>
          </div>
        )}
        {/* Format badge */}
        <div
          className="absolute top-2 right-2 text-[0.58rem] font-bold px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(0,0,0,0.6)', color: style.accent, border: `1px solid ${style.accent}40` }}
        >
          {comic.format.toUpperCase()}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: '#252118' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.accent }} />
        </div>
        <span className="text-[0.62rem] min-w-[28px] text-right" style={{ color: '#6A5840' }}>
          {pct > 0 ? `${Math.round(pct)}%` : 'New'}
        </span>
      </div>

      <div className="text-[0.82rem] font-semibold truncate" style={{ color: '#F0E8D8' }}>{comic.title}</div>
      {comic.author && <div className="text-[0.72rem] truncate" style={{ color: '#6A5840' }}>{comic.author}</div>}
    </Link>
  )
}

function EmptyState({ onAdd }: { onAdd: (b: any) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <svg viewBox="0 0 120 140" width="100" height="117" className="mb-8 opacity-80">
        <rect x="15" y="10" width="40" height="55" rx="3" fill="#2A0A1A"/>
        <rect x="15" y="10" width="40" height="3" fill="#C83060"/>
        <rect x="65" y="20" width="40" height="45" rx="3" fill="#1A0A2E"/>
        <rect x="65" y="20" width="40" height="3" fill="#6030C0"/>
        <rect x="15" y="75" width="40" height="45" rx="3" fill="#071018"/>
        <rect x="15" y="75" width="40" height="3" fill="#2060B0"/>
        <rect x="65" y="75" width="40" height="45" rx="3" fill="#1A0A06"/>
        <rect x="65" y="75" width="40" height="3" fill="#C86020"/>
      </svg>
      <h2 className="text-2xl mb-2" style={{ fontFamily: "'Yeseva One', serif", color: '#F0E8D8' }}>
        No comics yet
      </h2>
      <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: '#A8947C' }}>
        Add your CBZ files and read comics panel by panel.
      </p>
      <AddBook
        onAdded={onAdd}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
        style={{ background: '#C83060', color: '#F0E8D8' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add comic
      </AddBook>
      <div className="flex gap-2 flex-wrap justify-center mt-6">
        {['CBZ', 'CBR'].map(f => (
          <span key={f} className="px-3 py-1 rounded-full text-[0.7rem]" style={{ background: '#1C1915', border: '1px solid #2E2820', color: '#A8947C' }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ComicsView({ comics: initialComics }: { comics: Comic[] }) {
  const [comics, setComics] = useState<Comic[]>(initialComics)
  const [search, setSearch] = useState('')
  const router = useRouter()

  function onAdded(book: any) {
    setComics(prev => [book, ...prev])
  }
  const refresh = () => router.refresh()

  const filtered = comics.filter(c =>
    search ? c.title.toLowerCase().includes(search.toLowerCase()) : true
  )

  return (
    <div className="animate-fade-in">
      <div
        className="flex items-start justify-between gap-4 flex-wrap px-8 pt-7 pb-5 border-b sticky top-0 z-10"
        style={{ borderColor: '#2E2820', background: '#0C0B09' }}
      >
        <div>
          <h1 className="text-[1.75rem] leading-tight" style={{ fontFamily: "'Yeseva One', serif", color: '#F0E8D8' }}>
            Comics
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#A8947C' }}>
            {comics.length} title{comics.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2.5 items-center">
          <div className="relative flex items-center">
            <svg className="absolute left-3 w-4 h-4 pointer-events-none" style={{ color: '#6A5840' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search comics…"
              className="pl-9 pr-3 py-2 rounded-xl text-sm"
              style={{ background: '#1C1915', border: '1px solid #2E2820', color: '#F0E8D8', outline: 'none', width: 200 }}
              onFocus={e => (e.target.style.borderColor = '#C83060')}
              onBlur={e => (e.target.style.borderColor = '#2E2820')}
            />
          </div>
          <AddBook
            onAdded={onAdded}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#C83060', color: '#F0E8D8' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add
          </AddBook>
        </div>
      </div>

      {comics.length === 0 ? (
        <EmptyState onAdd={onAdded} />
      ) : (
        <div className="px-8 py-7">
          {filtered.length === 0 ? (
            <p className="text-sm" style={{ color: '#6A5840' }}>No comics match.</p>
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {filtered.map((c, i) => <ComicCover key={c.id} comic={c} idx={i} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
