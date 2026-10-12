// The only thing the LLM (or the rule parser) produces: an intent the app then executes itself.

export const ACTIONS = ['log', 'query', 'create', 'update', 'delete', 'list', 'unknown'] as const
export type Action = (typeof ACTIONS)[number]

export interface Intent {
  action: Action
  /** Task name as said by the user, or an existing task name. Empty for list/unknown. */
  task: string
  /** Day the task was done, YYYY-MM-DD (log only). */
  date?: string
  /** Recurrence in days (create/update). */
  intervalDays?: number
  /** New name (update only). */
  newName?: string
  /** Set by the app (a tap on a row), never by the model: targets that exact task. */
  taskId?: string
}

/** JSON Schema used to constrain WebLLM's output (XGrammar). */
export const intentJsonSchema = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: [...ACTIONS] },
    task: { type: 'string' },
    // Kept to plain types: XGrammar support for pattern/min/max varies; toIntent() checks them.
    date: { type: 'string' },
    intervalDays: { type: 'integer' },
    newName: { type: 'string' },
  },
  required: ['action', 'task'],
  additionalProperties: false,
} as const

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** YYYY-MM-DD → local Date at noon, or undefined if not a real calendar day. */
export function parseDay(value: string): Date | undefined {
  const match = DATE.exec(value)
  if (!match) return undefined
  const [, y, m, d] = match.map(Number) as [number, number, number, number]
  const date = new Date(y, m - 1, d, 12)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : undefined
}

export function formatDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Validates untrusted output (LLM JSON). Returns undefined when it is not a usable intent. */
export function toIntent(raw: unknown): Intent | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const value = raw as Record<string, unknown>
  if (!ACTIONS.includes(value.action as Action)) return undefined
  const action = value.action as Action
  const task = typeof value.task === 'string' ? value.task.trim() : ''
  if (!task && action !== 'list' && action !== 'unknown') return undefined
  const intent: Intent = { action, task }
  if (typeof value.date === 'string' && parseDay(value.date)) intent.date = value.date
  const interval = value.intervalDays
  if (typeof interval === 'number' && Number.isInteger(interval) && interval >= 1 && interval <= 3650) {
    intent.intervalDays = interval
  }
  if (typeof value.newName === 'string' && value.newName.trim()) intent.newName = value.newName.trim()
  return intent
}
