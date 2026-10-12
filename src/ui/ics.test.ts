import { describe, expect, it } from 'vitest'
import type { Task } from '../domain/store'
import { buildIcs, escapeText, fold } from './ics'

const now = new Date(2026, 9, 12, 9)
const task = (id: string, name: string, intervalDays?: number): Task => ({
  id,
  name,
  aliases: [],
  ...(intervalDays ? { intervalDays } : {}),
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('ics export', () => {
  it('writes one recurring event per scheduled task', () => {
    const ics = buildIcs(
      [task('p', 'Water the plants', 7), task('k', 'Descale the kettle', 30), task('c', 'Vacuum the car')],
      [
        { taskId: 'p', at: new Date(2026, 9, 3, 18).toISOString() },
        { taskId: 'k', at: new Date(2026, 8, 20, 18).toISOString() },
      ],
      now,
    )
    const events = ics.split('BEGIN:VEVENT').slice(1)
    expect(events).toHaveLength(2)
    // Overdue: starts today.
    expect(events[0]).toContain('DTSTART;VALUE=DATE:20261012')
    expect(events[0]).toContain('RRULE:FREQ=DAILY;INTERVAL=7')
    expect(events[1]).toContain('DTSTART;VALUE=DATE:20261020')
    expect(events[1]).toContain('DTEND;VALUE=DATE:20261021')
    expect(ics).not.toContain('Vacuum')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('escapes text and folds long lines', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne')
    const folded = fold(`SUMMARY:${'é'.repeat(60)}`)
    for (const line of folded.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'é'.repeat(60)}`)
  })
})

describe('ics escaping', () => {
  it('escapes semicolons as RFC 5545 requires', () => {
    expect(escapeText('Feed cat; water plants')).toBe('Feed cat\\; water plants')
    expect(buildIcs([task('x', 'Feed cat; water plants', 2)], [], now)).toContain('SUMMARY:Feed cat\\; water plants')
  })
})
