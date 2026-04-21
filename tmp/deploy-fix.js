const fs = require('fs');
const path = require('path');

async function deploy() {
  const assets = [
    { name: 'lad.png', url: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' },
    { name: 'sd.png', url: 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png' },
    { name: 'bkn.png', url: 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png' },
    { name: 'ny.png', url: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png' }
  ];

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  for (const asset of assets) {
    process.stdout.write(`Downloading ${asset.name}... `);
    try {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(path.join(publicDir, asset.name), buffer);
      console.log(`Saved (${buffer.length} bytes)`);
    } catch (e) {
      console.error(`Failed ${asset.name}: ${e.message}`);
    }
  }
}

deploy();
