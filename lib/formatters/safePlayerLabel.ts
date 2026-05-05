import { playerTeamGuard } from "../guards/playerTeamGuard";

export function getSafePlayerLabel(
  player: { fullName: string, teamId?: string | null, position?: string | null },
  team: { team_id: string },
  sport: string
): string {
  if (!playerTeamGuard(player, team)) {
    return getNeutralPlaceholder(sport, player.position);
  }
  return player.fullName;
}

function getNeutralPlaceholder(sport: string, position?: string | null): string {
  const s = sport.toUpperCase();
  if (s === "BASKETBALL" || s === "NBA") {
    if (position?.includes("G")) return "Rotation Guard";
    if (position?.includes("F")) return "Key Forward";
    if (position?.includes("C")) return "Defensive Anchor";
    return "Primary Scorer";
  }
  if (s === "BASEBALL" || s === "MLB") {
    if (position === "P") return "Starting Pitcher";
    return "Power Bat";
  }
  if (s === "SOCCER" || s === "FOOTBALL" || s === "EPL") {
    if (position === "GK") return "Keeper";
    return "Midfield Creator";
  }
  return "Key Player";
}
