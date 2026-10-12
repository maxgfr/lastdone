import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, Store, normalize, similarity, stem, toTaskName, type KeyValue } from './store'

function memory(initial: Record<string, string> = {}): KeyValue & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

describe('text helpers', () => {
  it('normalizes accents, case and punctuation', () => {
    expect(normalize('  Détartrer la BOUILLOIRE ! ')).toBe('detartrer la bouilloire')
    expect(normalize("l'aspirateur")).toBe('l aspirateur')
  })

  it('stems FR and EN inflections to the same root', () => {
    expect(stem('arrosees')).toBe(stem('arroser'))
    expect(stem('watered')).toBe(stem('water'))
    expect(stem('plantes')).toBe(stem('plant'))
  })

  it('scores a past-tense phrase as the same task', () => {
    expect(similarity('arrosé les plantes', 'Arroser les plantes')).toBe(1)
    expect(similarity('les plantes', 'Arroser les plantes')).toBeGreaterThanOrEqual(0.6)
    expect(similarity('arroser le jardin', 'Arroser les plantes')).toBeLessThan(0.6)
    expect(similarity('aroser les plantes', 'Arroser les plantes')).toBe(1)
    expect(similarity('arrsoer les plantes', 'Arroser les plantes')).toBe(1)
  })

  it('turns a past-tense phrase into a task name', () => {
    expect(toTaskName('arrosé les plantes')).toBe('Arroser les plantes')
    expect(toTaskName('détartré la bouilloire')).toBe('Détartrer la bouilloire')
    expect(toTaskName('fait le plein')).toBe('Faire le plein')
    expect(toTaskName('watered the plants')).toBe('Water the plants')
    expect(toTaskName('changed the sheets')).toBe('Change the sheets')
    expect(toTaskName('emptied the bin')).toBe('Empty the bin')
    expect(toTaskName('mopped the floor')).toBe('Mop the floor')
  })
})

describe('Store', () => {
  it('persists tasks and log entries', () => {
    const storage = memory()
    const store = new Store(storage)
    const task = store.addTask({ name: ' Arroser les plantes ', intervalDays: 5 })
    store.logDone(task.id, new Date('2026-10-03T10:00:00Z'))

    const reloaded = new Store(storage)
    expect(reloaded.tasks).toEqual([task])
    expect(reloaded.tasks[0]!.name).toBe('Arroser les plantes')
    expect(reloaded.log).toEqual([{ taskId: task.id, at: '2026-10-03T10:00:00.000Z' }])
  })

  it('updates and deletes a task with its history', () => {
    const store = new Store(memory())
    const task = store.addTask({ name: 'Bouilloire', intervalDays: 30 })
    store.logDone(task.id)
    expect(store.updateTask(task.id, { intervalDays: null, aliases: ['détartrage'] })).toMatchObject({
      name: 'Bouilloire',
      aliases: ['détartrage'],
    })
    expect(store.getTask(task.id)?.intervalDays).toBeUndefined()
    store.deleteTask(task.id)
    expect(store.tasks).toEqual([])
    expect(store.log).toEqual([])
  })

  it('returns history newest first and can undo one entry', () => {
    const store = new Store(memory())
    const task = store.addTask({ name: 'Sortir les poubelles' })
    const older = store.logDone(task.id, new Date('2026-10-01T08:00:00Z'))
    const newer = store.logDone(task.id, new Date('2026-10-08T08:00:00Z'))
    expect(store.history(task.id)).toEqual([newer, older])
    store.removeEntry(newer)
    expect(store.history(task.id)).toEqual([older])
  })

  it('finds a task by name or alias, loosely', () => {
    const store = new Store(memory())
    const plants = store.addTask({ name: 'Arroser les plantes' })
    const kettle = store.addTask({ name: 'Détartrer la bouilloire', aliases: ['kettle'] })
    expect(store.findTask('arrosé les plantes')).toBe(plants)
    expect(store.findTask('LES PLANTES')).toBe(plants)
    expect(store.findTask('detartre la bouilloire')).toBe(kettle)
    expect(store.findTask('the kettle')).toBe(kettle)
    expect(store.findTask('vidange de la voiture')).toBeUndefined()
  })

  it('notifies subscribers and keeps snapshots stable between changes', () => {
    const store = new Store(memory())
    let calls = 0
    const unsubscribe = store.subscribe(() => calls++)
    const before = store.getSnapshot()
    expect(store.getSnapshot()).toBe(before)
    store.addTask({ name: 'Aspirateur' })
    expect(store.getSnapshot()).not.toBe(before)
    unsubscribe()
    store.addTask({ name: 'Lessive' })
    expect(calls).toBe(1)
  })

  it('round-trips through export and import', () => {
    const source = new Store(memory())
    const task = source.addTask({ name: 'Changer les draps', intervalDays: 14, aliases: ['draps'] })
    source.logDone(task.id, new Date('2026-09-30T12:00:00Z'))

    const target = new Store(memory())
    target.importJSON(source.exportJSON())
    expect(target.getSnapshot()).toEqual(source.getSnapshot())
  })

  it('rejects invalid imports without touching existing data', () => {
    const store = new Store(memory())
    store.addTask({ name: 'Garder' })
    expect(() => store.importJSON('not json')).toThrow('JSON')
    expect(() => store.importJSON('{"version":2,"tasks":[],"log":[]}')).toThrow('version')
    expect(() =>
      store.importJSON('{"version":1,"tasks":[],"log":[{"taskId":"ghost","at":"2026-01-01"}]}'),
    ).toThrow('Log entry')
    expect(store.tasks.map((t) => t.name)).toEqual(['Garder'])
  })

  it('backs up unreadable stored data instead of overwriting it', () => {
    const storage = memory({ [STORAGE_KEY]: '{broken' })
    const store = new Store(storage)
    expect(store.loadError).toBeTruthy()
    expect(store.tasks).toEqual([])
    const backups = Object.keys(storage.data).filter((k) => k.startsWith(`${STORAGE_KEY}:backup-`))
    expect(backups).toHaveLength(1)
    expect(storage.data[backups[0]!]).toBe('{broken')
  })

  it('keeps working in memory when storage throws', () => {
    const storage: KeyValue = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    const store = new Store(storage)
    store.addTask({ name: 'Aspirateur' })
    expect(store.tasks).toHaveLength(1)
    expect(store.lastSaveOk).toBe(false)
  })
})
