import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { byUrgency, status } from './domain/schedule'
import { Store } from './domain/store'
import { execute, type Reply } from './intent/execute'
import { parseRules } from './intent/rules'
import type { Intent } from './intent/schema'
import { DEFAULT_MODEL, LlmEngine, MODELS, hasWebGPU, isModelCached, onMeteredConnection, type ModelId } from './llm/engine'
import { Chat, type Answer } from './ui/Chat'
import { Settings } from './ui/Settings'
import { TaskList } from './ui/TaskList'

const MODEL_KEY = 'lastdone:model'
const NOTIFIED_KEY = 'lastdone:notified'

function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Settings are a convenience: without storage they last for the session.
  }
}

const savedModel = readSetting(MODEL_KEY)
const store = new Store()
const engine = new LlmEngine(MODELS.some((m) => m.id === savedModel) ? (savedModel as ModelId) : DEFAULT_MODEL)

/** Ticks every minute so relative dates and statuses roll over (midnight included). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return now
}

/** Overdue reminders: app badge plus one notification per task and day while the app is open. */
function useOverdueReminders(now: Date) {
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot)
  useEffect(() => {
    const overdue = data.tasks.filter((t) => status(t, data.log, now) === 'overdue')
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (overdue.length) nav.setAppBadge?.(overdue.length).catch(() => undefined)
    else nav.clearAppBadge?.().catch(() => undefined)

    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const today = now.toDateString()
    let notified: Record<string, string> = {}
    try {
      notified = JSON.parse(readSetting(NOTIFIED_KEY) ?? '{}') as Record<string, string>
    } catch {
      notified = {}
    }
    const due = overdue.filter((t) => notified[t.id] !== today)
    if (!due.length) return
    const title = due.length === 1 ? `${due[0]!.name} is overdue` : `${due.length} chores are overdue`
    const body = due.map((t) => t.name).join(', ')
    const show = async () => {
      const registration = await navigator.serviceWorker?.getRegistration()
      const options = { body, icon: `${import.meta.env.BASE_URL}icon.svg`, tag: 'lastdone-overdue' }
      if (registration) await registration.showNotification(title, options)
      else new Notification(title, options)
    }
    show()
      .then(() => {
        for (const t of due) notified[t.id] = today
        writeSetting(NOTIFIED_KEY, JSON.stringify(notified))
      })
      .catch((err: unknown) => console.warn('[lastdone] notification failed', err))
  }, [data, now])
}

export function App() {
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const llm = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const now = useNow()
  const [view, setView] = useState<'board' | 'settings'>('board')
  const [answer, setAnswer] = useState<Answer | undefined>(
    store.loadError ? { reply: { tone: 'warn', text: `Saved data could not be read (${store.loadError}). A backup copy was kept in this browser.` } } : undefined,
  )
  const [busy, setBusy] = useState(false)
  const [webgpu, setWebgpu] = useState<boolean | undefined>(undefined)
  const settingsButton = useRef<HTMLButtonElement>(null)

  useOverdueReminders(now)

  useEffect(() => {
    let cancelled = false
    hasWebGPU().then(async (ok) => {
      if (cancelled) return
      setWebgpu(ok)
      // Reading an already-downloaded model costs no network: load it straight away.
      if (ok && (await isModelCached(engine.getSnapshot().modelId))) void engine.load()
    })
    return () => {
      cancelled = true
    }
  }, [])

  const run = useCallback(
    (intents: Intent[], source: Answer['source'], confirmed = false): Reply => {
      let reply: Reply = { tone: 'info', text: '' }
      for (const intent of intents) reply = execute(intent, store, new Date(), { confirmed })
      if (!store.lastSaveOk) {
        reply = { ...reply, tone: 'warn', text: `${reply.text} This browser refused to save, so the change only lasts until you close the tab.` }
      }
      setAnswer({ reply, source })
      return reply
    },
    [],
  )

  const submit = useCallback(
    async (text: string) => {
      setBusy(true)
      try {
        let intent: Intent | undefined
        let source: Answer['source'] = 'rules'
        if (engine.ready) {
          intent = await engine.interpret(text, store.tasks, store.log)
          if (intent) source = 'model'
        } else if (webgpu && llm.status === 'idle' && !onMeteredConnection()) {
          // First sentence starts the download; the rules answer meanwhile.
          void engine.load()
        }
        intent ??= parseRules(text)
        run([intent ?? { action: 'unknown', task: '' }], source)
      } finally {
        setBusy(false)
      }
    },
    [llm.status, run, webgpu],
  )

  const markDone = useCallback((taskId: string, at?: Date) => {
    const task = store.getTask(taskId)
    if (!task) return
    const day = at && at.toDateString() !== new Date().toDateString() ? at : undefined
    const date = day ? `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}` : undefined
    run([{ action: 'log', task: task.name, taskId, ...(date ? { date } : {}) }], 'tap')
  }, [run])

  const chooseModel = useCallback((modelId: ModelId) => {
    writeSetting(MODEL_KEY, modelId)
    void engine.setModel(modelId)
  }, [])

  const closeSettings = useCallback(() => {
    setView('board')
    requestAnimationFrame(() => settingsButton.current?.focus())
  }, [])

  const overdue = data.tasks.filter((t) => status(t, data.log, now) === 'overdue').length

  return (
    <div className="app" data-view={view}>
      <header className="masthead">
        <div className="masthead__inner">
          <h1 className="wordmark">lastdone</h1>
          <p className="clock">
            <span className="clock__day">{now.toLocaleDateString('en-US', { weekday: 'long' })}</span>
            <span className="clock__time">
              {now.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              <span aria-hidden="true"> · </span>
              <time dateTime={now.toISOString()}>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
            </span>
          </p>
          {view === 'board' ? (
            <button ref={settingsButton} type="button" className="icon-button" onClick={() => setView('settings')} aria-label="Settings">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="10" cy="17" r="2" />
              </svg>
            </button>
          ) : (
            <button type="button" className="icon-button" onClick={closeSettings} aria-label="Back to the board">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
        {overdue > 0 && view === 'board' && (
          <p className="masthead__alert" role="status">
            {overdue === 1 ? '1 chore overdue' : `${overdue} chores overdue`}
          </p>
        )}
      </header>

      {view === 'board' ? (
        <>
          <main className="board-wrap">
            <TaskList
              tasks={byUrgency(data.tasks, data.log, now)}
              store={store}
              log={data.log}
              now={now}
              onDone={markDone}
              onExample={(text) => void submit(text)}
            />
          </main>
          <Chat
            answer={answer}
            busy={busy}
            llm={llm}
            webgpu={webgpu}
            onSubmit={submit}
            onAccept={(intents) => run(intents, 'tap', true)}
            onDismiss={() => setAnswer(undefined)}
            onEnableAi={() => void engine.load()}
          />
        </>
      ) : (
        <Settings store={store} llm={llm} webgpu={webgpu} onModel={chooseModel} onEnableAi={() => void engine.load()} now={now} />
      )}
    </div>
  )
}
