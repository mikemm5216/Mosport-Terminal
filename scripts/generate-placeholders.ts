import fs from 'fs';
import path from 'path';
import { TEAM_META } from '../src/config/teamMeta';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function main() {
    console.log("--- Generating Missing Logo Placeholders ---");

    for (const [code, meta] of Object.entries(TEAM_META)) {
        const filePath = path.join(process.cwd(), 'public', meta.logo);
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, PNG_1X1);
            console.log(`[CREATED] Placeholder for ${code} -> ${meta.logo}`);
        } else {
            console.log(`[EXISTS ] Logo for ${code} -> ${meta.logo}`);
        }
    }

    console.log("--- Done ---");
}

main().catch(console.error);
