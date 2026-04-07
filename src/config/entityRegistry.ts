// src/config/entityRegistry.ts

export const ENTITY_REGISTRY: Record<string, { internalCode: string, shortName: string, name: string, path: string }> = {
    // ==========================================
    // ⚾️ BASEBALL - MLB (30 TEAMS) - SPORT: 01
    // ==========================================
    "Mpt_MLB01": { internalCode: "01_01_NYY", shortName: "NYY", name: "New York Yankees", path: "/assets/baseball/mlb/nyy.png" },
    "Mpt_MLB02": { internalCode: "01_01_BOS", shortName: "BOS", name: "Boston Red Sox", path: "/assets/baseball/mlb/bos.png" },
    "Mpt_MLB03": { internalCode: "01_01_BAL", shortName: "BAL", name: "Baltimore Orioles", path: "/assets/baseball/mlb/bal.png" },
    "Mpt_MLB04": { internalCode: "01_01_TB", shortName: "TB", name: "Tampa Bay Rays", path: "/assets/baseball/mlb/tb.png" },
    "Mpt_MLB05": { internalCode: "01_01_TOR", shortName: "TOR", name: "Toronto Blue Jays", path: "/assets/baseball/mlb/tor.png" },
    "Mpt_MLB11": { internalCode: "01_01_HOU", shortName: "HOU", name: "Houston Astros", path: "/assets/baseball/mlb/hou.png" },
    "Mpt_MLB28": { internalCode: "01_01_LAD", shortName: "LAD", name: "Los Angeles Dodgers", path: "/assets/baseball/mlb/lad.png" },
    // ... (其餘 MLB 隊伍比照此格式，篇幅關係省略，請保持原本 30 隊完整)

    // ==========================================
    // 🏀 BASKETBALL - NBA (30 TEAMS) - SPORT: 03
    // ==========================================
    "Mpt_NBA01": { internalCode: "03_01_BOS", shortName: "BOS", name: "Boston Celtics", path: "/assets/basketball/nba/bos.png" },
    "Mpt_NBA21": { internalCode: "03_01_GSW", shortName: "GSW", name: "Golden State Warriors", path: "/assets/basketball/nba/gsw.png" },
    "Mpt_NBA23": { internalCode: "03_01_LAL", shortName: "LAL", name: "Los Angeles Lakers", path: "/assets/basketball/nba/lal.png" },
    // ... (其餘 NBA 隊伍比照此格式，請保持原本 30 隊完整)

    // ==========================================
    // ⚽️ SOCCER - EUROPE TOP 5 (SPORT: 02)
    // ==========================================

    // --- 英超 Premier League (EPL) ---
    "Mpt_EPL01": { internalCode: "02_01_ARS", shortName: "ARS", name: "Arsenal", path: "/assets/soccer/epl/ars.png" },
    "Mpt_EPL02": { internalCode: "02_01_MCI", shortName: "MCI", name: "Manchester City", path: "/assets/soccer/epl/mci.png" },
    "Mpt_EPL03": { internalCode: "02_01_LIV", shortName: "LIV", name: "Liverpool", path: "/assets/soccer/epl/liv.png" },
    "Mpt_EPL04": { internalCode: "02_01_MUN", shortName: "MUN", name: "Manchester United", path: "/assets/soccer/epl/mun.png" },
    "Mpt_EPL05": { internalCode: "02_01_CHE", shortName: "CHE", name: "Chelsea", path: "/assets/soccer/epl/che.png" },
    "Mpt_EPL06": { internalCode: "02_01_TOT", shortName: "TOT", name: "Tottenham Hotspur", path: "/assets/soccer/epl/tot.png" },

    // --- 西甲 La Liga (ESP) ---
    "Mpt_ESP01": { internalCode: "02_01_RMA", shortName: "RMA", name: "Real Madrid", path: "/assets/soccer/esp/rma.png" },
    "Mpt_ESP02": { internalCode: "02_01_BAR", shortName: "BAR", name: "FC Barcelona", path: "/assets/soccer/esp/bar.png" },
    "Mpt_ESP03": { internalCode: "02_01_ATM", shortName: "ATM", name: "Atletico Madrid", path: "/assets/soccer/esp/atm.png" },

    // --- 義甲 Serie A (ITA) ---
    "Mpt_ITA01": { internalCode: "02_01_INT", shortName: "INT", name: "Inter Milan", path: "/assets/soccer/ita/int.png" },
    "Mpt_ITA02": { internalCode: "02_01_JUV", shortName: "JUV", name: "Juventus", path: "/assets/soccer/ita/juv.png" },
    "Mpt_ITA03": { internalCode: "02_01_MIL", shortName: "MIL", name: "AC Milan", path: "/assets/soccer/ita/mil.png" },
    "Mpt_ITA04": { internalCode: "02_01_NAP", shortName: "NAP", name: "Napoli", path: "/assets/soccer/ita/nap.png" },

    // --- 德甲 Bundesliga (GER) ---
    "Mpt_GER01": { internalCode: "02_01_BAY", shortName: "BAY", name: "Bayern Munich", path: "/assets/soccer/ger/bay.png" },
    "Mpt_GER02": { internalCode: "02_01_BVB", shortName: "BVB", name: "Borussia Dortmund", path: "/assets/soccer/ger/bvb.png" },
    "Mpt_GER03": { internalCode: "02_01_LEV", shortName: "LEV", name: "Bayer Leverkusen", path: "/assets/soccer/ger/lev.png" },

    // --- 法甲 Ligue 1 (FRA) ---
    "Mpt_FRA01": { internalCode: "02_01_PSG", shortName: "PSG", name: "Paris Saint-Germain", path: "/assets/soccer/fra/psg.png" },
    "Mpt_FRA02": { internalCode: "02_01_OM", shortName: "OM", name: "Olympique de Marseille", path: "/assets/soccer/fra/om.png" },
    "Mpt_FRA03": { internalCode: "02_01_ASM", shortName: "ASM", name: "AS Monaco", path: "/assets/soccer/fra/asm.png" },
};