'use client'

import { useState } from 'react'
import type { Match } from './data/mockData'
import TopBar from './components/TopBar'
import SchedulePage from './components/SchedulePage'
import DetailPage from './components/DetailPage'
import LabPage from './components/LabPage'
import LeaguesPage from './components/LeaguesPage'
import PlayersPage from './components/PlayersPage'

type PageState =
  | { screen: "schedule" }
  | { screen: "detail"; match: Match }
  | { screen: "lab" }
  | { screen: "leagues" }
  | { screen: "players" }

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
    else if (tab === "LEAGUES") setPage({ screen: "leagues" })
    else if (tab === "PLAYERS") setPage({ screen: "players" })
    else setPage({ screen: "schedule" })
  }

  const activeTab =
    page.screen === "lab"     ? "LAB"     :
    page.screen === "leagues" ? "LEAGUES" :
    page.screen === "players" ? "PLAYERS" : "SCHEDULE"

  return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <TopBar onHome={handleBack} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="fade-in" key={page.screen + (page.screen === "detail" ? page.match.id : "")}>
        {page.screen === "schedule" && <SchedulePage onOpen={handleOpen} />}
        {page.screen === "detail"  && <DetailPage m={page.match} onBack={handleBack} />}
        {page.screen === "lab"     && <LabPage />}
        {page.screen === "leagues" && <LeaguesPage />}
        {page.screen === "players" && <PlayersPage />}
      </div>
    </div>
  )
}
