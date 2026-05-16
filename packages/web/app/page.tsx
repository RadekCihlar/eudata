import Link from 'next/link'

const STATS = [
  { label: 'Data sources', value: '45' },
  { label: 'Countries', value: '3 + EU' },
  { label: 'Modules', value: '38' },
  { label: 'Runtime deps', value: '0' },
]

export default function Home() {
  return (
    <div className="space-y-12">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-accent-400 font-mono text-xs uppercase tracking-widest">eudata.explorer</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          Unified EU<br />
          <span className="text-accent-500">public data</span>
        </h1>
        <p className="mt-6 text-lg text-white/60 max-w-2xl">
          One library, 45 free public registries across Czech Republic, Slovakia, Poland,
          and the EU layer. Pick a module on the left and try it live.
        </p>
      </header>

      <div className="grid grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="border border-white/10 rounded-lg p-5 bg-white/5">
            <div className="font-mono text-3xl font-bold text-accent-400">{s.value}</div>
            <div className="text-xs text-white/40 uppercase tracking-wider mt-2">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-white/40">Try these</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/cz/company?id=64774716"
            className="border border-white/10 rounded-lg p-4 hover:bg-white/5 hover:border-accent-500/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-accent-400">CZ / company</span>
              <span className="text-white/30 group-hover:text-accent-400">→</span>
            </div>
            <div className="font-medium mt-1">Lookup ARES by ICO</div>
            <div className="text-sm text-white/50 mt-1">e.g. 64774716</div>
          </Link>

          <Link
            href="/eu/vies?id=CZ64774716"
            className="border border-white/10 rounded-lg p-4 hover:bg-white/5 hover:border-accent-500/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-accent-400">EU / vies</span>
              <span className="text-white/30 group-hover:text-accent-400">→</span>
            </div>
            <div className="font-medium mt-1">Validate EU VAT</div>
            <div className="text-sm text-white/50 mt-1">All 27 member states</div>
          </Link>

          <Link
            href="/pl/vat?id=5213003798"
            className="border border-white/10 rounded-lg p-4 hover:bg-white/5 hover:border-accent-500/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-accent-400">PL / vat</span>
              <span className="text-white/30 group-hover:text-accent-400">→</span>
            </div>
            <div className="font-medium mt-1">White List check</div>
            <div className="text-sm text-white/50 mt-1">Bank account verification</div>
          </Link>

          <Link
            href="/cz/risk?id=64774716"
            className="border border-white/10 rounded-lg p-4 hover:bg-white/5 hover:border-accent-500/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-accent-400">CZ / risk</span>
              <span className="text-white/30 group-hover:text-accent-400">→</span>
            </div>
            <div className="font-medium mt-1">Composite risk score</div>
            <div className="text-sm text-white/50 mt-1">Combines 3+ sources</div>
          </Link>
        </div>
      </section>
    </div>
  )
}
