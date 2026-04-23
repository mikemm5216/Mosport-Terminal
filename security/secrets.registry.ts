export type SecretOwner =
  | "frontend"
  | "api"
  | "crawler"
  | "ci"
  | "security-agent";

export type SecretRisk = "low" | "medium" | "high" | "critical";

export const SECRET_REGISTRY = [
  {
    name: "GITHUB_API_TOKEN",
    owner: "api" as SecretOwner,
    platform: "vercel",
    risk: "medium" as SecretRisk,
    rotationDays: 90,
    required: true,
  },
  {
    name: "CRAWLER_TOKEN",
    owner: "crawler" as SecretOwner,
    platform: "vercel",
    risk: "high" as SecretRisk,
    rotationDays: 60,
    required: true,
  },
  {
    name: "MOSPORT_INTERNAL_API_KEY",
    owner: "api" as SecretOwner,
    platform: "vercel",
    risk: "high" as SecretRisk,
    rotationDays: 60,
    required: true,
  },
  {
    name: "SENTRY_DSN",
    owner: "api" as SecretOwner,
    platform: "vercel",
    risk: "low" as SecretRisk,
    rotationDays: 180,
    required: false,
  },
] as const;
