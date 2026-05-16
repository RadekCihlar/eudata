import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { batch } from '../src/batch.js'
import { clearCache, configure, resetConfig, resetRateLimit } from 'eudata-common'

const originalFetch = globalThis.fetch

beforeEach(() => {
  clearCache()
  resetConfig()
  resetRateLimit()
  configure({ rateLimitPerMinute: 0 })
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

const ARES_OK = JSON.stringify({
  ico: '64774716',
  obchodniJmeno: 'X',
  sidlo: {},
  pravniForma: '121',
  datumVzniku: '2010-01-01',
  seznamRegistraci: { stavZdrojeRos: 'AKTIVNI' },
})

describe('batch.companies', () => {
  it('runs lookups concurrently and returns map', async () => {
    globalThis.fetch = vi.fn(async () => new Response(ARES_OK, { status: 200 })) as unknown as typeof fetch
    const result = await batch.companies(['64774716', '64774716'], { concurrency: 2, retries: 0 })
    expect(result.size).toBe(1)
  })

  it('reports progress', async () => {
    globalThis.fetch = vi.fn(async () => new Response(ARES_OK, { status: 200 })) as unknown as typeof fetch
    const progress: number[] = []
    await batch.companies(['64774716', '64774716', '64774716'], {
      concurrency: 1,
      retries: 0,
      onProgress: (done) => progress.push(done),
    })
    expect(progress).toEqual([1, 2, 3])
  })

  it('continues on error by default', async () => {
    let calls = 0
    globalThis.fetch = vi.fn(async () => {
      calls++
      if (calls === 1) return new Response('bad', { status: 500 })
      return new Response(ARES_OK, { status: 200 })
    }) as unknown as typeof fetch
    const map = await batch.companies(['64774716', '64774716'], { concurrency: 1, retries: 0 })
    expect(map.size).toBeLessThanOrEqual(2)
  })
})
