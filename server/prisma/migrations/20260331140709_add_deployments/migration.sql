-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('active', 'completed', 'terminated', 'extended');

-- CreateTable
CREATE TABLE "deployments" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "candidate_job_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "position_id" INTEGER NOT NULL,
    "deployment_date" DATE NOT NULL,
    "contract_end_date" DATE NOT NULL,
    "salary_amount" DECIMAL(10,2) NOT NULL,
    "salary_currency" VARCHAR(10) NOT NULL DEFAULT 'SAR',
    "country" "GulfCountry" NOT NULL,
    "visa_number" VARCHAR(50),
    "emergency_contact_name" VARCHAR(200),
    "emergency_contact_phone" VARCHAR(20),
    "status" "DeploymentStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "expiry_notified" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deployments_candidate_id_idx" ON "deployments"("candidate_id");

-- CreateIndex
CREATE INDEX "deployments_status_idx" ON "deployments"("status");

-- CreateIndex
CREATE INDEX "deployments_contract_end_date_idx" ON "deployments"("contract_end_date");

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
