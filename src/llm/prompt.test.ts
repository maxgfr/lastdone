import { describe, expect, it } from 'vitest'
import type { Task } from '../domain/store'
import { buildMessages, parseModelOutput, systemPrompt } from './prompt'

const now = new Date(2026, 9, 12, 9)
const tasks: Task[] = [
  { id: 'p', name: 'Arroser les plantes', aliases: ['plantes'], intervalDays: 5, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'k', name: 'Détartrer la bouilloire', aliases: [], createdAt: '2026-01-01T00:00:00Z' },
]
const log = [{ taskId: 'p', at: new Date(2026, 9, 3, 18).toISOString() }]

describe('prompt', () => {
  it('gives the model today and the existing task names', () => {
    const prompt = systemPrompt(tasks, log, now)
    expect(prompt).toContain('Today is Monday 2026-10-12.')
    expect(prompt).toContain('- "Arroser les plantes" (also: plantes), every 5 days, last done 2026-10-03')
    expect(prompt).toContain('- "Détartrer la bouilloire"\n')
    expect(systemPrompt([], [], now)).toContain('(none yet)')
  })

  it('ends with the user sentence after valid few-shot turns', () => {
    const messages = buildMessages('  j’ai arrosé  ', tasks, log, now)
    expect(messages[0]!.role).toBe('system')
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'j’ai arrosé' })
    for (const turn of messages.filter((m) => m.role === 'assistant')) {
      expect(parseModelOutput(turn.content)).toBeDefined()
    }
  })

  it('parses JSON output and rejects anything unusable', () => {
    expect(parseModelOutput('{"action":"log","task":"Arroser les plantes","date":"2026-10-11"}')).toEqual({
      action: 'log',
      task: 'Arroser les plantes',
      date: '2026-10-11',
    })
    expect(parseModelOutput('Sure! {"action":"list","task":""}')).toEqual({ action: 'list', task: '' })
    expect(parseModelOutput('{"action":"log"')).toBeUndefined()
    expect(parseModelOutput('{"action":"fly","task":"x"}')).toBeUndefined()
    expect(parseModelOutput('')).toBeUndefined()
  })
})
