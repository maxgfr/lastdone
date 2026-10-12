// In-browser LLM (WebLLM in a Web Worker), loaded on demand.
import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import type { LogEntry, Task } from '../domain/store'
import { intentJsonSchema, type Intent } from '../intent/schema'
import { buildMessages, parseModelOutput } from './prompt'

export const MODELS = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 1.5B · about 1 GB · recommended' },
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 0.5B · about 400 MB · small phones' },
] as const
export type ModelId = (typeof MODELS)[number]['id']
export const DEFAULT_MODEL: ModelId = MODELS[0].id

export type EngineStatus = 'idle' | 'checking' | 'unsupported' | 'loading' | 'ready' | 'error'

export interface EngineState {
  status: EngineStatus
  modelId: ModelId
  /** 0..1 while loading. */
  progress: number
  detail: string
}

const GENERATION_TIMEOUT_MS = 30_000

export async function hasWebGPU(): Promise<boolean> {
  if (!('gpu' in navigator) || !navigator.gpu) return false
  try {
    return (await navigator.gpu.requestAdapter()) !== null
  } catch {
    return false
  }
}

/** Cellular or data-saver connections never download the model without an explicit tap. */
export function onMeteredConnection(): boolean {
  const connection = (navigator as Navigator & { connection?: { type?: string; saveData?: boolean } }).connection
  return connection?.type === 'cellular' || connection?.saveData === true
}

export async function isModelCached(modelId: ModelId): Promise<boolean> {
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm')
    return await hasModelInCache(modelId)
  } catch {
    return false
  }
}

export class LlmEngine {
  private state: EngineState
  private listeners = new Set<() => void>()
  private engine?: WebWorkerMLCEngine
  private worker?: Worker
  private loading?: Promise<boolean>
  /** Model the running load is fetching; progress from a superseded load is not shown. */
  private target?: ModelId

  constructor(modelId: ModelId = DEFAULT_MODEL) {
    this.state = { status: 'idle', modelId, progress: 0, detail: '' }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): EngineState => this.state

  private set(patch: Partial<EngineState>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }

  get ready(): boolean {
    return this.state.status === 'ready'
  }

  /** Downloads (or reads from cache) and initialises the model. Resolves to false on failure. */
  load(modelId: ModelId = this.state.modelId): Promise<boolean> {
    if (this.loading && modelId === this.state.modelId) return this.loading
    this.loading = this.doLoad(modelId)
    return this.loading
  }

  private async doLoad(modelId: ModelId): Promise<boolean> {
    this.target = modelId
    this.set({ status: 'checking', modelId, progress: 0, detail: 'Checking WebGPU…' })
    if (!(await hasWebGPU())) {
      this.set({ status: 'unsupported', detail: 'WebGPU is not available in this browser.' })
      return false
    }
    try {
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm')
      if (this.engine) await this.engine.reload(modelId)
      else {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
        this.set({ status: 'loading', detail: 'Preparing…' })
        this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, {
          initProgressCallback: (report) => {
            if (this.target === this.state.modelId) this.set({ status: 'loading', progress: report.progress, detail: report.text })
          },
        })
      }
      // A model switch during this load supersedes it: setModel() reloads once it settles.
      if (this.state.modelId !== modelId) return false
      this.set({ status: 'ready', progress: 1, detail: '' })
      return true
    } catch (err) {
      this.loading = undefined
      this.set({ status: 'error', detail: err instanceof Error ? err.message : String(err) })
      return false
    }
  }

  /**
   * Switches model. A loaded or loading model is replaced: the running load is allowed to
   * finish (it cannot be cancelled), then the same engine and worker reload the new model.
   */
  async setModel(modelId: ModelId) {
    if (modelId === this.state.modelId) return
    const pending = this.loading
    const active = this.state.status === 'ready' || this.state.status === 'loading' || this.state.status === 'checking'
    this.loading = undefined
    this.set({ modelId, status: active ? 'loading' : 'idle', progress: 0, detail: active ? 'Switching model…' : '' })
    if (pending) await pending
    if (active && this.state.modelId === modelId) await this.load(modelId)
  }

  /** One sentence → one intent, or undefined (not ready, timeout, invalid JSON). */
  async interpret(text: string, tasks: Task[], log: LogEntry[], now = new Date()): Promise<Intent | undefined> {
    const engine = this.engine
    if (!engine || !this.ready) return undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => {
        engine.interruptGenerate()
        resolve(undefined)
      }, GENERATION_TIMEOUT_MS)
    })
    try {
      const completion = engine.chat.completions
        .create({
          messages: buildMessages(text, tasks, log, now),
          temperature: 0,
          max_tokens: 128,
          response_format: { type: 'json_object', schema: JSON.stringify(intentJsonSchema) },
        })
        .then((reply) => parseModelOutput(reply.choices[0]?.message.content ?? ''))
      return await Promise.race([completion, timeout])
    } catch (err) {
      console.warn('[lastdone] LLM failed, falling back to rules', err)
      return undefined
    } finally {
      clearTimeout(timer)
    }
  }
}
