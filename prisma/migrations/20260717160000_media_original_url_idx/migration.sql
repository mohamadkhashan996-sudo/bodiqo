-- MediaAsset lookups by originalUrl (private media route)
CREATE INDEX IF NOT EXISTS "MediaAsset_originalUrl_idx" ON "MediaAsset"("originalUrl");
