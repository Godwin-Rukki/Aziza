'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AddBook } from '@/components/add-book'
import { createClient } from '@/lib/supabase/client'
import { deleteBookFile } from '@/lib/idb'

type Book = {
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
  { bg: '#1E0E06', accent: '#C8852A', titleColor: '#E8A060', authorColor: '#7A5030' },
  { bg: '#110A1E', accent: '#8060B0', titleColor: '#C0A0E0', authorColor: '#6040A0' },
  { bg: '#071408', accent: '#4A8050', titleColor: '#80C090', authorColor: '#3A6040' },
  { bg: '#140E02', accent: '#C0A020', titleColor: '#D8C060', authorColor: '#807020' },
  { bg: '#160404', accent: '#C0402A', titleColor: '#E07060', authorColor: '#803020' },
  { bg: '#040A14', accent: '#4080B0', titleColor: '#70A8D8', authorColor: '#305880' },
]

function BookCover({ book, idx, onRemove }: { book: Book; idx: number; onRemove: (id: string) => void }) {
  const style = COVER_STYLES[idx % COVER_STYLES.length]
  const pct = book.progress_pct ?? 0
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Remove "${book.title}"?`)) return
    setDeleting(true)
    onRemove(book.id) // optimistic — remove from UI immediately
    try {
      const supabase = createClient()
      await supabase.from('book_metadata').delete().eq('id', book.id)
      await deleteBookFile(book.id)
    } catch {
      // already removed from UI; nothing to revert cleanly here
    }
  }

  return (
    <div className="group relative" style={{ animation: `fade-in 200ms ease ${idx * 40}ms both` }}>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(180,40,40,0.85)', color: '#fff' }}
        aria-label="Remove book"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <Link href={`/reader/${book.id}`} className="block cursor-pointer">
        <div
          className="w-full rounded-xl overflow-hidden mb-2.5 relative transition-transform duration-200 group-hover:-translate-y-1"
          style={{ aspectRatio: '2/3', background: style.bg, boxShadow: '4px 8px 24px rgba(0,0,0,0.6)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: style.accent }} />
          {book.cover_data ? (
            <img src={book.cover_data} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-end p-3">
              <div className="text-center text-[0.68rem] font-bold leading-snug mb-1" style={{ color: style.titleColor, fontFamily: "'Yeseva One', serif" }}>
                {book.title}
              </div>
              <div className="text-[0.55rem] text-center" style={{ color: style.authorColor }}>{book.author}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: '#252118' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#C8852A' }} />
          </div>
          <span className="text-[0.62rem] min-w-[28px] text-right" style={{ color: '#6A5840' }}>
            {pct > 0 ? `${Math.round(pct)}%` : 'New'}
          </span>
        </div>
        <div className="text-[0.82rem] font-semibold truncate" style={{ color: '#F0E8D8' }}>{book.title}</div>
        <div className="text-[0.72rem] truncate" style={{ color: '#6A5840' }}>{book.author ?? 'Unknown'}</div>
      </Link>
    </div>
  )
}

function EmptyState({ onAdded }: { onAdded: (book: Book) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <svg viewBox="0 0 120 160" width="100" height="134" className="mb-8 opacity-90">
        <rect x="10" y="130" width="100" height="4" rx="2" fill="#2E2820"/>
        <rect x="15" y="90" width="22" height="40" rx="3" fill="#3D1A0A" transform="rotate(-8, 26, 110)"/>
        <rect x="15" y="90" width="22" height="3" rx="1" fill="#C8852A" transform="rotate(-8, 26, 110)"/>
        <rect x="45" y="75" width="18" height="55" rx="2" fill="#1A0D2E"/>
        <rect x="45" y="75" width="18" height="3" rx="1" fill="#8060B0"/>
        <rect x="70" y="65" width="20" height="65" rx="2" fill="#071A0C"/>
        <rect x="70" y="65" width="20" height="3" rx="1" fill="#4A8050"/>
        <ellipse cx="60" cy="45" rx="8" ry="12" fill="#C8852A" opacity="0.2"/>
        <ellipse cx="60" cy="48" rx="5" ry="8" fill="#C8852A" opacity="0.4"/>
        <ellipse cx="60" cy="52" rx="3" ry="4" fill="#E09A40" opacity="0.8"/>
        <circle cx="60" cy="50" r="22" fill="none" stroke="#C8852A" strokeWidth="0.5" opacity="0.15"/>
      </svg>
      <h2 className="text-2xl mb-2" style={{ fontFamily: "'Yeseva One', serif", color: '#F0E8D8' }}>Your shelf awaits</h2>
      <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: '#A8947C' }}>
        Add your first book and Aziza will give it a voice. EPUB, PDF, MOBI, or comics.
      </p>
      <AddBook
        onAdded={onAdded}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
        style={{ background: '#C8852A', color: '#0C0B09', boxShadow: '0 2px 20px rgba(200,133,42,0.2)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add your first book
      </AddBook>
      <div className="flex gap-2 flex-wrap justify-center mt-8">
        {['EPUB', 'PDF', 'MOBI', 'CBZ', 'CBR'].map(f => (
          <span key={f} className="px-3 py-1 rounded-full text-[0.7rem]" style={{ background: '#1C1915', border: '1px solid #2E2820', color: '#A8947C' }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}

const GREETINGS = [
  (n: string) => `Back again, ${n}. The pages missed you.`,
  (n: string) => `Oh, it's ${n}. Thought you forgot about us.`,
  (n: string) => `Look who's here. Ready, ${n}?`,
  (_: string) => `Still chasing stories? Good.`,
  (_: string) => `The shelf is ready. Are you?`,
  (_: string) => `Pick up where you left off.`,
  (_: string) => `Reading is the move. Let's go.`,
]

