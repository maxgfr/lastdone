import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { daysBetween, formatDate, lastDone, nextDue, relativeDay, status, type Status } from '../domain/schedule'
import type { LogEntry, Store, Task } from '../domain/store'
import { formatInterval } from '../intent/execute'

interface Props {
  tasks: Task[]
  store: Store
  log: LogEntry[]
  now: Date
  onDone: (taskId: string, at?: Date) => void
  onExample: (text: string) => void
}

const EXAMPLES = ['I watered the plants', 'Remind me to descale the kettle every month', 'Change the sheets every 2 weeks']

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Split-flap style: when the text changes, each character flips in, left to right. */
function FlipText({ text }: { text: string }) {
  const previous = useRef(text)
  const [generation, setGeneration] = useState(0)
  useEffect(() => {
    if (previous.current === text) return
    previous.current = text
    setGeneration((g) => g + 1)
  }, [text])
  return (
    <span className="flip">
      {[...text].map((char, i) => (
        <span
          key={`${generation}-${i}`}
          className={generation ? 'flip__char is-flipping' : 'flip__char'}
          style={{ animationDelay: `${i * 55}ms` }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </span>
  )
}

/** "Thu 15" within the coming week, else "Oct 20" (with the year when it differs). */
function shortDay(date: Date, now: Date): string {
  const left = daysBetween(now, date)
  if (left >= 0 && left < 7) return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()}`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

function dueCell(task: Task, log: LogEntry[], now: Date): { big: string; small: string; label: string } {
  const due = nextDue(task, log, now)
  if (!due) return { big: '—', small: '', label: 'No schedule' }
  if (!lastDone(task, log)) return { big: 'Now', small: 'never done', label: 'Due now, never done' }
  const left = daysBetween(now, due)
  if (left < 0) return { big: `+${-left} d`, small: `was ${shortDay(due, now)}`, label: `Overdue by ${-left} days, was due ${formatDate(due, now)}` }
  if (left === 0) return { big: 'Today', small: '', label: 'Due today' }
  return { big: `${left} d`, small: shortDay(due, now), label: `Due ${relativeDay(due, now)}, ${formatDate(due, now)}` }
}

/** Recent passes as marks; the open stretch since the last one shows red when it overran. */
function Marks({ task, log }: { task: Task; log: LogEntry[] }) {
  const entries = log.filter((e) => e.taskId === task.id).sort((a, b) => a.at.localeCompare(b.at)).slice(-7)
  return (
    <span className="marks" aria-hidden="true">
      {entries.map((entry, i) => {
        const previous = entries[i - 1]
        const late = previous && task.intervalDays && daysBetween(new Date(previous.at), new Date(entry.at)) > task.intervalDays
        return <i key={entry.at} className={late ? 'marks__late' : undefined} />
      })}
      <i className="marks__open" />
    </span>
  )
}

export interface ScheduleDraft {
  name?: string
  every?: string
}

/**
 * The update for the fields the user actually edited. Untouched fields are left out, so a
 * change made meanwhile (a sentence in the composer) is never overwritten by a stale form.
 */
export function schedulePatch(task: Task, draft: ScheduleDraft): { name?: string; aliases?: string[]; intervalDays?: number | null } {
  const patch: { name?: string; aliases?: string[]; intervalDays?: number | null } = {}
  const name = draft.name?.trim()
  if (name && name !== task.name) {
    patch.name = name
    patch.aliases = [...new Set([...task.aliases, task.name])]
  }
  if (draft.every !== undefined) {
    const days = Number(draft.every)
    patch.intervalDays = draft.every.trim() && days >= 1 ? Math.round(days) : null
  }
  return patch
}

function History({ task, store, now, onDone }: { task: Task; store: Store; now: Date; onDone: Props['onDone'] }) {
  const entries = store.history(task.id)
  const [confirming, setConfirming] = useState<string | undefined>()
  const [showAll, setShowAll] = useState(false)
  const [draft, setDraft] = useState<ScheduleDraft>({})
  const every = draft.every ?? (task.intervalDays ? String(task.intervalDays) : '')
  const name = draft.name ?? task.name
  const [pastDay, setPastDay] = useState('')
  const [deleting, setDeleting] = useState(false)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const shown = showAll ? entries : entries.slice(0, 6)

  const saveSchedule = (event: FormEvent) => {
    event.preventDefault()
    store.updateTask(task.id, schedulePatch(task, draft))
    setDraft({})
  }

  const logPastDay = (event: FormEvent) => {
    event.preventDefault()
    const [y, m, d] = pastDay.split('-').map(Number)
    if (!y || !m || !d) return
    onDone(task.id, new Date(y, m - 1, d, 12))
    setPastDay('')
  }

  return (
    <div className="details" id={`details-${task.id}`}>
      <section className="details__block" aria-label="History">
        <h3 className="details__title">History</h3>
        {entries.length === 0 ? (
          <p className="details__empty">Not done yet.</p>
        ) : (
          <ol className="history">
            {shown.map((entry) => {
              const at = new Date(entry.at)
              return (
                <li key={entry.at} className="history__row">
                  <span className="history__date">
                    {at.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(at.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })}
                  </span>
                  <span className="history__ago">{relativeDay(at, now)}</span>
                  {confirming === entry.at ? (
                    <button type="button" className="text-button text-button--danger" onClick={() => store.removeEntry(entry)}>
                      Confirm remove
                    </button>
                  ) : (
                    <button type="button" className="text-button" onClick={() => setConfirming(entry.at)}>
                      Remove
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {entries.length > 6 && (
          <button type="button" className="text-button" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${entries.length}`}
          </button>
        )}
        <form className="inline-form" onSubmit={logPastDay}>
          <label className="field">
            <span className="field__label">Done on another day</span>
            <input type="date" max={today} value={pastDay} onChange={(e) => setPastDay(e.target.value)} required />
          </label>
          <button type="submit" className="button">Log it</button>
        </form>
      </section>

      <form className="details__block" onSubmit={saveSchedule} aria-label="Schedule">
        <h3 className="details__title">Schedule</h3>
        <label className="field">
          <span className="field__label">Name</span>
          <input value={name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
        </label>
        <label className="field field--every">
          <span className="field__label">Every</span>
          <span className="field__row">
            <input type="number" inputMode="numeric" min={1} max={3650} value={every} onChange={(e) => setDraft((d) => ({ ...d, every: e.target.value }))} placeholder="—" />
            <span>days</span>
          </span>
          <span className="field__hint">Leave empty for no schedule.</span>
        </label>
        <div className="details__actions">
          <button type="submit" className="button">Save</button>
          {deleting ? (
            <button type="button" className="button button--danger" onClick={() => store.deleteTask(task.id)}>
              Delete {entries.length ? `with ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` : 'chore'}
            </button>
          ) : (
            <button type="button" className="text-button text-button--danger" onClick={() => setDeleting(true)}>
              Delete chore…
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Row({ task, store, log, now, onDone, open, next, onToggle, rowRef }: {
  task: Task
  store: Store
  log: LogEntry[]
  now: Date
  onDone: Props['onDone']
  open: boolean
  /** First departure that is not late: its figure gets the timetable highlight. */
  next: boolean
  onToggle: () => void
  rowRef: (el: HTMLLIElement | null) => void
}) {
  const state: Status = status(task, log, now)
  const due = dueCell(task, log, now)
  const last = lastDone(task, log)
  const lastText = last ? `${relativeDay(last, now)}${daysBetween(now, last) < -1 ? `, ${shortDay(last, now)}` : ''}` : undefined
  const scheduled = Boolean(task.intervalDays)
  // The chevron travels with the last word so it never wraps alone.
  const cut = task.name.lastIndexOf(' ')
  const nameHead = cut > 0 ? task.name.slice(0, cut + 1) : ''
  const nameEnd = task.name.slice(cut + 1)

  return (
    <li ref={rowRef} className={`row row--${scheduled ? state : 'free'}${open ? ' is-open' : ''}${next ? ' row--next' : ''}`}>
      <div className="row__due">
        <span className="visually-hidden">{due.label}</span>
        <span className="row__due-big" aria-hidden="true"><FlipText text={due.big} /></span>
        {due.small && <span className="row__due-small" aria-hidden="true">{due.small}</span>}
      </div>
      <div className="row__chore">
        <button type="button" className="row__name" aria-expanded={open} aria-controls={`details-${task.id}`} onClick={onToggle}>
          {nameHead}
          <span className="row__name-end">
            {nameEnd}
            <svg className="row__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10l4 4 4-4" /></svg>
          </span>
        </button>
        <p className="row__meta">
          <span className="row__last">{lastText ? `Done ${lastText}` : 'Never done'}</span>
          {state === 'overdue' && scheduled && <Marks task={task} log={log} />}
        </p>
      </div>
      <p className="row__lastcol">{lastText ?? 'Never done'}</p>
      <div className="row__every">
        <span className="row__every-value">
          <span className="visually-hidden">{task.intervalDays ? formatInterval(task.intervalDays) : 'No schedule'}</span>
          <span aria-hidden="true">{task.intervalDays ? `${task.intervalDays} d` : '—'}</span>
        </span>
        <button type="button" className={`done-button${state === 'overdue' && scheduled ? ' done-button--urgent' : ''}`} onClick={() => onDone(task.id)} aria-label={`Mark “${task.name}” done today`}>
          Done
        </button>
      </div>
      {open && <History task={task} store={store} now={now} onDone={onDone} />}
    </li>
  )
}

function AddChore({ store }: { store: Store }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [every, setEvery] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const existing = store.findTask(name, 0.95)
    if (existing) {
      setError(`“${existing.name}” is already on the board.`)
      return
    }
    const days = Number(every)
    store.addTask({ name, ...(every && days >= 1 ? { intervalDays: Math.round(days) } : {}) })
    setName('')
    setEvery('')
    setError('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className="add-toggle" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Add a chore
      </button>
    )
  }
  return (
    <form className="add-form" onSubmit={submit}>
      <label className="field add-form__name">
        <span className="field__label">Chore</span>
        <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Water the plants" required autoFocus />
      </label>
      <label className="field add-form__every">
        <span className="field__label">Every (days)</span>
        <input type="number" inputMode="numeric" min={1} max={3650} value={every} onChange={(e) => setEvery(e.target.value)} placeholder="7" />
      </label>
      <div className="add-form__actions">
        <button type="submit" className="button button--primary">Add</button>
        <button type="button" className="text-button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
    </form>
  )
}

export function TaskList({ tasks, store, log, now, onDone, onExample }: Props) {
  const [openId, setOpenId] = useState<string | undefined>()
  const board = useRef<HTMLElement>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())
  const positions = useRef(new Map<string, number>())
  const lastOrder = useRef('')

  // Row tops relative to the board, so a masthead or scroll change doesn't count as movement.
  const measure = useCallback(() => {
    const origin = board.current?.getBoundingClientRect().top ?? 0
    const tops = new Map<string, number>()
    for (const [id, el] of rows.current) tops.set(id, el.getBoundingClientRect().top - origin)
    return tops
  }, [])

  // FLIP: measured after every commit; a row that changes rank slides from its old place to the new one.
  const order = tasks.map((t) => t.id).join('|')
  useLayoutEffect(() => {
    const tops = measure()
    const reordered = lastOrder.current !== '' && lastOrder.current !== order
    lastOrder.current = order
    if (reordered && !reducedMotion()) {
      for (const [id, top] of tops) {
        const before = positions.current.get(id)
        if (before === undefined || Math.abs(before - top) < 2) continue
        rows.current.get(id)?.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], {
          duration: 520,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        })
      }
    }
    positions.current = tops
  })

  useEffect(() => {
    const onResize = () => {
      positions.current = measure()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure])

  const scheduled = tasks.filter((t) => t.intervalDays)
  const nextId = scheduled.find((t) => status(t, log, now) !== 'overdue')?.id
  const free = tasks.filter((t) => !t.intervalDays)
  const ref = (id: string) => (el: HTMLLIElement | null) => {
    if (el) rows.current.set(id, el)
    else {
      rows.current.delete(id)
      positions.current.delete(id)
    }
  }
  const renderRow = (task: Task) => (
    <Row
      key={task.id}
      task={task}
      store={store}
      log={log}
      now={now}
      onDone={onDone}
      open={openId === task.id}
      next={task.id === nextId}
      onToggle={() => setOpenId((id) => (id === task.id ? undefined : task.id))}
      rowRef={ref(task.id)}
    />
  )

  return (
    <section ref={board} className="board" aria-label="Chores">
      <div className="board__heads" aria-hidden="true">
        <span>Due</span>
        <span>Chore</span>
        <span className="board__head-last">Last done</span>
        <span className="board__head-every">Every</span>
      </div>

      {tasks.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No chores yet.</p>
          <p className="empty__text">Tell lastdone what you did or what to keep track of. Everything stays on this device.</p>
          <ul className="empty__examples">
            {EXAMPLES.map((text) => (
              <li key={text}>
                <button type="button" className="example" onClick={() => onExample(text)}>
                  “{text}”
                </button>
              </li>
            ))}
          </ul>
          <AddChore store={store} />
        </div>
      ) : (
        <>
          {scheduled.length > 0 && <ol className="rows">{scheduled.map(renderRow)}</ol>}
          {free.length > 0 && (
            <>
              <h2 className="board__group">No schedule</h2>
              <ol className="rows">{free.map(renderRow)}</ol>
            </>
          )}
          <AddChore store={store} />
        </>
      )}
    </section>
  )
}
