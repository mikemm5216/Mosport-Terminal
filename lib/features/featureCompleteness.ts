import type { FeatureStatus } from "../../types/features";

export type FeatureCompletenessResult = {
  present: string[];
  missing: string[];
  completenessScore: number;
  status: FeatureStatus;
};

export function calculateFeatureCompleteness(
  requiredKeys: string[],
  featureObject: Record<string, unknown>,
  thresholds: { ready: number; partial: number } = { ready: 0.75, partial: 0.4 }
): FeatureCompletenessResult {
  const present = requiredKeys.filter((key) => {
    const value = featureObject[key];
    if (value === null || value === undefined) return false;
    if (typeof value === "number") return Number.isFinite(value);
    return true;
  });

  const missing = requiredKeys.filter((key) => !present.includes(key));
  const completenessScore = requiredKeys.length === 0 ? 0 : present.length / requiredKeys.length;

  let status: FeatureStatus = "MISSING";
  if (completenessScore >= thresholds.ready) status = "READY";
  else if (completenessScore >= thresholds.partial) status = "PARTIAL";

  return { present, missing, completenessScore, status };
}
