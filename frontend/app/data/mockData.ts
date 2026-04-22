// MoSport v4.0.1 — Sports Performance Intelligence Layer
// Live data: 2026-04-21 via the-odds-api.com + physiological overlay

export type Label = 'OUTPERFORMANCE' | 'VULNERABILITY' | 'MONITOR' | 'TACTICAL' | 'COLLAPSE'

export interface DecisionFactor {
  key: string
  label: string
  value: string
  positive: boolean
}

export interface CausalFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
}

export interface WhoopSync {
  mode: 'MIRACLE' | 'NORMAL' | 'RISK'
  hrv_delta: string
  recovery: number
  sleep_debt_hrs: number
  strain: number
  impact_score: number
}

export interface GameDecision {
  game_id: string
  away_team: string
  home_team: string
  away_code: string
  home_code: string
  game_time_utc: string
  baseline_win_pct: number      // model baseline (no bio adjustment)
  adjusted_win_pct: number      // physiologically adjusted
  wpa: number                   // performance impact %
  market_expectation: number    // Vegas line (American)
  best_side: 'HOME' | 'AWAY'
  confidence: number
  entropy_score?: number
  decision_factors: DecisionFactor[]
  causal_factors: CausalFactor[]
  decision: {
    label: Label
    score: number
  }
  whoop_sync: WhoopSync
}

export const WHOOP_DATA: WhoopSync = {
  mode:           'MIRACLE',
  hrv_delta:      '+14%',
  recovery:       91,
  sleep_debt_hrs: 0.4,
  strain:         8.2,
  impact_score:   0.082,
}

