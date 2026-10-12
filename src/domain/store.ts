// Text normalisation and fuzzy matching for task names (FR/EN).

const STOPWORDS = new Set([
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'un', 'une', 'mes', 'mon', 'ma', 'tes', 'ton', 'ta',
  'ses', 'son', 'sa', 'nos', 'notre', 'vos', 'votre', 'leur', 'leurs', 'au', 'aux', 'a', 'et', 'en',
  'pour', 'j', 'ai', 'the', 'an', 'my', 'our', 'of', 'to', 'your', 'his', 'her', 'their', 'some',
])

const SUFFIXES = ['ees', 'ing', 'ee', 'er', 'ed', 'e']

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Crude stemmer: drops a plural mark, then verb suffixes until the stem stops changing. */
export function stem(word: string): string {
  let current = /[sx]$/.test(word) && word.length > 4 ? word.slice(0, -1) : word
  for (;;) {
    const suffix = SUFFIXES.find((s) => current.endsWith(s) && current.length - s.length >= 3)
    if (!suffix) return current
    current = current.slice(0, -suffix.length)
  }
}

export function keyTokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem)
}

/** Edit distance counting an adjacent swap as one edit ("arosser" vs "arroser"). */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, d[i - 2]![j - 2]! + 1)
      d[i]![j] = best
    }
  }
  return d[a.length]![b.length]!
}

function sameToken(a: string, b: string): boolean {
  if (a === b) return true
  return Math.min(a.length, b.length) >= 4 && editDistance(a, b) <= 1
}

/**
 * Similarity between a query and a task label, in [0, 1].
 * A query whose tokens all appear in the label ("les plantes" vs "arroser les plantes") scores high;
 * otherwise the score is the share of tokens in common.
 */
export function similarity(query: string, label: string): number {
  if (normalize(query) === normalize(label)) return 1
  const q = keyTokens(query)
  const l = keyTokens(label)
  if (q.length === 0 || l.length === 0) return 0
  const common = q.filter((t) => l.some((u) => sameToken(t, u))).length
  if (common === q.length) return 0.7 + 0.3 * (common / l.length)
  return common / Math.max(q.length, l.length)
}

