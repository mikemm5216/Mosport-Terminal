export function calculateFeatureCompleteness(
  requiredKeys: string[],
  featureObject: Record<string, unknown>
): {
  present: string[];
  missing: string[];
  completenessScore: number;
  status: "READY" | "PARTIAL" | "MISSING";
} {
  const present = requiredKeys.filter((key) => {
    const value = featureObject[key];
    // 禁止使用 value || 0 判定，必須嚴格檢查 null/undefined
    return value !== null && value !== undefined && Number.isFinite(value as number);
  });

  const missing = requiredKeys.filter((key) => !present.includes(key));
  const completenessScore = requiredKeys.length === 0 ? 0 : present.length / requiredKeys.length;

  let status: "READY" | "PARTIAL" | "MISSING" = "MISSING";
  if (completenessScore >= 0.7) status = "READY";
  else if (completenessScore >= 0.4) status = "PARTIAL";

  return { present, missing, completenessScore, status };
}
