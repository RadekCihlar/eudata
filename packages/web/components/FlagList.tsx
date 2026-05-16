interface Flag {
  source?: string
  code?: string
  message?: string
  severity?: string
  detail?: string
}

const SEVERITY_STYLES: Record<string, string> = {
  low: 'border-risk-low/30 bg-risk-low/5',
  medium: 'border-risk-medium/30 bg-risk-medium/5',
  high: 'border-risk-high/30 bg-risk-high/5',
  critical: 'border-risk-critical/30 bg-risk-critical/5',
}

const SEVERITY_LABEL: Record<string, string> = {
  low: 'text-risk-low',
  medium: 'text-risk-medium',
  high: 'text-risk-high',
  critical: 'text-risk-critical',
}

export function FlagList({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) {
    return <div className="text-white/40 text-sm italic">No flags raised.</div>
  }
  return (
    <ul className="space-y-2">
      {flags.map((f, i) => (
        <li
          key={i}
          className={`border rounded-md p-3 ${SEVERITY_STYLES[f.severity ?? ''] ?? 'border-white/10'}`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`font-mono text-[10px] uppercase tracking-widest font-bold ${
                SEVERITY_LABEL[f.severity ?? ''] ?? 'text-white/60'
              }`}
            >
              {f.severity}
            </span>
            <div className="flex-1">
              <div className="font-medium">{f.message}</div>
              <div className="text-xs text-white/40 mt-0.5 font-mono">
                {f.source} · {f.code}
                {f.detail && ` · ${f.detail}`}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
