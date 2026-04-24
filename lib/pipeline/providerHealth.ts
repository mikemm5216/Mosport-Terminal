import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import {
  DataProvider,
  LeagueCode,
  ProviderHealth,
  ProviderStatus,
  DEGRADED_THRESHOLD,
  DOWN_THRESHOLD,
} from "./types";

const HEALTH_CACHE_TTL = 300; // 5 min Redis cache

function healthKey(provider: DataProvider, league: LeagueCode): string {
  return `hot:provider-health:${provider}:${league}`;
}

function deriveStatus(failureCount: number): ProviderStatus {
  if (failureCount >= DOWN_THRESHOLD) return "down";
  if (failureCount >= DEGRADED_THRESHOLD) return "degraded";
  return "healthy";
}

export async function recordSuccess(
  provider: DataProvider,
  league: LeagueCode,
  latencyMs: number,
): Promise<void> {
  const now = new Date();

  await prisma.providerHealth.upsert({
    where: { provider_league: { provider, league } },
    update: {
      status: "healthy",
      lastSuccessAt: now,
      failureCount: 0,
      latencyMs,
    },
    create: {
      provider,
      league,
      status: "healthy",
      lastSuccessAt: now,
      failureCount: 0,
      latencyMs,
    },
  });

  const health: ProviderHealth = {
    provider,
    league,
    status: "healthy",
    lastSuccessAt: now.toISOString(),
    lastFailureAt: null,
    failureCount: 0,
    latencyMs,
  };
  await redis.set(healthKey(provider, league), JSON.stringify(health), "EX", HEALTH_CACHE_TTL);
}

export async function recordFailure(
  provider: DataProvider,
  league: LeagueCode,
): Promise<ProviderStatus> {
  const now = new Date();

  const updated = await prisma.providerHealth.upsert({
    where: { provider_league: { provider, league } },
    update: {
      lastFailureAt: now,
      failureCount: { increment: 1 },
    },
    create: {
      provider,
      league,
      lastFailureAt: now,
      failureCount: 1,
    },
  });

  const status = deriveStatus(updated.failureCount);

  await prisma.providerHealth.update({
    where: { id: updated.id },
    data: { status },
  });

  const health: ProviderHealth = {
    provider,
    league,
    status,
    lastSuccessAt: updated.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: now.toISOString(),
    failureCount: updated.failureCount,
    latencyMs: updated.latencyMs ?? null,
  };
  await redis.set(healthKey(provider, league), JSON.stringify(health), "EX", HEALTH_CACHE_TTL);

  return status;
}

export async function getHealth(
  provider: DataProvider,
  league: LeagueCode,
): Promise<ProviderHealth | null> {
  const cached = await redis.get(healthKey(provider, league));
  if (cached) return JSON.parse(cached) as ProviderHealth;

  const row = await prisma.providerHealth.findUnique({
    where: { provider_league: { provider, league } },
  });
  if (!row) return null;

  return {
    provider: row.provider as DataProvider,
    league: row.league as LeagueCode,
    status: row.status as ProviderStatus,
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: row.lastFailureAt?.toISOString() ?? null,
    failureCount: row.failureCount,
    latencyMs: row.latencyMs ?? null,
  };
}

export async function getAllHealth(): Promise<ProviderHealth[]> {
  const rows = await prisma.providerHealth.findMany();
  return rows.map((row) => ({
    provider: row.provider as DataProvider,
    league: row.league as LeagueCode,
    status: row.status as ProviderStatus,
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: row.lastFailureAt?.toISOString() ?? null,
    failureCount: row.failureCount,
    latencyMs: row.latencyMs ?? null,
  }));
}
