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
    <div style={{ background: '#050b16', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden', marginTop: 32 }}>
      {/* 1. Header Row */}
      <div 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#0a1224', borderBottom: '1px solid #1e293b', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: '6px', background: 'rgba(59,130,246,0.1)', borderRadius: 4, border: '1px solid rgba(59,130,246,0.2)' }}>
            <MessageSquare size={14} color="#3b82f6" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.25em', margin: 0 }}>Keyboard Coaches</h3>
            {voteSummary && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#475569', fontWeight: 800, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                {voteSummary.total} ANALYTICAL SIGNALS
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!user && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAuthRequired(); }}
              style={{ padding: '6px 12px', background: '#1e293b', border: '1px solid #334155', color: '#3b82f6', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', borderRadius: 4, cursor: 'pointer' }}
            >
              Login to Participate
            </button>
          )}
          {isExpanded ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: 24 }}>
          {/* 2. Vote Actions Section */}
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 16 }}>Tactical Stance</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {[
                { id: 'AGREE', label: 'Agree', icon: ThumbsUp, color: '#34d399' },
                { id: 'DISAGREE', label: 'Disagree', icon: ThumbsDown, color: '#f43f5e' },
                { id: 'ALTERNATIVE', label: 'Alternative', icon: Zap, color: '#3b82f6' },
                { id: 'WATCH_ONLY', label: 'Watch Only', icon: ShieldAlert, color: '#94a3b8' },
              ].map((s) => {
                const isActive = (userVote?.stance === s.id || stance === s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => { setStance(s.id as any); handleVote(s.id as any); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px',
                      borderRadius: 6, border: '1px solid', transition: 'all 0.2s ease', cursor: 'pointer',
                      background: isActive ? `${s.color}15` : '#030812',
                      borderColor: isActive ? s.color : '#1e293b',
                      boxShadow: isActive ? `0 0 15px ${s.color}22` : 'none',
                    }}
                  >
                    <s.icon size={20} color={s.color} style={{ marginBottom: 8 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, color: s.color, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Alternative Action Select */}
          {stance === 'ALTERNATIVE' && (
            <div style={{ marginBottom: 32, padding: 16, background: 'rgba(59,130,246,0.05)', borderRadius: 6, border: '1px solid rgba(59,130,246,0.2)' }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'block', marginBottom: 12 }}>Proposed Tactical Shift</label>
              <select
                value={coachAction}
                onChange={(e) => setCoachAction(e.target.value as CoachDecisionAction)}
                style={{ width: '100%', background: '#030812', border: '1px solid #1e293b', borderRadius: 4, padding: '10px 16px', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none' }}
              >
                {availableActions.map(action => (
                  <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Comment Form */}
          <div style={{ marginBottom: 40 }}>
            {!user ? (
              <div style={{ background: 'rgba(30,41,59,0.2)', border: '1px solid #1e293b', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
                  Log in to post tactical signals and reasoning.
                </p>
                <button 
                  onClick={onAuthRequired}
                  style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', borderRadius: 4, cursor: 'pointer' }}
                >
                  Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitComment} style={{ background: '#030812', border: '1px solid #1e293b', padding: 20, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', display: 'grid', placeItems: 'center' }}>
                      <User size={14} color="#64748b" />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>{user.displayName}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#475569', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>CREDIT: {user.reputation}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(59,130,246,0.2)' }}>READY</div>
                </div>

                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Enter tactical reasoning for your signal..."
                  disabled={loading}
                  style={{ width: '100%', background: '#050b16', border: '1px solid #1e293b', borderRadius: 4, padding: 16, fontSize: 12, color: '#e2e8f0', minHeight: 100, resize: 'none', fontFamily: 'var(--font-inter)', outline: 'none' }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button
                    type="submit"
                    disabled={loading || !commentText.trim()}
                    style={{ background: '#3b82f6', border: 'none', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', padding: '10px 32px', borderRadius: 4, cursor: 'pointer', opacity: (loading || !commentText.trim()) ? 0.3 : 1, transition: 'all 0.2s ease' }}
                  >
                    {loading ? 'TRANSMITTING...' : 'EMIT SIGNAL'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 4. Signal Stream Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3em', whiteSpace: 'nowrap', margin: 0 }}>Signal Stream</h4>
              <div style={{ height: 1, width: '100%', background: 'linear-gradient(90deg, #1e293b, transparent)' }} />
            </div>

            {comments.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', opacity: 0.5 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>No active signals detected.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {comments.map((comment) => (
                  <div key={comment.id} style={{ background: '#030812', border: '1px solid #1e293b', borderRadius: 8, padding: 20, transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0a1224', border: '1px solid #1e293b', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, color: '#3b82f6' }}>
                          {comment.user.displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 900, color: '#fff' }}>{comment.user.displayName}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#475569', fontWeight: 900, marginTop: 2 }}>CRED: {comment.user.reputation}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 10, fontSize: 9, fontWeight: 900, border: '1px solid', textTransform: 'uppercase', letterSpacing: '0.1em',
                          color: comment.stance === 'AGREE' ? '#34d399' : comment.stance === 'DISAGREE' ? '#f43f5e' : '#3b82f6',
                          borderColor: comment.stance === 'AGREE' ? 'rgba(52,211,153,0.3)' : comment.stance === 'DISAGREE' ? 'rgba(244,63,94,0.3)' : 'rgba(59,130,246,0.3)',
                          background: comment.stance === 'AGREE' ? 'rgba(52,211,153,0.05)' : comment.stance === 'DISAGREE' ? 'rgba(244,63,94,0.05)' : 'rgba(59,130,246,0.05)',
                        }}>
                          {comment.stance}
                        </span>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#334155', marginTop: 4 }}>
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    
                    {comment.coachAction && (
                       <div style={{ marginBottom: 12, padding: '4px 10px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 4, display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, color: '#3b82f6', letterSpacing: '0.05em' }}>
                         ACTION: {comment.coachAction.replace(/_/g, ' ')}
                       </div>
                    )}

                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.6, fontFamily: 'var(--font-inter)' }}>
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
