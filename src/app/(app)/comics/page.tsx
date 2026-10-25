export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ComicsView } from '@/components/comics-view'

export default async function ComicsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: comics } = await supabase
    .from('book_metadata')
    .select('id, title, author, format, cover_data, progress_pct, last_opened, date_added')
    .eq('user_id', user.id)
    .in('format', ['cbz', 'cbr'])
    .order('last_opened', { ascending: false, nullsFirst: false })

  return <ComicsView comics={comics ?? []} />
}
