'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { COUNTRY_FLAGS, COUNTRY_LABELS, MODULES } from '@/lib/modules'

const COUNTRIES: Array<'cz' | 'sk' | 'pl' | 'eu'> = ['cz', 'sk', 'pl', 'eu']

export function Sidebar() {
  const pathname = usePathname()
  const [filter, setFilter] = useState('')

  const grouped = useMemo(() => {
    const f = filter.toLowerCase().trim()
    return COUNTRIES.map((c) => ({
      country: c,
      modules: MODULES.filter(
        (m) => m.country === c && (!f || m.label.toLowerCase().includes(f) || m.slug.includes(f))
      ),
    })).filter((g) => g.modules.length > 0)
  }, [filter])

  return (
    <aside className="w-72 shrink-0 border-r border-white/10 bg-ink-950 flex flex-col">
      <Link href="/" className="block p-6 pb-4">
        <div className="font-mono text-xs uppercase tracking-widest text-accent-400">eudata</div>
        <div className="text-xl font-bold mt-0.5">explorer</div>
      </Link>

      <div className="px-4 pb-3">
        <input
          type="text"
          placeholder="filter modules…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent-500"
        />
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-6">
        {grouped.map((g) => (
          <div key={g.country} className="mb-4">
            <div className="px-2 py-1.5 flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-500">
                {COUNTRY_FLAGS[g.country]}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                {COUNTRY_LABELS[g.country]}
              </span>
              <span className="h-px flex-1 bg-white/5" />
            </div>
            <ul>
              {g.modules.map((m) => {
                const href = `/${m.country}/${m.slug}`
                const active = pathname === href
                return (
                  <li key={`${m.country}-${m.slug}`}>
                    <Link
                      href={href}
                      className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                        active
                          ? 'bg-accent-500/20 text-accent-400 font-medium'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 text-xs text-white/40">
        <div className="font-mono">v0.0.1 · 45 sources</div>
      </div>
    </aside>
  )
}
