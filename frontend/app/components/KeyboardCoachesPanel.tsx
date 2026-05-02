'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { MessageSquare, ThumbsUp, ThumbsDown, Zap, ShieldAlert, ChevronDown, ChevronUp, User } from 'lucide-react'
import { CoachDecisionAction } from '../contracts/coachDecision'

interface Props {
  matchId: string
  league: string
  user: any
  onAuthRequired: () => void
}

const COMMON_ACTIONS: CoachDecisionAction[] = [
  'KEEP_STRUCTURE',
  'NO_FORCED_CHANGE',
  'ADJUST_ROTATION',
  'LIMIT_USAGE',
  'REST_KEY_PLAYER',
  'INCREASE_USAGE',
  'REASSIGN_MATCHUP',
  'TARGET_MATCHUP_EDGE'
]

const SPORT_SPECIFIC_ACTIONS: Record<string, CoachDecisionAction[]> = {
  MLB: ['BULLPEN_ALERT', 'PINCH_HIT_WINDOW', 'DEFENSIVE_SUBSTITUTION'],
  NBA: ['STAGGER_MINUTES', 'PROTECT_PRIMARY_HANDLER'],
  NHL: ['LINE_CHANGE_ALERT', 'SHORTEN_SHIFTS', 'GOALIE_PROTECTION'],
  EPL: ['SUBSTITUTION_WINDOW', 'PRESSING_ADJUSTMENT', 'BLOCK_SHAPE_ADJUSTMENT'],
  UCL: ['SUBSTITUTION_WINDOW', 'PRESSING_ADJUSTMENT', 'BLOCK_SHAPE_ADJUSTMENT'],
}

