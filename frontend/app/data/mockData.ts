// Live data from the-odds-api.com + MoSport v4.0.1 model output
// Pulled 2026-04-21 via live_demo.py

export type Label = 'STRONG' | 'UPSET' | 'CHAOS' | 'WEAK' | 'COLLAPSE'

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
  decision: {
    label: Label
    confidence: number
    win_prob: number
    roi_expected: number
    best_side: 'HOME' | 'AWAY'
    best_ml: number
    ev_pct: number
  }
  entropy_score?: number
  whoop_sync: WhoopSync
  causal_factors: CausalFactor[]
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
    game_id:       'mlb_2026_0421_min_nym',
    away_team:     'Minnesota Twins',
    home_team:     'New York Mets',
    away_code:     'MIN',
    home_code:     'NYM',
    game_time_utc: '23:11',
    decision: {
      label:       'UPSET',
      confidence:  0.68,
      win_prob:    0.432,
      roi_expected: 0.093,
      best_side:   'AWAY',
      best_ml:     153,
      ev_pct:      9.3,
    },
    entropy_score: 0.91,
    whoop_sync:    WHOOP_DATA,
    causal_factors: [
      { factor: 'Vegas mispriced: model 43% vs market 38%', impact: 'positive' },
      { factor: 'Underdog line +153 → payout 1.53x',        impact: 'positive' },
      { factor: 'Away travel (BOS→NYM, 2 days)',             impact: 'negative' },
      { factor: 'High entropy score (0.91)',                  impact: 'positive' },
    ],
  },
  {
    game_id:       'mlb_2026_0421_cws_ari',
    away_team:     'Chicago White Sox',
    home_team:     'Arizona Diamondbacks',
    away_code:     'CWS',
    home_code:     'ARI',
    game_time_utc: '01:41',
    decision: {
      label:       'STRONG',
      confidence:  0.74,
      win_prob:    0.634,
      roi_expected: 0.040,
      best_side:   'HOME',
      best_ml:     -146,
      ev_pct:      4.0,
    },
    whoop_sync: WHOOP_DATA,
    causal_factors: [
      { factor: 'ARI home win rate +6.2% above league avg', impact: 'positive' },
      { factor: 'CWS SP pitch count 112 last start (fatigued)', impact: 'positive' },
      { factor: 'CWS bullpen: 4 pitchers used past 3 days',  impact: 'positive' },
      { factor: 'ARI exit velocity z-score +0.8',            impact: 'positive' },
      { factor: 'Chase Field altitude factor',               impact: 'neutral' },
    ],
  },
  {
    game_id:       'mlb_2026_0421_lad_sfg',
    away_team:     'Los Angeles Dodgers',
    home_team:     'San Francisco Giants',
    away_code:     'LAD',
    home_code:     'SFG',
    game_time_utc: '01:46',
    decision: {
      label:       'STRONG',
      confidence:  0.71,
      win_prob:    0.407,
      roi_expected: 0.030,
      best_side:   'HOME',
      best_ml:     152,
      ev_pct:      3.0,
    },
    whoop_sync: WHOOP_DATA,
    causal_factors: [
      { factor: 'SFG home underdog: +152 vs true prob 42%',  impact: 'positive' },
      { factor: 'LAD SP rest only 3 days (short rotation)',   impact: 'positive' },
      { factor: 'LAD -10 run diff last 5 games',              impact: 'positive' },
      { factor: 'Oracle Park: suppresses LAD power game',     impact: 'positive' },
      { factor: 'LAD -180 Vegas — overpriced favorite',       impact: 'positive' },
    ],
  },
  {
    game_id:       'mlb_2026_0421_hou_cle',
    away_team:     'Houston Astros',
    home_team:     'Cleveland Guardians',
    away_code:     'HOU',
    home_code:     'CLE',
    game_time_utc: '22:11',
    decision: {
      label:       'UPSET',
      confidence:  0.61,
      win_prob:    0.460,
      roi_expected: 0.026,
      best_side:   'AWAY',
      best_ml:     118,
      ev_pct:      2.6,
    },
    entropy_score: 0.87,
    whoop_sync: WHOOP_DATA,
    causal_factors: [
      { factor: 'HOU model 46% vs Vegas 43% — line value',  impact: 'positive' },
      { factor: 'CLE SP struggling: ERA 6.1 last 3 starts', impact: 'positive' },
      { factor: 'HOU pythagorean: outperforming record',     impact: 'positive' },
      { factor: 'H2H: HOU 7-3 in last 10 vs CLE',          impact: 'positive' },
    ],
  },
  {
    game_id:       'mlb_2026_0421_nyy_bos',
    away_team:     'New York Yankees',
    home_team:     'Boston Red Sox',
    away_code:     'NYY',
    home_code:     'BOS',
    game_time_utc: '22:46',
    decision: {
      label:       'WEAK',
      confidence:  0.38,
      win_prob:    0.472,
      roi_expected: -0.001,
      best_side:   'AWAY',
      best_ml:     -108,
      ev_pct:      -0.1,
    },
    whoop_sync: WHOOP_DATA,
    causal_factors: [
      { factor: 'Model prob = Vegas prob: no edge',         impact: 'neutral' },
      { factor: 'Vig erodes any marginal signal',           impact: 'negative' },
      { factor: 'Rivalry game: high variance unpredictable', impact: 'negative' },
    ],
  },
  {
    game_id:       'mlb_2026_0421_atl_wsn',
    away_team:     'Atlanta Braves',
    home_team:     'Washington Nationals',
    away_code:     'ATL',
    home_code:     'WSN',
    game_time_utc: '22:46',
    decision: {
      label:       'CHAOS',
      confidence:  0.52,
      win_prob:    0.418,
      roi_expected: 0.010,
      best_side:   'AWAY',
      best_ml:     -134,
      ev_pct:      1.0,
    },
    whoop_sync: WHOOP_DATA,
    causal_factors: [
      { factor: 'ATL model (62%) diverges from Vegas (55%)', impact: 'positive' },
      { factor: 'WSN bullpen exhausted: 5 pitchers yesterday', impact: 'positive' },
      { factor: 'Late-season motivation asymmetry',          impact: 'positive' },
      { factor: 'High model/Vegas divergence → CHAOS signal', impact: 'negative' },
    ],
  },
]
