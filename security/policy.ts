export const SECURITY_POLICY = {
  maxTokenAgeDays: 90,
  requireFineGrainedGithubToken: true,
  forbidClassicPAT: true,
  forbidSecretsInFrontend: true,
  requireApiKeyForInternalRoutes: true,
  requireRateLimit: true,
  requireSentry: true,

  aiAgent: {
    allowDirectProductionMutation: false,
    allowAutoPR: true,
    allowAutoDeploy: false,
    requireHumanApprovalFor: [
      "delete-secret",
      "rotate-production-secret",
      "change-github-permission",
      "deploy-production",
    ],
  },
} as const;
