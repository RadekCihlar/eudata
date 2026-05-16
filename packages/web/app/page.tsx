import Link from 'next/link'
import { MODULES, STATUS_META } from '@/lib/modules'

const QUICK_TRIES = [
  { country: 'eu', slug: 'universal', id: '64949681', desc: 'Universal lookup — T-Mobile CZ (ICO)' },
  { country: 'cz', slug: 'company', id: '64949681', desc: 'T-Mobile Czech Republic a.s. (ARES)' },
  { country: 'sk', slug: 'company', id: '35763469', desc: 'Slovak Telekom, a.s. (ORSR scrape)' },
  { country: 'pl', slug: 'company', id: '0000010681', desc: 'Orange Polska S.A. (KRS)' },
  { country: 'pl', slug: 'vat', id: '5260250995', desc: 'Orange Polska White List (150 banks)' },
  { country: 'cz', slug: 'risk', id: '64949681', desc: 'T-Mobile CZ composite risk' },
]

export default function Home() {
  const working = MODULES.filter((m) => m.status === 'working').length
  const experimental = MODULES.filter((m) => m.status === 'experimental').length

  return (
    <div className="space-y-12">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-accent-400 font-mono text-xs uppercase tracking-widest">
            eudata.explorer · v0.1
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          EU public data,<br />
          <span className="text-accent-500">unified</span>
        </h1>
        <p className="mt-6 text-lg text-white/60 max-w-2xl">
          Real, working access to Czech, Slovak, Polish, and EU public registries.
          Honest about scope: {working} verified working sources, {experimental} experimental.
          Pick a module on the left.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs uppercase tracking-wider text-emerald-300">
              {STATUS_META.working.label}
            </span>
          </div>
          <div className="font-mono text-3xl font-bold text-emerald-300 mt-2">{working}</div>
          <div className="text-xs text-white/40 mt-1">Verified live</div>
        </div>
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs uppercase tracking-wider text-amber-300">
              {STATUS_META.experimental.label}
            </span>
          </div>
          <div className="font-mono text-3xl font-bold text-amber-300 mt-2">{experimental}</div>
          <div className="text-xs text-white/40 mt-1">Network/parser issues</div>
        </div>
        <div className="border border-white/10 rounded-lg p-5 bg-white/5">
          <div className="text-xs uppercase tracking-wider text-white/40">Runtime deps</div>
          <div className="font-mono text-3xl font-bold text-accent-400 mt-2">0</div>
          <div className="text-xs text-white/40 mt-1">Node 20+ built-ins only</div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-white/40">Try these</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_TRIES.map((t) => (
            <Link
              key={`${t.country}-${t.slug}`}
              href={`/${t.country}/${t.slug}?id=${encodeURIComponent(t.id)}`}
              className="border border-white/10 rounded-lg p-4 hover:bg-white/5 hover:border-accent-500/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-accent-400">
                  {t.country} / {t.slug}
                </span>
                <span className="text-white/30 group-hover:text-accent-400">→</span>
              </div>
              <div className="font-medium mt-1">{t.desc}</div>
              <div className="text-xs text-white/50 mt-1 font-mono">id={t.id}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border border-white/10 rounded-lg p-6 bg-white/5">
        <h2 className="text-sm font-mono uppercase tracking-widest text-white/40 mb-3">
          Honest scope
        </h2>
        <p className="text-white/70 text-sm leading-relaxed">
          The plan listed 45 sources. In reality, ~30 of those gov registries have no public
          REST API — they ship as HTML SPAs, CSV downloads, or behind login walls. v0.1 ships
          the working set. Broken modules stay in the codebase with status flags and notes
          on what's needed (API keys, real scrapers, alternate endpoints). See{' '}
          <code className="font-mono text-accent-400">STATUS.md</code> for the full breakdown.
        </p>
      </section>
    </div>
  )
}
