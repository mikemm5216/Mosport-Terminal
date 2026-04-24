const fs = require('fs');

const mockDataPath = 'd:/Mosport/Mosport-Terminal/frontend/app/data/mockData.ts';
const routePath = 'd:/Mosport/Mosport-Terminal/frontend/app/api/games/route.ts';
const uiPath = 'd:/Mosport/Mosport-Terminal/frontend/app/components/ui.tsx';
const logosDir = 'd:/Mosport/Mosport-Terminal/frontend/public/logos';

const logos = new Set(fs.readdirSync(logosDir));

// Extract abbreviations from mockData.ts
const mockContent = fs.readFileSync(mockDataPath, 'utf8');
const mockMatches = [];
// Match patterns like league: "EPL", ... away: { abbr: "WHU" }
// This is hard to regex perfectly, let's just find all abbrs and their leagues if possible
const abbrRegex = /league:\s*"([^"]+)"[\s\S]*?abbr:\s*"([^"]+)"/g;
let match;
const matchAbbrs = []; // { league, abbr }
while ((match = abbrRegex.exec(mockContent)) !== null) {
    matchAbbrs.push({ league: match[1], abbr: match[2] });
}

// Also check TEAM_MAP in route.ts
const routeContent = fs.readFileSync(routePath, 'utf8');
const teamMapRegex = /'([^']+)':\s*'([^']+)'/g;
const teamMap = {};
while ((match = teamMapRegex.exec(routeContent)) !== null) {
    teamMap[match[2]] = match[1];
}

// Simulate ui.tsx logic
const EPL_ABBRS = new Set(["ARS","AVL","BOU","BRE","BHA","CHE","CRY","EVE","FUL","IPS","LEI","LIV","MCI","MUN","NEW","NFO","SOU","TOT","WHM","WOL"]);
const NBA_ABBRS = new Set(["ATL","BOS","BKN","CHA","CHI","CLE","DAL","DEN","DET","GSW","HOU","IND","LAC","LAL","MEM","MIA","MIL","MIN","NOP","NYK","OKC","ORL","PHI","PHX","POR","SAC","SAS","TOR","UTA","WSH"]);
const MLB_ABBRS = new Set(["MIN","NYM","LAD","NYY","HOU","BOS","ATL","SD","CHC","SEA","CWS","ARI","SFG","CLE","COL","MIA","MIL","OAK","PHI","PIT","STL","TB","TEX","TOR","WSH","BAL","DET","KC","LAA","CIN","SDP", "WSN"]);
const NHL_ABBRS = new Set(["BOS","BUF","DET","FLA","MTL","OTT","TBL","TOR","CAR","CBJ","NJD","NYI","NYR","PHI","PIT","WSH","CHI","COL","DAL","MIN","NSH","STL","UTA","WPG","ANA","CGY","EDM","LAK","SEA","SJS","VAN","VGK"]);

function check(league, abbr) {
    let normalized = abbr;
    if (abbr === "SDP") normalized = "SD";
    if (abbr === "WSN") normalized = "WSH";
    
    let set;
    let prefix;
    if (league === "EPL") { set = EPL_ABBRS; prefix = "epl"; }
    else if (league === "NBA") { set = NBA_ABBRS; prefix = "nba"; }
    else if (league === "MLB") { set = MLB_ABBRS; prefix = "mlb"; }
    else if (league === "NHL") { set = NHL_ABBRS; prefix = "nhl"; }
    else return true;

    if (!set.has(abbr)) return { error: "NOT_IN_SET", league, abbr };
    
    const filename = `${prefix}-${normalized.toLowerCase()}.png`;
    if (!logos.has(filename)) return { error: "FILE_MISSING", league, abbr, filename };
    
    return true;
}

const broken = [];
for (const item of matchAbbrs) {
    const res = check(item.league, item.abbr);
    if (res !== true) broken.push(res);
}

// Also check all entries in TEAM_MAP for possible leagues
for (const abbr in teamMap) {
    // We don't know the league for sure from TEAM_MAP alone, but we can guess
    const leagues = ["EPL", "NBA", "MLB", "NHL", "UCL"];
    let anyOk = false;
    for (const l of leagues) {
        if (check(l, abbr) === true) { anyOk = true; break; }
    }
    if (!anyOk) {
        broken.push({ error: "MAP_ABBR_FAIL", abbr, name: teamMap[abbr] });
    }
}

console.log(JSON.stringify(broken, null, 2));
