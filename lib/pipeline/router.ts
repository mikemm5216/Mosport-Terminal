import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { CanonicalMatch } from "./types";

const HOT_TTL_LIVE = 60;
const HOT_TTL_TODAY = 86400;
const HOT_TTL_CLOSED = 7200;

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
  };
  return d.toLocaleDateString("en-CA", opts) === now.toLocaleDateString("en-CA", opts);
}

function isHistorical(dateStr: string): boolean {
  return new Date(dateStr) < new Date(Date.now() - 2 * 60 * 60 * 1000);
}

export function shouldWriteCold(match: CanonicalMatch): boolean {
  return match.status === "closed" || isHistorical(match.startsAt);
}

export function shouldWriteHot(match: CanonicalMatch): boolean {
  return (
    isToday(match.startsAt) ||
    match.status === "live" ||
    match.status === "scheduled"
  );
}

function hotTtl(match: CanonicalMatch): number {
  if (match.status === "live") return HOT_TTL_LIVE;
  if (match.status === "closed") return HOT_TTL_CLOSED;
  return HOT_TTL_TODAY;
}

const DB_STATUS_MAP: Record<string, string> = {
  closed: "finished",
  live: "in_play",
  scheduled: "scheduled",
  postponed: "scheduled",
  cancelled: "scheduled",
};

export async function writeHot(canonical: CanonicalMatch): Promise<void> {
  const matchKey = `hot:match:${canonical.canonicalMatchId}`;
  await redis.set(matchKey, JSON.stringify(canonical), "EX", hotTtl(canonical));

  const dateKey = canonical.startsAt.slice(0, 10);
  const scheduleKey = `hot:schedule:${canonical.league}:${dateKey}`;
  await redis.sadd(scheduleKey, canonical.canonicalMatchId);
  await redis.expire(scheduleKey, HOT_TTL_TODAY);
}

export async function writeCold(canonical: CanonicalMatch, rawRef: string): Promise<void> {
  await prisma.match.update({
    where: { match_id: canonical.canonicalMatchId },
    data: {
      status: DB_STATUS_MAP[canonical.status] ?? canonical.status,
      home_score: canonical.homeScore,
      away_score: canonical.awayScore,
      sourceProvider: canonical.sourceProvider,
      sourceConfidence: canonical.sourceConfidence,
      rawRefs: { push: rawRef },
      sourceUpdatedAt: new Date(),
    },
  });
}

export async function routeCanonical(
  canonical: CanonicalMatch,
  rawRef: string,
): Promise<{ writtenToHot: boolean; writtenToCold: boolean }> {
  const [hot, cold] = await Promise.all([
    shouldWriteHot(canonical) ? writeHot(canonical).then(() => true).catch(() => false) : Promise.resolve(false),
    shouldWriteCold(canonical) ? writeCold(canonical, rawRef).then(() => true).catch(() => false) : Promise.resolve(false),
  ]);

  // Always persist state changes (live/closed) to cold even if not fully historical
  if (!cold && canonical.status !== "scheduled") {
    await writeCold(canonical, rawRef).catch(() => null);
    return { writtenToHot: hot, writtenToCold: true };
  }

  return { writtenToHot: hot, writtenToCold: cold };
}
