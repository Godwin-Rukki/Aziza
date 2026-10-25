const KEY = 'aziza_streak_dates'

export function markTodayRead() {
  if (typeof window === 'undefined') return
  const today = new Date().toISOString().slice(0, 10)
  const stored = localStorage.getItem(KEY)
  const dates: string[] = stored ? JSON.parse(stored) : []
  if (!dates.includes(today)) {
    dates.push(today)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 365)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    localStorage.setItem(KEY, JSON.stringify(dates.filter(d => d >= cutoffStr)))
  }
}

export function getStreak(): number {
  if (typeof window === 'undefined') return 0
  const stored = localStorage.getItem(KEY)
  if (!stored) return 0
  const dates = [...new Set<string>(JSON.parse(stored) as string[])].sort().reverse()
  if (dates.length === 0) return 0

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dates[0] !== today && dates[0] !== yesterday) return 0

  let streak = 1
  let prev = dates[0]
  for (let i = 1; i < dates.length; i++) {
    const expected = new Date(new Date(prev + 'T12:00:00').getTime() - 86400000).toISOString().slice(0, 10)
    if (dates[i] === expected) { streak++; prev = dates[i] } else break
  }
  return streak
}
