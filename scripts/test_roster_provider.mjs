import assert from 'node:assert/strict'

// Lightweight unit-style script for ESPN roster parser testing.

function parseEspnRoster(data) {
  const result = []
  
  if (!data) return result

  let athletes = data.athletes || []
  
  // Flatten if it's an array of groups (e.g. data.athletes[0].items)
  if (Array.isArray(athletes) && athletes.length > 0 && athletes[0].items) {
    athletes = athletes.reduce((acc, group) => {
      if (Array.isArray(group.items)) {
        return acc.concat(group.items)
      }
      return acc
    }, [])
  }

  if (!Array.isArray(athletes)) return result

  for (const item of athletes) {
    const ath = item.athlete || item // sometimes it's nested
    
    if (!ath) continue
    
    const name = ath.displayName || ath.fullName || item.displayName || item.fullName
    if (!name) continue
      
    let posStr
    const posObj = ath.position || item.position
    if (posObj) {
      posStr = posObj.abbreviation || posObj.name
    }
    
    result.push({
      name,
      position: posStr,
      availability: 'ACTIVE', // default unless we can parse injuries
    })
  }

  return result
}

function testZeroPlayers() {
  const parsed = parseEspnRoster({ athletes: [] })
  assert.equal(parsed.length, 0)
}

function testFlatAthletes() {
  const data = {
    athletes: [
      {
        displayName: 'LeBron James',
        position: { abbreviation: 'SF' }
      },
      {
        athlete: {
          fullName: 'Anthony Davis',
          position: { name: 'Center' }
        }
      }
    ]
  }
  const parsed = parseEspnRoster(data)
  assert.equal(parsed.length, 2)
  assert.equal(parsed[0].name, 'LeBron James')
  assert.equal(parsed[0].position, 'SF')
  assert.equal(parsed[1].name, 'Anthony Davis')
  assert.equal(parsed[1].position, 'Center')
}

function testGroupedAthletes() {
  const data = {
    athletes: [
      {
        items: [
          { displayName: 'Stephen Curry', position: { abbreviation: 'PG' } }
        ]
      },
      {
        items: [
          { displayName: 'Draymond Green', position: { abbreviation: 'PF' } }
        ]
      }
    ]
  }
  const parsed = parseEspnRoster(data)
  assert.equal(parsed.length, 2)
  assert.equal(parsed[0].name, 'Stephen Curry')
  assert.equal(parsed[1].name, 'Draymond Green')
}

function main() {
  testZeroPlayers()
  testFlatAthletes()
  testGroupedAthletes()
  console.log("All parser tests passed!")
}

main()
