import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A fake WebLLM whose first load stays pending until the test releases it.
const created: { modelId: string; release: () => void }[] = []
const reloads: string[] = []
vi.mock('@mlc-ai/web-llm', () => ({
  hasModelInCache: async () => false,
  CreateWebWorkerMLCEngine: (_worker: unknown, modelId: string) =>
    new Promise((resolve) => {
      created.push({
        modelId,
        release: () => resolve({ reload: async (id: string) => void reloads.push(id), interruptGenerate() {}, chat: {} }),
      })
    }),
}))

const { LlmEngine, MODELS } = await import('./engine')
const [big, small] = [MODELS[0].id, MODELS[1].id]
const workers: unknown[] = []

beforeEach(() => {
  created.length = 0
  reloads.length = 0
  workers.length = 0
  vi.stubGlobal('navigator', { gpu: { requestAdapter: async () => ({}) } })
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        workers.push(this)
      }
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('LlmEngine', () => {
  it('loads a model on demand', async () => {
    const engine = new LlmEngine(big)
    const loading = engine.load()
    await settle()
    expect(engine.getSnapshot().status).toBe('loading')
    created[0]!.release()
    expect(await loading).toBe(true)
    expect(engine.getSnapshot()).toMatchObject({ status: 'ready', modelId: big })
  })

  it('switching model mid-download reloads the chosen one in the same worker', async () => {
    const engine = new LlmEngine(big)
    void engine.load()
    await settle()
    const switching = engine.setModel(small)
    expect(engine.getSnapshot()).toMatchObject({ modelId: small, status: 'loading' })

    created[0]!.release()
    await switching
    expect(workers).toHaveLength(1)
    expect(created.map((c) => c.modelId)).toEqual([big])
    expect(reloads).toEqual([small])
    expect(engine.getSnapshot()).toMatchObject({ status: 'ready', modelId: small })
  })

  it('choosing a model before any load only records it', async () => {
    const engine = new LlmEngine(big)
    await engine.setModel(small)
    expect(engine.getSnapshot()).toMatchObject({ status: 'idle', modelId: small })
    expect(workers).toHaveLength(0)
  })

  it('reports a browser without WebGPU', async () => {
    vi.stubGlobal('navigator', {})
    const engine = new LlmEngine(big)
    expect(await engine.load()).toBe(false)
    expect(engine.getSnapshot().status).toBe('unsupported')
  })
})
