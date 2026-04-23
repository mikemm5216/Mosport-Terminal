'use client'

import { useState } from 'react'
import type { Match } from './data/mockData'
import TopBar from './components/TopBar'
import SchedulePage from './components/SchedulePage'
import DetailPage from './components/DetailPage'
import LabPage from './components/LabPage'

type PageState =
  | { screen: "schedule" }
  | { screen: "detail"; match: Match }
  | { screen: "lab" }

export default function Home() {
  const [page, setPage] = useState<PageState>({ screen: "schedule" })

  function handleOpen(m: Match) {
    setPage({ screen: "detail", match: m })
  }

  function handleBack() {
    setPage({ screen: "schedule" })
  }

  function handleTabChange(tab: string) {
    if (tab === "LAB") setPage({ screen: "lab" })
    else setPage({ screen: "schedule" })
  }

  const activeTab = page.screen === "lab" ? "LAB" : "SCHEDULE"

  return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <TopBar onHome={handleBack} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="fade-in" key={page.screen + (page.screen === "detail" ? page.match.id : "")}>
        {page.screen === "schedule" && (
          <SchedulePage onOpen={handleOpen} />
        )}
        {page.screen === "detail" && (
          <DetailPage m={page.match} onBack={handleBack} />
        )}
        {page.screen === "lab" && (
          <LabPage />
        )}
      </div>
    </div>
  )
}
