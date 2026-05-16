import type { CacheEntry } from './types.js'

const store = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    store.delete(key)
    return undefined
  }
  return entry.value
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function cacheDelete(key: string): void {
  store.delete(key)
}

export function clearCache(): void {
  store.clear()
}

export function cacheSize(): number {
  return store.size
}
