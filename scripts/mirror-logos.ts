import fs from 'fs';
import path from 'path';
import https from 'https';

const getUrls = () => {
    const list: any[] = [];
    const nba = ['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW', 'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK', 'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'];
    nba.forEach(id => {
        let espnId = id.toLowerCase();
        if (id === 'UTA') espnId = 'utah';
        if (id === 'NOP') espnId = 'no';
        list.push({ prefix: 'nba', id, url: `https://a.espncdn.com/i/teamlogos/nba/500/${espnId}.png` });
    });

    const mlb = ['ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CHW', 'CIN', 'CLE', 'COL', 'DET', 'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK', 'PHI', 'PIT', 'SD', 'SEA', 'SF', 'STL', 'TB', 'TEX', 'TOR', 'WAS'];
    mlb.forEach(id => list.push({ prefix: 'mlb', id, url: `https://a.espncdn.com/i/teamlogos/mlb/500/${id.toLowerCase()}.png` }));

    const eplMap: Record<string, string> = { 'ARS': '359', 'AST': '362', 'BOU': '349', 'BRE': '337', 'BHA': '331', 'CHE': '363', 'CRY': '384', 'EVE': '368', 'FUL': '370', 'IPS': '394', 'LEI': '375', 'LIV': '364', 'MCI': '382', 'MUN': '360', 'NEW': '361', 'NFO': '393', 'SOU': '376', 'TOT': '367', 'WHU': '371', 'WOL': '380' };
    Object.entries(eplMap).forEach(([id, espnId]) => list.push({ prefix: 'epl', id, url: `https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png` }));

    return list;
};

const downloadImage = (url: string, filepath: string) => {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath)).on('error', reject).once('close', () => resolve(filepath));
            } else if (res.statusCode === 301 || res.statusCode === 302) {
                downloadImage(res.headers.location as string, filepath).then(resolve).catch(reject);
            } else {
                res.resume();
                reject(new Error(`Status ${res.statusCode} for ${url}`));
            }
        });
    });
};

async function mirrorAssets() {
    const outDir = path.join(process.cwd(), 'public', 'logos');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const downloadList = getUrls();
    console.log(`[MIRROR] Fetching ${downloadList.length} HD Logos from ESPN CDN...`);

    let success = 0;
    for (const item of downloadList) {
        const filename = `${item.prefix}_${item.id.toLowerCase()}.png`;
        const filepath = path.join(outDir, filename);

        try {
            await downloadImage(item.url, filepath);
            console.log(`[+] Downloaded: ${filename}`);
            success++;
        } catch (e: any) {
            console.error(`[-] Failed ${filename}: ${e.message}`);
        }
    }
    console.log(`[MIRROR COMPLETE] ${success}/${downloadList.length} assets cold stored.`);
}

mirrorAssets().catch(console.error);
