/**
 * apiGovernor.ts — In-process API Usage Governor v1
 *
 * Prevents paid provider credit burn by enforcing:
 * - 2-minute minimum interval per (provider, league)
 * - 1-hour cooldown after 401
 * - 5-minute cooldown after 429
 * - 100 max calls per process-hour (conservative)
 * - Automatic mode degradation on repeated failures
 *
 * NOTE: This is in-process state. On Vercel serverless, each function instance
 * has isolated memory. Governor is effective within a warm instance, which is
 * the most common burst scenario.
 */

export type ProviderName = 'odds-api'

export type DataMode =
  | 'FULL'       // Odds API + ESPN — normal operation
  | 'DEGRADED'   // ESPN only — Odds API disabled due to 401/429/quota
  | 'EMERGENCY'  // Minimal / cached only — all external providers failing

interface GovernorEntry {
  lastCallAt: number
  cooldownUntil: number
  consecutiveErrors: number
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_INTERVAL_MS    = 2 * 60 * 1000   // 2 min between league calls
const COOLDOWN_401_MS    = 60 * 60 * 1000  // 1 hour after 401
const COOLDOWN_429_MS    = 5 * 60 * 1000   // 5 min after 429
const MAX_CALLS_PER_HOUR = 100
const MAX_429_BEFORE_DEGRADED = 3          // 3 consecutive 429s → DEGRADED

// ── In-process state ──────────────────────────────────────────────────────────
const registry = new Map<string, GovernorEntry>()
let globalCalls = 0
let globalWindowStart = Date.now()
let currentMode: DataMode = 'FULL'
let modeReason = ''

function entryKey(provider: ProviderName, league: string, endpoint: string): string {
  return `${provider}::${league}::${endpoint}`
}

function getOrCreate(k: string): GovernorEntry {
  if (!registry.has(k)) {
    registry.set(k, { lastCallAt: 0, cooldownUntil: 0, consecutiveErrors: 0 })
  }
  return registry.get(k)!
}

function resetGlobalWindowIfNeeded(now: number): void {
  if (now - globalWindowStart > 3_600_000) {
    globalCalls = 0
    globalWindowStart = now
    // Auto-recover from quota-triggered DEGRADED when window resets
    if (currentMode === 'DEGRADED' && modeReason === 'global_quota_exhausted') {
      setMode('FULL', 'hourly_window_reset')
    }
  }
}

function setMode(mode: DataMode, reason: string): void {
  if (currentMode === mode) return
  const prev = currentMode
  currentMode = mode
  modeReason = reason
  if (mode === 'DEGRADED') {
    console.warn(`[data-mode] DEGRADED: odds-api disabled, using ESPN only (reason: ${reason}, was: ${prev})`)
  } else if (mode === 'EMERGENCY') {
    console.warn(`[data-mode] EMERGENCY: all external providers failing, using cached/minimal data (reason: ${reason})`)
  } else {
    console.info(`[data-mode] ${mode}: recovered from ${prev} (reason: ${reason})`)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function canCallProvider(input: {
  provider: ProviderName
  league: string
  endpoint: string
}): { allowed: boolean; reason?: string } {
  // Mode check first — skip all paid API calls in DEGRADED/EMERGENCY
  if (currentMode !== 'FULL') {
    return { allowed: false, reason: `mode_${currentMode.toLowerCase()}` }
  }

  const now = Date.now()
  resetGlobalWindowIfNeeded(now)

  if (globalCalls >= MAX_CALLS_PER_HOUR) {
    setMode('DEGRADED', 'global_quota_exhausted')
    return { allowed: false, reason: `global_hourly_limit_${MAX_CALLS_PER_HOUR}` }
  }

  const k = entryKey(input.provider, input.league, input.endpoint)
  const entry = getOrCreate(k)

  if (now < entry.cooldownUntil) {
    const remainSec = Math.ceil((entry.cooldownUntil - now) / 1000)
    return { allowed: false, reason: `cooldown_${remainSec}s_remaining` }
  }

  if (entry.lastCallAt > 0 && now - entry.lastCallAt < MIN_INTERVAL_MS) {
    const remainSec = Math.ceil((entry.lastCallAt + MIN_INTERVAL_MS - now) / 1000)
    return { allowed: false, reason: `min_interval_${remainSec}s_remaining` }
  }

  return { allowed: true }
}

export function recordProviderSuccess(input: {
  provider: ProviderName
  league: string
  endpoint: string
}): void {
  const now = Date.now()
  resetGlobalWindowIfNeeded(now)
  const k = entryKey(input.provider, input.league, input.endpoint)
  const entry = getOrCreate(k)
  entry.lastCallAt = now
  entry.cooldownUntil = 0
  entry.consecutiveErrors = 0
  globalCalls++
}

export function recordProviderError(input: {
  provider: ProviderName
  league: string
  endpoint: string
  status: number
}): void {
  const now = Date.now()
  const k = entryKey(input.provider, input.league, input.endpoint)
  const entry = getOrCreate(k)
  entry.lastCallAt = now
  entry.consecutiveErrors++

  if (input.status === 401) {
    entry.cooldownUntil = now + COOLDOWN_401_MS
    // 401 = key is dead or revoked — immediately degrade
    setMode('DEGRADED', `401_on_${input.provider}_${input.league}`)
  } else if (input.status === 429) {
    entry.cooldownUntil = now + COOLDOWN_429_MS
    console.warn(`[api-governor] 429 on ${input.provider}/${input.league} — cooldown 5m`)
    // After N consecutive 429s across any league, degrade
    if (entry.consecutiveErrors >= MAX_429_BEFORE_DEGRADED) {
      setMode('DEGRADED', `429_repeated_${input.provider}_${input.league}`)
    }
  }
}

/** Returns the current system data mode. */
export function getCurrentDataMode(): DataMode {
  return currentMode
}

/** Force-set mode manually (e.g. from admin route or test). */
export function forceDataMode(mode: DataMode, reason = 'manual'): void {
  setMode(mode, reason)
}

/** Diagnostic snapshot — safe to log (no secrets) */
export function getGovernorStats(): Record<string, unknown> {
  return {
    mode: currentMode,
    modeReason,
    globalCalls,
    maxPerHour: MAX_CALLS_PER_HOUR,
    windowAgeMs: Date.now() - globalWindowStart,
    entries: registry.size,
  }
}
