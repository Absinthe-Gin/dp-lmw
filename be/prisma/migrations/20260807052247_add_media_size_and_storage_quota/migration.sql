-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "sizeBytes" INTEGER;

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "storageQuotaBytes" DOUBLE PRECISION NOT NULL DEFAULT 1073741824;
