/*
  Warnings:

  - You are about to drop the `candidate_waitlist` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "candidate_waitlist" DROP CONSTRAINT "candidate_waitlist_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "candidate_waitlist" DROP CONSTRAINT "candidate_waitlist_job_id_fkey";

-- DropTable
DROP TABLE "candidate_waitlist";
