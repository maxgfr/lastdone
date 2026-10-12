import type { LogEntry, Task } from './store'

export type Status = 'ok' | 'soon' | 'overdue'

const DAY = 86_400_000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Calendar days from `from` to `to` in local time (positive when `to` is later). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function lastDone(task: Task, log: LogEntry[]): Date | undefined {
  let latest: string | undefined
  for (const entry of log) {
    if (entry.taskId === task.id && (!latest || entry.at > latest)) latest = entry.at
  }
  return latest ? new Date(latest) : undefined
}

/** When the task is next due; undefined without an interval. Never done means due now. */
export function nextDue(task: Task, log: LogEntry[], now = new Date()): Date | undefined {
  if (!task.intervalDays) return undefined
  const last = lastDone(task, log)
  return last ? addDays(last, task.intervalDays) : now
}

/** Days before a due date that count as "soon": 20 % of the interval, at least one day. */
export function soonWindow(intervalDays: number): number {
  return Math.max(1, Math.round(intervalDays * 0.2))
}

export function status(task: Task, log: LogEntry[], now = new Date()): Status {
  const due = nextDue(task, log, now)
  if (!due || !task.intervalDays) return 'ok'
  const left = daysBetween(now, due)
  if (left < 0) return 'overdue'
  if (left <= soonWindow(task.intervalDays)) return 'soon'
  return 'ok'
}

const RANK: Record<Status, number> = { overdue: 0, soon: 1, ok: 2 }

/** Most urgent first: overdue, then soon, then by due date, then tasks without interval. */
export function byUrgency(tasks: Task[], log: LogEntry[], now = new Date()): Task[] {
  const key = (task: Task) => ({
    rank: RANK[status(task, log, now)],
    due: nextDue(task, log, now)?.getTime() ?? Number.POSITIVE_INFINITY,
  })
  return [...tasks].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    return ka.rank - kb.rank || ka.due - kb.due || a.name.localeCompare(b.name)
  })
}

/** "today", "yesterday", "9 days ago", "tomorrow", "in 3 days". */
export function relativeDay(date: Date, now = new Date()): string {
  const diff = daysBetween(now, date)
  if (diff === 0) return 'today'
  if (diff === -1) return 'yesterday'
  if (diff === 1) return 'tomorrow'
  return diff < 0 ? `${-diff} days ago` : `in ${diff} days`
}

/** "October 3" (with the year when it differs from now). */
export function formatDate(date: Date, now = new Date()): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}
