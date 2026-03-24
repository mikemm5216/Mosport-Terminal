import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // 1. Fetch Real Team IDs
    const ladTeam = await prisma.teams.findFirst({ where: { short_name: 'LAD' } });
    const bknTeam = await prisma.teams.findFirst({ where: { short_name: 'BKN' } });

    if (!ladTeam || !bknTeam) {
      throw new Error("LAD or BKN team not found. Run Genesis injection first.");
    }

    // 2. Inject Shohei Ohtani (LAD)
    const ohtani = await prisma.player.upsert({
      where: { player_id: 'P_OHTANI_GENESIS' },
      update: {
        first_name: "Shohei",
        last_name: "Ohtani",
        display_name: "Shohei Ohtani",
        position_main: "SP/DH",
        stats_mlb: {
          upsert: {
            create: { avg: 0.310, hr: 54, rbi: 130, era: 3.14, w: 15, so: 167 },
            update: { avg: 0.310, hr: 54, rbi: 130, era: 3.14, w: 15, so: 167 }
          }
        }
      },
      create: {
        player_id: 'P_OHTANI_GENESIS',
        first_name: "Shohei",
        last_name: "Ohtani",
        display_name: "Shohei Ohtani",
        position_main: "SP/DH",
        stats_mlb: {
          create: { avg: 0.310, hr: 54, rbi: 130, era: 3.14, w: 15, so: 167 }
        }
      }
    });

    await prisma.roster.upsert({
      where: { player_id_team_id_season_year: { player_id: ohtani.player_id, team_id: ladTeam.team_id, season_year: 2026 } },
      update: { jersey_number: "17" },
      create: {
        player_id: ohtani.player_id,
        team_id: ladTeam.team_id,
        season_year: 2026,
        jersey_number: "17"
      }
    });

    // 3. Inject Nic Claxton (BKN)
    const clax = await prisma.player.upsert({
      where: { player_id: 'P_CLAXTON_GENESIS' },
      update: {
        first_name: "Nic",
        last_name: "Claxton",
        display_name: "Nic Claxton",
        position_main: "C",
        stats_nba: {
          upsert: {
            create: { pts: 11.8, reb: 7.1, ast: 3.8 },
            update: { pts: 11.8, reb: 7.1, ast: 3.8 }
          }
        }
      },
      create: {
        player_id: 'P_CLAXTON_GENESIS',
        first_name: "Nic",
        last_name: "Claxton",
        display_name: "Nic Claxton",
        position_main: "C",
        stats_nba: {
          create: { pts: 11.8, reb: 7.1, ast: 3.8 }
        }
      }
    });

    await prisma.roster.upsert({
      where: { player_id_team_id_season_year: { player_id: clax.player_id, team_id: bknTeam.team_id, season_year: 2026 } },
      update: { jersey_number: "33" },
      create: {
        player_id: clax.player_id,
        team_id: bknTeam.team_id,
        season_year: 2026,
        jersey_number: "33"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Star Players (Ohtani & Claxton) Injected Successfully",
      roster_year: 2026
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
