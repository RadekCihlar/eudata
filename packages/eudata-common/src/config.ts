import type { GlobalConfig } from './types.js'

const defaults: GlobalConfig = {
  cacheTTL: 300_000,
  timeout: 10_000,
  retries: 2,
  rateLimitPerMinute: 60,
  userAgent: 'eudata/0.0.1 (+https://github.com/RadekCihlar/eudata)',
}

let current: GlobalConfig = { ...defaults }

export function configure(opts: Partial<GlobalConfig>): void {
  current = { ...current, ...opts }
}

export function getConfig(): Readonly<GlobalConfig> {
  return current
}

export function resetConfig(): void {
  current = { ...defaults }
}
