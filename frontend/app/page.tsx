'use client'

import { useState } from 'react'
import type { Match } from './data/mockData'
import TopBar from './components/TopBar'
import SchedulePage from './components/SchedulePage'
import DetailPage from './components/DetailPage'

type PageState =
  | { screen: "schedule" }
  | { screen: "detail"; match: Match }

export default function Home() {
  const [page, setPage] = useState<PageState>({ screen: "schedule" })

  function handleOpen(m: Match) {
    setPage({ screen: "detail", match: m })
  }

  function handleBack() {
    setPage({ screen: "schedule" })
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <TopBar onHome={handleBack} />

      <div className="fade-in" key={page.screen + (page.screen === "detail" ? page.match.id : "")}>
        {page.screen === "schedule" && (
          <SchedulePage onOpen={handleOpen} />
        )}
        {page.screen === "detail" && (
          <DetailPage m={page.match} onBack={handleBack} />
        )}
      </div>
    </div>
  )
}
