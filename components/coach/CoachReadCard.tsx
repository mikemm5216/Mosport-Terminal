'use client'

import React from 'react'
import { CoachReadDTO } from '../../types/coach'
import FanVoteBar from './FanVoteBar'
import LiveStatusBadge from '../game/LiveStatusBadge'
import DataChallengeButton from '../data/DataChallengeButton'
import { MessageSquare, ThumbsUp, ThumbsDown, HelpCircle, ChevronRight } from 'lucide-react'

interface CoachReadCardProps {
  data: CoachReadDTO
  onVote: (stance: 'AGREE' | 'DISAGREE' | 'ALTERNATIVE') => void
  onComment: () => void
}

export default function CoachReadCard({ data, onVote, onComment }: CoachReadCardProps) {
  const isInsufficient = data.engineStatus === 'INSUFFICIENT_DATA'

  return (
    <div className="group relative bg-[#0f172a] border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all duration-500 shadow-2xl">
      {/* Header with Game Info */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black italic text-slate-500 uppercase tracking-tighter">{data.league}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{data.awayTeam.shortName}</span>
              <span className="text-[10px] font-bold text-slate-600">@</span>
              <span className="text-sm font-bold text-white">{data.homeTeam.shortName}</span>
            </div>
          </div>
        </div>
        <LiveStatusBadge status={data.gameStatus} sport={data.sport} />
      </div>

      {/* Coach Question Section */}
      <div className="p-6 space-y-4">
        {data.analysisPhase !== 'PREGAME_OPEN' && (
          <div className="flex gap-2 mb-2">
            <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/30">
              賽前判斷已鎖定
            </div>
            <div className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest border border-blue-500/30">
              Live Follow Only
            </div>
          </div>
        )}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">Coach Question</span>
          <h2 className="text-xl font-black italic text-white leading-tight">{data.coachQuestion}</h2>
        </div>

        {isInsufficient ? (
          <div className="p-6 bg-rose-500/5 rounded-lg border border-rose-500/20 text-center">
            <div className="text-rose-400 text-xs font-black uppercase tracking-widest mb-2">Engine Alert: Insufficient Data</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              資料不足，不強行給傾向。<br />
              你可以先留下你的教練判斷。
            </p>
          </div>
        ) : (
          <>
            <div className="relative p-4 bg-blue-500/5 rounded-lg border-l-2 border-blue-500/50">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase italic">
                Mosport Read
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic">
                "{data.coachRead}"
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.whyItMatters.map((point, i) => (
                <div key={i} className="px-2 py-1 bg-slate-800/50 rounded text-[10px] text-slate-400 border border-white/5">
                  • {point}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* World Engine Evidence */}
      {!isInsufficient && (
        <div className="px-6 py-4 bg-black/20 border-y border-white/5">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-3">World Engine Evidence</span>
          <div className="space-y-3">
            {data.worldEngineEvidence.map((ev, i) => (
              <div key={i} className="flex justify-between items-start gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">{ev.label}</span>
                  <span className="text-[10px] text-slate-500 leading-tight">{ev.explanation}</span>
                </div>
                <div className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                  ev.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {ev.valueLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fan Interaction Section */}
      <div className="p-6 space-y-6">
        {data.fanVoteSummary && (
          <FanVoteBar 
            agreePct={data.fanVoteSummary.agreePct} 
            disagreePct={data.fanVoteSummary.disagreePct} 
            alternativePct={data.fanVoteSummary.alternativePct} 
            totalVotes={data.fanVoteSummary.totalVotes} 
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onVote('AGREE')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all active:scale-95 group/btn"
          >
            <ThumbsUp size={16} className="group-hover/btn:-rotate-12 transition-transform" />
            <span className="text-xs font-black italic uppercase">同意 (Agree)</span>
          </button>
          <button 
            onClick={() => onVote('DISAGREE')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-all active:scale-95 group/btn"
          >
            <ThumbsDown size={16} className="group-hover/btn:rotate-12 transition-transform" />
            <span className="text-xs font-black italic uppercase">不同意 (Disagree)</span>
          </button>
          <button 
            onClick={() => onVote('ALTERNATIVE')}
            className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg transition-all active:scale-95 group/btn"
          >
            <HelpCircle size={16} />
            <span className="text-xs font-black italic uppercase">我有別招 (Another Call)</span>
          </button>
        </div>

        <button 
          onClick={onComment}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-all group/comment"
        >
          <div className="flex items-center gap-3">
            <MessageSquare size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">加入教練辯論 (Comment)</span>
          </div>
          <ChevronRight size={14} className="group-hover/comment:translate-x-1 transition-transform" />
        </button>
      </div>


      <div className="px-6 py-3 bg-black/40 border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${data.debateIntensity === 'HOT' ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Debate Intensity: {data.debateIntensity}</span>
          </div>
          <DataChallengeButton matchId={data.matchId} />
        </div>
        <span className="text-[8px] font-mono text-slate-600">LOCKED AT KICKOFF</span>
      </div>
    </div>
  )
}
