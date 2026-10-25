export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HabitsView } from '@/components/habits-view'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: books } = await supabase
    .from('book_metadata')
    .select('id, title, author, cover_data, progress_pct, last_opened')
    .eq('user_id', user.id)
    .order('last_opened', { ascending: false, nullsFirst: false })

  return <HabitsView books={books ?? []} />
}
