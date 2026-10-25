export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ComicReader } from '@/components/comic-reader'

export default async function ComicReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: comic } = await supabase
    .from('book_metadata')
    .select('id, title, author, format, cover_data, progress_pct')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!comic) redirect('/app/comics')

  await supabase
    .from('book_metadata')
    .update({ last_opened: new Date().toISOString() })
    .eq('id', id)

  return <ComicReader comic={comic} />
}