/** Turns a past-tense phrase ("arrosé les plantes", "watered the plants") into a task name. */
export function toTaskName(phrase: string): string {
  const words = phrase.trim().replace(/[.!?]+$/, '').split(/\s+/)
  const first = words[0]
  if (!first) return ''
  words[0] = toInfinitive(first)
  const name = words.join(' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

const IRREGULAR: Record<string, string> = {
  fait: 'faire', faite: 'faire', pris: 'prendre', mis: 'mettre', sorti: 'sortir', sortie: 'sortir',
  rempli: 'remplir', nourri: 'nourrir', vu: 'voir', did: 'do', done: 'do', took: 'take', fed: 'feed',
  ran: 'run', paid: 'pay', went: 'go', made: 'make', got: 'get', bought: 'buy', swept: 'sweep',
}

function toInfinitive(word: string): string {
  const lower = word.toLowerCase()
  if (IRREGULAR[lower]) return IRREGULAR[lower]
  const fr = lower.match(/^(.{2,})é(e?s?)$/)
  if (fr) return `${fr[1]}er`
  if (lower.endsWith('ied') && lower.length > 4) return `${lower.slice(0, -3)}y`
  if (lower.endsWith('ed') && lower.length > 4) {
    let base = lower.slice(0, -2)
    if (/([b-df-hj-km-np-tv-z])\1$/.test(base) && !/(ll|ss|ff|zz)$/.test(base)) return base.slice(0, -1)
    if (/(v|c|z|ng|at|al|ut|iz)$/.test(base)) base += 'e'
    return base
  }
  return word
}

// Persistence: tasks plus an append-only log, kept in localStorage.

export interface Task {
  id: string
  name: string
  aliases: string[]
  intervalDays?: number
  createdAt: string
}

export interface LogEntry {
  taskId: string
  at: string
}

export interface Data {
  version: 1
  tasks: Task[]
  log: LogEntry[]
}

export interface KeyValue {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const STORAGE_KEY = 'lastdone:data'
const SCHEMA_VERSION = 1

const empty = (): Data => ({ version: SCHEMA_VERSION, tasks: [], log: [] })

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function browserStorage(): KeyValue | undefined {
  try {
    return globalThis.localStorage
  } catch {
    // Access throws when site data is blocked: run in memory only.
    return undefined
  }
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

/** Validates untrusted data (localStorage or an imported file). Throws on bad shape. */
export function parseData(raw: unknown): Data {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid format: an object is expected.')
  const { version, tasks, log } = raw as Record<string, unknown>
  if (version !== SCHEMA_VERSION) throw new Error(`Unsupported data version: ${String(version)}.`)
  if (!Array.isArray(tasks) || !Array.isArray(log)) throw new Error('Invalid format: “tasks” and “log” are expected.')
  const parsedTasks = tasks.map((t, i): Task => {
    const task = t as Record<string, unknown>
    if (typeof task.id !== 'string' || typeof task.name !== 'string' || !task.name.trim()) {
      throw new Error(`Task #${i + 1} is invalid.`)
    }
    const interval = task.intervalDays
    if (interval !== undefined && (typeof interval !== 'number' || !(interval > 0))) {
      throw new Error(`Invalid interval for “${task.name}”.`)
    }
    return {
      id: task.id,
      name: task.name,
      aliases: Array.isArray(task.aliases) ? task.aliases.filter((a): a is string => typeof a === 'string') : [],
      ...(interval !== undefined ? { intervalDays: interval } : {}),
      createdAt: isValidDate(task.createdAt) ? task.createdAt : new Date(0).toISOString(),
    }
  })
  const ids = new Set(parsedTasks.map((t) => t.id))
  const parsedLog = log.map((e, i): LogEntry => {
    const entry = e as Record<string, unknown>
    if (typeof entry.taskId !== 'string' || !ids.has(entry.taskId) || !isValidDate(entry.at)) {
      throw new Error(`Log entry #${i + 1} is invalid.`)
    }
    return { taskId: entry.taskId, at: entry.at }
  })
  return { version: SCHEMA_VERSION, tasks: parsedTasks, log: parsedLog }
}

export class Store {
  private data: Data
  private listeners = new Set<() => void>()
  /** Set when stored data could not be read; the raw value is kept under a backup key. */
  readonly loadError?: string

  constructor(private storage: KeyValue | undefined = browserStorage()) {
    const { data, error } = this.load()
    this.data = data
    if (error) this.loadError = error
  }

  private load(): { data: Data; error?: string } {
    let raw: string | null = null
    try {
      raw = this.storage?.getItem(STORAGE_KEY) ?? null
      if (raw === null) return { data: empty() }
      return { data: parseData(JSON.parse(raw)) }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      if (raw !== null) this.write(`${STORAGE_KEY}:backup-${Date.now()}`, raw)
      return { data: empty(), error }
    }
  }

  private write(key: string, value: string): boolean {
    try {
      this.storage?.setItem(key, value)
      return true
    } catch {
      return false
    }
  }

  /** False when the browser refused the write (quota, private mode). */
  lastSaveOk = true

  private commit(next: Data) {
    this.data = next
    this.lastSaveOk = this.write(STORAGE_KEY, JSON.stringify(next))
    for (const listener of this.listeners) listener()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Immutable snapshot, stable between changes (for useSyncExternalStore). */
  getSnapshot = (): Data => this.data

  get tasks(): Task[] {
    return this.data.tasks
  }

  get log(): LogEntry[] {
    return this.data.log
  }

  getTask(id: string): Task | undefined {
    return this.data.tasks.find((t) => t.id === id)
  }

  addTask(input: { name: string; intervalDays?: number; aliases?: string[] }, now = new Date()): Task {
    const name = input.name.trim()
    if (!name) throw new Error('The task name is empty.')
    const task: Task = {
      id: newId(),
      name,
      aliases: (input.aliases ?? []).map((a) => a.trim()).filter(Boolean),
      ...(input.intervalDays ? { intervalDays: input.intervalDays } : {}),
      createdAt: now.toISOString(),
    }
    this.commit({ ...this.data, tasks: [...this.data.tasks, task] })
    return task
  }

  updateTask(id: string, patch: { name?: string; intervalDays?: number | null; aliases?: string[] }): Task {
    const current = this.getTask(id)
    if (!current) throw new Error('Task not found.')
    const next: Task = { ...current }
    if (patch.name !== undefined && patch.name.trim()) next.name = patch.name.trim()
    if (patch.aliases) next.aliases = patch.aliases
    if (patch.intervalDays === null) delete next.intervalDays
    else if (patch.intervalDays !== undefined) next.intervalDays = patch.intervalDays
    this.commit({ ...this.data, tasks: this.data.tasks.map((t) => (t.id === id ? next : t)) })
    return next
  }

  deleteTask(id: string) {
    this.commit({
      ...this.data,
      tasks: this.data.tasks.filter((t) => t.id !== id),
      log: this.data.log.filter((e) => e.taskId !== id),
    })
  }

  logDone(taskId: string, at = new Date()): LogEntry {
    if (!this.getTask(taskId)) throw new Error('Task not found.')
    const entry: LogEntry = { taskId, at: at.toISOString() }
    this.commit({ ...this.data, log: [...this.data.log, entry] })
    return entry
  }

  /** Removes one log entry (undo of a mistaken "Fait"). */
  removeEntry(entry: LogEntry) {
    const index = this.data.log.findIndex((e) => e.taskId === entry.taskId && e.at === entry.at)
    if (index === -1) return
    this.commit({ ...this.data, log: this.data.log.filter((_, i) => i !== index) })
  }

  /** Entries for one task, newest first. */
  history(taskId: string): LogEntry[] {
    return this.data.log.filter((e) => e.taskId === taskId).sort((a, b) => b.at.localeCompare(a.at))
  }

  /** Best task for a free-text name, matching the name and aliases loosely. */
  findTask(query: string, threshold = 0.6): Task | undefined {
    let best: { task: Task; score: number } | undefined
    for (const task of this.data.tasks) {
      const score = Math.max(...[task.name, ...task.aliases].map((label) => similarity(query, label)))
      if (score >= threshold && (!best || score > best.score)) best = { task, score }
    }
    return best?.task
  }

  exportJSON(): string {
    return JSON.stringify(this.data, null, 2)
  }

  /** Replaces all data with the content of an export. Throws without touching anything if invalid. */
  importJSON(text: string) {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new Error('The file is not valid JSON.')
    }
    this.commit(parseData(raw))
  }
}
