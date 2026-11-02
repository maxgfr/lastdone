import { STORAGE_KEY, type KeyValue } from './store'

// maxgfr.github.io serves many apps from one origin, so they all share one localStorage quota
// (about 5 MB). The chore history grows without bound, so it lives in IndexedDB, under a database
// named after the app, and only small settings stay in localStorage.

export const DB_NAME = 'lastdone-data'
const OBJECT_STORE = 'kv'

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  const req = factory.open(DB_NAME, 1)
  req.onupgradeneeded = () => req.result.createObjectStore(OBJECT_STORE)
  return request(req)
}

function put(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBJECT_STORE, 'readwrite')
    tx.objectStore(OBJECT_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/** Moves this app's own keys (data and its backups) out of localStorage, once. */
async function migrate(db: IDBDatabase, values: Map<string, string>, legacy: Storage | undefined) {
  if (!legacy) return
  const keys: string[] = []
  for (let i = 0; i < legacy.length; i++) {
    const key = legacy.key(i)
    if (key === STORAGE_KEY || key?.startsWith(`${STORAGE_KEY}:backup-`)) keys.push(key)
  }
  for (const key of keys) {
    const value = legacy.getItem(key)
    if (value === null) continue
    if (!values.has(key)) {
      await put(db, key, value)
      values.set(key, value)
    }
    // Only removed once IndexedDB holds a copy: a failed put leaves localStorage untouched.
    legacy.removeItem(key)
  }
}

function legacyStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/**
 * Opens the app's IndexedDB storage, migrating data left in localStorage by earlier versions.
 * Reads are served from memory; each write returns the promise of its IndexedDB transaction.
 * Falls back to localStorage, then to memory only, when IndexedDB is unavailable.
 */
export async function openStorage(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  legacy: Storage | undefined = legacyStorage(),
): Promise<KeyValue | undefined> {
  if (!factory) return legacy
  let db: IDBDatabase
  const values = new Map<string, string>()
  try {
    db = await openDb(factory)
    const tx = db.transaction(OBJECT_STORE, 'readonly')
    const store = tx.objectStore(OBJECT_STORE)
    const [keys, items] = await Promise.all([request(store.getAllKeys()), request(store.getAll())])
    keys.forEach((key, i) => {
      if (typeof key === 'string' && typeof items[i] === 'string') values.set(key, items[i])
    })
  } catch {
    return legacy
  }
  try {
    await migrate(db, values, legacy)
  } catch {
    // Whatever could not be moved stays in localStorage and is retried on the next start.
    if (!values.has(STORAGE_KEY)) return legacy
  }
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
      return put(db, key, value)
    },
  }
}
