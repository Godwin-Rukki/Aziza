export type BookMeta = {
  title: string
  author: string
  format: 'epub' | 'pdf' | 'cbz' | 'cbr' | 'mobi'
  cover_data: string | null // base64 data URL
}

export async function parseBook(file: File): Promise<BookMeta> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const format = (['epub','pdf','cbz','cbr','mobi'] as const).find(f => f === ext) ?? 'epub'

  if (format === 'epub') return parseEpub(file)
  if (format === 'pdf')  return parsePdf(file)
  if (format === 'cbz') return parseCbz(file)
  // CBR/MOBI — basic metadata from filename only
  return {
    title: file.name.replace(/\.[^.]+$/, ''),
    author: '',
    format,
    cover_data: null,
  }
}

async function parseEpub(file: File): Promise<BookMeta> {
  const { default: ePub } = await import('epubjs')
  const buf = await file.arrayBuffer()
  const book = ePub(buf)
  await book.ready

  const meta  = await book.loaded.metadata as { title?: string; creator?: string }
  const title = meta.title  || file.name.replace(/\.epub$/i, '')
  const author = meta.creator || ''

  // Cover
  let cover_data: string | null = null
  try {
    const coverUrl = await (book as any).coverUrl()
    if (coverUrl) {
      const resp = await fetch(coverUrl)
      const blob = await resp.blob()
      cover_data = await blobToDataUrl(blob)
    }
  } catch {}

  return { title, author, format: 'epub', cover_data }
}

async function parsePdf(file: File): Promise<BookMeta> {
  // Metadata only — no pdfjs, no canvas render (that was the bottleneck)
  const buf   = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let title   = file.name.replace(/\.pdf$/i, '')
  let author  = ''
  try {
    const text         = new TextDecoder('latin1').decode(bytes.slice(0, 16384))
    const titleMatch   = text.match(/\/Title\s*\(([^)]+)\)/)
    const authorMatch  = text.match(/\/Author\s*\(([^)]+)\)/)
    if (titleMatch?.[1]?.trim())  title  = titleMatch[1].trim()
    if (authorMatch?.[1]?.trim()) author = authorMatch[1].trim()
  } catch {}
  return { title, author, format: 'pdf', cover_data: null }
}

async function parseCbz(file: File): Promise<BookMeta> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  const imageFiles = Object.keys(zip.files)
    .filter(name => /\.(jpe?g|png|webp|gif)$/i.test(name) && !zip.files[name].dir)
    .sort()

  let cover_data: string | null = null
  if (imageFiles.length > 0) {
    const blob = await zip.files[imageFiles[0]].async('blob')
    cover_data = await blobToDataUrl(blob)
  }

  return {
    title: file.name.replace(/\.[^.]+$/, ''),
    author: '',
    format: 'cbz',
    cover_data,
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
