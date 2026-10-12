import { describe, expect, it } from 'vitest'
import { formatDay, intentJsonSchema, parseDay, toIntent } from './schema'

describe('intent schema', () => {
  it('accepts valid intents and drops bad optional fields', () => {
    expect(toIntent({ action: 'log', task: ' plantes ', date: '2026-10-11' })).toEqual({
      action: 'log',
      task: 'plantes',
      date: '2026-10-11',
    })
    expect(toIntent({ action: 'create', task: 'x', intervalDays: 2.5, date: '2026-02-30' })).toEqual({
      action: 'create',
      task: 'x',
    })
    expect(toIntent({ action: 'list', task: '' })).toEqual({ action: 'list', task: '' })
  })

  it('rejects unusable output', () => {
    expect(toIntent(null)).toBeUndefined()
    expect(toIntent({ action: 'explode', task: 'x' })).toBeUndefined()
    expect(toIntent({ action: 'log', task: '  ' })).toBeUndefined()
  })

  it('parses and formats calendar days', () => {
    expect(parseDay('2026-02-29')).toBeUndefined()
    expect(formatDay(parseDay('2026-10-03')!)).toBe('2026-10-03')
  })

  it('keeps the JSON schema in sync with the actions', () => {
    expect(intentJsonSchema.properties.action.enum).toContain('unknown')
    expect(intentJsonSchema.required).toEqual(['action', 'task'])
  })
})
