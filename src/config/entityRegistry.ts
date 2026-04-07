// src/config/entityRegistry.ts

export const ENTITY_REGISTRY: Record<string, { internalCode: string, shortName: string, name: string, path?: string }> = {
    "Mpt_MLB01": { "internalCode": "01_01_NYY", "shortName": "NYY", "name": "New York Yankees" },
    "Mpt_MLB02": { "internalCode": "01_01_ATL", "shortName": "ATL", "name": "Atlanta Braves" },
    "Mpt_MLB03": { "internalCode": "01_01_BAL", "shortName": "BAL", "name": "Baltimore Orioles" },
    "Mpt_MLB04": { "internalCode": "01_01_BOS", "shortName": "BOS", "name": "Boston Red Sox" },
    "Mpt_MLB05": { "internalCode": "01_01_CHC", "shortName": "CHC", "name": "Chicago Cubs" },
    "Mpt_MLB06": { "internalCode": "01_01_CWS", "shortName": "CWS", "name": "Chicago White Sox" },
    "Mpt_MLB07": { "internalCode": "01_01_CIN", "shortName": "CIN", "name": "Cincinnati Reds" },
    "Mpt_MLB08": { "internalCode": "01_01_CLE", "shortName": "CLE", "name": "Cleveland Guardians" },
    "Mpt_MLB09": { "internalCode": "01_01_COL", "shortName": "COL", "name": "Colorado Rockies" },
    "Mpt_MLB10": { "internalCode": "01_01_DET", "shortName": "DET", "name": "Detroit Tigers" },
    "Mpt_MLB11": { "internalCode": "01_01_HOU", "shortName": "HOU", "name": "Houston Astros" },
    "Mpt_MLB12": { "internalCode": "01_01_KC", "shortName": "KC", "name": "Kansas City Royals" },
    "Mpt_MLB13": { "internalCode": "01_01_LAA", "shortName": "LAA", "name": "Los Angeles Angels" },
    "Mpt_MLB14": { "internalCode": "01_01_TEX", "shortName": "TEX", "name": "Texas Rangers" },
    "Mpt_MLB15": { "internalCode": "01_01_MIA", "shortName": "MIA", "name": "Miami Marlins" },
    "Mpt_MLB16": { "internalCode": "01_01_MIL", "shortName": "MIL", "name": "Milwaukee Brewers" },
    "Mpt_MLB17": { "internalCode": "01_01_MIN", "shortName": "MIN", "name": "Minnesota Twins" },
    "Mpt_MLB18": { "internalCode": "01_01_NYM", "shortName": "NYM", "name": "New York Mets" },
    "Mpt_MLB19": { "internalCode": "01_01_ARI", "shortName": "ARI", "name": "Arizona Diamondbacks" },
    "Mpt_MLB20": { "internalCode": "01_01_OAK", "shortName": "OAK", "name": "Oakland Athletics" },
    "Mpt_MLB21": { "internalCode": "01_01_PHI", "shortName": "PHI", "name": "Philadelphia Phillies" },
    "Mpt_MLB22": { "internalCode": "01_01_PIT", "shortName": "PIT", "name": "Pittsburgh Pirates" },
    "Mpt_MLB23": { "internalCode": "01_01_SD", "shortName": "SD", "name": "San Diego Padres" },
    "Mpt_MLB24": { "internalCode": "01_01_SF", "shortName": "SF", "name": "San Francisco Giants" },
    "Mpt_MLB25": { "internalCode": "01_01_SEA", "shortName": "SEA", "name": "Seattle Mariners" },
    "Mpt_MLB26": { "internalCode": "01_01_STL", "shortName": "STL", "name": "St. Louis Cardinals" },
    "Mpt_MLB27": { "internalCode": "01_01_TB", "shortName": "TB", "name": "Tampa Bay Rays" },
    "Mpt_MLB28": { "internalCode": "01_01_LAD", "shortName": "LAD", "name": "Los Angeles Dodgers" },
    "Mpt_MLB29": { "internalCode": "01_01_TOR", "shortName": "TOR", "name": "Toronto Blue Jays" },
    "Mpt_MLB30": { "internalCode": "01_01_WSH", "shortName": "WSH", "name": "Washington Nationals" },
    "Mpt_NBA01": { "internalCode": "03_01_ATL", "shortName": "ATL", "name": "Atlanta Hawks" },
    "Mpt_NBA02": { "internalCode": "03_01_BOS", "shortName": "BOS", "name": "Boston Celtics" },
    "Mpt_NBA03": { "internalCode": "03_01_BKN", "shortName": "BKN", "name": "Brooklyn Nets" },
    "Mpt_NBA04": { "internalCode": "03_01_CHA", "shortName": "CHA", "name": "Charlotte Hornets" },
    "Mpt_NBA05": { "internalCode": "03_01_CHI", "shortName": "CHI", "name": "Chicago Bulls" },
    "Mpt_NBA06": { "internalCode": "03_01_CLE", "shortName": "CLE", "name": "Cleveland Cavaliers" },
    "Mpt_NBA07": { "internalCode": "03_01_DAL", "shortName": "DAL", "name": "Dallas Mavericks" },
    "Mpt_NBA08": { "internalCode": "03_01_DEN", "shortName": "DEN", "name": "Denver Nuggets" },
    "Mpt_NBA09": { "internalCode": "03_01_DET", "shortName": "DET", "name": "Detroit Pistons" },
    "Mpt_NBA10": { "internalCode": "03_01_OKC", "shortName": "OKC", "name": "Oklahoma City Thunder" },
    "Mpt_NBA11": { "internalCode": "03_01_HOU", "shortName": "HOU", "name": "Houston Rockets" },
    "Mpt_NBA12": { "internalCode": "03_01_IND", "shortName": "IND", "name": "Indiana Pacers" },
    "Mpt_NBA13": { "internalCode": "03_01_LAC", "shortName": "LAC", "name": "LA Clippers" },
    "Mpt_NBA14": { "internalCode": "03_01_PHI", "shortName": "PHI", "name": "Philadelphia 76ers" },
    "Mpt_NBA15": { "internalCode": "03_01_MEM", "shortName": "MEM", "name": "Memphis Grizzlies" },
    "Mpt_NBA16": { "internalCode": "03_01_MIA", "shortName": "MIA", "name": "Miami Heat" },
    "Mpt_NBA17": { "internalCode": "03_01_MIL", "shortName": "MIL", "name": "Milwaukee Bucks" },
    "Mpt_NBA18": { "internalCode": "03_01_MIN", "shortName": "MIN", "name": "Minnesota Timberwolves" },
    "Mpt_NBA19": { "internalCode": "03_01_NOP", "shortName": "NOP", "name": "New Orleans Pelicans" },
    "Mpt_NBA20": { "internalCode": "03_01_NYK", "shortName": "NYK", "name": "New York Knicks" },
    "Mpt_NBA21": { "internalCode": "03_01_GSW", "shortName": "GSW", "name": "Golden State Warriors" },
    "Mpt_NBA22": { "internalCode": "03_01_ORL", "shortName": "ORL", "name": "Orlando Magic" },
    "Mpt_NBA23": { "internalCode": "03_01_LAL", "shortName": "LAL", "name": "Los Angeles Lakers" },
    "Mpt_NBA24": { "internalCode": "03_01_PHX", "shortName": "PHX", "name": "Phoenix Suns" },
    "Mpt_NBA25": { "internalCode": "03_01_POR", "shortName": "POR", "name": "Portland Trail Blazers" },
    "Mpt_NBA26": { "internalCode": "03_01_SAC", "shortName": "SAC", "name": "Sacramento Kings" },
    "Mpt_NBA27": { "internalCode": "03_01_SAS", "shortName": "SAS", "name": "San Antonio Spurs" },
    "Mpt_NBA28": { "internalCode": "03_01_TOR", "shortName": "TOR", "name": "Toronto Raptors" },
    "Mpt_NBA29": { "internalCode": "03_01_UTA", "shortName": "UTA", "name": "Utah Jazz" },
    "Mpt_NBA30": { "internalCode": "03_01_WAS", "shortName": "WAS", "name": "Washington Wizards" },

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
    "Mpt_EPL07": { internalCode: "02_01_NEW", shortName: "NEW", name: "Newcastle United" },
    "Mpt_EPL08": { internalCode: "02_01_AVL", shortName: "AVL", name: "Aston Villa" },

    // --- 西甲 La Liga (ESP) ---
    "Mpt_ESP01": { internalCode: "02_01_RMA", shortName: "RMA", name: "Real Madrid" },
    "Mpt_ESP02": { internalCode: "02_01_BAR", shortName: "BAR", name: "FC Barcelona" },
    "Mpt_ESP03": { internalCode: "02_01_ATM", shortName: "ATM", name: "Atletico Madrid" },
    "Mpt_ESP04": { internalCode: "02_01_RSO", shortName: "RSO", name: "Real Sociedad" },
    "Mpt_ESP05": { internalCode: "02_01_VIL", shortName: "VIL", name: "Villarreal" },

    // --- 義甲 Serie A (ITA) ---
    "Mpt_ITA01": { internalCode: "02_01_INT", shortName: "INT", name: "Inter Milan" },
    "Mpt_ITA02": { internalCode: "02_01_JUV", shortName: "JUV", name: "Juventus" },
    "Mpt_ITA03": { internalCode: "02_01_MIL", shortName: "MIL", name: "AC Milan" },
    "Mpt_ITA04": { internalCode: "02_01_NAP", shortName: "NAP", name: "Napoli" },
    "Mpt_ITA05": { internalCode: "02_01_ROM", shortName: "ROM", name: "AS Roma" },

    // --- 德甲 Bundesliga (GER) ---
    "Mpt_GER01": { internalCode: "02_01_BAY", shortName: "BAY", name: "Bayern Munich" },
    "Mpt_GER02": { internalCode: "02_01_BVB", shortName: "BVB", name: "Borussia Dortmund" },
    "Mpt_GER03": { internalCode: "02_01_LEV", shortName: "LEV", name: "Bayer Leverkusen" },
    "Mpt_GER04": { internalCode: "02_01_RBL", shortName: "RBL", name: "RB Leipzig" },

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