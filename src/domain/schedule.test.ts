import { describe, expect, it } from 'vitest'
import type { LogEntry, Task } from './store'
import { byUrgency, daysBetween, formatDate, lastDone, nextDue, relativeDay, status } from './schedule'

const task = (id: string, intervalDays?: number): Task => ({
  id,
  name: id,
  aliases: [],
  ...(intervalDays ? { intervalDays } : {}),
  createdAt: '2026-01-01T00:00:00.000Z',
})
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString()
const now = new Date(2026, 9, 12, 9) // 12 October 2026, 09:00 local

describe('schedule', () => {
  it('counts calendar days, not 24h periods', () => {
    expect(daysBetween(new Date(2026, 9, 11, 23), new Date(2026, 9, 12, 1))).toBe(1)
    expect(daysBetween(new Date(2026, 9, 12, 23), new Date(2026, 9, 3, 1))).toBe(-9)
  })

  it('finds the latest entry regardless of order', () => {
    const log: LogEntry[] = [
      { taskId: 'a', at: at(2026, 10, 3) },
      { taskId: 'a', at: at(2026, 9, 20) },
      { taskId: 'b', at: at(2026, 10, 11) },
    ]
    expect(lastDone(task('a'), log)?.toISOString()).toBe(at(2026, 10, 3))
    expect(lastDone(task('c'), log)).toBeUndefined()
  })

  it('computes the next due date from the last entry', () => {
    const log = [{ taskId: 'a', at: at(2026, 10, 3) }]
    expect(nextDue(task('a', 5), log, now)?.toISOString()).toBe(at(2026, 10, 8))
    expect(nextDue(task('a'), log, now)).toBeUndefined()
    expect(nextDue(task('never', 5), log, now)).toEqual(now)
  })

  it('derives ok, soon and overdue', () => {
    const log = [
      { taskId: 'late', at: at(2026, 10, 3) },
      { taskId: 'today', at: at(2026, 10, 7) },
      { taskId: 'soon', at: at(2026, 10, 4) },
      { taskId: 'fine', at: at(2026, 10, 11) },
    ]
    expect(status(task('late', 5), log, now)).toBe('overdue')
    expect(status(task('today', 5), log, now)).toBe('soon')
    expect(status(task('soon', 10), log, now)).toBe('soon')
    expect(status(task('fine', 10), log, now)).toBe('ok')
    expect(status(task('free'), log, now)).toBe('ok')
    expect(status(task('never', 7), log, now)).toBe('soon')
  })

  it('sorts by urgency', () => {
    const log = [
      { taskId: 'late', at: at(2026, 10, 1) },
      { taskId: 'fine', at: at(2026, 10, 11) },
      { taskId: 'soon', at: at(2026, 10, 4) },
    ]
    const sorted = byUrgency([task('free'), task('fine', 30), task('soon', 10), task('late', 3)], log, now)
    expect(sorted.map((t) => t.id)).toEqual(['late', 'soon', 'fine', 'free'])
  })

  it('formats relative days and dates', () => {
    expect(relativeDay(new Date(2026, 9, 3), now)).toBe('9 days ago')
    expect(relativeDay(new Date(2026, 9, 11), now)).toBe('yesterday')
    expect(relativeDay(new Date(2026, 9, 12, 20), now)).toBe('today')
    expect(relativeDay(new Date(2026, 9, 15), now)).toBe('in 3 days')
    expect(formatDate(new Date(2026, 9, 3), now)).toBe('October 3')
    expect(formatDate(new Date(2025, 11, 24), now)).toBe('December 24, 2025')
  })
})
