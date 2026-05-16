const buckets = new Map<string, number[]>()

export interface RateLimitConfig {
  perMinute: number
}

const configs = new Map<string, RateLimitConfig>()

export function setRateLimit(source: string, perMinute: number): void {
  configs.set(source, { perMinute })
}

export function getRateLimit(source: string): RateLimitConfig | undefined {
  return configs.get(source)
}

export async function acquire(source: string, fallbackPerMinute: number): Promise<void> {
  const cfg = configs.get(source) ?? { perMinute: fallbackPerMinute }
  if (cfg.perMinute <= 0) return

  const now = Date.now()
  const windowMs = 60_000
  const minInterval = windowMs / cfg.perMinute

  const bucket = buckets.get(source) ?? []
  const cutoff = now - windowMs
  while (bucket.length > 0 && bucket[0]! < cutoff) bucket.shift()

  if (bucket.length >= cfg.perMinute) {
    const oldest = bucket[0]!
    const waitMs = oldest + windowMs - now
    if (waitMs > 0) await sleep(waitMs)
  } else if (bucket.length > 0) {
    const last = bucket[bucket.length - 1]!
    const sinceLast = now - last
    if (sinceLast < minInterval) await sleep(minInterval - sinceLast)
  }

  bucket.push(Date.now())
  buckets.set(source, bucket)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function resetRateLimit(): void {
  buckets.clear()
  configs.clear()
}
