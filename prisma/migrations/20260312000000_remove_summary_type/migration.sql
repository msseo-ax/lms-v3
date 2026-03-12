DROP INDEX "contents_created_at_idx";

ALTER TABLE "contents" DROP COLUMN "summary_type";

DROP TYPE "SummaryType";

CREATE INDEX "contents_created_at_idx" ON "contents"("created_at");
