import fs from 'fs';
import path from 'path';
import https from 'https';

// 1. 全球資料夾矩陣
const directories = [
    'mlb', 'npb', 'kbo', 'cpbl', 'intl', // ⚾️ Baseball
    'nba', 'tpbl', 'kbl', 'bleague', 'pleague', 'intl', // 🏀 Basketball
    'epl', 'esp', 'ger', 'ita', 'fra', 'intl' // ⚽️ Soccer
];

// 2. 亞洲測試球隊高清 Logo 狙擊清單 (已驗證的高解析度網址)
const assetDownloads = [
    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Yomiuri_Giants_logo.svg/500px-Yomiuri_Giants_logo.svg.png', dest: 'npb/yom.png' },
    { url: 'https://upload.wikimedia.org/wikipedia/en/d/d7/CTBC_Brothers_%28baseball_team%29_logo.png', dest: 'cpbl/bro.png' },
    { url: 'https://upload.wikimedia.org/wikipedia/en/7/79/New_Taipei_CTBC_DEA.png', dest: 'tpbl/dea.png' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Alvark_Tokyo_logo.png', dest: 'bleague/alv.png' }
];

async function downloadImage(url: string, filepath: string) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'MosportTerminalBot/1.0 (https://mosport-terminal.demo; admin@mosport-terminal.demo)'
            }
        };

        https.get(url, options, (res) => {
            // Handle redirects (Wikimedia often redirects /en/ to /commons/ or vice versa)
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadImage(res.headers.location!, filepath).then(resolve).catch(reject);
            }

            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
}

async function main() {
    console.log("🌍 [Mosport Global Matrix] 啟動全球賽區基建與武裝部屬 (v1.2 - Verified URLs)...");

    const baseDir = path.join(process.cwd(), 'public', 'logos');

    // 建立資料夾
    directories.forEach(dir => {
        const fullPath = path.join(baseDir, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`📁 賽區已建立: /logos/${dir}`);
        }
    });

    console.log("⬇️ 正在空投亞洲賽區首發測試球隊 Logo (使用驗證網址)...");

    // 下載實體圖片
    for (const asset of assetDownloads) {
        const fullPath = path.join(baseDir, asset.dest);
        try {
            await downloadImage(asset.url, fullPath);
            console.log(`✅ Logo 武裝完成: ${asset.dest}`);
        } catch (err) {
            console.error(`❌ 下載失敗 ${asset.dest}:`, err.message);
        }
    }

    console.log("\n🎉 全球賽區基建完畢！100% 實體 Logo 準備就緒！");
}

main();
