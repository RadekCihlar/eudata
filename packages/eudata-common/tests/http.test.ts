import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchJSON, fetchText } from '../src/http.js'
import { clearCache } from '../src/cache.js'
import { resetConfig, configure } from '../src/config.js'
import { resetRateLimit } from '../src/rate-limit.js'
import { HttpError, ParseError, TimeoutError } from '../src/errors.js'

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

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>): void {
  globalThis.fetch = vi.fn(impl as typeof fetch) as unknown as typeof fetch
}

describe('fetchJSON', () => {
  it('returns parsed JSON', async () => {
    mockFetch(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }))
    const result = await fetchJSON<{ ok: number }>('https://x/y', { source: 'test', retries: 0 })
    expect(result.ok).toBe(1)
  })

  it('throws ParseError when server returns HTML', async () => {
    mockFetch(async () => new Response('<html>oops</html>', { status: 200 }))
    await expect(
      fetchJSON('https://x/y', { source: 'test', retries: 0 })
    ).rejects.toBeInstanceOf(ParseError)
  })

  it('caches responses by URL', async () => {
    const fn = vi.fn(async () => new Response(JSON.stringify({ n: 1 }), { status: 200 }))
    mockFetch(fn)
    const opts = { source: 'test', retries: 0, cacheTTL: 60_000 }
    await fetchJSON('https://x/cached', opts)
    await fetchJSON('https://x/cached', opts)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not retry on 4xx', async () => {
    const fn = vi.fn(async () => new Response('not found', { status: 404 }))
    mockFetch(fn)
    await expect(
      fetchJSON('https://x/404', { source: 'test', retries: 3, cacheTTL: 0 })
    ).rejects.toBeInstanceOf(HttpError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on 5xx', async () => {
    let calls = 0
    mockFetch(async () => {
      calls++
      if (calls < 3) return new Response('err', { status: 500 })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })
    const result = await fetchJSON<{ ok: boolean }>('https://x/retry', {
      source: 'test',
      retries: 3,
      cacheTTL: 0,
    })
    expect(result.ok).toBe(true)
    expect(calls).toBe(3)
  })

  it('throws TimeoutError on slow response', async () => {
    mockFetch(async (_url, init) => {
      const signal = (init as { signal?: AbortSignal }).signal
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason as Error))
      })
    })
    await expect(
      fetchJSON('https://x/slow', { source: 'test', retries: 0, timeout: 20, cacheTTL: 0 })
    ).rejects.toBeInstanceOf(TimeoutError)
  })
})

describe('fetchText', () => {
  it('returns raw body', async () => {
    mockFetch(async () => new Response('hello', { status: 200 }))
    const result = await fetchText('https://x/txt', { source: 'test', retries: 0 })
    expect(result).toBe('hello')
  })
})
