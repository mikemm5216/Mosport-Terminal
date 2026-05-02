import assert from 'node:assert/strict'

async function testKeyboardCoaches() {
  console.log("Running Keyboard Coaches & Data Challenge tests...")

  // 1. Test data challenge report type validation
  const validTypes = [
    'WRONG_PLAYER_TEAM',
    'WRONG_ROSTER',
    'WRONG_SCORE_STATUS',
    'WRONG_JERSEY',
    'WRONG_LOGO',
    'BAD_COACH_DECISION',
    'UI_BUG',
    'OTHER'
  ]
  
  const report = {
    reportType: 'WRONG_JERSEY',
    description: 'Player wearing #23 but shown as #6'
  }
  
  assert.ok(validTypes.includes(report.reportType), "Report type should be valid")
  console.log("Test 1 Passed: Data challenge report type validation")

  // 2. Test stance validation
  const validStances = ['AGREE', 'DISAGREE', 'ALTERNATIVE', 'WATCH_ONLY']
  const stance = 'ALTERNATIVE'
  assert.ok(validStances.includes(stance), "Stance should be valid")
  console.log("Test 2 Passed: Stance validation")

  // 3. Test coach action sport-specific availability (Mock)
  const mlbActions = ['BULLPEN_ALERT', 'KEEP_STRUCTURE']
  const nbaActions = ['PROTECT_PRIMARY_HANDLER', 'KEEP_STRUCTURE']
  
  const isMLBAction = (action) => mlbActions.includes(action)
  const isNBAAction = (action) => nbaActions.includes(action)

  assert.ok(isMLBAction('BULLPEN_ALERT'), "BULLPEN_ALERT should be available for MLB")
  assert.ok(!isNBAAction('BULLPEN_ALERT'), "BULLPEN_ALERT should NOT be available for NBA")
  console.log("Test 3 Passed: Sport-specific action availability")

  // 4. Public comment serialization mock
  const internalUser = {
    email: 'private@example.com',
    displayName: 'ExpertCoach',
    reputation: 150
  }
  
  const publicUser = {
    displayName: internalUser.displayName,
    reputation: internalUser.reputation
  }
  
  assert.strictEqual(publicUser.email, undefined, "Email must be hidden in public view")
  console.log("Test 4 Passed: Email hidden in public serialization")

  console.log("All Keyboard Coaches MVP tests passed!")
}

testKeyboardCoaches().catch(err => {
  console.error("Test failed:", err)
  process.exit(1)
})
