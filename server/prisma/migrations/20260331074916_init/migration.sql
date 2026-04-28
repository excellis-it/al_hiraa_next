-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('data_entry', 'recruiter', 'process_manager', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('active', 'inactive', 'deployed', 'blacklisted');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('complete', 'incomplete');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "EcrType" AS ENUM ('ecr', 'ecnr');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('not_contacted', 'contacted_interested', 'contacted_not_interested', 'contacted_not_reachable', 'contacted_maybe_later', 'lined_up', 'interview_selected', 'interview_rejected', 'interview_on_hold');

-- CreateEnum
CREATE TYPE "ProcessStepStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'on_hold', 'failed');

-- CreateEnum
CREATE TYPE "FailureAction" AS ENUM ('retry', 'release');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'overdue', 'waived');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('open', 'interviews_scheduled', 'in_process', 'closed', 'on_hold');

-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('walk_in', 'phone', 'online', 'referral', 'camp');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('reached', 'voicemail', 'wrong_number', 'line_busy', 'not_reachable', 'switched_off');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('in_person', 'video', 'trade_test', 'combined');

-- CreateEnum
CREATE TYPE "InterviewEventStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('expected', 'arrived', 'no_show', 'late');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('waiting', 'in_interview', 'completed');

-- CreateEnum
CREATE TYPE "InterviewResult" AS ENUM ('selected', 'rejected', 'on_hold', 'pending');

-- CreateEnum
CREATE TYPE "ResultsTiming" AS ENUM ('same_day', 'delayed');

