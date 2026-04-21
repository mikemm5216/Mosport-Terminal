import fs from 'fs';
import path from 'path';

const LOGO_DIR = path.join(process.cwd(), 'public/logos');

const MAPPINGS = {
    // EPL
    'che.png': 'epl_che.png',
    'mci.png': 'epl_mnc.png',
    'ars.png': 'epl_ars.png',
    'mun.png': 'epl_mun.png',
    'liv.png': 'epl_liv.png',
    'tot.png': 'epl_tot.png',
    'avl.png': 'epl_avl.png',
    'bur.png': 'epl_bur.png',
    'bha.png': 'epl_bha.png',
    'bou.png': 'epl_bou.png',
    'bre.png': 'epl_bre.png',
    'cry.png': 'epl_cry.png',
    'eve.png': 'epl_eve.png',
    'ful.png': 'epl_ful.png',
    'ips.png': 'epl_ips.png',
    'lei.png': 'epl_lei.png',
    'new.png': 'epl_new.png',
    'nfo.png': 'epl_nfo.png',
    'sou.png': 'epl_sou.png',
    'whu.png': 'epl_whu.png',
    'wol.png': 'epl_wol.png',
    // MLB
    'oak.png': 'mlb_ath.png',
    'ari.png': 'mlb_ari.png',
    'atl.png': 'mlb_atl.png',
    'bal.png': 'mlb_bal.png',
    'bos.png': 'mlb_bos.png',
    'chc.png': 'mlb_chc.png',
    'chw.png': 'mlb_chw.png',
    'cin.png': 'mlb_cin.png',
    'cle.png': 'mlb_cle.png',
    'col.png': 'mlb_col.png',
    'det.png': 'mlb_det.png',
    'hou.png': 'mlb_hou.png',
    'kc.png': 'mlb_kc.png',
    'laa.png': 'mlb_laa.png',
    'lad.png': 'mlb_lad.png',
    'mia.png': 'mlb_mia.png',
    'mil.png': 'mlb_mil.png',
    'min.png': 'mlb_min.png',
    'nym.png': 'mlb_nym.png',
    'nyy.png': 'mlb_nyy.png',
    'phi.png': 'mlb_phi.png',
    'pit.png': 'mlb_pit.png',
    'sd.png': 'mlb_sd.png',
    'sea.png': 'mlb_sea.png',
    'sf.png': 'mlb_sf.png',
    'stl.png': 'mlb_stl.png',
    'tb.png': 'mlb_tb.png',
    'tex.png': 'mlb_tex.png',
    'tor.png': 'mlb_tor.png',
    'was.png': 'mlb_was.png',
    // NBA
    'bkn.png': 'nba_bkn.png',
    'chi.png': 'nba_chi.png',
    'dal.png': 'nba_dal.png',
    'den.png': 'nba_den.png',
    'gsw.png': 'nba_gsw.png',
    'ind.png': 'nba_ind.png',
    'lac.png': 'nba_lac.png',
    'lal.png': 'nba_lal.png',
    'mem.png': 'nba_mem.png',
    'okc.png': 'nba_okc.png',
    'orl.png': 'nba_orl.png',
    'phx.png': 'nba_phx.png',
    'por.png': 'nba_por.png',
    'sac.png': 'nba_sac.png',
    'sas.png': 'nba_sas.png',
    'utah.png': 'nba_uta.png',
    'nop.png': 'nba_nop.png',
    'cha.png': 'nba_cha.png',
    'atl.png': 'nba_atl.png',
    'bos.png': 'nba_bos.png',
    'cle.png': 'nba_cle.png',
    'det.png': 'nba_det.png',
    'hou.png': 'nba_hou.png',
    'mia.png': 'nba_mia.png',
    'mil.png': 'nba_mil.png',
    'min.png': 'nba_min.png',
    'nyk.png': 'nba_nyk.png',
    'phi.png': 'nba_phi.png',
    'tor.png': 'nba_tor.png',
    'was.png': 'nba_was.png',
};

async function sync() {
    console.log('--- ASSET SYNC START ---');
    for (const [src, dest] of Object.entries(MAPPINGS)) {
        const srcPath = path.join(LOGO_DIR, src);
        const destPath = path.join(LOGO_DIR, dest);

        if (fs.existsSync(srcPath)) {
            if (!fs.existsSync(destPath)) {
                console.log(`Copying ${src} -> ${dest}`);
                fs.copyFileSync(srcPath, destPath);
            }
        } else {
            console.warn(`[MISSING_SOURCE] ${src}`);
        }
    }
}

sync().catch(console.error);
