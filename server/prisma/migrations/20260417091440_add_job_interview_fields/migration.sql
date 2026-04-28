-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "coordinator_id" TEXT,
ADD COLUMN     "flyer_headline" VARCHAR(500),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "venue_id" INTEGER;