-- CreateEnum
CREATE TYPE "DropoutReason" AS ENUM ('other_offer', 'family_pressure', 'financial_issues', 'medical_unfit', 'visa_rejected', 'salary_mismatch', 'personal_reasons', 'other');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('earned', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "FeeChangeStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AssociateStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "EnglishLevel" AS ENUM ('none', 'basic', 'conversational', 'fluent');

-- CreateEnum
CREATE TYPE "GulfCountry" AS ENUM ('saudi_arabia', 'uae', 'qatar', 'oman', 'kuwait', 'bahrain');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('construction', 'oil_and_gas', 'hospitality', 'manufacturing', 'facilities', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "dob" DATE,
    "whatsapp_no" VARCHAR(20) NOT NULL,
    "alternate_contact" VARCHAR(20),
    "email" VARCHAR(255),
    "gender" "Gender" NOT NULL,
    "passport_no" VARCHAR(20),
    "ecr_type" "EcrType",
    "state_id" INTEGER,
    "city_id" INTEGER,
    "religion" VARCHAR(100),
    "education" VARCHAR(100) NOT NULL,
    "education_other" VARCHAR(200),
    "position_1_id" INTEGER NOT NULL,
    "position_2_id" INTEGER,
    "position_3_id" INTEGER,
    "indian_experience" VARCHAR(200),
    "abroad_experience" VARCHAR(500),
    "indian_driving_license" TEXT[],
    "gulf_driving_license" TEXT[],
    "english_speaking" "EnglishLevel",
    "arabic_speaking" BOOLEAN NOT NULL DEFAULT false,
    "gulf_return" BOOLEAN NOT NULL DEFAULT false,
    "gulf_return_details" TEXT,
    "registration_mode" "RegistrationMode" NOT NULL,
    "source_id" INTEGER NOT NULL,
    "referred_by" VARCHAR(200),
    "associate_id" INTEGER,
    "cv_url" VARCHAR(500),
    "photo_url" VARCHAR(500),
    "status" "CandidateStatus" NOT NULL DEFAULT 'active',
    "completion_status" "CompletionStatus" NOT NULL DEFAULT 'incomplete',
    "is_no_show" BOOLEAN NOT NULL DEFAULT false,
    "no_show_count" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "registered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "country" "GulfCountry" NOT NULL,
    "city" VARCHAR(200),
    "industry" "Industry",
    "contact_person" VARCHAR(200),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "status" "CompanyStatus" NOT NULL DEFAULT 'active',
    "agreement_details" TEXT,
    "agreement_file_url" VARCHAR(500),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "trade_id" INTEGER NOT NULL,
    "positions_required" INTEGER NOT NULL,
    "positions_filled" INTEGER NOT NULL DEFAULT 0,
    "salary_min" DECIMAL(10,2),
    "salary_max" DECIMAL(10,2),
    "salary_currency" VARCHAR(10) NOT NULL DEFAULT 'AED',
    "country" "GulfCountry" NOT NULL,
    "experience_required" TEXT,
    "other_requirements" TEXT,
    "service_fee" DECIMAL(10,2),
    "interview_date_start" DATE,
    "interview_date_end" DATE,
    "interview_type" "InterviewType",
    "job_flyer_url" VARCHAR(500),
    "target_deploy_days" INTEGER NOT NULL DEFAULT 45,
    "actual_first_deploy_date" DATE,
    "status" "JobStatus" NOT NULL DEFAULT 'open',
    "priority" "JobPriority" NOT NULL DEFAULT 'medium',
    "deadline" DATE,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_jobs" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'not_contacted',
    "waitlist_rank" INTEGER,
    "no_show" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to" TEXT,
    "call_notes" TEXT,
    "follow_up_date" DATE,
    "interview_batch" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_tracking" (
    "id" SERIAL NOT NULL,
    "candidate_job_id" INTEGER NOT NULL,
    "step_number" INTEGER NOT NULL,
    "step_name" VARCHAR(100) NOT NULL,
    "status" "ProcessStepStatus" NOT NULL DEFAULT 'not_started',
    "failure_action" "FailureAction",
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "step_data" JSONB,
    "notes" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "candidate_job_id" INTEGER NOT NULL,
    "total_fee" DECIMAL(10,2) NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fee_waiver_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fee_waiver_approved_by" TEXT,
    "due_date" DATE NOT NULL,
    "paid_date" DATE,
    "payment_method" VARCHAR(50),
    "receipt_number" VARCHAR(100),
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "collected_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" SERIAL NOT NULL,
    "candidate_job_id" INTEGER NOT NULL,
    "caller_id" TEXT NOT NULL,
    "call_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "CallOutcome" NOT NULL,
    "notes" TEXT,
    "follow_up_date" DATE,
    "follow_up_reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "call_attempt_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associates" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "location_state" VARCHAR(100),
    "location_city" VARCHAR(100),
    "commission_rate" DECIMAL(10,2) NOT NULL,
    "commission_type" VARCHAR(50) NOT NULL DEFAULT 'per_deployment',
    "status" "AssociateStatus" NOT NULL DEFAULT 'active',
    "password_hash" VARCHAR(255) NOT NULL,
    "bank_account_name" VARCHAR(200),
    "bank_name" VARCHAR(200),
    "bank_account_number" VARCHAR(50),
    "bank_ifsc" VARCHAR(20),
    "total_commission_earned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_commission_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "associates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associate_commissions" (
    "id" SERIAL NOT NULL,
    "associate_id" INTEGER NOT NULL,
    "candidate_job_id" INTEGER NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'earned',
    "earned_date" DATE,
    "paid_date" DATE,
    "payment_reference" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "associate_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_events" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "event_date" DATE NOT NULL,
    "venue_name" VARCHAR(300),
    "venue_address" TEXT,
    "venue_phone" VARCHAR(20),
    "capacity" INTEGER,
    "interviewer_name" VARCHAR(200),
    "interview_type" "InterviewType",
    "candidate_count" INTEGER,
    "results_timing" "ResultsTiming" NOT NULL DEFAULT 'same_day',
    "status" "InterviewEventStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_checkins" (
    "id" SERIAL NOT NULL,
    "interview_event_id" INTEGER NOT NULL,
    "candidate_job_id" INTEGER NOT NULL,
    "checkin_status" "CheckinStatus" NOT NULL DEFAULT 'expected',
    "checkin_time" TIMESTAMP(3),
    "interview_status" "InterviewStatus",
    "result" "InterviewResult",
    "result_notes" TEXT,
    "slot_number" INTEGER,
    "checked_in_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dropouts" (
    "id" SERIAL NOT NULL,
    "candidate_job_id" INTEGER NOT NULL,
    "dropout_stage" VARCHAR(100) NOT NULL,
    "dropout_reason" "DropoutReason" NOT NULL,
    "reason_details" TEXT,
    "replacement_candidate_job_id" INTEGER,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dropouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_waitlist" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "added_by" TEXT NOT NULL,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "promoted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_change_requests" (
    "id" SERIAL NOT NULL,
    "candidate_job_id" INTEGER NOT NULL,
    "requested_by" TEXT NOT NULL,
    "original_fee" DECIMAL(10,2) NOT NULL,
    "requested_fee" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "FeeChangeStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "state_id" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "template_type" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(500),
    "body" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_whatsapp_no_key" ON "candidates"("whatsapp_no");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_passport_no_key" ON "candidates"("passport_no");

-- CreateIndex
CREATE INDEX "candidates_passport_no_idx" ON "candidates"("passport_no");

-- CreateIndex
CREATE INDEX "candidates_whatsapp_no_idx" ON "candidates"("whatsapp_no");

-- CreateIndex
CREATE INDEX "candidates_full_name_idx" ON "candidates"("full_name");

-- CreateIndex
CREATE INDEX "candidates_status_idx" ON "candidates"("status");

-- CreateIndex
CREATE INDEX "candidates_completion_status_idx" ON "candidates"("completion_status");

-- CreateIndex
CREATE INDEX "candidates_created_at_idx" ON "candidates"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_company_id_idx" ON "jobs"("company_id");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- CreateIndex
CREATE INDEX "candidate_jobs_status_idx" ON "candidate_jobs"("status");

-- CreateIndex
CREATE INDEX "candidate_jobs_job_id_idx" ON "candidate_jobs"("job_id");

-- CreateIndex
CREATE INDEX "candidate_jobs_candidate_id_idx" ON "candidate_jobs"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_jobs_candidate_id_job_id_key" ON "candidate_jobs"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "process_tracking_candidate_job_id_idx" ON "process_tracking"("candidate_job_id");

-- CreateIndex
CREATE INDEX "process_tracking_status_idx" ON "process_tracking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "process_tracking_candidate_job_id_step_number_key" ON "process_tracking"("candidate_job_id", "step_number");

-- CreateIndex
CREATE INDEX "payments_candidate_job_id_idx" ON "payments"("candidate_job_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "call_logs_candidate_job_id_idx" ON "call_logs"("candidate_job_id");

-- CreateIndex
CREATE INDEX "call_logs_caller_id_idx" ON "call_logs"("caller_id");

-- CreateIndex
CREATE UNIQUE INDEX "associates_phone_key" ON "associates"("phone");

-- CreateIndex
CREATE INDEX "associate_commissions_associate_id_idx" ON "associate_commissions"("associate_id");

-- CreateIndex
CREATE INDEX "interview_events_job_id_idx" ON "interview_events"("job_id");

-- CreateIndex
CREATE INDEX "interview_events_event_date_idx" ON "interview_events"("event_date");

-- CreateIndex
CREATE INDEX "interview_checkins_interview_event_id_idx" ON "interview_checkins"("interview_event_id");

-- CreateIndex
CREATE INDEX "dropouts_candidate_job_id_idx" ON "dropouts"("candidate_job_id");

-- CreateIndex
CREATE INDEX "candidate_waitlist_job_id_idx" ON "candidate_waitlist"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_waitlist_job_id_candidate_id_key" ON "candidate_waitlist"("job_id", "candidate_id");

-- CreateIndex
CREATE INDEX "fee_change_requests_candidate_job_id_idx" ON "fee_change_requests"("candidate_job_id");

-- CreateIndex
CREATE INDEX "activity_log_entity_type_entity_id_idx" ON "activity_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_log_user_id_idx" ON "activity_log"("user_id");

-- CreateIndex
CREATE INDEX "activity_log_created_at_idx" ON "activity_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "trades_name_key" ON "trades"("name");

-- CreateIndex
CREATE UNIQUE INDEX "states_name_key" ON "states"("name");

-- CreateIndex
CREATE INDEX "cities_state_id_idx" ON "cities"("state_id");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_state_id_key" ON "cities"("name", "state_id");

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_1_id_fkey" FOREIGN KEY ("position_1_id") REFERENCES "trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_2_id_fkey" FOREIGN KEY ("position_2_id") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_3_id_fkey" FOREIGN KEY ("position_3_id") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_jobs" ADD CONSTRAINT "candidate_jobs_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_jobs" ADD CONSTRAINT "candidate_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_tracking" ADD CONSTRAINT "process_tracking_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fee_waiver_approved_by_fkey" FOREIGN KEY ("fee_waiver_approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_commissions" ADD CONSTRAINT "associate_commissions_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_commissions" ADD CONSTRAINT "associate_commissions_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_events" ADD CONSTRAINT "interview_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_checkins" ADD CONSTRAINT "interview_checkins_interview_event_id_fkey" FOREIGN KEY ("interview_event_id") REFERENCES "interview_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_checkins" ADD CONSTRAINT "interview_checkins_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dropouts" ADD CONSTRAINT "dropouts_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_waitlist" ADD CONSTRAINT "candidate_waitlist_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_waitlist" ADD CONSTRAINT "candidate_waitlist_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_change_requests" ADD CONSTRAINT "fee_change_requests_candidate_job_id_fkey" FOREIGN KEY ("candidate_job_id") REFERENCES "candidate_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
