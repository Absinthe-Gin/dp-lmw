-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "perceptualHash" TEXT;

-- CreateTable
CREATE TABLE "IgnoredDuplicateGroup" (
    "id" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgnoredDuplicateGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IgnoredDuplicateGroup_groupKey_key" ON "IgnoredDuplicateGroup"("groupKey");

-- CreateIndex
CREATE INDEX "Media_contentHash_idx" ON "Media"("contentHash");
