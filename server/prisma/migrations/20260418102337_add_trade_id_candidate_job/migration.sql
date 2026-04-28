-- AlterTable
ALTER TABLE "candidate_jobs" ADD COLUMN     "trade_id" INTEGER;

-- AddForeignKey
ALTER TABLE "candidate_jobs" ADD CONSTRAINT "candidate_jobs_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
