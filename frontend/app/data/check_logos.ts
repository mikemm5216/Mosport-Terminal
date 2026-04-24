import fs from 'fs';
import path from 'path';

const mockDataPath = 'd:/Mosport/Mosport-Terminal/frontend/app/data/mockData.ts';
const logosDir = 'd:/Mosport/Mosport-Terminal/frontend/public/logos';

const content = fs.readFileSync(mockDataPath, 'utf8');

// Regex to find abbreviations like abbr: "WHU" or teamAbbr: "WHU"
const abbrRegex = /(?:abbr|teamAbbr):\s*"([^"]+)"/g;
const abbreviations = new Set<string>();
let match;
while ((match = abbrRegex.exec(content)) !== null) {
    abbreviations.add(match[1]);
}

// Map abbreviations to possible logo prefixes
const prefixes = ['mlb', 'nba', 'epl', 'ucl', 'nhl'];
const files = fs.readdirSync(logosDir);

console.log(`Total abbreviations found: ${abbreviations.size}`);
console.log('Checking for missing logos...');

const missing = [];
const aliased: Record<string, string> = {
    "SDP": "SD",
    "WSN": "WSH",
    "WHU": "WHM" // Alias found
};

for (const abbr of abbreviations) {
    const normalized = aliased[abbr] || abbr;
    const lower = normalized.toLowerCase();
    
    let found = false;
    for (const p of prefixes) {
        if (files.includes(`${p}-${lower}.png`)) {
            found = true;
            break;
        }
    }
    
    if (!found) {
        missing.push(abbr);
    }
}

console.log('Missing logos (or missing mapping):');
console.log(JSON.stringify(missing, null, 2));
