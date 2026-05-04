-- CreateTable
CREATE TABLE "LeagueProjectionSnapshot" (
    "id" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataCutoff" TIMESTAMP(3) NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "dataStatus" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "projectedChampion" JSONB NOT NULL,
    "titleDistribution" JSONB NOT NULL,
    "finalsMatchup" JSONB,
    "bracketState" JSONB,
    "warnings" TEXT[],
    "refreshReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueProjectionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueProjectionSnapshot_snapshotId_key" ON "LeagueProjectionSnapshot"("snapshotId");

-- CreateIndex
CREATE INDEX "LeagueProjectionSnapshot_league_generatedAt_idx" ON "LeagueProjectionSnapshot"("league", "generatedAt");
