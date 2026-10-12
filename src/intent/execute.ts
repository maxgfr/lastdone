// Runs an intent against the store, deterministically, and phrases the answer.
import { daysBetween, formatDate, lastDone, nextDue, relativeDay, status } from '../domain/schedule'
import { toTaskName, type Store, type Task } from '../domain/store'
import { parseDay, type Intent } from './schema'

export interface Reply {
  text: string
  tone: 'ok' | 'info' | 'warn'
  /** A follow-up the user can accept in one tap (create an unknown task, confirm a deletion). */
  suggestion?: { label: string; intents: Intent[] }
}

export function formatInterval(days: number): string {
  if (days === 1) return 'every day'
  if (days === 7) return 'every week'
  if (days % 7 === 0 && days <= 56) return `every ${days / 7} weeks`
  if (days === 30) return 'every month'
  if (days === 365) return 'every year'
  return `every ${days} days`
}

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

/** "Overdue by 2 days (was due October 8)." / "Next: in 3 days (October 15)." */
export function describeDue(task: Task, store: Store, now: Date): string | undefined {
  const due = nextDue(task, store.log, now)
  if (!due) return undefined
  if (!lastDone(task, store.log)) return 'Never done yet: due now.'
  const left = daysBetween(now, due)
  if (left < 0) return `Overdue by ${plural(-left, 'day')} (was due ${formatDate(due, now)}).`
  if (left === 0) return 'Due again today.'
  return `Next: ${relativeDay(due, now)} (${formatDate(due, now)}).`
}

function unknownTask(intent: Intent): Reply {
  const name = toTaskName(intent.task)
  const intents: Intent[] = [{ action: 'create', task: name }]
  if (intent.action === 'log') intents.push({ ...intent, task: name })
  return {
    tone: 'warn',
    text: `I don’t know a task called “${intent.task}”.`,
    suggestion: {
      label: intent.action === 'log' ? `Create “${name}” and log it` : `Create “${name}”`,
      intents,
    },
  }
}

export function execute(intent: Intent, store: Store, now = new Date(), options: { confirmed?: boolean } = {}): Reply {
  const task = intent.taskId ? store.getTask(intent.taskId) : intent.task ? store.findTask(intent.task) : undefined

  switch (intent.action) {
    case 'log': {
      if (!task) return unknownTask(intent)
      const day = intent.date ? parseDay(intent.date) : undefined
      const at = day && daysBetween(now, day) !== 0 ? day : now
      if (at > now) return { tone: 'warn', text: 'That date is in the future, so nothing was logged.' }
      store.logDone(task.id, at)
      const when = daysBetween(now, at) === 0 ? 'today' : `${relativeDay(at, now)}, on ${formatDate(at, now)}`
      const due = describeDue(task, store, now)
      return { tone: 'ok', text: `Logged: “${task.name}” done ${when}.${due ? ` ${due}` : ''}` }
    }

    case 'query': {
      if (!task) return unknownTask(intent)
      const last = lastDone(task, store.log)
      if (!last) return { tone: 'info', text: `“${task.name}”: never done yet.` }
      const ago = relativeDay(last, now)
      const due = describeDue(task, store, now)
      return {
        tone: status(task, store.log, now) === 'overdue' ? 'warn' : 'info',
        text: `“${task.name}”: last done ${ago}${ago === 'today' ? '' : `, on ${formatDate(last, now)}`}.${due ? ` ${due}` : ''}`,
      }
    }

    case 'create': {
      if (task) {
        if (!intent.intervalDays || intent.intervalDays === task.intervalDays) {
          return { tone: 'info', text: `“${task.name}” already exists.` }
        }
        store.updateTask(task.id, { intervalDays: intent.intervalDays })
        return { tone: 'ok', text: `“${task.name}” is now ${formatInterval(intent.intervalDays)}.` }
      }
      const created = store.addTask({
        name: toTaskName(intent.task),
        ...(intent.intervalDays ? { intervalDays: intent.intervalDays } : {}),
      })
      const every = created.intervalDays ? `, ${formatInterval(created.intervalDays)}` : ''
      return { tone: 'ok', text: `New task “${created.name}”${every}.` }
    }

    case 'update': {
      if (!task) return unknownTask(intent)
      if (!intent.intervalDays && !intent.newName) {
        return { tone: 'info', text: `What should change for “${task.name}”? For example: “every 10 days”.` }
      }
      const updated = store.updateTask(task.id, {
        ...(intent.newName ? { name: intent.newName, aliases: [...new Set([...task.aliases, task.name])] } : {}),
        ...(intent.intervalDays ? { intervalDays: intent.intervalDays } : {}),
      })
      const changes = [
        intent.newName ? `renamed to “${updated.name}”` : '',
        intent.intervalDays ? `now ${formatInterval(intent.intervalDays)}` : '',
      ].filter(Boolean)
      return { tone: 'ok', text: `“${task.name}”: ${changes.join(', ')}.` }
    }

    case 'delete': {
      if (!task) return { tone: 'warn', text: `There is no task “${intent.task}” to delete.` }
      const count = store.history(task.id).length
      if (!options.confirmed) {
        return {
          tone: 'warn',
          text: `Delete “${task.name}”${count ? ` and its ${plural(count, 'entry', 'entries')}` : ''}?`,
          suggestion: { label: 'Delete', intents: [{ action: 'delete', task: task.name, taskId: task.id }] },
        }
      }
      store.deleteTask(task.id)
      return { tone: 'ok', text: `“${task.name}” deleted.` }
    }

    case 'list': {
      if (store.tasks.length === 0) {
        return { tone: 'info', text: 'No tasks yet. Try “I watered the plants”.' }
      }
      const late = store.tasks.filter((t) => status(t, store.log, now) === 'overdue').map((t) => t.name)
      const soon = store.tasks.filter((t) => status(t, store.log, now) === 'soon').map((t) => t.name)
      if (!late.length && !soon.length) return { tone: 'ok', text: 'All caught up.' }
      const parts = [late.length ? `Overdue: ${late.join(', ')}.` : '', soon.length ? `Due soon: ${soon.join(', ')}.` : '']
      return { tone: late.length ? 'warn' : 'info', text: parts.filter(Boolean).join(' ') }
    }

    case 'unknown':
      return {
        tone: 'info',
        text: 'I didn’t get that. Try “I watered the plants”, “when did I last descale the kettle?” or “remind me to water the plants every 5 days”.',
      }
  }
}
