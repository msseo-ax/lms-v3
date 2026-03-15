-- AlterTable
ALTER TABLE "contents"
  ADD COLUMN "min_duration_seconds" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "require_file_access"  BOOLEAN NOT NULL DEFAULT false;

-- Backfill: min duration based on body text length
UPDATE "contents"
SET "min_duration_seconds" = LEAST(300, GREATEST(10, (LENGTH(COALESCE("body", '')) / 100) * 10));

-- Backfill: require file access when content has files
UPDATE "contents"
SET "require_file_access" = true
WHERE EXISTS (
  SELECT 1 FROM "content_files" WHERE "content_files"."content_id" = "contents"."id"
);
