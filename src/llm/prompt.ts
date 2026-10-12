// Prompt for turning one sentence into one intent. The model never sees or edits the data itself.
import type { LogEntry, Task } from '../domain/store'
import { lastDone } from '../domain/schedule'
import { formatDay, toIntent, type Intent } from '../intent/schema'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function systemPrompt(tasks: Task[], log: LogEntry[], now: Date): string {
  const list = tasks.length
    ? tasks
        .map((t) => {
          const last = lastDone(t, log)
          const every = t.intervalDays ? `, every ${t.intervalDays} days` : ''
          const aliases = t.aliases.length ? ` (also: ${t.aliases.join(', ')})` : ''
          return `- "${t.name}"${aliases}${every}${last ? `, last done ${formatDay(last)}` : ''}`
        })
        .join('\n')
    : '(none yet)'
  return `You turn one sentence about household chores or recurring tasks into one JSON intent. The user writes in French or English.

Today is ${WEEKDAYS[now.getDay()]} ${formatDay(now)}.

Existing tasks:
${list}

Actions:
- "log": the user did a task ("j'ai arrosé les plantes", "I watered the plants yesterday"). Set "date" (YYYY-MM-DD) only if a day other than today is mentioned.
- "query": the user asks when a task was last done ("quand ai-je arrosé les plantes ?", "c'est quand la dernière fois que…").
- "create": the user wants a new task or reminder, often with a recurrence ("rappelle-moi d'arroser tous les 5 jours"). Set "intervalDays" (week = 7, month = 30, year = 365).
- "update": change the recurrence ("intervalDays") or rename ("newName") an existing task.
- "delete": remove a task.
- "list": the user asks what is due, late or what tasks exist.
- "unknown": anything else.

Rules for "task":
- If the sentence refers to an existing task, copy its exact name from the list above.
- Otherwise, write a short task name with the verb in the infinitive, in the user's language ("Arroser les plantes", "Descale the kettle").
- Use "" for "list" and "unknown".

Answer with the JSON object only.`
}

/** Few-shot turns: they help small models more than extra instructions. */
const EXAMPLES: [string, Intent][] = [
  ["j'ai arrosé les plantes", { action: 'log', task: 'Arroser les plantes' }],
  ["c'est quand la dernière fois que j'ai détartré la bouilloire ?", { action: 'query', task: 'Détartrer la bouilloire' }],
  ["rappelle-moi de changer les draps toutes les deux semaines", { action: 'create', task: 'Changer les draps', intervalDays: 14 }],
  ["qu'est-ce qui est en retard ?", { action: 'list', task: '' }],
  ['when did I last vacuum the car?', { action: 'query', task: 'Vacuum the car' }],
  ['remind me to water the plants every week', { action: 'create', task: 'Water the plants', intervalDays: 7 }],
]

export function buildMessages(text: string, tasks: Task[], log: LogEntry[], now = new Date()): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt(tasks, log, now) },
    ...EXAMPLES.flatMap(([user, intent]): ChatMessage[] => [
      { role: 'user', content: user },
      { role: 'assistant', content: JSON.stringify(intent) },
    ]),
    { role: 'user', content: text.trim() },
  ]
}

/** Parses the model's reply; undefined means "fall back to the rule parser". */
export function parseModelOutput(content: string): Intent | undefined {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start === -1 || end < start) return undefined
  try {
    return toIntent(JSON.parse(content.slice(start, end + 1)))
  } catch {
    return undefined
  }
}
