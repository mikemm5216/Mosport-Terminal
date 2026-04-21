const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
  const teams = await prisma.teams.findMany();
  for (const team of teams) {
    const short = (team.short_name || "").toLowerCase();
    // 🛡️ ENFORCE LOCAL PATH FORMAT
    const localPath = `/${short}.png`;
    
    if (team.logo_url !== localPath) {
      console.log(`Updating ${team.short_name}: ${team.logo_url} -> ${localPath}`);
      await prisma.teams.update({
        where: { team_id: team.team_id },
        data: { logo_url: localPath }
      });
    }
  }
  await prisma.$disconnect();
  console.log("DB Sync Complete.");
}

sync();
