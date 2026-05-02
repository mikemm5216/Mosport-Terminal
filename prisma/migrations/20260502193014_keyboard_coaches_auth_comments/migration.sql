-- CreateTable
CREATE TABLE "MosportUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "coachScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MosportUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MosportSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MosportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchComment" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "coachAction" TEXT,
    "targetPlayer" TEXT,
    "confidence" INTEGER,
    "commentText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "sourceContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachDecisionVote" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "coachAction" TEXT,
    "targetPlayer" TEXT,
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachDecisionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataChallengeReport" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "userId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "teamCode" TEXT,
    "playerName" TEXT,
    "currentValue" TEXT,
    "suggestedValue" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "DataChallengeReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MosportUser_email_key" ON "MosportUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MosportSession_tokenHash_key" ON "MosportSession"("tokenHash");

-- CreateIndex
CREATE INDEX "MosportSession_userId_idx" ON "MosportSession"("userId");

-- CreateIndex
CREATE INDEX "MosportSession_expiresAt_idx" ON "MosportSession"("expiresAt");

-- CreateIndex
CREATE INDEX "MatchComment_matchId_idx" ON "MatchComment"("matchId");

-- CreateIndex
CREATE INDEX "MatchComment_userId_idx" ON "MatchComment"("userId");

-- CreateIndex
CREATE INDEX "MatchComment_createdAt_idx" ON "MatchComment"("createdAt");

-- CreateIndex
CREATE INDEX "CoachDecisionVote_matchId_idx" ON "CoachDecisionVote"("matchId");

-- CreateIndex
CREATE INDEX "CoachDecisionVote_userId_idx" ON "CoachDecisionVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachDecisionVote_matchId_userId_key" ON "CoachDecisionVote"("matchId", "userId");

-- CreateIndex
CREATE INDEX "DataChallengeReport_matchId_idx" ON "DataChallengeReport"("matchId");

-- CreateIndex
CREATE INDEX "DataChallengeReport_userId_idx" ON "DataChallengeReport"("userId");

-- CreateIndex
CREATE INDEX "DataChallengeReport_reportType_idx" ON "DataChallengeReport"("reportType");

-- CreateIndex
CREATE INDEX "DataChallengeReport_status_idx" ON "DataChallengeReport"("status");

-- AddForeignKey
ALTER TABLE "MosportSession" ADD CONSTRAINT "MosportSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MosportUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchComment" ADD CONSTRAINT "MatchComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MosportUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachDecisionVote" ADD CONSTRAINT "CoachDecisionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MosportUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataChallengeReport" ADD CONSTRAINT "DataChallengeReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MosportUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
