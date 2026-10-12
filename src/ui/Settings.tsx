import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react'
import type { Store } from '../domain/store'
import { MODELS, onMeteredConnection, type EngineState, type ModelId } from '../llm/engine'
import { buildIcs } from './ics'

interface Props {
  store: Store
  llm: EngineState
  webgpu?: boolean
  now: Date
  onModel: (id: ModelId) => void
  onEnableAi: () => void
}

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stamp = (now: Date) => now.toISOString().slice(0, 10)

function notificationState(): NotificationPermission | 'unsupported' {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

export function Settings({ store, llm, webgpu, now, onModel, onEnableAi }: Props) {
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | undefined>()
  const [permission, setPermission] = useState(notificationState)
  const [confirmImport, setConfirmImport] = useState<string | undefined>()
  const file = useRef<HTMLInputElement>(null)
  const scheduled = data.tasks.filter((t) => t.intervalDays).length

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0]
    event.target.value = ''
    if (!chosen) return
    setConfirmImport(await chosen.text())
    setMessage(undefined)
  }

  const runImport = () => {
    if (!confirmImport) return
    try {
      store.importJSON(confirmImport)
      setMessage({ tone: 'ok', text: `Imported ${store.tasks.length} chores and ${store.log.length} entries.` })
    } catch (err) {
      setMessage({ tone: 'warn', text: `Nothing was imported: ${err instanceof Error ? err.message : String(err)}` })
    }
    setConfirmImport(undefined)
  }

  const askPermission = async () => {
    try {
      setPermission(await Notification.requestPermission())
    } catch {
      setPermission(notificationState())
    }
  }

  return (
    <main className="settings">
      <h2 className="settings__title">Settings</h2>

      <section className="settings__section" aria-labelledby="s-model">
        <h3 id="s-model">Language model</h3>
        <p className="settings__text">
          The model runs in this browser with WebGPU and only turns your sentence into an action; the app does the rest. It is downloaded once from Hugging Face, then kept in the browser cache. Without it, simple sentence rules still work.
        </p>
        {webgpu === false ? (
          <p className="settings__note settings__note--warn">WebGPU isn’t available here. Try a recent Chrome or Edge on desktop or Android, or Safari 26 and later.</p>
        ) : (
          <>
            <fieldset className="choices">
              <legend className="visually-hidden">Model</legend>
              {MODELS.map((model) => (
                <label key={model.id} className="choice">
                  <input type="radio" name="model" value={model.id} checked={llm.modelId === model.id} onChange={() => onModel(model.id)} />
                  <span>{model.label}</span>
                </label>
              ))}
            </fieldset>
            <p className="settings__state">
              {llm.status === 'ready' && 'Loaded and ready.'}
              {(llm.status === 'loading' || llm.status === 'checking') && `Loading · ${Math.round(llm.progress * 100)} %`}
              {llm.status === 'error' && `Couldn’t load: ${llm.detail}`}
              {llm.status === 'idle' && 'Not loaded.'}
            </p>
            {(llm.status === 'idle' || llm.status === 'error') && (
              <button type="button" className="button button--primary" onClick={onEnableAi}>
                {llm.status === 'error' ? 'Retry' : 'Turn on AI'}
              </button>
            )}
            {onMeteredConnection() && llm.status === 'idle' && <p className="settings__note">You seem to be on mobile data: the download is large.</p>}
          </>
        )}
      </section>

      <section className="settings__section" aria-labelledby="s-reminders">
        <h3 id="s-reminders">Reminders</h3>
        <p className="settings__text">
          While lastdone is open or installed, it can notify you once a day about overdue chores.
        </p>
        {permission === 'unsupported' && <p className="settings__note">This browser doesn’t support notifications.</p>}
        {permission === 'granted' && <p className="settings__note settings__note--ok">Notifications are on.</p>}
        {permission === 'denied' && <p className="settings__note settings__note--warn">Notifications are blocked. Allow them in the browser’s site settings.</p>}
        {permission === 'default' && (
          <button type="button" className="button" onClick={askPermission}>Allow notifications</button>
        )}
        <h4 className="settings__sub">Calendar</h4>
        <p className="settings__text">
          Exports each scheduled chore as a repeating event from its next due date. Dates don’t move when you log a chore, so export again afterwards.
        </p>
        <button
          type="button"
          className="button"
          disabled={scheduled === 0}
          onClick={() => download(`lastdone-${stamp(now)}.ics`, 'text/calendar', buildIcs(data.tasks, data.log, now))}
        >
          Export {scheduled} {scheduled === 1 ? 'chore' : 'chores'} to calendar (.ics)
        </button>
      </section>

      <section className="settings__section" aria-labelledby="s-data">
        <h3 id="s-data">Your data</h3>
        <p className="settings__text">
          {data.tasks.length} chores and {data.log.length} entries, stored only in this browser. Clearing site data erases them, so keep an export.
        </p>
        <div className="settings__row">
          <button type="button" className="button" onClick={() => download(`lastdone-${stamp(now)}.json`, 'application/json', store.exportJSON())}>
            Export JSON
          </button>
          <button type="button" className="button" onClick={() => file.current?.click()}>Import JSON…</button>
          <input ref={file} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} onChange={onFile} />
        </div>
        {confirmImport && (
          <div className="settings__confirm" role="alert">
            <p>Importing replaces everything on this device with the file’s content.</p>
            <div className="settings__row">
              <button type="button" className="button button--danger" onClick={runImport}>Replace my data</button>
              <button type="button" className="text-button" onClick={() => setConfirmImport(undefined)}>Cancel</button>
            </div>
          </div>
        )}
        {message && <p className={`settings__note settings__note--${message.tone}`} role="status">{message.text}</p>}
      </section>

      <p className="settings__footer">
        lastdone is open source ·{' '}
        <a href="https://github.com/maxgfr/lastdone">github.com/maxgfr/lastdone</a>
      </p>
    </main>
  )
}
