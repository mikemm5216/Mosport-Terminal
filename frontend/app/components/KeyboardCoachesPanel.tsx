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
    <div className="bg-[#050b16] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl mt-8">
      {/* 1. Header Row */}
      <div 
        className="flex items-center justify-between px-5 py-4 bg-[#0a1224] border-b border-[#1e293b] cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#3b82f6]/10 rounded border border-[#3b82f6]/20">
            <MessageSquare className="w-4 h-4 text-[#3b82f6]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Keyboard Coaches</h3>
            {voteSummary && (
              <div className="text-[9px] text-[#475569] font-bold mt-0.5 uppercase tracking-wider">
                {voteSummary.total} ANALYTICAL SIGNALS RECEIVED
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!user && (
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onAuthRequired()
              }}
              className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[#3b82f6] text-[9px] font-black uppercase tracking-widest rounded transition-colors hidden sm:block"
            >
              Login to Participate
            </button>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-8">
          {/* 2. Vote Actions 區 */}
          <div className="space-y-4">
            <h4 className="text-[9px] font-black text-[#64748b] uppercase tracking-[0.25em] px-1">Tactical Stance</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  className={`flex flex-col items-center justify-center min-h-[72px] rounded border transition-all relative group ${
                    (userVote?.stance === s.id || stance === s.id)
                      ? `bg-[${s.color}]22 border-[${s.color}] shadow-[0_0_15px_${s.color}22]` 
                      : 'bg-[#030812] border-[#1e293b] hover:border-[#334155]'
                  }`}
                  style={{
                    backgroundColor: (userVote?.stance === s.id || stance === s.id) ? `${s.color}15` : undefined,
                    borderColor: (userVote?.stance === s.id || stance === s.id) ? s.color : undefined
                  }}
                >
                  <s.icon className={`w-5 h-5 mb-2 transition-transform group-hover:scale-110`} style={{ color: s.color }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: s.color }}>{s.label}</span>
                  {(userVote?.stance === s.id) && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Alternative Action Select */}
          {stance === 'ALTERNATIVE' && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300 bg-[#3b82f6]/5 p-4 rounded border border-[#3b82f6]/20">
              <label className="text-[9px] font-black text-[#3b82f6] uppercase tracking-[0.2em] block">Proposed Tactical Shift</label>
              <select
                value={coachAction}
                onChange={(e) => setCoachAction(e.target.value as CoachDecisionAction)}
                className="w-full bg-[#030812] border border-[#1e293b] rounded py-2.5 px-4 text-[11px] text-white focus:outline-none focus:border-[#3b82f6] font-mono appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23475569\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
              >
                {availableActions.map(action => (
                  <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Auth Hint / Comment Form */}
          <div className="space-y-4">
            {!user ? (
              <div className="bg-[#1e293b]/20 border border-[#1e293b] p-4 rounded-lg flex items-center justify-between gap-4">
                <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">
                  Log in to post tactical signals and reasoning.
                </p>
                <button 
                  onClick={onAuthRequired}
                  className="whitespace-nowrap px-4 py-2 bg-[#3b82f6] text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-[#2563eb] transition-all shadow-lg"
                >
                  Login Now
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitComment} className="space-y-4 bg-[#030812] border border-[#1e293b] p-5 rounded-lg shadow-inner">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center">
                      <User className="w-4 h-4 text-[#64748b]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-white tracking-widest">{user.displayName}</div>
                      <div className="text-[8px] text-[#475569] font-black uppercase tracking-[0.2em]">REP_CRED: {user.reputation}</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-[#3b82f6] font-mono tracking-tighter bg-[#3b82f6]/10 px-2 py-0.5 rounded border border-[#3b82f6]/20">
                    STATUS: READY
                  </div>
                </div>

                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Enter tactical reasoning for your signal..."
                  disabled={loading}
                  className="w-full bg-[#050b16] border border-[#1e293b] rounded p-4 text-[12px] text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#3b82f6] min-h-[100px] resize-none leading-relaxed transition-all"
                />
                
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading || !commentText.trim()}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-30 text-white font-black py-2.5 px-10 rounded text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  >
                    {loading ? 'TRANSMITTING...' : 'EMIT SIGNAL'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 4. Signal Stream 區 */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center gap-4">
              <h4 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.3em] whitespace-nowrap">Signal Stream</h4>
              <div className="h-px w-full bg-gradient-to-r from-[#1e293b] to-transparent" />
            </div>

            {comments.length === 0 ? (
              <div className="bg-[#030812] border border-[#1e293b] rounded-xl py-12 flex flex-col items-center justify-center space-y-3 opacity-60">
                <MessageSquare className="w-8 h-8 text-[#1e293b]" />
                <p className="text-[10px] text-[#475569] font-black uppercase tracking-[0.25em]">No active signals for this match.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-[#030812] border border-[#1e293b] rounded-xl p-5 space-y-3 relative overflow-hidden group hover:border-[#334155] transition-all hover:shadow-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0a1224] border border-[#1e293b] flex items-center justify-center text-[10px] font-black text-[#3b82f6]">
                          {comment.user.displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[11px] font-black text-white tracking-tight">{comment.user.displayName}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] bg-[#1e293b] text-[#64748b] px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-[#334155]">REP: {comment.user.reputation}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                         <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                           comment.stance === 'AGREE' ? 'bg-[#34d399]/5 border-[#34d399]/30 text-[#34d399]' :
                           comment.stance === 'DISAGREE' ? 'bg-[#f43f5e]/5 border-[#f43f5e]/30 text-[#f43f5e]' :
                           comment.stance === 'ALTERNATIVE' ? 'bg-[#3b82f6]/5 border-[#3b82f6]/30 text-[#3b82f6]' :
                           'bg-[#475569]/5 border-[#475569]/30 text-[#475569]'
                         }`}>
                           {comment.stance}
                         </span>
                         <span className="text-[8px] text-[#475569] font-mono font-bold">
                           {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                      </div>
                    </div>
                    
                    {comment.coachAction && (
                       <div className="text-[9px] text-[#3b82f6] font-mono font-black tracking-[0.1em] bg-[#3b82f6]/5 px-3 py-1.5 rounded-lg border border-[#3b82f6]/10 inline-block">
                         ACTION: {comment.coachAction.replace(/_/g, ' ')}
                       </div>
                    )}

                    <p className="text-[12px] text-[#94a3b8] leading-relaxed font-medium">
                      {comment.commentText}
                    </p>
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
