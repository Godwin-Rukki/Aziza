export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LibraryView } from '@/components/library-view'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: books } = await supabase
    .from('book_metadata')
    .select('*')
    .eq('user_id', user.id)
    .order('last_opened', { ascending: false, nullsFirst: false })

  return <LibraryView books={books ?? []} />
}