export default function KeyboardCoachesPanel({ matchId, league, user, onAuthRequired }: Props) {
  const [comments, setComments] = useState<any[]>([])
  const [voteSummary, setVoteSummary] = useState<any>(null)
  const [userVote, setUserVote] = useState<any>(null)
  const [stance, setStance] = useState<'AGREE' | 'DISAGREE' | 'ALTERNATIVE' | 'WATCH_ONLY'>('AGREE')
  const [commentText, setCommentText] = useState('')
  const [coachAction, setCoachAction] = useState<CoachDecisionAction>('KEEP_STRUCTURE')
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const availableActions = useMemo(() => {
    return [...COMMON_ACTIONS, ...(SPORT_SPECIFIC_ACTIONS[league] || [])]
  }, [league])

  useEffect(() => {
    fetchData()
  }, [matchId, user])

  const fetchData = async () => {
    try {
      const [comRes, voteRes] = await Promise.all([
        fetch(`/api/matches/${matchId}/comments`),
        fetch(`/api/matches/${matchId}/coach-vote`)
      ])
      const comData = await comRes.json()
      const voteData = await voteRes.json()
      setComments(comData.comments || [])
      setVoteSummary(voteData.summary)
      setUserVote(voteData.userVote)
    } catch (err) {
      console.error('Fetch keyboard coaches data error:', err)
    }
  }

  const handleVote = async (newStance: typeof stance) => {
    if (!user) {
      onAuthRequired()
      return
    }

    try {
      const res = await fetch(`/api/matches/${matchId}/coach-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stance: newStance, coachAction: newStance === 'ALTERNATIVE' ? coachAction : undefined }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Vote error:', err)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      onAuthRequired()
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stance, commentText, coachAction: stance === 'ALTERNATIVE' ? coachAction : undefined }),
      })
      if (res.ok) {
        setCommentText('')
        fetchData()
      }
    } catch (err) {
      console.error('Comment error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#050b16] border border-[#1e293b] rounded-lg overflow-hidden shadow-xl mt-6">
      <div 
        className="flex items-center justify-between px-4 py-3 bg-[#0a1224] border-b border-[#1e293b] cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#3b82f6]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Keyboard Coaches</h3>
          {voteSummary && (
            <span className="text-[10px] text-[#64748b] ml-2">
              {voteSummary.total} SIGNALS RECEIVED
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Stance Controls */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'AGREE', label: 'Agree', icon: ThumbsUp, color: '#34d399' },
              { id: 'DISAGREE', label: 'Disagree', icon: ThumbsDown, color: '#f43f5e' },
              { id: 'ALTERNATIVE', label: 'Alternative', icon: Zap, color: '#3b82f6' },
              { id: 'WATCH_ONLY', label: 'Watch Only', icon: ShieldAlert, color: '#94a3b8' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStance(s.id as any)
                  handleVote(s.id as any)
                }}
                className={`flex flex-col items-center justify-center p-3 rounded border transition-all ${
                  (userVote?.stance === s.id || stance === s.id)
                    ? `bg-[${s.color}]22 border-[${s.color}] shadow-[0_0_10px_${s.color}33]` 
                    : 'bg-[#030812] border-[#1e293b] hover:border-[#334155]'
                }`}
                style={{
                  backgroundColor: (userVote?.stance === s.id || stance === s.id) ? `${s.color}15` : undefined,
                  borderColor: (userVote?.stance === s.id || stance === s.id) ? s.color : undefined
                }}
              >
                <s.icon className="w-4 h-4 mb-2" style={{ color: s.color }} />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Alternative Action Select */}
          {stance === 'ALTERNATIVE' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <label className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest px-1">Proposed Alternative Action</label>
              <select
                value={coachAction}
                onChange={(e) => setCoachAction(e.target.value as CoachDecisionAction)}
                className="w-full bg-[#030812] border border-[#1e293b] rounded py-2 px-3 text-[10px] text-white focus:outline-none focus:border-[#3b82f6]"
              >
                {availableActions.map(action => (
                  <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {/* Comment Form */}
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <div className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user ? "Enter tactical reasoning..." : "Log in to post tactical signals..."}
                disabled={!user || loading}
                className="w-full bg-[#030812] border border-[#1e293b] rounded p-3 text-[11px] text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#3b82f6] min-h-[80px] resize-none"
              />
              {!user && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded transition-all group">
                   <button 
                    type="button"
                    onClick={onAuthRequired}
                    className="bg-[#3b82f6] text-white text-[10px] font-bold uppercase tracking-[0.2em] px-6 py-2 rounded shadow-lg hover:bg-[#2563eb]"
                   >
                     Login Required
                   </button>
                </div>
              )}
            </div>
            
            {user && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#64748b]">
                    <User className="w-3 h-3" />
                    <span className="font-bold text-[#94a3b8]">{user.displayName}</span>
                  </div>
                  <div className="text-[10px] text-[#475569] uppercase font-bold tracking-widest">
                    REP: {user.reputation}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !commentText.trim()}
                  className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-30 text-white font-bold py-1.5 px-6 rounded text-[10px] uppercase tracking-[0.15em] transition-all"
                >
                  {loading ? 'Transmitting...' : 'Emit Signal'}
                </button>
              </div>
            )}
          </form>

          {/* Summary */}
          {voteSummary && voteSummary.total > 0 && (
            <div className="pt-4 border-t border-[#1e293b] space-y-4">
               <div className="flex justify-between items-end mb-1">
                 <h4 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Consensus Delta</h4>
                 <span className="text-[9px] text-[#475569] font-mono">{voteSummary.total} SAMPLES</span>
               </div>
               <div className="h-1.5 w-full bg-[#030812] rounded-full overflow-hidden flex">
                 <div style={{ width: `${(voteSummary.agree / voteSummary.total) * 100}%`, backgroundColor: '#34d399' }} />
                 <div style={{ width: `${(voteSummary.disagree / voteSummary.total) * 100}%`, backgroundColor: '#f43f5e' }} />
                 <div style={{ width: `${(voteSummary.alternative / voteSummary.total) * 100}%`, backgroundColor: '#3b82f6' }} />
                 <div style={{ width: `${(voteSummary.watchOnly / voteSummary.total) * 100}%`, backgroundColor: '#475569' }} />
               </div>
               <div className="flex justify-between text-[8px] font-bold text-[#475569] uppercase tracking-wider">
                 <span style={{ color: '#34d399' }}>AGREE {Math.round((voteSummary.agree / voteSummary.total) * 100)}%</span>
                 <span style={{ color: '#f43f5e' }}>DISAGREE {Math.round((voteSummary.disagree / voteSummary.total) * 100)}%</span>
                 <span style={{ color: '#3b82f6' }}>ALT {Math.round((voteSummary.alternative / voteSummary.total) * 100)}%</span>
               </div>
               {voteSummary.topAlternativeAction && (
                 <div className="bg-[#3b82f6]/5 border border-[#3b82f6]/20 rounded p-2 text-[9px] flex items-center justify-between">
                   <span className="text-[#3b82f6] font-bold uppercase tracking-widest">Top Alternative Action:</span>
                   <span className="text-white font-mono">{voteSummary.topAlternativeAction.replace(/_/g, ' ')}</span>
                 </div>
               )}
            </div>
          )}

          {/* Comment List */}
          <div className="space-y-4 pt-4 border-t border-[#1e293b]">
            <h4 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-4">Signal Stream</h4>
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[10px] text-[#475569] uppercase tracking-[0.15em]">No active signals for this match.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-[#030812] border border-[#1e293b] rounded p-3 space-y-2 relative overflow-hidden group hover:border-[#334155] transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#3b82f6] tracking-tight">{comment.user.displayName}</span>
                        <span className="text-[8px] bg-[#1e293b] text-[#64748b] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">REP: {comment.user.reputation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                           comment.stance === 'AGREE' ? 'bg-[#34d399]/10 text-[#34d399]' :
                           comment.stance === 'DISAGREE' ? 'bg-[#f43f5e]/10 text-[#f43f5e]' :
                           comment.stance === 'ALTERNATIVE' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' :
                           'bg-[#475569]/10 text-[#475569]'
                         }`}>
                           {comment.stance}
                         </span>
                      </div>
                    </div>
                    
                    {comment.coachAction && (
                       <div className="text-[9px] text-[#3b82f6] font-mono tracking-wider bg-[#3b82f6]/5 px-2 py-1 rounded inline-block">
                         ACTION: {comment.coachAction.replace(/_/g, ' ')}
                       </div>
                    )}

                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      {comment.commentText}
                    </p>
                    
                    <div className="flex justify-end pt-1">
                      <span className="text-[8px] text-[#475569] font-mono">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
