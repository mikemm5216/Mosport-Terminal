'use client'

import { useState } from 'react'
import type { Match, League, KeyPlayer } from './data/mockData'
import { MatchesProvider } from './context/MatchesContext'
import type { AppViewState, ProductMode } from './contracts/product'
import TopBar from './components/TopBar'
import LiveScheduleDashboard from './components/LiveScheduleDashboard'
import SimulationDashboard from './components/SimulationDashboard'
import DetailPage from './components/DetailPage'
import LabPage from './components/LabPage'
import LeaguesPage from './components/LeaguesPage'
import PlayersPage from './components/PlayersPage'
import TeamDetailPage from './components/TeamDetailPage'
import PlayerDetailPage from './components/PlayerDetailPage'
import AuthModal from './components/AuthModal'
import UserMenu from './components/UserMenu'
import { useEffect } from 'react'

type PageState =
  | { screen: 'schedule' }
  | { screen: 'detail'; match: Match }
  | { screen: 'lab' }
  | { screen: 'leagues' }
  | { screen: 'players' }
  | { screen: 'team-detail'; teamAbbr: string; league: League; backTo: 'leagues' | 'players' }
  | { screen: 'player-detail'; player: KeyPlayer; teamAbbr: string; teamName: string; league: League; match?: Match; backTo: 'players' }

export default function Home() {
  const [page, setPage] = useState<PageState>({ screen: 'schedule' })
  const [viewState, setViewState] = useState<AppViewState>({ mode: 'live', selectedLeague: 'ALL' })
  const [user, setUser] = useState<any>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Initial auth check
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) setUser(data.user)
      })
  }, [])

  function handleModeChange(mode: ProductMode) {
    setViewState((prev) => ({ ...prev, mode }))
    setPage({ screen: 'schedule' })
  }

  function handleOpen(m: Match) {
    setPage({ screen: 'detail', match: m })
  }

  function handleBack() {
    setPage({ screen: 'schedule' })
  }

  function handleTabChange(tab: string) {
    if (tab === 'LAB') setPage({ screen: 'lab' })
    else if (tab === 'LEAGUES') setPage({ screen: 'leagues' })
    else if (tab === 'PLAYERS') setPage({ screen: 'players' })
    else setPage({ screen: 'schedule' })
  }

  function handleTeam(abbr: string, league: League, from: 'leagues' | 'players') {
    setPage({ screen: 'team-detail', teamAbbr: abbr, league, backTo: from })
  }

  function handleTeamBack() {
    if (page.screen === 'team-detail') setPage({ screen: page.backTo })
  }

  function handlePlayer(player: KeyPlayer, teamAbbr: string, teamName: string, league: League, match: Match) {
    setPage({ screen: 'player-detail', player, teamAbbr, teamName, league, match, backTo: 'players' })
  }

  function handlePlayerBack() {
    if (page.screen === 'player-detail') setPage({ screen: page.backTo })
  }

  function handlePlayerTeam(abbr: string, league: League) {
    setPage({ screen: 'team-detail', teamAbbr: abbr, league, backTo: 'players' })
  }

  const activeTab =
    page.screen === 'lab' ? 'LAB' :
    page.screen === 'leagues' ? 'LEAGUES' :
    page.screen === 'players' ? 'PLAYERS' :
    page.screen === 'team-detail' ? (page.backTo === 'leagues' ? 'LEAGUES' : 'PLAYERS') :
    page.screen === 'player-detail' ? 'PLAYERS' :
    'SCHEDULE'

  const fadeKey = viewState.mode === 'simulation'
    ? 'simulation-mode'
    : page.screen === 'detail' ? `detail-${page.match.id}`
    : page.screen === 'team-detail' ? `team-${page.teamAbbr}`
    : page.screen === 'player-detail' ? `player-${page.player.name}`
    : page.screen

  return (
    <MatchesProvider>
      <div style={{ minHeight: '100vh', background: '#020617' }}>
        <TopBar
          onHome={handleBack}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          mode={viewState.mode}
          onModeChange={handleModeChange}
          hideModeToggle={activeTab === 'LAB' || viewState.mode === 'simulation'}
        >
          <div className="flex items-center gap-4">
            {user ? (
              <UserMenu user={user} onLogout={() => setUser(null)} />
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="text-[10px] text-[#3b82f6] font-bold uppercase tracking-widest px-3 py-1.5 border border-[#3b82f6]/30 rounded hover:bg-[#3b82f6]/10 transition-all"
              >
                Log In
              </button>
            )}
          </div>
        </TopBar>

        <div className="fade-in" key={fadeKey}>
          {viewState.mode === 'simulation' && <SimulationDashboard />}

          {viewState.mode === 'live' && (
            <>
              {page.screen === 'schedule' && <LiveScheduleDashboard onOpen={handleOpen} onOpenLab={() => handleTabChange('LAB')} />}
              {page.screen === 'detail' && (
                <DetailPage 
                  m={page.match} 
                  onBack={handleBack} 
                  user={user} 
                  onAuthRequired={() => setIsAuthModalOpen(true)} 
                />
              )}
              {page.screen === 'lab' && <LabPage />}
              {page.screen === 'leagues' && <LeaguesPage onTeam={(a, l) => handleTeam(a, l, 'leagues')} />}
              {page.screen === 'players' && <PlayersPage onTeam={(a, l) => handleTeam(a, l, 'players')} onPlayer={handlePlayer} />}
              {page.screen === 'team-detail' && <TeamDetailPage teamAbbr={page.teamAbbr} league={page.league} onBack={handleTeamBack} />}
              {page.screen === 'player-detail' && (
                <PlayerDetailPage
                  player={page.player}
                  teamAbbr={page.teamAbbr}
                  teamName={page.teamName}
                  league={page.league}
                  match={page.match}
                  onBack={handlePlayerBack}
                  onTeam={handlePlayerTeam}
                />
              )}
            </>
          )}
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={(u) => setUser(u)}
      />
    </MatchesProvider>
  )
}
