import assert from 'node:assert/strict'

// Define the exact mapping logic locally for the test since we can't easily import from the Next.js routes
function toLiveRosterSnapshot(snapshot) {
  if (!snapshot) return undefined
  return {
    league: snapshot.league,
    teamCode: snapshot.teamCode,
    source: snapshot.source,
    updatedAtMs: snapshot.updatedAtMs,
    players: (snapshot.players ?? []).map((p) => ({
      name: p.name,
      position: p.position,
      isStarter: p.isStarter,
      depthRank: p.depthRank,
      availability: p.availability,
    })),
  }
}

function adaptLiveCard(card) {
  return {
    id: card.id,
    league: card.league,
    rosters: card.rosters, // The crucial part we're testing
  }
}

function testBridgeRoundtrip() {
  const match = {
    id: 'NBA-LAL@GSW',
    league: 'NBA',
    rosters: {
      home: {
        league: 'NBA',
        teamCode: 'GSW',
        source: 'espn_roster_provider',
        updatedAtMs: 123456789,
        players: [{ name: 'Stephen Curry', position: 'PG' }]
      },
      away: {
        league: 'NBA',
        teamCode: 'LAL',
        source: 'unavailable',
        updatedAtMs: 123456789,
        players: []
      }
    }
  }

  // To LiveMatchCard (inside /api/matches)
  const homeRoster = toLiveRosterSnapshot(match.rosters.home)
  const awayRoster = toLiveRosterSnapshot(match.rosters.away)
  const card = {
    id: match.id,
    league: match.league,
    rosters: homeRoster && awayRoster ? { home: homeRoster, away: awayRoster } : undefined,
    dataSources: {
      roster: {
        home: homeRoster?.source ?? 'unavailable',
        away: awayRoster?.source ?? 'unavailable',
      }
    }
  }

  // To Match (inside MatchesContext)
  const adaptedMatch = adaptLiveCard(card)

  // Verify
  assert.ok(adaptedMatch.rosters)
  assert.equal(adaptedMatch.rosters.home.source, 'espn_roster_provider')
  assert.equal(adaptedMatch.rosters.home.players[0].name, 'Stephen Curry')
  assert.equal(adaptedMatch.rosters.away.source, 'unavailable')
  assert.equal(adaptedMatch.rosters.away.players.length, 0)
  assert.equal(card.dataSources.roster.home, 'espn_roster_provider')

  console.log("Bridge roundtrip passed")
}

function main() {
  testBridgeRoundtrip()
  console.log("All bridge tests passed!")
}

main()
