import { SECURITY_POLICY } from "./policy";
import { SECRET_REGISTRY } from "./secrets.registry";

export type SecurityFindingSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type SecurityFinding = {
  id: string;
  severity: SecurityFindingSeverity;
  title: string;
  description: string;
  recommendedAction: string;
  requiresHumanApproval: boolean;
};

export function runSecurityAgent(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const secret of SECRET_REGISTRY) {
    if (secret.risk === "high" || secret.risk === "critical") {
      findings.push({
        id: `secret-risk-${secret.name}`,
        severity: secret.risk,
        title: `High-risk secret detected: ${secret.name}`,
        description: `${secret.name} is classified as ${secret.risk} and must be rotated every ${secret.rotationDays} days.`,
        recommendedAction: `Verify that ${secret.name} exists only in ${secret.platform} and is not exposed to frontend runtime.`,
        requiresHumanApproval: true,
      });
    }
  }

  if (!SECURITY_POLICY.aiAgent.allowDirectProductionMutation) {
    findings.push({
      id: "agent-production-mutation-disabled",
      severity: "info",
      title: "AI agent production mutation disabled",
      description: "The security agent is running in recommendation mode only.",
      recommendedAction: "Keep this setting for production safety.",
      requiresHumanApproval: false,
    });
  }

  return findings;
}
