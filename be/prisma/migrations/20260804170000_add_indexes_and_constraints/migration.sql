-- CreateIndex
CREATE INDEX "Album_createdAt_idx" ON "Album"("createdAt");

-- CreateIndex
CREATE INDEX "AlbumMedia_mediaId_idx" ON "AlbumMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- CreateIndex
CREATE INDEX "Media_uploadedAt_idx" ON "Media"("uploadedAt");
