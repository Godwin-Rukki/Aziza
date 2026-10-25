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
  // CBZ/CBR/MOBI — basic metadata from filename only
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
  const pdfjsLib = await import('pdfjs-dist')
  // Point worker to bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
  const meta = await pdf.getMetadata() as { info?: { Title?: string; Author?: string } }

  const title  = meta.info?.Title  || file.name.replace(/\.pdf$/i, '')
  const author = meta.info?.Author || ''

  // Render first page as cover thumbnail
  let cover_data: string | null = null
  try {
    const page   = await pdf.getPage(1)
    const vp     = page.getViewport({ scale: 0.4 })
    const canvas = document.createElement('canvas')
    canvas.width  = vp.width
    canvas.height = vp.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
    cover_data = canvas.toDataURL('image/jpeg', 0.7)
  } catch {}

  return { title, author, format: 'pdf', cover_data }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
