import { useRef, useState, type FormEvent } from 'react'
import type { Reply } from '../intent/execute'
import type { Intent } from '../intent/schema'
import { MODELS, onMeteredConnection, type EngineState } from '../llm/engine'

export interface Answer {
  reply: Reply
  /** Who understood the sentence: the on-device model, the rule parser, or a tap. */
  source?: 'model' | 'rules' | 'tap'
}

interface Props {
  answer?: Answer
  busy: boolean
  llm: EngineState
  webgpu?: boolean
  onSubmit: (text: string) => Promise<void>
  onAccept: (intents: Intent[]) => void
  onDismiss: () => void
  onEnableAi: () => void
}

const modelName = (id: string) => MODELS.find((m) => m.id === id)?.label.split(' · ')[0] ?? id
const modelSize = (id: string) => MODELS.find((m) => m.id === id)?.label.split(' · ')[1] ?? ''

function ModelLine({ llm, webgpu, onEnableAi }: Pick<Props, 'llm' | 'webgpu' | 'onEnableAi'>) {
  if (webgpu === false || llm.status === 'unsupported') {
    return <>On this device · sentence rules only, WebGPU isn’t available in this browser</>
  }
  switch (llm.status) {
    case 'idle':
      return (
        <>
          On this device · sentence rules
          <button type="button" className="status__action" onClick={onEnableAi}>
            Turn on AI ({modelSize(llm.modelId)}, once{onMeteredConnection() ? ', you’re on mobile data' : ''})
          </button>
        </>
      )
    case 'checking':
    case 'loading':
      return <>Loading {modelName(llm.modelId)} · {Math.round(llm.progress * 100)} % · sentence rules meanwhile</>
    case 'ready':
      return <>On this device · {modelName(llm.modelId)}</>
    case 'error':
      return (
        <>
          AI couldn’t start, using sentence rules
          <button type="button" className="status__action" onClick={onEnableAi}>Retry</button>
        </>
      )
  }
}

export function Chat({ answer, busy, llm, webgpu, onSubmit, onAccept, onDismiss, onEnableAi }: Props) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const loading = llm.status === 'loading' || llm.status === 'checking'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const sentence = text.trim()
    if (!sentence || busy) return
    await onSubmit(sentence)
    setText('')
    input.current?.focus()
  }

  return (
    <footer className="composer">
      {loading && (
        <div className="composer__progress" role="progressbar" aria-label="Model download" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(llm.progress * 100)}>
          <span style={{ transform: `scaleX(${llm.progress})` }} />
        </div>
      )}
      <div className="composer__inner">
        <div className="answer" aria-live="polite">
          {answer && (
            <div className={`answer__body answer__body--${answer.reply.tone}`}>
              <p className="answer__text">{answer.reply.text}</p>
              <div className="answer__actions">
                {answer.reply.suggestion && (
                  <button type="button" className="button button--primary" onClick={() => onAccept(answer.reply.suggestion!.intents)}>
                    {answer.reply.suggestion.label}
                  </button>
                )}
                <button type="button" className="answer__close" onClick={onDismiss} aria-label="Dismiss">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
                </button>
              </div>
              {answer.source === 'model' && <p className="answer__source">Understood by the on-device model</p>}
            </div>
          )}
        </div>
        <form className="composer__form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="sentence">Say what you did, ask when, or set a schedule</label>
          <input
            ref={input}
            id="sentence"
            className="composer__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I watered the plants…"
            autoComplete="off"
            enterKeyHint="send"
            aria-describedby="model-status"
          />
          <button type="submit" className="composer__send" disabled={busy || !text.trim()} aria-busy={busy}>
            {busy ? 'Reading…' : 'Log'}
          </button>
        </form>
        <p className="status" id="model-status">
          <ModelLine llm={llm} webgpu={webgpu} onEnableAi={onEnableAi} />
        </p>
      </div>
    </footer>
  )
}
