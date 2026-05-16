'use client'

import { useState } from 'react'

interface Props {
  data: unknown
  collapseDepth?: number
}

export function JsonViewer({ data, collapseDepth = 2 }: Props) {
  return (
    <div className="font-mono text-sm leading-relaxed bg-black/40 border border-white/10 rounded-lg p-4 overflow-x-auto scrollbar-thin">
      <Node value={data} depth={0} collapseDepth={collapseDepth} keyName="" />
    </div>
  )
}

function Node({
  value,
  depth,
  collapseDepth,
  keyName,
}: {
  value: unknown
  depth: number
  collapseDepth: number
  keyName: string
}) {
  const [open, setOpen] = useState(depth < collapseDepth)

  if (value === null) return <Atom keyName={keyName} text="null" className="text-white/40" />
  if (typeof value === 'string') return <Atom keyName={keyName} text={`"${value}"`} className="text-emerald-300" />
  if (typeof value === 'number') return <Atom keyName={keyName} text={String(value)} className="text-accent-400" />
  if (typeof value === 'boolean')
    return <Atom keyName={keyName} text={String(value)} className="text-fuchsia-300" />

  if (Array.isArray(value)) {
    if (value.length === 0) return <Atom keyName={keyName} text="[]" className="text-white/40" />
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white/40 hover:text-white text-left"
        >
          {keyName && <span className="text-sky-300">{keyName}</span>}
          {keyName && <span className="text-white/30">: </span>}
          <span>{open ? '▾' : '▸'}</span> <span className="text-white/60">[{value.length}]</span>
        </button>
        {open && (
          <div className="pl-4 border-l border-white/10 ml-1 mt-1">
            {value.map((v, i) => (
              <Node
                key={i}
                value={v}
                depth={depth + 1}
                collapseDepth={collapseDepth}
                keyName={String(i)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <Atom keyName={keyName} text="{}" className="text-white/40" />
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white/40 hover:text-white text-left"
        >
          {keyName && <span className="text-sky-300">{keyName}</span>}
          {keyName && <span className="text-white/30">: </span>}
          <span>{open ? '▾' : '▸'}</span>{' '}
          <span className="text-white/60">{`{${entries.length}}`}</span>
        </button>
        {open && (
          <div className="pl-4 border-l border-white/10 ml-1 mt-1">
            {entries.map(([k, v]) => (
              <Node
                key={k}
                value={v}
                depth={depth + 1}
                collapseDepth={collapseDepth}
                keyName={k}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return <Atom keyName={keyName} text={String(value)} className="text-white" />
}

function Atom({ keyName, text, className }: { keyName: string; text: string; className: string }) {
  return (
    <div>
      {keyName && <span className="text-sky-300">{keyName}</span>}
      {keyName && <span className="text-white/30">: </span>}
      <span className={className}>{text}</span>
    </div>
  )
}
