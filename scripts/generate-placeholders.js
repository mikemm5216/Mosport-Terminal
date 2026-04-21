const fs = require('fs');
const path = require('path');

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

// Copy-paste from teamMeta.ts temporarily to avoid import hell
const logos = [
    "/logos/nba/atl.png", "/logos/nba/bos.png", "/logos/nba/bkn.png", "/logos/nba/cha.png", "/logos/nba/chi.png",
    "/logos/nba/cle.png", "/logos/nba/dal.png", "/logos/nba/den.png", "/logos/nba/det.png", "/logos/nba/gsw.png",
    "/logos/nba/hou.png", "/logos/nba/ind.png", "/logos/nba/lac.png", "/logos/nba/lal.png", "/logos/nba/mem.png",
    "/logos/nba/mia.png", "/logos/nba/mil.png", "/logos/nba/min.png", "/logos/nba/nop.png", "/logos/nba/nyk.png",
    "/logos/nba/okc.png", "/logos/nba/orl.png", "/logos/nba/phi.png", "/logos/nba/phx.png", "/logos/nba/por.png",
    "/logos/nba/sac.png", "/logos/nba/sas.png", "/logos/nba/tor.png", "/logos/nba/uta.png", "/logos/nba/was.png",

    "/logos/mlb/ari.png", "/logos/mlb/atl.png", "/logos/mlb/bal.png", "/logos/mlb/bos.png", "/logos/mlb/chc.png",
    "/logos/mlb/cws.png", "/logos/mlb/cin.png", "/logos/mlb/cle.png", "/logos/mlb/col.png", "/logos/mlb/det.png",
    "/logos/mlb/hou.png", "/logos/mlb/kc.png", "/logos/mlb/laa.png", "/logos/mlb/lad.png", "/logos/mlb/mia.png",
    "/logos/mlb/mil.png", "/logos/mlb/min.png", "/logos/mlb/nym.png", "/logos/mlb/nyy.png", "/logos/mlb/oak.png",
    "/logos/mlb/phi.png", "/logos/mlb/pit.png", "/logos/mlb/sd.png", "/logos/mlb/sea.png", "/logos/mlb/sf.png",
    "/logos/mlb/stl.png", "/logos/mlb/tb.png", "/logos/mlb/tex.png", "/logos/mlb/tor.png", "/logos/mlb/was.png",

    "/logos/epl/ars.png", "/logos/epl/avl.png", "/logos/epl/bha.png", "/logos/epl/bou.png", "/logos/epl/bre.png",
    "/logos/epl/bur.png", "/logos/epl/che.png", "/logos/epl/cry.png", "/logos/epl/eve.png", "/logos/epl/ful.png",
    "/logos/epl/ips.png", "/logos/epl/lee.png", "/logos/epl/lei.png", "/logos/epl/liv.png", "/logos/epl/mci.png",
    "/logos/epl/mun.png", "/logos/epl/new.png", "/logos/epl/nfo.png", "/logos/epl/sou.png", "/logos/epl/tot.png",
    "/logos/epl/whu.png", "/logos/epl/wol.png"
];

const main = () => {
    console.log("--- Generating Missing Logo Placeholders ---");
    const baseDir = process.cwd();

    logos.forEach(logoPath => {
        const fullPath = path.join(baseDir, 'public', logoPath);
        const dir = path.dirname(fullPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(fullPath)) {
            fs.writeFileSync(fullPath, PNG_1X1);
            console.log(`[CREATED] Placeholder: ${logoPath}`);
        } else {
            console.log(`[EXISTS ] Logo: ${logoPath}`);
        }
    });

    console.log("--- Done ---");
};

main();
