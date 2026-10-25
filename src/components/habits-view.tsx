'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getStreak, markTodayRead } from '@/lib/streak'

type Book = {
  id: string
  title: string
  author: string | null
  cover_data: string | null
  progress_pct: number | null
  last_opened: string | null
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col" style={{ background: '#131210', border: '1px solid #2E2820' }}>
      <div className="text-[1.75rem] font-bold mb-0.5 leading-none" style={{ fontFamily: "'Yeseva One', serif", color: '#C8852A' }}>
        {value}
      </div>
      <div className="text-xs font-medium mt-1" style={{ color: '#F0E8D8' }}>{label}</div>
      {sub && <div className="text-[0.62rem] mt-0.5" style={{ color: '#6A5840' }}>{sub}</div>}
    </div>
  )
}

export function HabitsView({ books }: { books: Book[] }) {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    markTodayRead()
    setStreak(getStreak())
  }, [])

  const total      = books.length
  const completed  = books.filter(b => (b.progress_pct ?? 0) >= 95).length
  const inProgress = books.filter(b => { const p = b.progress_pct ?? 0; return p > 0 && p < 95 }).length
  const activBooks = books.filter(b => (b.progress_pct ?? 0) > 0)

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      <h1 className="mb-1" style={{ fontFamily: "'Yeseva One', serif", fontSize: '1.5rem', color: '#F0E8D8' }}>
        Habits
      </h1>
      <p className="text-sm mb-6" style={{ color: '#6A5840' }}>
        {streak > 1
          ? `${streak} days in a row. Keep the fire going.`
          : streak === 1
          ? 'Day one. Come back tomorrow to build a streak.'
          : 'Open a book today to start your streak.'}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard
          label="Day streak"
          value={streak > 0 ? streak : '—'}
          sub={streak > 0 ? 'days in a row' : 'Read today to start'}
        />
        <StatCard
          label="Books added"
          value={total > 0 ? total : '—'}
          sub={total > 0 ? `in your library` : 'Library is empty'}
        />
        <StatCard
          label="Completed"
          value={completed > 0 ? completed : '—'}
          sub={completed > 0 ? `finished` : 'None yet'}
        />
        <StatCard
          label="In progress"
          value={inProgress > 0 ? inProgress : '—'}
          sub={inProgress > 0 ? 'reading now' : 'Nothing started'}
        />
      </div>

      {activBooks.length > 0 && (
        <>
          <div className="text-[0.68rem] uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: '#6A5840' }}>
            Your progress
          </div>
          <div className="flex flex-col gap-3">
            {activBooks.slice(0, 8).map(book => {
              const pct = book.progress_pct ?? 0
              return (
                <Link
                  key={book.id}
                  href={`/reader/${book.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: '#131210', border: '1px solid #2E2820' }}
                >
                  {book.cover_data ? (
                    <img
                      src={book.cover_data}
                      alt={book.title}
                      className="w-10 h-14 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-14 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ background: '#1C1915' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A5840" strokeWidth="1.5">
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate mb-0.5" style={{ color: '#F0E8D8' }}>{book.title}</div>
                    <div className="text-xs truncate mb-2" style={{ color: '#6A5840' }}>{book.author ?? 'Unknown'}</div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: '#252118' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: pct >= 95 ? '#4A8050' : '#C8852A' }}
                      />
                    </div>
                    <div className="text-[0.62rem] mt-0.5" style={{ color: '#6A5840' }}>
                      {pct >= 95 ? 'Completed' : `${Math.round(pct)}%`}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E2820" strokeWidth="2" className="shrink-0">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {total === 0 && (
        <div className="text-center py-12">
          <p className="text-sm mb-4" style={{ color: '#6A5840' }}>
            No books yet. Add one to start tracking your reading.
          </p>
          <Link
            href="/app"
            className="inline-block px-5 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#C8852A', color: '#0C0B09' }}
          >
            Go to Library
          </Link>
        </div>
      )}
    </div>
  )
}
