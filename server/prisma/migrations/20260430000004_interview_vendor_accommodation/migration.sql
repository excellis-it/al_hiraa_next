-- AlterTable interview_events: add vendor, accommodation, transportation
ALTER TABLE "interview_events"
  ADD COLUMN "vendor_id"           INTEGER,
  ADD COLUMN "accommodation"       BOOLEAN,
  ADD COLUMN "accommodation_cost"  DECIMAL(10,2),
  ADD COLUMN "transportation"      BOOLEAN,
  ADD COLUMN "transportation_cost" DECIMAL(10,2);

-- AlterTable process_details: add vendor_id, accommodation, transportation
ALTER TABLE "process_details"
  ADD COLUMN "vendor_id"           INTEGER,
  ADD COLUMN "accommodation"       BOOLEAN,
  ADD COLUMN "accommodation_cost"  DECIMAL(10,2),
  ADD COLUMN "transportation"      BOOLEAN,
  ADD COLUMN "transportation_cost" DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "interview_events" ADD CONSTRAINT "interview_events_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "process_details" ADD CONSTRAINT "process_details_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