export const GAMES: GameDecision[] = [
  {
    game_id:            'mlb_2026_0421_min_nym',
    away_team:          'Minnesota Twins',
    home_team:          'New York Mets',
    away_code:          'MIN',
    home_code:          'NYM',
    game_time_utc:      '23:11',
    baseline_win_pct:   37.8,
    adjusted_win_pct:   43.2,
    wpa:                9.3,
    market_expectation: 153,
    best_side:          'AWAY',
    confidence:         0.68,
    entropy_score:      0.91,
    decision:           { label: 'OUTPERFORMANCE', score: 93 },
    whoop_sync:         WHOOP_DATA,
    decision_factors: [
      { key: 'bullpen_fatigue', label: 'Bullpen Fatigue Penalty', value: '−2.1%', positive: false },
      { key: 'travel_burden',   label: 'Travel Burden',           value: '−1.4%', positive: false },
      { key: 'matchup_synergy', label: 'Matchup Synergy',         value: '+8.0%', positive: true  },
      { key: 'bio_override',    label: 'Biometric Override',      value: '+3.2%', positive: true  },
    ],
    causal_factors: [
      { factor: 'Model 43.2% vs Baseline Projection 37.8%: mispriced by market',   impact: 'positive' },
      { factor: 'Market Expectation +153: performance leverage 1.53x per unit',     impact: 'positive' },
      { factor: 'Away travel burden: BOS→NYM 2-day gap',                            impact: 'negative' },
      { factor: 'High tactical entropy (0.91): market disagrees → edge window',     impact: 'positive' },
    ],
  },
  {
    game_id:            'mlb_2026_0421_cws_ari',
    away_team:          'Chicago White Sox',
    home_team:          'Arizona Diamondbacks',
    away_code:          'CWS',
    home_code:          'ARI',
    game_time_utc:      '01:41',
    baseline_win_pct:   61.8,
    adjusted_win_pct:   63.4,
    wpa:                4.0,
    market_expectation: -146,
    best_side:          'HOME',
    confidence:         0.74,
    decision:           { label: 'OUTPERFORMANCE', score: 74 },
    whoop_sync:         WHOOP_DATA,
    decision_factors: [
      { key: 'home_advantage',  label: 'Home Performance Rate',  value: '+6.2%', positive: true  },
      { key: 'sp_fatigue',      label: 'Starter Load Penalty',   value: '−3.1%', positive: false },
      { key: 'bullpen_usage',   label: 'Bullpen Load (4 in 3d)', value: '−2.0%', positive: false },
      { key: 'exit_velocity',   label: 'Exit Velocity Edge',     value: '+4.1%', positive: true  },
    ],
    causal_factors: [
      { factor: 'ARI home performance rate: +6.2% above league average',           impact: 'positive' },
      { factor: 'CWS starter load: 112-pitch count last start — recovery penalty', impact: 'positive' },
      { factor: 'CWS bullpen: 4 pitchers deployed past 3 days',                    impact: 'positive' },
      { factor: 'ARI exit velocity z-score +0.8 vs CWS rotation',                 impact: 'positive' },
      { factor: 'Chase Field altitude factor: neutral for both rosters',            impact: 'neutral'  },
    ],
  },
  {
    game_id:            'mlb_2026_0421_lad_sfg',
    away_team:          'Los Angeles Dodgers',
    home_team:          'San Francisco Giants',
    away_code:          'LAD',
    home_code:          'SFG',
    game_time_utc:      '01:46',
    baseline_win_pct:   42.1,
    adjusted_win_pct:   43.9,
    wpa:                3.0,
    market_expectation: 152,
    best_side:          'HOME',
    confidence:         0.71,
    decision:           { label: 'OUTPERFORMANCE', score: 71 },
    whoop_sync:         WHOOP_DATA,
    decision_factors: [
      { key: 'market_gap',      label: 'Market Gap',             value: '+4.2%', positive: true  },
      { key: 'sp_rest',         label: 'Starter Rest Penalty',   value: '−2.8%', positive: false },
      { key: 'run_diff',        label: 'Run Differential Trend', value: '+3.1%', positive: true  },
      { key: 'park_factor',     label: 'Oracle Park Factor',     value: '+1.8%', positive: true  },
    ],
    causal_factors: [
      { factor: 'SFG adjusted win: 43.9% vs market baseline 41.8%',               impact: 'positive' },
      { factor: 'LAD starter rest: 3-day rotation gap — load management flag',    impact: 'positive' },
      { factor: 'LAD run differential: −10 last 5 games',                          impact: 'positive' },
      { factor: 'Oracle Park: suppresses LAD power profile',                       impact: 'positive' },
      { factor: 'LAD market overvalued at −180 baseline',                          impact: 'positive' },
    ],
  },
  {
    game_id:            'mlb_2026_0421_hou_cle',
    away_team:          'Houston Astros',
    home_team:          'Cleveland Guardians',
    away_code:          'HOU',
    home_code:          'CLE',
    game_time_utc:      '22:11',
    baseline_win_pct:   46.0,
    adjusted_win_pct:   48.6,
    wpa:                2.6,
    market_expectation: 118,
    best_side:          'AWAY',
    confidence:         0.61,
    entropy_score:      0.87,
    decision:           { label: 'OUTPERFORMANCE', score: 61 },
    whoop_sync:         WHOOP_DATA,
    decision_factors: [
      { key: 'model_gap',       label: 'Performance Gap',        value: '+2.6%', positive: true  },
      { key: 'sp_era',          label: 'Opponent SP Load',       value: '+3.4%', positive: true  },
      { key: 'pythagorean',     label: 'Pythagorean Edge',       value: '+1.8%', positive: true  },
      { key: 'h2h',             label: 'Head-to-Head Record',    value: '+2.1%', positive: true  },
    ],
    causal_factors: [
      { factor: 'HOU adjusted 48.6% vs market baseline 43.0%: performance gap',   impact: 'positive' },
      { factor: 'CLE starter: ERA 6.1 last 3 starts — load management concern',   impact: 'positive' },
      { factor: 'HOU pythagorean: outperforming record projection',                impact: 'positive' },
      { factor: 'H2H: HOU 7-3 last 10 matchups vs CLE',                           impact: 'positive' },
    ],
  },
  {
    game_id:            'mlb_2026_0421_nyy_bos',
    away_team:          'New York Yankees',
    home_team:          'Boston Red Sox',
    away_code:          'NYY',
    home_code:          'BOS',
    game_time_utc:      '22:46',
    baseline_win_pct:   47.2,
    adjusted_win_pct:   47.1,
    wpa:                -0.1,
    market_expectation: -108,
    best_side:          'AWAY',
    confidence:         0.38,
    decision:           { label: 'MONITOR', score: 38 },
    whoop_sync:         WHOOP_DATA,
    decision_factors: [
      { key: 'market_align',    label: 'Market Alignment',       value: '0.0%',  positive: true  },
      { key: 'vig_drag',        label: 'Market Friction',        value: '−0.1%', positive: false },
      { key: 'rivalry_var',     label: 'Rivalry Variance',       value: '±4.2%', positive: false },
    ],
    causal_factors: [
      { factor: 'Model probability aligns with market baseline: no tactical edge', impact: 'neutral'  },
      { factor: 'Market friction erodes any marginal performance signal',           impact: 'negative' },
      { factor: 'Rivalry game: high variance — unpredictable tactical outcome',    impact: 'negative' },
    ],
  },
  {
    game_id:            'mlb_2026_0421_atl_wsn',
    away_team:          'Atlanta Braves',
    home_team:          'Washington Nationals',
    away_code:          'ATL',
    home_code:          'WSN',
    game_time_utc:      '22:46',
    baseline_win_pct:   41.8,
    adjusted_win_pct:   55.2,
    wpa:                1.0,
    market_expectation: -134,
    best_side:          'AWAY',
    confidence:         0.52,
    decision:           { label: 'VULNERABILITY', score: 52 },
    whoop_sync:         WHOOP_DATA,
    decision_factors: [
      { key: 'model_diverge',   label: 'Model Divergence',       value: '+13.4%', positive: true  },
      { key: 'bp_exhausted',    label: 'Bullpen Exhaustion',     value: '+5.2%',  positive: true  },
      { key: 'motivation_gap',  label: 'Motivation Asymmetry',   value: '+3.1%',  positive: true  },
      { key: 'chaos_signal',    label: 'Tactical Instability',   value: '−6.8%',  positive: false },
    ],
    causal_factors: [
      { factor: 'ATL model 55.2% diverges sharply from market baseline 41.8%',    impact: 'positive' },
      { factor: 'WSN bullpen exhaustion: 5 pitchers deployed yesterday',           impact: 'positive' },
      { factor: 'Late-season motivation asymmetry: ATL in contention',             impact: 'positive' },
      { factor: 'High model/market divergence → VULNERABILITY instability signal', impact: 'negative' },
    ],
  },
]

export const FEATURED_GAME = GAMES[0]
