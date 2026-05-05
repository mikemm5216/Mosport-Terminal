# Keyboard Coach Level System

Status: Binding Product Layer
Base Repo: `mikemm5216/Mosport-Terminal`
Related Docs:

- `docs/MOSPORT_CONSTITUTION.md`
- `docs/V12_USER_DATA_LAYER.md`

---

## 1. Core Thesis

The Keyboard Coach Level System is the public identity layer of Mosport's Fan Judgment Data Layer.

V12 explains how Mosport understands the user internally.

The Coach Level System explains how users see themselves externally.

```txt
V12 User Data Layer = system understanding
Coach Level System = user-facing identity
```

Core product sentence:

> In Mosport, knowing ball is not something you claim. It is earned through every pregame read, every comment, and every postgame verification.

Chinese:

> 在 Mosport，懂球不是自己說的。
> 是靠每一次賽前判斷、每一次留言、每一次被比賽驗證累積出來的。

---

## 2. Level Ladder

### Rookie

剛加入 Mosport，開始你的第一場教練判斷。

### Freshman

開始累積比賽判斷，熟悉 Coach Read、投票與留言玩法。

### Prospect

你已經不是路人球迷，開始留下穩定的賽前判斷紀錄。

### Semi-Pro

你的判斷開始被其他球迷注意，留言也逐漸有說服力。

### Pro

你不只是看球，你能說出比賽為什麼可能這樣發展。

### All-Star

你的教練判斷開始影響討論方向，其他球迷會看你怎麼投。

### Superstar

你是 Mosport 裡高準確率、高參與度、高影響力的核心鍵盤教練。

### Hall of Fame

你不是鍵盤教練，你是被系統長期驗證過的傳奇懂球人。

---

## 3. Level Philosophy

Coach Level must not become a betting rank.

Do not rank users by betting ROI, line value, or wagering performance.

Rank users by verified coaching judgment.

Coach Level should consider:

- pregame judgment accuracy
- participation consistency
- comment quality
- reasoning quality
- contrarian value
- correctness when disagreeing with Mosport AI
- postgame verification
- data challenge quality
- abuse/moderation history

---

## 4. Coach Score Formula

First implementation may use a simple weighted formula:

```txt
CoachScore =
  40% AccuracyScore
+ 25% ParticipationScore
+ 20% ReasoningQualityScore
+ 15% ContrarianValueScore
```

### AccuracyScore

How often the user's pregame stance is verified after the game.

### ParticipationScore

Votes, comments, data challenges, streaks, and consistent pregame engagement.

### ReasoningQualityScore

Quality of comments, replies, upvotes, moderator labels, and whether the user explains the coaching logic.

### ContrarianValueScore

Extra credit when the user takes a minority position and is later verified right.

This is important because Mosport should reward real judgment, not only crowd-following.

---

## 5. Suggested Level Thresholds

These thresholds are first-pass product guidelines and may be tuned later.

| Level | CoachScore | Meaning |
|---|---:|---|
| Rookie | 0-99 | New user |
| Freshman | 100-249 | Started participating |
| Prospect | 250-599 | Stable record forming |
| Semi-Pro | 600-1199 | Noticeable judgment |
| Pro | 1200-2499 | Reliable contributor |
| All-Star | 2500-4999 | High influence |
| Superstar | 5000-9999 | High accuracy + high participation |
| Hall of Fame | 10000+ | Long-term verified elite |

Hall of Fame should require more than points:

- minimum 300 pregame judgments
- minimum 3 months of activity
- high verified accuracy
- no serious abuse/moderation record
- meaningful participation across time

---

## 6. Coach Form

Coach Level is long-term identity.

Coach Form is short-term momentum.

Possible forms:

- Cold
- Heating Up
- Locked In
- On Fire
- Legendary Run

Example profile:

```txt
Michael Mo
Level: Pro
Form: On Fire
Last 10 Coach Reads: 7 verified
Best League: NBA
Style: Contrarian Coach
Next Level: All-Star, 660 points away
```

---

## 7. Public UI Rules

User-facing identity surfaces may show:

- Coach Level
- Coach Score
- Coach Form
- Best League
- Best Decision Type
- Verified Reads
- Good Calls
- Contrarian Hits
- Participation Streak

Avoid:

- bettor
- gambling expert
- ROI
- tail this user
- win money
- paid picks
- betting win rate

Suggested copy:

> Postgame Verified

> Good Call

> Coach Score +24

> Pro · NBA Specialist

> All-Star coaches are split on this read.

---

## 8. Product Uses

Coach Level can power:

- profile badges
- comment badges
- vote weighting display, without overriding one-person-one-vote UX
- top keyboard coaches leaderboard
- league-specific specialist badges
- postgame verdict recap
- high-level user sentiment surfaces
- fan judgment research layer

Examples:

```txt
All-Star and above: 62% agree with Mosport, 38% disagree.
```

```txt
Three Pro-level NBA coaches challenged this read before tip-off.
```

```txt
Hall of Fame users were early against the crowd on this matchup.
```

---

## 9. Engineering Implementation Guidance

First implementation should use existing schema where possible:

- `MosportUser.reputation`
- `MosportUser.coachScore`
- `CoachDecisionVote`
- `MatchComment`
- `UserEventLog`
- `UserProfileVector.payload`

Recommended new services:

- `lib/reputation/coachLevel.ts`
- `lib/reputation/coachScore.ts`
- `lib/reputation/coachForm.ts`
- `lib/reputation/updateUserProfileVector.ts`
- `lib/reputation/postgameUserJudgmentEvaluator.ts`

Recommended DTO:

```ts
export type CoachLevel =
  | "ROOKIE"
  | "FRESHMAN"
  | "PROSPECT"
  | "SEMI_PRO"
  | "PRO"
  | "ALL_STAR"
  | "SUPERSTAR"
  | "HALL_OF_FAME";

export type CoachForm =
  | "COLD"
  | "HEATING_UP"
  | "LOCKED_IN"
  | "ON_FIRE"
  | "LEGENDARY_RUN";
```

---

## 10. Final Line

The World Engine makes Mosport understand the game.

The Coach Level System makes fans want to stay and prove they understand the game.

Chinese:

> World Engine 讓 Mosport 會分析比賽，Coach Level System 讓球迷願意留下來證明自己懂球。
