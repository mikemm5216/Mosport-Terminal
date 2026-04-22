"""
Mosport V11 — Runtime Loop

Execution order: raw → WorldStateAgent → AnalystAgent → SharpAgent → ArbiterAgent

Each agent step prints structured debug trace to terminal.
"""

from typing import Dict, Any

from v11.agents.world_state_agent import WorldStateAgent
from v11.agents.analyst_agent import AnalystAgent
from v11.agents.sharp_agent import SharpAgent
from v11.agents.arbiter_agent import ArbiterAgent


def _print_world_state(ws: Dict[str, Any]) -> None:
    print("\n[WORLD STATE]")
    print(f"  game_id={ws['game_id']}")
    print(f"  sport={ws['sport']}")
    print(f"  home_team={ws['home_team']}")
    print(f"  away_team={ws['away_team']}")
    print(f"  pressure={ws['pressure']}")
    print(f"  fatigue={ws['fatigue']}")
    print(f"  volatility={ws['volatility']}")
    print(f"  momentum={ws['momentum']}")
    print(f"  mismatch={ws['mismatch']}")
    print(f"  market_home_prob={ws['market_home_prob']}")
    print(f"  tags={ws['tags']}")


def _print_opinion(opinion: Dict[str, Any]) -> None:
    agent = opinion["agent"]
    label = agent.replace("Agent", "").upper()
    print(f"\n[{label}]")
    print(f"  lean={opinion['lean']}")
    print(f"  confidence={opinion['confidence']}")
    print(f"  reasoning={opinion['reasoning']}")
    print(f"  features_used={opinion['features_used']}")


def _print_decision(decision: Dict[str, Any]) -> None:
    print("\n[ARBITER]")
    print(f"dominant={decision['dominant_agent']}")
    print(f"market={decision['market_home_prob']:.2f}")
    print(f"final_prob={decision['final_probability_home']:.2f}")
    print(f"edge={decision['edge_vs_market']:.2f}")
    print(f"label={decision['label']}")
    print(f"action={decision['action']}")


def run_pipeline(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the full multi-agent pipeline.

    Args:
        raw_data: Raw game state JSON (matches sample_game_state.json format).

    Returns:
        FinalDecision as a dict.
    """
    print("=" * 60)
    print("  MOSPORT V11 — MULTI-AGENT RUNTIME")
    print("=" * 60)

    # Step 1: World State Agent
    ws_agent = WorldStateAgent()
    world_state = ws_agent.run(raw_data)
    _print_world_state(world_state)

    # Step 2: Analyst Agent (conservative)
    analyst_agent = AnalystAgent()
    analyst_opinion = analyst_agent.run(world_state)
    _print_opinion(analyst_opinion)

    # Step 3: Sharp Agent (aggressive)
    sharp_agent = SharpAgent()
    sharp_opinion = sharp_agent.run(world_state)
    _print_opinion(sharp_opinion)

    # Step 4: Arbiter Agent (final decision)
    arbiter_agent = ArbiterAgent()
    arbiter_input = {
        "world_state": world_state,
        "opinions": [analyst_opinion, sharp_opinion],
    }
    decision = arbiter_agent.run(arbiter_input)
    _print_decision(decision)

    print("\n" + "=" * 60)
    return decision
