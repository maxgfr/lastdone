import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { openStorage } from './idb'
import { STORAGE_KEY, Store } from './store'

function legacyStorage(initial: Record<string, string> = {}): Storage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    get length() {
      return data.size
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
  }
}

const saved = JSON.stringify({ version: 1, tasks: [{ id: 't1', name: 'Water the plants', aliases: [], createdAt: '2026-01-01T00:00:00.000Z' }], log: [] })

describe('openStorage', () => {
  it('moves data from localStorage to IndexedDB once, leaving other keys alone', async () => {
    const factory = new IDBFactory()
    const legacy = legacyStorage({ [STORAGE_KEY]: saved, 'lastdone:model': 'm', theme: 'dark' })
    const storage = await openStorage(factory, legacy)
    expect(new Store(storage).tasks.map((t) => t.name)).toEqual(['Water the plants'])
    expect([...legacy.data.keys()]).toEqual(['lastdone:model', 'theme'])

    // Next start: read back from IndexedDB, nothing left to migrate.
    const again = await openStorage(factory, legacyStorage())
    expect(new Store(again).tasks).toHaveLength(1)
  })

  it('does not overwrite IndexedDB data with a stale localStorage copy', async () => {
    const factory = new IDBFactory()
    const first = new Store(await openStorage(factory, legacyStorage()))
    first.addTask({ name: 'Descale the kettle' })
    expect(await first.saved()).toBe(true)

    const legacy = legacyStorage({ [STORAGE_KEY]: saved })
    const store = new Store(await openStorage(factory, legacy))
    expect(store.tasks.map((t) => t.name)).toEqual(['Descale the kettle'])
    expect(legacy.data.size).toBe(0)
  })

  it('persists changes across restarts', async () => {
    const factory = new IDBFactory()
    const store = new Store(await openStorage(factory, legacyStorage()))
    const task = store.addTask({ name: 'Change the sheets', intervalDays: 7 })
    store.logDone(task.id)
    expect(await store.saved()).toBe(true)
    const reloaded = new Store(await openStorage(factory, legacyStorage()))
    expect(reloaded.history(task.id)).toHaveLength(1)
  })

  it('falls back to localStorage without IndexedDB', async () => {
    const legacy = legacyStorage({ [STORAGE_KEY]: saved })
    expect(await openStorage(undefined, legacy)).toBe(legacy)
  })
})

describe('Store.saved', () => {
  it('reports a write the backend rejected later', async () => {
    const store = new Store({ getItem: () => null, setItem: () => Promise.reject(new Error('QuotaExceededError')) })
    store.addTask({ name: 'Mop the floor' })
    expect(store.lastSaveOk).toBe(true)
    expect(await store.saved()).toBe(false)
    expect(store.tasks).toHaveLength(1)
  })

  it('reports a write refused synchronously', async () => {
    const store = new Store({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    })
    store.addTask({ name: 'Mop the floor' })
    expect(await store.saved()).toBe(false)
  })
})
