interface Props {
  score: number
  level: string
}

const LEVEL_COLOR: Record<string, string> = {
  low: 'bg-risk-low/20 text-risk-low border-risk-low/30',
  medium: 'bg-risk-medium/20 text-risk-medium border-risk-medium/30',
  high: 'bg-risk-high/20 text-risk-high border-risk-high/30',
  critical: 'bg-risk-critical/20 text-risk-critical border-risk-critical/30',
}

export function RiskBadge({ score, level }: Props) {
  const colorClass = LEVEL_COLOR[level] ?? 'bg-white/10 text-white border-white/20'
  return (
    <div className="flex items-center gap-4 p-6 border border-white/10 rounded-lg bg-white/5">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 264} 264`}
            className={
              level === 'low'
                ? 'text-risk-low'
                : level === 'medium'
                ? 'text-risk-medium'
                : level === 'high'
                ? 'text-risk-high'
                : 'text-risk-critical'
            }
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-2xl">
          {score}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-widest text-white/40">Risk level</div>
        <div
          className={`inline-flex items-center px-3 py-1 mt-1 rounded-md border text-sm font-bold uppercase ${colorClass}`}
        >
          {level}
        </div>
        <div className="text-sm text-white/60 mt-2">Score: {score}/100</div>
      </div>
    </div>
  )
}
