-- AlterTable
ALTER TABLE "process_details" ADD COLUMN     "courier_received_date" DATE,
ADD COLUMN     "courier_sent_date" DATE,
ADD COLUMN     "medical_approval_date" DATE,
ADD COLUMN     "medical_completion_date" DATE,
ADD COLUMN     "medical_expiry_date" DATE,
ADD COLUMN     "medical_repeat_date" DATE,
ADD COLUMN     "mofa_date" DATE,
ADD COLUMN     "mofa_received_date" DATE,
ADD COLUMN     "onboarding_city" VARCHAR(100),
ADD COLUMN     "vendor_service_charge" DECIMAL(10,2),
ADD COLUMN     "vfs_applied_date" DATE,
ADD COLUMN     "vfs_received_date" DATE;