function sassyGreeting(name: string, bookCount: number): string {
  if (bookCount === 0) return `Nothing to read yet, ${name}. Add something worth your time.`
  const hour = new Date().getHours()
  if (hour < 6)  return `Up before dawn, ${name}? Respect. Read something.`
  if (hour < 12) return `Morning, ${name}. Best time to read.`
  if (hour < 17) return GREETINGS[Math.floor(Math.random() * GREETINGS.length)](name)
  if (hour < 21) return `Evening, ${name}. The story won't finish itself.`
  return `Late night reading? That's the spirit, ${name}.`
}

export function LibraryView({ books: initialBooks, userName = 'reader' }: { books: Book[]; userName?: string }) {
  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [search, setSearch] = useState('')
  const greeting = sassyGreeting(userName, initialBooks.length)

  function onAdded(book: Book) {
    setBooks(prev => [book, ...prev])
  }

  function onRemove(id: string) {
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  const inProgress = books.filter(b => (b.progress_pct ?? 0) > 0 && (b.progress_pct ?? 0) < 100)
  const all = books.filter(b =>
    search
      ? b.title.toLowerCase().includes(search.toLowerCase()) ||
        (b.author ?? '').toLowerCase().includes(search.toLowerCase())
      : true
  )

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div
        className="px-4 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 border-b sticky top-0 z-10"
        style={{ borderColor: '#2E2820', background: '#0C0B09' }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-2xl md:text-[1.75rem] leading-tight" style={{ fontFamily: "'Yeseva One', serif", color: '#F0E8D8' }}>
              Your Library
            </h1>
            <p className="text-[0.72rem] mt-0.5 italic" style={{ color: '#C8852A' }}>{greeting}</p>
            <p className="text-xs md:text-sm mt-0.5" style={{ color: '#A8947C' }}>
              {books.length} book{books.length !== 1 ? 's' : ''}
              {inProgress.length > 0 && ` · ${inProgress.length} in progress`}
            </p>
          </div>
          <AddBook
            onAdded={onAdded}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold shrink-0"
            style={{ background: '#C8852A', color: '#0C0B09' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Add Book</span>
            <span className="sm:hidden">Add</span>
          </AddBook>
        </div>
        <div className="relative flex items-center">
          <svg className="absolute left-3 w-4 h-4 pointer-events-none" style={{ color: '#6A5840' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search books…"
            className="pl-9 pr-3 py-2 rounded-xl text-sm w-full"
            style={{ background: '#1C1915', border: '1px solid #2E2820', color: '#F0E8D8', outline: 'none', maxWidth: 360 }}
            onFocus={e => (e.target.style.borderColor = '#C8852A')}
            onBlur={e => (e.target.style.borderColor = '#2E2820')}
          />
        </div>
      </div>

      {/* Body */}
      {books.length === 0 ? (
        <EmptyState onAdded={onAdded} />
      ) : (
        <div className="px-4 md:px-8 py-5 md:py-7">
          {inProgress.length > 0 && !search && (
            <>
              <div className="text-[0.68rem] uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: '#6A5840' }}>
                Continue listening
              </div>
              <div className="grid gap-4 md:gap-5 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                {inProgress.map((book, i) => <BookCover key={book.id} book={book} idx={i} onRemove={onRemove} />)}
              </div>
            </>
          )}
          <div className="text-[0.68rem] uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: '#6A5840' }}>
            {search ? `Results for "${search}"` : 'All books'}
          </div>
          {all.length === 0 ? (
            <p className="text-sm" style={{ color: '#6A5840' }}>No books match.</p>
          ) : (
            <div className="grid gap-4 md:gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
              {all.map((book, i) => <BookCover key={book.id} book={book} idx={i} onRemove={onRemove} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
