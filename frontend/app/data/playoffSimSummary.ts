// Pre-computed playoff simulation summaries.
// These represent the stored output of an offline 10,000,000-iteration
// Monte Carlo bracket simulation. The frontend reads this — it does not
// re-run the simulation at request time.

import type { PlayoffSimulationSummary } from './mockData'

export const NBA_SIM_SUMMARY: PlayoffSimulationSummary = {
  season: '2025-26',
  league: 'NBA',
  simulation_runs: 10000000,

  projected_champion: {
    team: 'OKC',
    probability: 0.2837,
  },

  champion_distribution: [
    { team: 'OKC', probability: 0.2837 },
    { team: 'DET', probability: 0.1981 },
    { team: 'DEN', probability: 0.1612 },
    { team: 'BOS', probability: 0.1498 },
    { team: 'SAS', probability: 0.0962 },
    { team: 'NYK', probability: 0.0564 },
    { team: 'LAL', probability: 0.0318 },
    { team: 'CLE', probability: 0.0131 },
    { team: 'PHX', probability: 0.0027 },
    { team: 'MIN', probability: 0.0018 },
    { team: 'HOU', probability: 0.0016 },
    { team: 'TOR', probability: 0.0013 },
    { team: 'ATL', probability: 0.0010 },
    { team: 'PHI', probability: 0.0008 },
    { team: 'ORL', probability: 0.0003 },
    { team: 'POR', probability: 0.0002 },
  ],

  most_likely_finals_matchup: {
    home_team: 'OKC',
    away_team: 'DET',
    probability: 0.1482,
  },

  finals_matchup_distribution: [
    { team_a: 'OKC', team_b: 'DET', probability: 0.1482 },
    { team_a: 'OKC', team_b: 'BOS', probability: 0.0981 },
    { team_a: 'DEN', team_b: 'DET', probability: 0.0874 },
    { team_a: 'DEN', team_b: 'BOS', probability: 0.0611 },
    { team_a: 'SAS', team_b: 'DET', probability: 0.0492 },
    { team_a: 'OKC', team_b: 'NYK', probability: 0.0364 },
    { team_a: 'SAS', team_b: 'BOS', probability: 0.0338 },
    { team_a: 'DEN', team_b: 'NYK', probability: 0.0228 },
    { team_a: 'LAL', team_b: 'DET', probability: 0.0212 },
    { team_a: 'OKC', team_b: 'CLE', probability: 0.0118 },
  ],

  round_advancement: [
    { team: 'OKC', round_1_win_prob: 0.882, conference_semifinal_prob: 0.723, conference_final_prob: 0.528, finals_prob: 0.412, championship_prob: 0.2837 },
    { team: 'DET', round_1_win_prob: 0.841, conference_semifinal_prob: 0.681, conference_final_prob: 0.461, finals_prob: 0.348, championship_prob: 0.1981 },
    { team: 'DEN', round_1_win_prob: 0.782, conference_semifinal_prob: 0.524, conference_final_prob: 0.271, finals_prob: 0.198, championship_prob: 0.1612 },
    { team: 'BOS', round_1_win_prob: 0.786, conference_semifinal_prob: 0.471, conference_final_prob: 0.289, finals_prob: 0.221, championship_prob: 0.1498 },
    { team: 'SAS', round_1_win_prob: 0.834, conference_semifinal_prob: 0.441, conference_final_prob: 0.248, finals_prob: 0.154, championship_prob: 0.0962 },
    { team: 'NYK', round_1_win_prob: 0.643, conference_semifinal_prob: 0.351, conference_final_prob: 0.194, finals_prob: 0.098, championship_prob: 0.0564 },
    { team: 'LAL', round_1_win_prob: 0.621, conference_semifinal_prob: 0.271, conference_final_prob: 0.098, finals_prob: 0.058, championship_prob: 0.0318 },
    { team: 'CLE', round_1_win_prob: 0.591, conference_semifinal_prob: 0.241, conference_final_prob: 0.112, finals_prob: 0.061, championship_prob: 0.0131 },
    { team: 'HOU', round_1_win_prob: 0.379, conference_semifinal_prob: 0.098, conference_final_prob: 0.027, finals_prob: 0.009, championship_prob: 0.0016 },
    { team: 'MIN', round_1_win_prob: 0.218, conference_semifinal_prob: 0.048, conference_final_prob: 0.019, finals_prob: 0.007, championship_prob: 0.0018 },
    { team: 'PHX', round_1_win_prob: 0.118, conference_semifinal_prob: 0.031, conference_final_prob: 0.014, finals_prob: 0.006, championship_prob: 0.0027 },
    { team: 'POR', round_1_win_prob: 0.166, conference_semifinal_prob: 0.027, conference_final_prob: 0.009, finals_prob: 0.003, championship_prob: 0.0002 },
    { team: 'TOR', round_1_win_prob: 0.409, conference_semifinal_prob: 0.087, conference_final_prob: 0.024, finals_prob: 0.008, championship_prob: 0.0013 },
    { team: 'ATL', round_1_win_prob: 0.357, conference_semifinal_prob: 0.071, conference_final_prob: 0.019, finals_prob: 0.006, championship_prob: 0.0010 },
    { team: 'PHI', round_1_win_prob: 0.214, conference_semifinal_prob: 0.038, conference_final_prob: 0.012, finals_prob: 0.004, championship_prob: 0.0008 },
    { team: 'ORL', round_1_win_prob: 0.159, conference_semifinal_prob: 0.024, conference_final_prob: 0.008, finals_prob: 0.003, championship_prob: 0.0003 },
  ],

  bracket_projection: {
    west: {
      round_1: [
        { team_a: 'OKC', team_b: 'PHX', winner: 'OKC', winner_probability: 0.882, series_score_prediction: '4-1' },
        { team_a: 'LAL', team_b: 'HOU', winner: 'LAL', winner_probability: 0.621, series_score_prediction: '4-2' },
        { team_a: 'DEN', team_b: 'MIN', winner: 'DEN', winner_probability: 0.782, series_score_prediction: '4-2' },
        { team_a: 'SAS', team_b: 'POR', winner: 'SAS', winner_probability: 0.834, series_score_prediction: '4-1' },
      ],
      semifinals: [
        { team_a: 'OKC', team_b: 'LAL', winner: 'OKC', winner_probability: 0.817, series_score_prediction: '4-2' },
        { team_a: 'DEN', team_b: 'SAS', winner: 'DEN', winner_probability: 0.564, series_score_prediction: '4-3' },
      ],
      conference_finals: [
        { team_a: 'OKC', team_b: 'DEN', winner: 'OKC', winner_probability: 0.604, series_score_prediction: '4-2' },
      ],
    },
    east: {
      round_1: [
        { team_a: 'DET', team_b: 'ORL', winner: 'DET', winner_probability: 0.841, series_score_prediction: '4-1' },
        { team_a: 'CLE', team_b: 'TOR', winner: 'CLE', winner_probability: 0.591, series_score_prediction: '4-3' },
        { team_a: 'NYK', team_b: 'ATL', winner: 'NYK', winner_probability: 0.643, series_score_prediction: '4-2' },
        { team_a: 'BOS', team_b: 'PHI', winner: 'BOS', winner_probability: 0.786, series_score_prediction: '4-1' },
      ],
      semifinals: [
        { team_a: 'DET', team_b: 'CLE', winner: 'DET', winner_probability: 0.748, series_score_prediction: '4-2' },
        { team_a: 'BOS', team_b: 'NYK', winner: 'BOS', winner_probability: 0.619, series_score_prediction: '4-3' },
      ],
      conference_finals: [
        { team_a: 'DET', team_b: 'BOS', winner: 'DET', winner_probability: 0.546, series_score_prediction: '4-3' },
      ],
    },
    championship: [
      { team_a: 'OKC', team_b: 'DET', winner: 'OKC', winner_probability: 0.572, series_score_prediction: '4-2' },
    ],
  },

  validation: {
    mode: 'live_projection',
    round_1_accuracy: null,
    semifinal_accuracy: null,
    conference_finals_accuracy: null,
    finals_accuracy: null,
    overall_bracket_accuracy: null,
    notes: 'Live playoff projection. Historical validation data not yet attached.',
  },

  metadata: {
    model_version: 'v4.1',
    generated_at: '2026-04-24T06:00:00Z',
    data_cutoff: '2026-04-24T05:00:00Z',
  },
}

