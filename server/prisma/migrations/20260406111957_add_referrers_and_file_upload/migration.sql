-- AlterEnum
ALTER TYPE "RegistrationMode" ADD VALUE 'associate';

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "referrer_id" INTEGER;

-- CreateTable
CREATE TABLE "referrers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
