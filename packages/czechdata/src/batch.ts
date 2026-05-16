import { company } from './company.js'
import { risk } from './risk.js'
import type {
  BatchOptions,
  ChangeReport,
  CompanyInfo,
  RiskReport,
} from './types.js'

async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<Array<{ ok: true; value: R } | { ok: false; error: unknown }>> {
  const out: Array<{ ok: true; value: R } | { ok: false; error: unknown }> = new Array(items.length)
  let next = 0
  let done = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = next++
      if (idx >= items.length) return
      try {
        const value = await worker(items[idx]!)
        out[idx] = { ok: true, value }
      } catch (error) {
        out[idx] = { ok: false, error }
      }
      done++
      onProgress?.(done, items.length)
    }
  })
  await Promise.all(workers)
  return out
}

function unwrap<T>(results: Array<{ ok: true; value: T } | { ok: false; error: unknown }>, continueOnError: boolean): T[] {
  if (!continueOnError) {
    const failed = results.find((r) => !r.ok)
    if (failed && !failed.ok) throw failed.error
  }
  return results.filter((r): r is { ok: true; value: T } => r.ok).map((r) => r.value)
}

export const batch = {
  async companies(icos: string[], opts?: BatchOptions): Promise<Map<string, CompanyInfo>> {
    const concurrency = opts?.concurrency ?? 5
    const continueOnError = opts?.continueOnError ?? true
    const results = await runConcurrent(icos, concurrency, (ico) => company.lookup(ico, opts), opts?.onProgress)
    const map = new Map<string, CompanyInfo>()
    icos.forEach((ico, idx) => {
      const r = results[idx]!
      if (r.ok) map.set(ico, r.value)
      else if (!continueOnError) throw r.error
    })
    return map
  },

  async riskCheck(icos: string[], opts?: BatchOptions): Promise<Map<string, RiskReport>> {
    const concurrency = opts?.concurrency ?? 5
    const continueOnError = opts?.continueOnError ?? true
    const results = await runConcurrent(icos, concurrency, (ico) => risk.assess(ico, opts), opts?.onProgress)
    const map = new Map<string, RiskReport>()
    icos.forEach((ico, idx) => {
      const r = results[idx]!
      if (r.ok) map.set(ico, r.value)
      else if (!continueOnError) throw r.error
    })
    return map
  },

  async monitor(icos: string[], _since: string, opts?: BatchOptions): Promise<ChangeReport[]> {
    const map = await batch.companies(icos, opts)
    return Array.from(map.keys()).map((ico) => ({ ico, changes: [] }))
  },
}

void unwrap
