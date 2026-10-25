export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookReader } from '@/components/book-reader'

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: book } = await supabase
    .from('book_metadata')
    .select('id, title, author, format, cover_data, progress_pct')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!book) redirect('/app')

  await supabase
    .from('book_metadata')
    .update({ last_opened: new Date().toISOString() })
    .eq('id', id)

  return <BookReader book={book} />
}
