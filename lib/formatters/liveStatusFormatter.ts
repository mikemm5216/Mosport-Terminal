import { LiveStatus } from "../../types/gameStatus";

export function formatLiveStatus(status: LiveStatus, sport: string): string {
  if (status.status !== "live") return status.display;

  const s = sport.toUpperCase();
  if (s === "NBA" || s === "BASKETBALL") {
    return `${status.period || "Q"} ${status.clock || ""}`.trim();
  }
  if (s === "MLB" || s === "BASEBALL") {
    const half = status.inningHalf === "top" ? "Top" : "Bottom";
    return `${half} ${status.inning || "1"}`;
  }
  if (s === "EPL" || s === "SOCCER") {
    const min = status.matchMinute || 0;
    const extra = status.stoppageTime ? `+${status.stoppageTime}` : "";
    return `${min}${extra}'`;
  }
  if (s === "NHL" || s === "HOCKEY") {
    return `${status.period || "P"} ${status.clock || ""}`.trim();
  }
  if (s === "NFL" || s === "FOOTBALL") {
    return `${status.period || "Q"} ${status.clock || ""}`.trim();
  }

  return status.display;
}
