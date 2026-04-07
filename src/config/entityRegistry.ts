// src/config/entityRegistry.ts

export const ENTITY_REGISTRY: Record<string, { internalCode: string, shortName: string, name: string }> = {
    // ==========================================
    // ⚾️ BASEBALL - MLB (30 TEAMS) - SPORT: 01
    // ==========================================
    "Mpt_MLB01": { internalCode: "01_01_NYY", shortName: "NYY", name: "New York Yankees" },
    "Mpt_MLB02": { internalCode: "01_01_BOS", shortName: "BOS", name: "Boston Red Sox" },
    "Mpt_MLB03": { internalCode: "01_01_BAL", shortName: "BAL", name: "Baltimore Orioles" },
    "Mpt_MLB04": { internalCode: "01_01_TB", shortName: "TB", name: "Tampa Bay Rays" },
    "Mpt_MLB05": { internalCode: "01_01_TOR", shortName: "TOR", name: "Toronto Blue Jays" },
    "Mpt_MLB11": { internalCode: "01_01_HOU", shortName: "HOU", name: "Houston Astros" },
    "Mpt_MLB28": { internalCode: "01_01_LAD", shortName: "LAD", name: "Los Angeles Dodgers" },
    // ... (其餘 MLB 隊伍比照此格式，篇幅關係省略，請保持原本 30 隊完整)

    // ==========================================
    // 🏀 BASKETBALL - NBA (30 TEAMS) - SPORT: 03
    // ==========================================
    "Mpt_NBA01": { internalCode: "03_01_BOS", shortName: "BOS", name: "Boston Celtics" },
    "Mpt_NBA21": { internalCode: "03_01_GSW", shortName: "GSW", name: "Golden State Warriors" },
    "Mpt_NBA23": { internalCode: "03_01_LAL", shortName: "LAL", name: "Los Angeles Lakers" },
    // ... (其餘 NBA 隊伍比照此格式，請保持原本 30 隊完整)

    // ==========================================
    // ⚽️ SOCCER - EUROPE TOP 5 (SPORT: 02)
    // ==========================================

    // --- 英超 Premier League (EPL) ---
    "Mpt_EPL01": { internalCode: "02_01_ARS", shortName: "ARS", name: "Arsenal" },
    "Mpt_EPL02": { internalCode: "02_01_MCI", shortName: "MCI", name: "Manchester City" },
    "Mpt_EPL03": { internalCode: "02_01_LIV", shortName: "LIV", name: "Liverpool" },
    "Mpt_EPL04": { internalCode: "02_01_MUN", shortName: "MUN", name: "Manchester United" },
    "Mpt_EPL05": { internalCode: "02_01_CHE", shortName: "CHE", name: "Chelsea" },
    "Mpt_EPL06": { internalCode: "02_01_TOT", shortName: "TOT", name: "Tottenham Hotspur" },

    // --- 西甲 La Liga (ESP) ---
    "Mpt_ESP01": { internalCode: "02_01_RMA", shortName: "RMA", name: "Real Madrid" },
    "Mpt_ESP02": { internalCode: "02_01_BAR", shortName: "BAR", name: "FC Barcelona" },
    "Mpt_ESP03": { internalCode: "02_01_ATM", shortName: "ATM", name: "Atletico Madrid" },

    // --- 義甲 Serie A (ITA) ---
    "Mpt_ITA01": { internalCode: "02_01_INT", shortName: "INT", name: "Inter Milan" },
    "Mpt_ITA02": { internalCode: "02_01_JUV", shortName: "JUV", name: "Juventus" },
    "Mpt_ITA03": { internalCode: "02_01_MIL", shortName: "MIL", name: "AC Milan" },
    "Mpt_ITA04": { internalCode: "02_01_NAP", shortName: "NAP", name: "Napoli" },

    // --- 德甲 Bundesliga (GER) ---
    "Mpt_GER01": { internalCode: "02_01_BAY", shortName: "BAY", name: "Bayern Munich" },
    "Mpt_GER02": { internalCode: "02_01_BVB", shortName: "BVB", name: "Borussia Dortmund" },
    "Mpt_GER03": { internalCode: "02_01_LEV", shortName: "LEV", name: "Bayer Leverkusen" },

    // --- 法甲 Ligue 1 (FRA) ---
    "Mpt_FRA01": { internalCode: "02_01_PSG", shortName: "PSG", name: "Paris Saint-Germain" },
    "Mpt_FRA02": { internalCode: "02_01_OM", shortName: "OM", name: "Olympique de Marseille" },
    "Mpt_FRA03": { internalCode: "02_01_ASM", shortName: "ASM", name: "AS Monaco" },
};

// Reverse lookup for V2 DB binding: internal_code -> hashId
export const REVERSE_REGISTRY: Record<string, string> = Object.entries(ENTITY_REGISTRY).reduce(
    (acc, [hash, entity]) => ({ ...acc, [entity.internalCode]: hash }),
    {}
);