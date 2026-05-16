'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { JsonViewer } from './JsonViewer'
import { RiskBadge } from './RiskBadge'
import { FlagList } from './FlagList'

interface Flag {
  source?: string
  code?: string
  message?: string
  severity?: string
  detail?: string
}
import type { ModuleSpec } from '@/lib/modules'
import { STATUS_META } from '@/lib/modules'

interface ApiResponse {
  ok: boolean
  data?: unknown
  error?: string
  elapsedMs?: number
}

export function ModuleClient({ module: mod }: { module: ModuleSpec }) {
  const router = useRouter()
  const params = useSearchParams()
  const initialId = params.get('id') ?? ''
  const [id, setId] = useState(initialId)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const run = useCallback(
    async (currentId: string) => {
      if (!currentId) return
      setLoading(true)
      setResponse(null)
      const url = `/api/${mod.country}/${mod.slug}?id=${encodeURIComponent(currentId)}`
      try {
        const res = await fetch(url)
        const json = (await res.json()) as ApiResponse
        setResponse(json)
      } catch (e) {
        setResponse({ ok: false, error: (e as Error).message })
      } finally {
        setLoading(false)
      }
    },
    [mod.country, mod.slug]
  )

  useEffect(() => {
    if (initialId) void run(initialId)
  }, [initialId, run])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.replace(`/${mod.country}/${mod.slug}?id=${encodeURIComponent(id)}`)
    void run(id)
  }

  const loadExample = () => {
    setId(mod.exampleId)
    router.replace(`/${mod.country}/${mod.slug}?id=${encodeURIComponent(mod.exampleId)}`)
    void run(mod.exampleId)
  }

  const copyCurl = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const curl = `curl '${baseUrl}/api/${mod.country}/${mod.slug}?id=${encodeURIComponent(id || mod.exampleId)}'`
    await navigator.clipboard.writeText(curl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const risk = response?.ok && isRiskReport(response.data) ? response.data : null

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-xs uppercase tracking-widest text-accent-400">
            {mod.country} / {mod.slug}
          </span>
          <span className="h-px flex-1 bg-white/10" />
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider ${STATUS_META[mod.status].color}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[mod.status].dot}`} />
            {STATUS_META[mod.status].label}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{mod.label}</h1>
        <p className="text-white/60 mt-1">{mod.description}</p>
        {mod.note && (
          <div
            className={`mt-4 border rounded-md p-3 text-sm ${
              mod.status === 'broken'
                ? 'border-red-500/30 bg-red-500/5 text-red-200'
                : mod.status === 'needs_key'
                ? 'border-sky-500/30 bg-sky-500/5 text-sky-200'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-200'
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest mr-2">
              {STATUS_META[mod.status].label}
            </span>
            {mod.note}
          </div>
        )}
      </header>

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs uppercase tracking-widest text-white/40 font-mono">
          {mod.inputLabel}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder={mod.exampleId}
            className="flex-1 bg-white/5 border border-white/10 rounded-md px-4 py-3 font-mono focus:outline-none focus:border-accent-500"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !id}
            className="px-6 py-3 rounded-md bg-accent-500 text-black font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-400"
          >
            {loading ? '…' : 'Lookup'}
          </button>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={loadExample}
            className="px-2 py-1 rounded border border-white/10 text-white/60 hover:text-white hover:border-accent-500/50 font-mono"
          >
            ↺ Example: {mod.exampleId}
          </button>
          {id && (
            <button
              type="button"
              onClick={copyCurl}
              className="px-2 py-1 rounded border border-white/10 text-white/60 hover:text-white hover:border-accent-500/50 font-mono"
            >
              {copied ? '✓ Copied' : 'Copy as curl'}
            </button>
          )}
        </div>
      </form>

      {loading && (
        <div className="border border-white/10 rounded-lg p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-accent-500 rounded-full animate-spin" />
          <div className="text-white/40 mt-3 text-sm">calling {mod.country}:{mod.slug}…</div>
        </div>
      )}

      {response && !loading && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span
              className={`px-2 py-1 rounded ${
                response.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
              }`}
            >
              {response.ok ? '200 OK' : 'ERROR'}
            </span>
            {response.elapsedMs !== undefined && (
              <span className="text-white/40">{response.elapsedMs}ms</span>
            )}
          </div>

          {!response.ok && (
            <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4 font-mono text-sm text-red-300">
              {response.error}
            </div>
          )}

          {risk && (
            <div className="space-y-4">
              <RiskBadge score={risk.score} level={risk.level} />
              <div>
                <h3 className="text-xs uppercase tracking-widest text-white/40 font-mono mb-2">
                  Flags
                </h3>
                <FlagList flags={(risk.flags ?? []) as unknown as Flag[]} />
              </div>
            </div>
          )}

          {response.ok && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/40 font-mono mb-2">
                Raw response
              </h3>
              <JsonViewer data={response.data} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function isRiskReport(d: unknown): d is { score: number; level: string; flags: unknown[] } {
  return (
    typeof d === 'object' &&
    d !== null &&
    'score' in d &&
    'level' in d &&
    typeof (d as { score: unknown }).score === 'number'
  )
}
