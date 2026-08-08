-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "location" TEXT,
    "userAgent" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessLog_visitorId_idx" ON "AccessLog"("visitorId");

-- CreateIndex
CREATE INDEX "AccessLog_lastSeenAt_idx" ON "AccessLog"("lastSeenAt");
