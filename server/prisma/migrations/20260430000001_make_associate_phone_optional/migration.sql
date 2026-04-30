-- AlterTable: make phone nullable on associates (was NOT NULL, but phone is not always known at creation)
ALTER TABLE "associates" ALTER COLUMN "phone" DROP NOT NULL;
