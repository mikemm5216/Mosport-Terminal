# Mosport Agent Instructions

Before making changes, proposing architecture, writing code, reviewing code, or answering repository-specific questions, read these documents in order:

1. [`docs/MOSPORT_CONSTITUTION.md`](./docs/MOSPORT_CONSTITUTION.md)
2. [`README.md`](./README.md)

`docs/MOSPORT_CONSTITUTION.md` is the highest-level binding product constitution for Mosport.

Treat it as the source of truth for:

- Mosport's product identity
- pregame-only analysis boundaries
- no live/in-play analysis rules
- no sportsbook, betting, wagering, or investment-advisory positioning
- Keyboard Coach product framing
- World Engine → Coach Evidence → Coach Read data flow
- fan vote / comment as core product mechanics
- player-team validation rules
- postgame verdict rules
- UI language and copy guardrails

`README.md` remains the repository-level technical and operational guide. If `README.md` conflicts with `docs/MOSPORT_CONSTITUTION.md`, follow the constitution first and update the technical plan accordingly.

## Non-Negotiable Product Rules

Mosport is a **pregame Keyboard Coach platform**.

Mosport is not:

- a sportsbook
- a betting product
- a live wagering tool
- an in-play prediction platform
- a quant trading terminal
- an investment-advisory style dashboard
- a generic scoreboard app

Mosport's product flow is:

```txt
Pregame:
Raw Data → Validated Data → World Engine → Coach Read → Fan Vote / Comment

Live:
Locked Pregame Coach Read → Live Follow Only → Fan Discussion

Postgame:
Final Result → Postgame Verdict → Keyboard Coach Reputation
```

## Pregame-Only Rule

All public-facing Coach Reads must be generated before the game starts.

Once a game is live:

- do not generate a new Coach Read
- do not update the locked Coach Read
- do not show live win probability
- do not show live edge
- do not show live recommendations
- do not create in-play analysis
- do not use market movement to trigger public advice

Live mode is follow-only:

- score
- clock/status
- period/inning/match minute
- locked pregame read recap
- fan vote recap
- comments
- postgame verdict pending state

## Quantitative Data Rule

Do not remove quantitative data. Coaches need evidence.

But raw numbers are not the default product. Quantitative data must be translated through the World Engine into coach-readable evidence and then into a Coach Read.

Do not headline public UI with betting-like metrics such as edge, line, total, market movement, live probability, or sharp signal.

Public UI should headline:

- Coach Question
- Mosport Coach Read
- Why It Matters
- World Engine Evidence
- Opposing Coach View
- Fan Vote
- Comment / Debate

## Required Engineering Behavior

When adding or modifying features:

1. Check whether the change violates the pregame-only rule.
2. Check whether the copy makes Mosport feel like betting, wagering, trading, or investment advice.
3. Check whether quantitative data is being presented as raw signal instead of coach evidence.
4. Check whether live games are restricted to follow-only behavior.
5. Check whether real player names are protected by player-team validation.
6. Check whether vote/comment/data challenge remain first-class product loops.

If a requested implementation conflicts with the constitution, stop and propose a constitution-compliant alternative.

Final north star:

> 賽前當教練，賽中看打臉，賽後論輸贏。
