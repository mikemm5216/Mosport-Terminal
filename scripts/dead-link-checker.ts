import { PrismaClient } from '@prisma/client';
import https from 'https';

const prisma = new PrismaClient();

const checkStatus = (url: string) => {
    return new Promise((resolve) => {
        https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                checkStatus(res.headers.location as string).then(resolve);
            } else {
                resolve(res.statusCode);
            }
        }).on('error', () => resolve(500)).end();
    });
};

async function main() {
    const teams = await prisma.teams.findMany();
    console.log(`[DEAD LINK CHECKER] Scanning ${teams.length} teams...`);

    let deadCount = 0;
    for (const t of teams) {
        if (!t.logo_url) continue;
        const cdnUrl = t.logo_url.includes('||') ? t.logo_url.split('||')[1] : t.logo_url;
        if (!cdnUrl.startsWith('http')) continue;

        const status = await checkStatus(cdnUrl);

        if (status !== 200) {
            console.log(`[404 DETECTED] ${t.short_name} (${t.full_name}) -> ${cdnUrl}`);
            deadCount++;
        }
    }

    console.log(`[DEAD LINK CHECKER COMPLETE] Found ${deadCount} dead links.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
