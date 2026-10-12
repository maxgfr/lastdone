import { describe, expect, it } from 'vitest'
import type { Task } from '../domain/store'
import { schedulePatch } from './TaskList'

const task: Task = { id: 'p', name: 'Water the plants', aliases: [], intervalDays: 5, createdAt: '2026-01-01T00:00:00Z' }

describe('schedulePatch', () => {
  it('leaves untouched fields alone, so a newer interval set elsewhere survives a rename', () => {
    // The form opened at "every 3 days"; a sentence has since set 5. Only the name was edited.
    expect(schedulePatch(task, { name: 'Water the balcony plants' })).toEqual({
      name: 'Water the balcony plants',
      aliases: ['Water the plants'],
    })
  })

  it('writes an edited interval, or clears it when emptied', () => {
    expect(schedulePatch(task, { every: '10' })).toEqual({ intervalDays: 10 })
    expect(schedulePatch(task, { every: '' })).toEqual({ intervalDays: null })
  })

  it('ignores a name edited back to the same value', () => {
    expect(schedulePatch(task, { name: ' Water the plants ' })).toEqual({})
  })
})
