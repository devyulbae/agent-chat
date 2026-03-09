import { beforeEach, describe, expect, it, vi } from 'vitest'

const renderSpy = vi.fn()
const createRootSpy = vi.fn(() => ({ render: renderSpy }))

vi.mock('react-dom/client', () => ({
  createRoot: createRootSpy,
}))

describe('main bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    renderSpy.mockClear()
    createRootSpy.mockClear()

    const rootNode = { id: 'root' }
    ;(globalThis as unknown as { window: unknown }).window = {
      location: { origin: 'http://localhost:50004' },
    }
    ;(globalThis as unknown as { document: unknown }).document = {
      getElementById: (id: string) => (id === 'root' ? rootNode : null),
    }
  })

  it('mounts the app through createRoot when #root exists', async () => {
    await import('./main')

    expect(createRootSpy).toHaveBeenCalledTimes(1)
    expect(renderSpy).toHaveBeenCalledTimes(1)

    const renderedTree = renderSpy.mock.calls[0]?.[0]
    expect(renderedTree).toBeTruthy()
    expect(typeof renderedTree).toBe('object')
  })
})
