-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "homeSlideIntervalSec" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "HomeSlide" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeSlide_storageKey_key" ON "HomeSlide"("storageKey");

-- CreateIndex
CREATE INDEX "HomeSlide_createdAt_idx" ON "HomeSlide"("createdAt");
