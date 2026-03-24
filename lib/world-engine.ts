export interface TeamStats {
  id: string;
  name: string;
  shortName: string;
  momentum: number;
  strength: number;
  fatigue: number;
  history: { result: string; date: Date }[];
}

export const WorldEngine = {
  calcMomentum(history: { result: string }[]): number {
    const last5 = history.slice(0, 5);
    if (last5.length === 0) return 0;
    const pts = last5.reduce((sum, h) => {
      if (h.result === 'W') return sum + 1.0;
      if (h.result === 'D') return sum + 0.5;
      return sum;
    }, 0);
    return Math.round((pts / 5) * 100) / 100;
  },

  calcStrength(history: { result: string }[]): number {
    if (history.length === 0) return 0;
    const wins = history.filter(h => h.result === 'W').length;
    return Math.round((wins / history.length) * 100) / 100;
  },

  calcFatigue(history: { date: Date }[]): number {
    if (history.length === 0) return 0;
    const mostRecent = history[0].date;
    const daysSince = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 2) return 0.9;
    if (daysSince <= 4) return 0.5;
    return 0.1;
  },

  getStreakCount(history: { result: string }[]) {
    if (history.length === 0) return { type: 'N', count: 0 };
    const type = history[0].result;
    let count = 0;
    for (const h of history) {
      if (h.result === type) count++;
      else break;
    }
    return { type, count };
  },

  generateMarketSentiment(home: TeamStats, away: TeamStats, predictedWinner: 'home' | 'away'): { expert: string; money: string; social: string } {
    const winner = predictedWinner === 'home' ? home : away;
    const loser = predictedWinner === 'home' ? away : home;
    
    const buzzwords = ["perimeter efficiency", "defensive keywords", "market volume", "sharp money", "injury volatility", "line movement"];
    const buzz = buzzwords[Math.floor(Math.random() * buzzwords.length)];

    let expert = "";
    if (predictedWinner === 'away' && winner.momentum > 0.8) {
      expert = `Market analysts are heavily focusing on ${winner.shortName}'s ${buzz}, warning that ${loser.shortName}'s recent form makes them a risky fade tonight.`;
    } else if (predictedWinner === 'home' && loser.fatigue > 0.7) {
      expert = `Expert consensus highlights a significant energy gap; ${loser.shortName}'s road exhaustion is driving heavy sentiment toward a ${home.shortName} home cover.`;
    } else {
      expert = `Aggregated intelligence indicates ${winner.shortName} is gaining traction among high-volume models due to ${buzz} advantages over ${loser.shortName}.`;
    }

    return {
      expert,
      money: `${winner.shortName} ${predictedWinner === 'home' ? 'spread' : 'moneyline'} position detected.`,
      social: `Viral trend favoring ${winner.shortName} across major sports betting forums.`
    };
  },

  runMatchSimulation(home: TeamStats, away: TeamStats, forcedWinner?: 'home' | 'away') {
    const homeScore = (home.strength * 0.5) + (home.momentum * 0.3) - (home.fatigue * 0.2);
    const awayScore = (away.strength * 0.5) + (away.momentum * 0.3) - (away.fatigue * 0.2);

    const predictedWinner = forcedWinner || (homeScore >= awayScore ? 'home' : 'away');
    const isUpset = (predictedWinner === 'home' && home.strength < away.strength) || 
                    (predictedWinner === 'away' && away.strength < home.strength);

    let primaryTag = "";
    let tagTarget: "home" | "away" = "home";
    let standardAnalysis = "";
    let confidence = Math.abs(homeScore - awayScore);

    if (predictedWinner === 'away') {
      const winner = away;
      const loser = home;
      const winnerStreak = this.getStreakCount(winner.history);
      const loserStreak = this.getStreakCount(loser.history);

      if (winnerStreak.type === 'W' && winnerStreak.count >= 2) {
        primaryTag = `${winnerStreak.count}W STREAK: RIDING MOMENTUM`;
        tagTarget = "away";
      } else if (loserStreak.type === 'L' && loserStreak.count >= 2) {
        primaryTag = `L${loserStreak.count}: STRUGGLING FORM`;
        tagTarget = "home";
      } else if (winner.strength > loser.strength + 0.2) {
        primaryTag = `DOMINANT: SUPERIOR CLASS`;
        tagTarget = "away";
      } else {
        primaryTag = `PROJECTED: VALUE PLAY`;
        tagTarget = "away";
      }
      
      standardAnalysis = `${winner.name} are bringing massive momentum into this game against a struggling ${loser.name} squad. Quantitative models favor the road team based on consistent output.`;
    } else {
      const winner = home;
      const loser = away;
      const winnerStreak = this.getStreakCount(winner.history);

      if (loser.fatigue > 0.6) {
        primaryTag = `FATIGUE ALERT: ROAD EXHAUSTION`;
        tagTarget = "away";
      } else if (winnerStreak.type === 'L' && winner.strength > 0.4) {
        primaryTag = `DUE FOR A BOUNCE BACK`;
        tagTarget = "home";
      } else if (winner.momentum > loser.momentum) {
        primaryTag = `PROTECTING HOME TURF`;
        tagTarget = "home";
      } else {
        primaryTag = `HOME ADVANTAGE FAVORED`;
        tagTarget = "home";
      }

      if (isUpset) {
        standardAnalysis = `Despite ${loser.name}'s higher paper strength, their Bio-Battery is severely low. ${winner.name} is primed to capitalize on home soil and secure the upset.`;
      } else {
        standardAnalysis = `${winner.name} looks dominant at home. Expect them to control the tempo and capitalize on ${loser.name}'s defensive gaps throughout the match.`;
      }
    }

    const marketSentiment = this.generateMarketSentiment(home, away, predictedWinner);

    return { 
      primaryTag, 
      tagTarget,
      marketSentiment,
      standardAnalysis, 
      predictedWinner,
      confidence: Math.round(confidence * 100) / 100 
    };
  }
};
