const fs = require('fs');
const path = require('path');

const mockDataPath = 'd:/Mosport/Mosport-Terminal/frontend/app/data/mockData.ts';
const logosDir = 'd:/Mosport/Mosport-Terminal/frontend/public/logos';

const content = fs.readFileSync(mockDataPath, 'utf8');
const abbrs = new Set([...content.matchAll(/(?:abbr|teamAbbr):\s*"([^"]+)"/g)].map(m => m[1]));

const files = fs.readdirSync(logosDir);
const aliased = {
    'SDP': 'SD',
    'WSN': 'WSH',
    'WHU': 'WHM',
    'HOU_ROCKETS': 'HOU',
    'GSW_WARRIORS': 'GSW'
};

const prefixes = ['mlb', 'nba', 'epl', 'ucl', 'nhl'];
const missing = [];

for (const a of abbrs) {
    const n = aliased[a] || a;
    const l = n.toLowerCase();
    let f = false;
    for (const p of prefixes) {
        if (files.includes(p + '-' + l + '.png')) {
            f = true;
            break;
        }
    }
    if (!f) missing.push(a);
}

console.log(JSON.stringify(missing, null, 2));
