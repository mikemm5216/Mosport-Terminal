import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeagueType } from "@prisma/client";

export async function GET() {
  try {
    // 1. Create TEAMS (Upsert to ensure idempotency)
    const teamsData = [
      {
        short_name: "LAD",
        full_name: "Los Angeles Dodgers",
        logo_url: "https://a.espncdn.com/i/teamlogos/mlb/500/lad.png",
        league_type: LeagueType.MLB,
      },
      {
        short_name: "BKN",
        full_name: "Brooklyn Nets",
        logo_url: "https://a.espncdn.com/i/teamlogos/nba/500/bkn.png",
        league_type: LeagueType.NBA,
      },
      {
        short_name: "WHU",
        full_name: "West Ham United",
        logo_url: "https://a.espncdn.com/i/teamlogos/soccer/500/11.png",
        league_type: LeagueType.SOCCER,
      },
    ];

    const teams = await Promise.all(
      teamsData.map((team) =>
        prisma.teams.upsert({
          where: { full_name: team.full_name },
          update: team,
          create: team,
        })
      )
    );

    const lad = teams.find((t: any) => t.short_name === "LAD")!;
    const bkn = teams.find((t: any) => t.short_name === "BKN")!;
    const whu = teams.find((t: any) => t.short_name === "WHU")!;

    // 2. Create PLAYERS and connect to TEAMS via Roster
    const playersData = [
      {
        first_name: "Shohei",
        last_name: "Ohtani",
        display_name: "Shohei Ohtani",
        position_main: "DH/P",
        team_id: lad.team_id,
      },
      {
        first_name: "Cam",
        last_name: "Thomas",
        display_name: "Cam Thomas",
        position_main: "G",
        team_id: bkn.team_id,
      },
      {
        first_name: "Jarrod",
        last_name: "Bowen",
        display_name: "Jarrod Bowen",
        position_main: "F",
        team_id: whu.team_id,
      },
    ];

    for (const p of playersData) {
      let player = await prisma.player.findFirst({
        where: { display_name: p.display_name },
      });

      if (player) {
        player = await prisma.player.update({
          where: { player_id: player.player_id },
          data: {
            first_name: p.first_name,
            last_name: p.last_name,
            position_main: p.position_main,
          },
        });
      } else {
        player = await prisma.player.create({
          data: {
            first_name: p.first_name,
            last_name: p.last_name,
            display_name: p.display_name,
            position_main: p.position_main,
          },
        });
      }

      // Connect to Roster for 2025
      const rosterWhere = {
        player_id_team_id_season_year: {
          player_id: player.player_id,
          team_id: p.team_id,
          season_year: 2025,
        },
      };

      await prisma.roster.upsert({
        where: rosterWhere,
        update: {},
        create: {
          player_id: player.player_id,
          team_id: p.team_id,
          season_year: 2025,
        },
      });
    }

    return NextResponse.json({ message: "MOSPORT 2.0 ALIVE: Genesis Data Injected!" });
  } catch (error) {
    console.error("Genesis Seeding Error:", error);
    return NextResponse.json(
      { error: "Genesis Protocol Failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
