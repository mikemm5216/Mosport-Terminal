'use client'

import { useState, useEffect } from 'react'
import type { Match } from './data/mockData'
import { TODAY_MATCHES } from './data/mockData'
import TopBar from './components/TopBar'
import SchedulePage from './components/SchedulePage'
import DetailPage from './components/DetailPage'

type PageState =
  | { screen: "schedule" }
  | { screen: "detail"; matchId: string }

export default function Home() {
  const [page, setPage] = useState<PageState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mosport_page")
        if (saved) return JSON.parse(saved)
      } catch { /* ignore */ }
    }
    return { screen: "schedule" }
  })

  useEffect(() => {
    localStorage.setItem("mosport_page", JSON.stringify(page))
  }, [page])

  const match = page.screen === "detail"
    ? TODAY_MATCHES.find(m => m.id === page.matchId)
    : null

  function handleOpen(m: Match) {
    setPage({ screen: "detail", matchId: m.id })
  }

  function handleBack() {
    setPage({ screen: "schedule" })
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <TopBar onHome={handleBack} />

      <div className="fade-in" key={page.screen + (page.screen === "detail" ? page.matchId : "")}>
        {page.screen === "schedule" && (
          <SchedulePage onOpen={handleOpen} />
        )}
        {page.screen === "detail" && match && (
          <DetailPage m={match} onBack={handleBack} />
        )}
      </div>
    </div>
  )
}
