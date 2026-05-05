# V12 User Data Layer

Status: Binding Strategic Product Layer
Base Repo: `mikemm5216/Mosport-Terminal`
Related Constitution: `docs/MOSPORT_CONSTITUTION.md`

---

## 1. Core Thesis

Mosport's B2C surface is not only a traffic funnel.

It is the foundation for a long-term proprietary user data layer built from fan judgment.

Mosport should not only own sports data. Mosport should accumulate structured fan judgment data.

This data layer is rare because scoreboards, sports news sites, and raw sports APIs usually know what happened in games, but they do not know how fans judged the game before it happened, how those fans disagreed with AI, and which fans were repeatedly proven right after the game.

Core phrase:

> Fan judgment data is Mosport's proprietary sports intelligence layer.

Chinese:

> Mosport 不只擁有比賽資料，而是累積一層稀缺的 fan judgment data。

---

## 2. What Mosport Captures

Every logged-in user action should become structured behavioral and judgment data when possible.

Examples:

- login behavior
- favorite teams
- watched leagues
- followed matches
- pregame votes
- comments
- alternative coach calls
- disagreement with Mosport Coach Read
- agreement with Mosport Coach Read
- postgame correctness
- data challenges
- report accuracy
- league-specific performance
- sport-specific expertise
- contrarian behavior
- underdog sensitivity
- pregame vs live vs postgame behavior differences
- common traits of high-accuracy users
- behavior patterns across coach levels

---

## 3. Data Flow

```txt
Fan Vote / Comment / Data Challenge / Postgame Verdict
→ UserEventLog
→ UserProfileVector
→ FanJudgmentProfile
→ KeyboardCoachReputation
→ Mosport Proprietary Sports Intelligence
```

This means vote/comment are not just social features.

They are the raw material for Mosport's long-term user intelligence layer.

---

## 4. Strategic Dimensions

The V12 layer should eventually help Mosport understand:

- user's favorite teams
- user's most watched leagues
- user's pregame accuracy
- user's best sports
- user's best coach decision types
- user's cold-game / underdog sensitivity
- user's contrarian rate
- user's disagreement rate against AI Coach Reads
- user's accuracy when disagreeing with AI
- user's comment quality
- user's data challenge quality
- user's participation streak
- user's behavior by analysis phase
- user's postgame learning pattern
- shared traits of high-accuracy keyboard coaches
- shared traits of different coach levels

---

## 5. Engineering Principles

### 5.1 Capture Structured Events

Every meaningful user action should write to `UserEventLog` with a stable event taxonomy.

Examples:

```txt
FAN_VOTE_AGREE
FAN_VOTE_DISAGREE
FAN_VOTE_ALTERNATIVE
FAN_COMMENT_POSTED
DATA_CHALLENGE_CREATED
COACH_READ_VIEWED
PREGAME_READ_FOLLOWED
POSTGAME_VERDICT_VIEWED
AI_DISAGREEMENT_RECORDED
GOOD_CALL_CONFIRMED
BAD_CALL_CONFIRMED
```

### 5.2 Keep User Profile Vector Updated

`UserProfileVector.payload` should become the first implementation home for user-level judgment intelligence.

Example payload:

```json
{
  "coachLevel": "PRO",
  "coachForm": "ON_FIRE",
  "accuracy": {
    "overall": 0.64,
    "last10": 0.7,
    "nba": 0.68,
    "mlb": 0.55
  },
  "behavior": {
    "contrarianRate": 0.28,
    "aiDisagreementRate": 0.31,
    "accuracyWhenDisagreeingWithAI": 0.59,
    "commentQualityScore": 72,
    "participationStreak": 8
  },
  "expertise": {
    "bestLeague": "NBA",
    "bestDecisionType": "ROTATION_COMPRESSION"
  }
}
```

### 5.3 Separate Identity From Betting

Do not frame user skill as betting performance.

Avoid:

- ROI
- bettor rank
- betting win rate
- pick seller language
- tail/follow this user

Use:

- Coach Score
- Coach Level
- Verified Reads
- Good Calls
- Postgame Verified
- Keyboard Coach Reputation

---

## 6. Privacy and Trust

Mosport must treat fan judgment data as a trust asset.

Rules:

- collect only product-relevant interaction data
- avoid selling personal data as raw user profiles
- use aggregated insights for product intelligence
- be transparent that votes/comments contribute to reputation and coach identity
- allow moderation and abuse prevention
- do not expose private user data in public ranking surfaces

---

## 7. Product Rule

Any feature that collects fan judgment should answer:

1. What structured user judgment does this create?
2. How does it improve Coach Level / Coach Score / reputation?
3. How does it improve Mosport's proprietary sports intelligence?
4. Does it avoid betting, wagering, and investment-advisory framing?

If the answer is unclear, the feature is incomplete.

---

## 8. Final Line

Mosport's moat is not only the World Engine.

Mosport's moat is the combination of:

```txt
World Engine + Locked Pregame Coach Reads + Fan Judgment Data + Keyboard Coach Reputation
```

Chinese:

> 投票不是互動功能，投票是 Mosport proprietary sports intelligence 的原料。
