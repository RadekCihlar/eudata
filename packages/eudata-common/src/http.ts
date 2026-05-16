import { cacheGet, cacheSet } from './cache.js'
import { getConfig } from './config.js'
import { HttpError, ParseError, TimeoutError } from './errors.js'
import { acquire } from './rate-limit.js'
import type { RequestOptions } from './types.js'
import { sleep } from './utils.js'

export interface FetchInit extends RequestOptions {
  method?: 'GET' | 'POST'
  body?: string | Uint8Array
  contentType?: string
  source: string
}

interface InternalFetchOpts extends FetchInit {
  parse: 'json' | 'text' | 'xml' | 'buffer'
}

function buildHeaders(init: InternalFetchOpts): Record<string, string> {
  const cfg = getConfig()
  const headers: Record<string, string> = {
    'user-agent': init.userAgent ?? cfg.userAgent,
    accept: init.parse === 'json' ? 'application/json' : init.parse === 'xml' ? 'application/xml, text/xml' : '*/*',
  }
  if (init.body !== undefined) {
    headers['content-type'] = init.contentType ?? 'application/json'
  }
  if (init.headers) {
    for (const [k, v] of Object.entries(init.headers)) headers[k.toLowerCase()] = v
  }
  return headers
}

async function fetchOnce(url: string, init: InternalFetchOpts, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController()
  const cleanup: Array<() => void> = []
  if (init.signal) {
    const onAbort = (): void => ctrl.abort(init.signal!.reason)
    if (init.signal.aborted) ctrl.abort(init.signal.reason)
    else init.signal.addEventListener('abort', onAbort, { once: true })
    cleanup.push(() => init.signal!.removeEventListener('abort', onAbort))
  }
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs)
  cleanup.push(() => clearTimeout(timer))

  try {
    return await fetch(url, {
      method: init.method ?? 'GET',
      headers: buildHeaders(init),
      body: init.body as BodyInit | undefined,
      signal: ctrl.signal,
    })
  } catch (e) {
    if (ctrl.signal.aborted && (ctrl.signal.reason as Error | undefined)?.message === 'timeout') {
      throw new TimeoutError(`Request timed out after ${timeoutMs}ms`, { source: init.source, url, cause: e })
    }
    throw new HttpError(`Network error: ${(e as Error).message}`, { source: init.source, url, cause: e })
  } finally {
    for (const fn of cleanup) fn()
  }
}

function backoff(attempt: number): number {
  return Math.min(8000, 250 * 2 ** attempt) + Math.floor(Math.random() * 100)
}

async function doFetch<T>(url: string, init: InternalFetchOpts): Promise<T> {
  const cfg = getConfig()
  const timeout = init.timeout ?? cfg.timeout
  const retries = init.retries ?? cfg.retries
  const cacheTTL = init.cacheTTL ?? cfg.cacheTTL
  const useCache = init.method !== 'POST' && !init.noCache && cacheTTL > 0
  const cacheKey = useCache ? `${init.source}::${init.parse}::${url}` : ''

  if (useCache) {
    const hit = cacheGet<T>(cacheKey)
    if (hit !== undefined) return hit
  }

  await acquire(init.source, cfg.rateLimitPerMinute)

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchOnce(url, init, timeout)
      if (!res.ok) {
        const body = await safeReadText(res)
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          throw new HttpError(`HTTP ${res.status}`, { source: init.source, url, status: res.status, body })
        }
        lastErr = new HttpError(`HTTP ${res.status}`, { source: init.source, url, status: res.status, body })
      } else {
        const value = await parseBody<T>(res, init)
        if (useCache) cacheSet(cacheKey, value, cacheTTL)
        return value
      }
    } catch (e) {
      lastErr = e
      if (e instanceof HttpError && e.status !== undefined && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) {
        throw e
      }
    }
    if (attempt < retries) await sleep(backoff(attempt))
  }
  throw lastErr instanceof Error ? lastErr : new HttpError('Request failed', { source: init.source, url })
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

async function parseBody<T>(res: Response, init: InternalFetchOpts): Promise<T> {
  if (init.parse === 'buffer') {
    const ab = await res.arrayBuffer()
    return new Uint8Array(ab) as unknown as T
  }
  const text = await res.text()
  if (init.parse === 'text') return text as unknown as T
  if (init.parse === 'xml') return text as unknown as T
  if (init.parse === 'json') {
    if (text.trim() === '') return null as unknown as T
    const trimmed = text.trimStart()
    if (trimmed.startsWith('<')) {
      throw new ParseError('Expected JSON, got HTML/XML', {
        source: init.source,
        url: res.url,
        status: res.status,
        body: text.slice(0, 500),
      })
    }
    try {
      return JSON.parse(text) as T
    } catch (e) {
      throw new ParseError(`JSON parse failed: ${(e as Error).message}`, {
        source: init.source,
        url: res.url,
        status: res.status,
        body: text.slice(0, 500),
        cause: e,
      })
    }
  }
  return text as unknown as T
}

export async function fetchJSON<T>(url: string, init: FetchInit): Promise<T> {
  return doFetch<T>(url, { ...init, parse: 'json' })
}

export async function fetchText(url: string, init: FetchInit): Promise<string> {
  return doFetch<string>(url, { ...init, parse: 'text' })
}

export async function fetchXML(url: string, init: FetchInit): Promise<string> {
  return doFetch<string>(url, { ...init, parse: 'xml' })
}

export async function fetchBuffer(url: string, init: FetchInit): Promise<Uint8Array> {
  return doFetch<Uint8Array>(url, { ...init, parse: 'buffer' })
}
