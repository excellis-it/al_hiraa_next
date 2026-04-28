-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "external_only" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "candidates_external_only_idx" ON "candidates"("external_only");