export const NHL_SIM_SUMMARY: PlayoffSimulationSummary = {
  season: '2025-26',
  league: 'NHL',
  simulation_runs: 10000000,

  projected_champion: {
    team: 'WPG',
    probability: 0.2142,
  },

  champion_distribution: [
    { team: 'WPG', probability: 0.2142 },
    { team: 'BOS', probability: 0.1871 },
    { team: 'EDM', probability: 0.1643 },
    { team: 'DAL', probability: 0.1524 },
    { team: 'FLA', probability: 0.1148 },
    { team: 'NYR', probability: 0.0821 },
    { team: 'TOR', probability: 0.0521 },
    { team: 'VGK', probability: 0.0330 },
  ],

  most_likely_finals_matchup: {
    home_team: 'WPG',
    away_team: 'BOS',
    probability: 0.1241,
  },

  finals_matchup_distribution: [
    { team_a: 'WPG', team_b: 'BOS', probability: 0.1241 },
    { team_a: 'DAL', team_b: 'BOS', probability: 0.0891 },
    { team_a: 'WPG', team_b: 'FLA', probability: 0.0781 },
    { team_a: 'EDM', team_b: 'BOS', probability: 0.0712 },
    { team_a: 'DAL', team_b: 'FLA', probability: 0.0612 },
  ],

  round_advancement: [
    { team: 'WPG', round_1_win_prob: 0.871, conference_semifinal_prob: 0.694, conference_final_prob: 0.481, finals_prob: 0.362, championship_prob: 0.2142 },
    { team: 'BOS', round_1_win_prob: 0.841, conference_semifinal_prob: 0.651, conference_final_prob: 0.421, finals_prob: 0.298, championship_prob: 0.1871 },
    { team: 'EDM', round_1_win_prob: 0.861, conference_semifinal_prob: 0.602, conference_final_prob: 0.364, finals_prob: 0.244, championship_prob: 0.1643 },
    { team: 'DAL', round_1_win_prob: 0.851, conference_semifinal_prob: 0.581, conference_final_prob: 0.348, finals_prob: 0.231, championship_prob: 0.1524 },
    { team: 'FLA', round_1_win_prob: 0.731, conference_semifinal_prob: 0.481, conference_final_prob: 0.274, finals_prob: 0.184, championship_prob: 0.1148 },
    { team: 'NYR', round_1_win_prob: 0.621, conference_semifinal_prob: 0.341, conference_final_prob: 0.187, finals_prob: 0.104, championship_prob: 0.0821 },
    { team: 'TOR', round_1_win_prob: 0.581, conference_semifinal_prob: 0.281, conference_final_prob: 0.141, finals_prob: 0.072, championship_prob: 0.0521 },
    { team: 'VGK', round_1_win_prob: 0.541, conference_semifinal_prob: 0.224, conference_final_prob: 0.098, finals_prob: 0.048, championship_prob: 0.0330 },
  ],

  bracket_projection: {
    west: {
      round_1: [
        { team_a: 'WPG', team_b: 'STL', winner: 'WPG', winner_probability: 0.871, series_score_prediction: '4-1' },
        { team_a: 'DAL', team_b: 'NSH', winner: 'DAL', winner_probability: 0.762, series_score_prediction: '4-2' },
        { team_a: 'EDM', team_b: 'LAK', winner: 'EDM', winner_probability: 0.814, series_score_prediction: '4-2' },
        { team_a: 'VGK', team_b: 'COL', winner: 'VGK', winner_probability: 0.519, series_score_prediction: '4-3' },
      ],
      semifinals: [
        { team_a: 'WPG', team_b: 'VGK', winner: 'WPG', winner_probability: 0.741, series_score_prediction: '4-2' },
        { team_a: 'DAL', team_b: 'EDM', winner: 'DAL', winner_probability: 0.524, series_score_prediction: '4-3' },
      ],
      conference_finals: [
        { team_a: 'WPG', team_b: 'DAL', winner: 'WPG', winner_probability: 0.561, series_score_prediction: '4-3' },
      ],
    },
    east: {
      round_1: [
        { team_a: 'BOS', team_b: 'OTT', winner: 'BOS', winner_probability: 0.841, series_score_prediction: '4-1' },
        { team_a: 'FLA', team_b: 'TBL', winner: 'FLA', winner_probability: 0.692, series_score_prediction: '4-2' },
        { team_a: 'TOR', team_b: 'CAR', winner: 'TOR', winner_probability: 0.524, series_score_prediction: '4-3' },
        { team_a: 'NYR', team_b: 'NJD', winner: 'NYR', winner_probability: 0.534, series_score_prediction: '4-3' },
      ],
      semifinals: [
        { team_a: 'BOS', team_b: 'NYR', winner: 'BOS', winner_probability: 0.684, series_score_prediction: '4-2' },
        { team_a: 'FLA', team_b: 'TOR', winner: 'FLA', winner_probability: 0.614, series_score_prediction: '4-3' },
      ],
      conference_finals: [
        { team_a: 'BOS', team_b: 'FLA', winner: 'BOS', winner_probability: 0.582, series_score_prediction: '4-3' },
      ],
    },
    championship: [
      { team_a: 'WPG', team_b: 'BOS', winner: 'WPG', winner_probability: 0.541, series_score_prediction: '4-3' },
    ],
  },

  validation: {
    mode: 'live_projection',
    round_1_accuracy: null,
    semifinal_accuracy: null,
    conference_finals_accuracy: null,
    finals_accuracy: null,
    overall_bracket_accuracy: null,
    notes: 'Live playoff projection. Historical validation data not yet attached.',
  },

  metadata: {
    model_version: 'v4.1',
    generated_at: '2026-04-24T06:00:00Z',
    data_cutoff: '2026-04-24T05:00:00Z',
  },
}
