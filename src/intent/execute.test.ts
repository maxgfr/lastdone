import { describe, expect, it } from 'vitest'
import { Store, type KeyValue } from '../domain/store'
import { execute, formatInterval } from './execute'
import type { Intent } from './schema'

const memory = (): KeyValue => {
  const data: Record<string, string> = {}
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}
const now = new Date(2026, 9, 12, 9)

function setup() {
  const store = new Store(memory())
  const plants = store.addTask({ name: 'Arroser les plantes', intervalDays: 7 })
  store.logDone(plants.id, new Date(2026, 9, 3, 18))
  return { store, plants }
}

describe('execute', () => {
  it('answers when a task was last done, with the delay', () => {
    const { store } = setup()
    const reply = execute({ action: 'query', task: 'arrosé les plantes' }, store, now)
    expect(reply.text).toBe(
      '“Arroser les plantes”: last done 9 days ago, on October 3. Overdue by 2 days (was due October 10).',
    )
    expect(reply.tone).toBe('warn')
  })

  it('logs a passage today or on a given day', () => {
    const { store, plants } = setup()
    expect(execute({ action: 'log', task: 'les plantes' }, store, now).text).toBe(
      'Logged: “Arroser les plantes” done today. Next: in 7 days (October 19).',
    )
    execute({ action: 'log', task: 'plantes', date: '2026-10-11' }, store, now)
    expect(store.history(plants.id).map((e) => new Date(e.at).getDate())).toEqual([12, 11, 3])
  })

  it('refuses a date in the future', () => {
    const { store, plants } = setup()
    expect(execute({ action: 'log', task: 'plantes', date: '2026-10-20' }, store, now).tone).toBe('warn')
    expect(store.history(plants.id)).toHaveLength(1)
  })

  it('offers to create an unknown task instead of inventing one', () => {
    const { store } = setup()
    const reply = execute({ action: 'log', task: 'détartré la bouilloire', date: '2026-10-11' }, store, now)
    expect(reply.tone).toBe('warn')
    expect(store.tasks).toHaveLength(1)
    expect(reply.suggestion?.intents).toEqual<Intent[]>([
      { action: 'create', task: 'Détartrer la bouilloire' },
      { action: 'log', task: 'Détartrer la bouilloire', date: '2026-10-11' },
    ])
    for (const intent of reply.suggestion!.intents) execute(intent, store, now, { confirmed: true })
    const kettle = store.findTask('bouilloire')!
    expect(kettle.name).toBe('Détartrer la bouilloire')
    expect(store.history(kettle.id)).toHaveLength(1)
  })

  it('creates a task, or updates the interval of an existing one', () => {
    const { store, plants } = setup()
    expect(execute({ action: 'create', task: 'vidange', intervalDays: 365 }, store, now).text).toBe(
      'New task “Vidange”, every year.',
    )
    expect(execute({ action: 'create', task: 'arroser', intervalDays: 5 }, store, now).text).toBe(
      '“Arroser les plantes” is now every 5 days.',
    )
    expect(store.getTask(plants.id)?.intervalDays).toBe(5)
  })

  it('renames a task and keeps the old name as an alias', () => {
    const { store, plants } = setup()
    execute({ action: 'update', task: 'plantes', newName: 'Plantes du salon' }, store, now)
    expect(store.getTask(plants.id)).toMatchObject({ name: 'Plantes du salon', aliases: ['Arroser les plantes'] })
    expect(store.findTask('arroser les plantes')?.id).toBe(plants.id)
  })

  it('asks for confirmation before deleting', () => {
    const { store } = setup()
    const reply = execute({ action: 'delete', task: 'plantes' }, store, now)
    expect(reply.text).toBe('Delete “Arroser les plantes” and its 1 entry?')
    expect(store.tasks).toHaveLength(1)
    execute(reply.suggestion!.intents[0]!, store, now, { confirmed: true })
    expect(store.tasks).toHaveLength(0)
  })

  it('lists what is overdue or due soon', () => {
    const { store } = setup()
    const kettle = store.addTask({ name: 'Détartrer la bouilloire', intervalDays: 30 })
    store.logDone(kettle.id, new Date(2026, 9, 1))
    store.addTask({ name: 'Lessive' })
    expect(execute({ action: 'list', task: '' }, store, now).text).toBe('Overdue: Arroser les plantes.')
    expect(execute({ action: 'list', task: '' }, new Store(memory()), now).tone).toBe('info')
  })

  it('formats intervals', () => {
    expect([1, 7, 14, 30, 5, 365].map(formatInterval)).toEqual([
      'every day',
      'every week',
      'every 2 weeks',
      'every month',
      'every 5 days',
      'every year',
    ])
  })
})

describe('execute with a task id', () => {
  it('logs the tapped task even when another name matches as well', () => {
    const store = new Store(memory())
    const a = store.addTask({ name: 'Water the plants' })
    const b = store.addTask({ name: 'Water plants' })
    execute({ action: 'log', task: b.name, taskId: b.id }, store, now)
    expect(store.history(a.id)).toHaveLength(0)
    expect(store.history(b.id)).toHaveLength(1)
  })

  it('deletes the task named in the confirmation, by id', () => {
    const store = new Store(memory())
    const a = store.addTask({ name: 'Water the plants' })
    const b = store.addTask({ name: 'Water plants' })
    const reply = execute({ action: 'delete', task: 'water plants', taskId: b.id }, store, now)
    execute(reply.suggestion!.intents[0]!, store, now, { confirmed: true })
    expect(store.tasks.map((t) => t.id)).toEqual([a.id])
  })
})
