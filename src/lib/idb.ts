import { openDB } from 'idb'

const DB_NAME = 'aziza'
const DB_VERSION = 1

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('book_files')) {
        db.createObjectStore('book_files') // keyed by book_id (uuid)
      }
    },
  })
}

export async function saveBookFile(bookId: string, data: ArrayBuffer) {
  const db = await getDB()
  await db.put('book_files', data, bookId)
}

export async function getBookFile(bookId: string): Promise<ArrayBuffer | undefined> {
  const db = await getDB()
  return db.get('book_files', bookId)
}

export async function deleteBookFile(bookId: string) {
  const db = await getDB()
  await db.delete('book_files', bookId)
}

export async function clearAllBookFiles() {
  const db = await getDB()
  await db.clear('book_files')
}
