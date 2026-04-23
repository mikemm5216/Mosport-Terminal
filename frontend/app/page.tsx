'use client'

import { useState } from 'react'
import type { Match, League } from './data/mockData'
import TopBar from './components/TopBar'
import SchedulePage from './components/SchedulePage'
import DetailPage from './components/DetailPage'
import LabPage from './components/LabPage'
import LeaguesPage from './components/LeaguesPage'
import PlayersPage from './components/PlayersPage'
import TeamDetailPage from './components/TeamDetailPage'

type PageState =
  | { screen: "schedule" }
  | { screen: "detail"; match: Match }
  | { screen: "lab" }
  | { screen: "leagues" }
  | { screen: "players" }
  | { screen: "team-detail"; teamAbbr: string; league: League; backTo: "leagues" | "players" }

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

  function handleTeam(abbr: string, league: League, from: "leagues" | "players") {
    setPage({ screen: "team-detail", teamAbbr: abbr, league, backTo: from })
  }

  function handleTeamBack() {
    if (page.screen === "team-detail") {
      setPage({ screen: page.backTo })
    }
  }

  const activeTab =
    page.screen === "lab"         ? "LAB"     :
    page.screen === "leagues"     ? "LEAGUES" :
    page.screen === "players"     ? "PLAYERS" :
    page.screen === "team-detail" ? page.backTo.toUpperCase() :
    "SCHEDULE"

  return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <TopBar onHome={handleBack} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="fade-in" key={page.screen + (page.screen === "detail" ? page.match.id : "") + (page.screen === "team-detail" ? page.teamAbbr : "")}>
        {page.screen === "schedule"    && <SchedulePage onOpen={handleOpen} />}
        {page.screen === "detail"      && <DetailPage m={page.match} onBack={handleBack} />}
        {page.screen === "lab"         && <LabPage />}
        {page.screen === "leagues"     && <LeaguesPage onTeam={(a, l) => handleTeam(a, l, "leagues")} />}
        {page.screen === "players"     && <PlayersPage onTeam={(a, l) => handleTeam(a, l, "players")} />}
        {page.screen === "team-detail" && (
          <TeamDetailPage
            teamAbbr={page.teamAbbr}
            league={page.league}
            onBack={handleTeamBack}
          />
        )}
      </div>
    </div>
  )
}
