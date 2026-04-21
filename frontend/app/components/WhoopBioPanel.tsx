'use client'

import type { WhoopSync } from '../data/mockData'

interface Props {
  data: WhoopSync
}

// SVG heartbeat path — simplified ECG wave
const ECG_PATH = 'M0,20 L15,20 L20,5 L25,35 L30,20 L35,20 L40,20 L45,8 L50,32 L55,20 L70,20'

export default function WhoopBioPanel({ data }: Props) {
  const isMiracle = data.mode === 'MIRACLE'
  const isRisk    = data.mode === 'RISK'

  return (
    <div className="sticky top-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
          Bio Panel
        </span>
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{
            color:      isMiracle ? '#22C55E' : isRisk ? '#EF4444' : '#71717A',
            background: isMiracle ? 'rgba(34,197,94,0.1)' : isRisk ? 'rgba(239,68,68,0.1)' : 'rgba(63,63,70,0.2)',
          }}
        >
          {data.mode}
        </span>
      </div>

      {/* Heartbeat card */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#121217', border: '1px solid #27272A' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">WHOOP Sync</span>
          {isMiracle && (
            <span className="animate-blink flex items-center gap-1 text-[9px] font-mono text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              LIVE
            </span>
          )}
        </div>

        {/* ECG animation */}
        <div className="mb-3 overflow-hidden rounded" style={{ height: 40, background: '#0a0a0f' }}>
          <svg width="100%" height="40" viewBox="0 0 70 40" preserveAspectRatio="none">
            <path
              d={ECG_PATH}
              fill="none"
              stroke={isMiracle ? '#22C55E' : '#EF4444'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="200"
              style={isMiracle ? { animation: 'heartbeat 1.6s linear infinite' } : {}}
            />
          </svg>
        </div>

        {/* HRV */}
        <BioRow
          label="HRV Delta"
          value={data.hrv_delta}
          positive
          sub="vs 30-day baseline"
        />
      </div>

      {/* Recovery card */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#121217', border: '1px solid #27272A' }}
      >
        <BioRow label="Recovery" value={`${data.recovery}%`} positive={data.recovery >= 70} />
        <div className="mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width:      `${data.recovery}%`,
              background: data.recovery >= 70
                ? 'linear-gradient(90deg, #16A34A, #22C55E)'
                : 'linear-gradient(90deg, #B45309, #EAB308)',
            }}
          />
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #1e1e26' }}>
          <BioRow
            label="Sleep Debt"
            value={`${data.sleep_debt_hrs}h`}
            positive={data.sleep_debt_hrs < 1}
          />
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #1e1e26' }}>
          <BioRow
            label="Strain"
            value={data.strain.toFixed(1)}
            positive={data.strain < 14}
            sub="/ 21 max"
          />
        </div>
      </div>

      {/* Impact bridge */}
      <div
        className="rounded-xl p-4"
        style={{
          background: isMiracle ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border:     `1px solid ${isMiracle ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}
      >
        <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-2">
          Decision Impact
        </div>
        <div
          className="text-[12px] font-semibold leading-snug"
          style={{ color: isMiracle ? '#86EFAC' : '#FCA5A5' }}
        >
          Bio-data {isMiracle ? 'increased' : 'reduced'} decision confidence by{' '}
          <span className="text-white">
            {isMiracle ? '+' : '−'}{Math.round(data.impact_score * 100 * (1 + data.recovery / 100))}%
          </span>
        </div>
        <div className="mt-2 text-[10px] text-zinc-600">
          {isMiracle
            ? 'Optimal biometric state → Enhanced mode active'
            : 'Elevated strain → reduced bet sizing recommended'}
        </div>
      </div>

      {/* Socket animation */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#121217', border: '1px solid #27272A' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Data Feed</span>
          <span className="text-[9px] font-mono text-zinc-600">CONNECTED</span>
        </div>
        <div className="space-y-2">
          {['WHOOP API', 'Odds Feed', 'Statcast'].map(src => (
            <div key={src} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-16">{src}</span>
              <div className="socket-track flex-1">
                <div className="socket-dot" />
                <div className="socket-dot" />
                <div className="socket-dot" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BioRow({ label, value, positive, sub }: {
  label: string; value: string; positive: boolean; sub?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[11px] text-zinc-400">{label}</span>
        {sub && <span className="text-[9px] text-zinc-600 ml-1">{sub}</span>}
      </div>
      <span
        className="text-sm font-bold font-mono"
        style={{ color: positive ? '#22C55E' : '#EF4444' }}
      >
        {value}
      </span>
    </div>
  )
}
