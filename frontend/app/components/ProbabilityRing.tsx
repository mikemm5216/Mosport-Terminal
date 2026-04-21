'use client'

interface Props {
  prob: number        // 0–1
  label: string
  size?: number
}

const LABEL_COLOR: Record<string, string> = {
  STRONG:   '#22C55E',
  UPSET:    '#A855F7',
  CHAOS:    '#EAB308',
  WEAK:     '#3F3F46',
  COLLAPSE: '#EF4444',
}

export default function ProbabilityRing({ prob, label, size = 88 }: Props) {
  const r       = (size / 2) - 7
  const circ    = 2 * Math.PI * r
  const filled  = circ * prob
  const color   = LABEL_COLOR[label] ?? '#71717A'
  const pct     = Math.round(prob * 100)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ position: 'absolute' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#27272A" strokeWidth={5}
        />
        {/* Fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          style={{
            transition: 'stroke-dasharray 1s ease',
            filter: `drop-shadow(0 0 4px ${color}88)`,
          }}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span className="text-xl font-bold leading-none" style={{ color }}>
          {pct}
        </span>
        <span className="text-[9px] text-zinc-500 font-mono mt-0.5">WIN%</span>
      </div>
    </div>
  )
}
