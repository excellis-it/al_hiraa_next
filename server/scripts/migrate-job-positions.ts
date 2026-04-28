/**
 * One-time data migration: populate job_positions and job_interview_dates
 * from existing flat Job records.
 *
 * Run with:  npx ts-node scripts/migrate-job-positions.ts
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      // @ts-ignore — these fields still exist during Phase 1 / before destructive migration
      trade_id: true,
      positions_required: true,
      positions_filled: true,
      salary_min: true,
      interview_date_start: true,
      interview_date_end: true,
    },
  });

  console.log(`Found ${jobs.length} jobs to migrate.`);
  let positionsCreated = 0;
  let datesCreated = 0;

  for (const job of jobs) {
    const raw = job as any;

    // Skip if position already exists for this job
    const existingPos = await prisma.jobPosition.findFirst({ where: { job_id: job.id } });
    if (!existingPos && raw.trade_id && raw.positions_required) {
      await prisma.jobPosition.create({
        data: {
          job_id: job.id,
          trade_id: raw.trade_id,
          quantity: raw.positions_required,
          salary: raw.salary_min ?? null,
          positions_filled: raw.positions_filled ?? 0,
          accommodation: false,
          transportation: false,
        },
      });
      positionsCreated++;
    }

    // Skip if interview dates already exist
    const existingDate = await prisma.jobInterviewDate.findFirst({ where: { job_id: job.id } });
    if (!existingDate && raw.interview_date_start) {
      await prisma.jobInterviewDate.create({
        data: {
          job_id: job.id,
          date: raw.interview_date_start,
          sort_order: 0,
        },
      });
      datesCreated++;

      if (
        raw.interview_date_end &&
        raw.interview_date_end.toISOString() !== raw.interview_date_start.toISOString()
      ) {
        await prisma.jobInterviewDate.create({
          data: {
            job_id: job.id,
            date: raw.interview_date_end,
            sort_order: 1,
          },
        });
        datesCreated++;
      }
    }
  }

  console.log(`Done. Created ${positionsCreated} job positions and ${datesCreated} interview dates.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
