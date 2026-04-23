import numpy as np
import json
import time

def run_vectorized_sim(bracket, iterations=10000000):
    print(f"Starting vectorized 10,000,000 iterations for {bracket['league']}...")
    start_time = time.time()
    
    # Extract data for numpy
    series_data = []
    for s in bracket['series']:
        series_data.append([s['home']['edge'], s['away']['edge'], s['home']['recovery'], s['away']['recovery']])
    
    series_data = np.array(series_data) # (8, 4)
    
    def simulate_round_full(h_e_m, a_e_m, h_r_m, a_r_m):
        diff = h_e_m - a_e_m
        rec_boost = (h_r_m - a_r_m) * 0.1
        p = np.clip(0.52 + diff * 0.55 + rec_boost, 0.25, 0.75)
        
        h_wins = np.zeros_like(p, dtype=int)
        a_wins = np.zeros_like(p, dtype=int)
        for _ in range(7):
            mask = (h_wins < 4) & (a_wins < 4)
            rand = np.random.random(p.shape)
            h_wins += (rand < p) & mask
            a_wins += (rand >= p) & mask
        return h_wins == 4

    h_e = series_data[:, 0]
    a_e = series_data[:, 1]
    h_r = series_data[:, 2]
    a_r = series_data[:, 3]
    
    # R1 needs to expand vectors to (8, Iter)
    h_e_m = np.tile(h_e[:, np.newaxis], iterations)
    a_e_m = np.tile(a_e[:, np.newaxis], iterations)
    h_r_m = np.tile(h_r[:, np.newaxis], iterations)
    a_r_m = np.tile(a_r[:, np.newaxis], iterations)
    
    r1_mask = simulate_round_full(h_e_m, a_e_m, h_r_m, a_r_m)
    
    # Round 2
    r1_win_e = np.where(r1_mask, h_e_m, a_e_m)
    r1_win_r = np.where(r1_mask, h_r_m, a_r_m)
    
    r2_h_e, r2_a_e = r1_win_e[0::2], r1_win_e[1::2]
    r2_h_r, r2_a_r = r1_win_r[0::2], r1_win_r[1::2]
    r2_mask = simulate_round_full(r2_h_e, r2_a_e, r2_h_r, r2_a_r)
    
    # Round 3
    r2_win_e = np.where(r2_mask, r2_h_e, r2_a_e)
    r2_win_r = np.where(r2_mask, r2_h_r, r2_a_r)
    
    r3_h_e, r3_a_e = r2_win_e[0::2], r2_win_e[1::2]
    r3_h_r, r3_a_r = r2_win_r[0::2], r2_win_r[1::2]
    r3_mask = simulate_round_full(r3_h_e, r3_a_e, r3_h_r, r3_a_r)
    
    # Round 4
    r3_win_e = np.where(r3_mask, r3_h_e, r3_a_e)
    r3_win_r = np.where(r3_mask, r3_h_r, r3_a_r)
    
    r4_h_e, r4_a_e = r3_win_e[0:1], r3_win_e[1:2]
    r4_h_r, r4_a_r = r3_win_r[0:1], r3_win_r[1:2]
    r4_mask = simulate_round_full(r4_h_e, r4_a_e, r4_h_r, r4_a_r)
    
    final_winner_e = np.where(r4_mask, r4_h_e, r4_a_e)[0]
    
    # Map back to team names
    edge_to_name = {}
    for s in bracket['series']:
        edge_to_name[s['home']['edge']] = s['home']['abbr']
        edge_to_name[s['away']['edge']] = s['away']['abbr']
    
    results = {}
    for team_edge, team_name in edge_to_name.items():
        count = np.sum(np.isclose(final_winner_e, team_edge))
        results[team_name] = count / iterations
        
    end_time = time.time()
    print(f"Finished in {end_time - start_time:.2f}s")
    return results

nba_bracket = {
    "league": "NBA",
    "series": [
        {"id": "w1", "home": {"abbr": "OKC", "edge": 0.78, "recovery": 0.88}, "away": {"abbr": "PHX", "edge": 0.52, "recovery": 0.72}},
        {"id": "w2", "home": {"abbr": "DEN", "edge": 0.71, "recovery": 0.81}, "away": {"abbr": "DAL", "edge": 0.64, "recovery": 0.74}},
        {"id": "w3", "home": {"abbr": "MIN", "edge": 0.74, "recovery": 0.79}, "away": {"abbr": "LAL", "edge": 0.62, "recovery": 0.71}},
        {"id": "w4", "home": {"abbr": "LAC", "edge": 0.61, "recovery": 0.68}, "away": {"abbr": "GSW", "edge": 0.58, "recovery": 0.64}},
        {"id": "e1", "home": {"abbr": "BOS", "edge": 0.81, "recovery": 0.92}, "away": {"abbr": "MIA", "edge": 0.48, "recovery": 0.65}},
        {"id": "e2", "home": {"abbr": "MIL", "edge": 0.72, "recovery": 0.84}, "away": {"abbr": "IND", "edge": 0.55, "recovery": 0.71}},
        {"id": "e3", "home": {"abbr": "NYK", "edge": 0.69, "recovery": 0.78}, "away": {"abbr": "PHI", "edge": 0.65, "recovery": 0.74}},
        {"id": "e4", "home": {"abbr": "CLE", "edge": 0.61, "recovery": 0.72}, "away": {"abbr": "ORL", "edge": 0.59, "recovery": 0.68}},
    ]
}

if __name__ == "__main__":
    nba_results = run_vectorized_sim(nba_bracket)
    output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "iterations": 10000000,
        "leagues": {
            "NBA": nba_results
        }
    }
    with open("d:/Mosport/Mosport-Terminal/v11/runtime/playoff_prediction_v11.json", "w") as f:
        json.dump(output, f, indent=2)
    print("Results saved to playoff_prediction_v11.json")
