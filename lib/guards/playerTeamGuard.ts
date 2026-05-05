export function playerTeamGuard(player: { teamId?: string | null }, team: { team_id: string }): boolean {
  if (!player.teamId || player.teamId !== team.team_id) {
    return false;
  }
  return true;
}
