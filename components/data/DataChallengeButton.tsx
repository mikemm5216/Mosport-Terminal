'use client'

import React, { useState } from 'react'
import { ShieldAlert, Send } from 'lucide-react'

interface DataChallengeButtonProps {
  matchId?: string
  teamCode?: string
  playerName?: string
}

export default function DataChallengeButton({ matchId, teamCode, playerName }: DataChallengeButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reportType, setReportType] = useState('WRONG_PLAYER_TEAM')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/data-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          reportType,
          description,
          teamCode,
          playerName,
          userId: 'anonymous_user'
        })
      })
      if (res.ok) {
        setIsOpen(false)
        setDescription('')
        alert('回報已送出，感謝您的貢獻！')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded text-[10px] font-black uppercase tracking-widest transition-all"
      >
        <ShieldAlert size={14} />
        資料有誤？ (Report Error)
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 w-64 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl p-4 z-50 space-y-4">
          <div className="space-y-1">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">回報資料錯誤</h4>
            <p className="text-[8px] text-slate-500">幫助我們優化教練席資料品質</p>
          </div>

          <select 
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none focus:border-blue-500"
          >
            <option value="WRONG_PLAYER_TEAM">球員隊伍錯誤 (Wrong Team)</option>
            <option value="WRONG_ROSTER">陣容清單錯誤 (Wrong Roster)</option>
            <option value="WRONG_SCORE_STATUS">比分/狀態錯誤 (Wrong Score)</option>
            <option value="WRONG_LOGO">球隊 Logo 錯誤 (Wrong Logo)</option>
            <option value="BAD_COACH_DECISION">教練判斷不合理 (Bad Read)</option>
            <option value="UI_BUG">介面 Bug (UI Bug)</option>
          </select>

          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="請簡短描述錯誤..."
            className="w-full h-20 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none focus:border-blue-500 resize-none"
          />

          <button 
            disabled={isSubmitting || !description}
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Send size={12} />
            {isSubmitting ? '傳送中...' : '送出回報'}
          </button>
        </div>
      )}
    </div>
  )
}
