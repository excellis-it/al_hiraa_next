-- AlterEnum
ALTER TYPE "InterviewEventStatus" ADD VALUE 'postponed';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterviewStatus" ADD VALUE 'pending';
ALTER TYPE "InterviewStatus" ADD VALUE 'in_progress';
ALTER TYPE "InterviewStatus" ADD VALUE 'skipped';

-- DropForeignKey
ALTER TABLE "candidates" DROP CONSTRAINT "candidates_position_1_id_fkey";

-- DropForeignKey
ALTER TABLE "candidates" DROP CONSTRAINT "candidates_source_id_fkey";

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "year_sequence" INTEGER,
ALTER COLUMN "position_1_id" DROP NOT NULL,
ALTER COLUMN "registration_mode" DROP NOT NULL,
ALTER COLUMN "source_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "accommodation" BOOLEAN,
ADD COLUMN     "age" VARCHAR(100),
ADD COLUMN     "contract_period" VARCHAR(50);

-- AlterTable
ALTER TABLE "message_templates" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "related_entity_id" VARCHAR(100),
ADD COLUMN     "related_entity_type" VARCHAR(100);

-- CreateTable
CREATE TABLE "job_positions" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "trade_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "salary" DECIMAL(10,2),
    "accommodation" BOOLEAN NOT NULL DEFAULT false,
    "transportation" BOOLEAN NOT NULL DEFAULT false,
    "contract_period" VARCHAR(50),
    "age" VARCHAR(100),
    "positions_filled" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_interview_dates" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_interview_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_venues" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "address" VARCHAR(500),
    "city" VARCHAR(200),
    "phone" VARCHAR(20),
    "google_maps_url" VARCHAR(1000),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_positions_job_id_idx" ON "job_positions"("job_id");

-- CreateIndex
CREATE INDEX "job_positions_trade_id_idx" ON "job_positions"("trade_id");

-- CreateIndex
CREATE INDEX "job_interview_dates_job_id_idx" ON "job_interview_dates"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_venues_name_key" ON "interview_venues"("name");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_1_id_fkey" FOREIGN KEY ("position_1_id") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_interview_dates" ADD CONSTRAINT "job_interview_dates_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
