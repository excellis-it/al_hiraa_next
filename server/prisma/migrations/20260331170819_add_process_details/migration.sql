-- CreateTable
CREATE TABLE "process_details" (
    "id" SERIAL NOT NULL,
    "candidate_job_id" INTEGER NOT NULL,
    "year_of_selection" INTEGER,
    "date_of_interview" DATE,
    "date_of_selection" DATE,
    "selection_month" VARCHAR(50),
    "mode_of_selection" VARCHAR(100),
    "interview_location" VARCHAR(200),
    "client_remark" VARCHAR(500),
    "vendor" VARCHAR(200),
    "sponsor" VARCHAR(200),
    "candidate_status" VARCHAR(100),
    "medical_status" VARCHAR(50),
    "medical_app_date" DATE,
    "mofa_number" VARCHAR(100),
    "visa_receiving_date" DATE,
    "visa_issue_date" DATE,
    "visa_expiry_date" DATE,
    "ticket_booking_date" DATE,
    "ticket_confirm_date" DATE,
    "exit_paper_date" DATE,
    "deployment_date" DATE,
    "deployment_month" VARCHAR(50),
    "advance_received" DECIMAL(12,2),
    "exit_setting_payment" DECIMAL(12,2),
    "other_setting_charge" DECIMAL(12,2),
    "total_received_amount" DECIMAL(12,2),
    "total_receivable_amount" DECIMAL(12,2),
    "refund_date" DATE,
    "refund_amount" DECIMAL(12,2),
    "disc_allot" DECIMAL(12,2),
    "family_contact_name" VARCHAR(200),
    "family_contact_phone" VARCHAR(20),
    "candidate_address" TEXT,
    "remarks" TEXT,
    "other_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "process_details_candidate_job_id_key" ON "process_details"("candidate_job_id");

-- AddForeignKey
ALTER TABLE "process_details" ADD CONSTRAINT "process_details_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
