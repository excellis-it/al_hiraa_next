/**
 * One-time data migration: populate job_positions and job_interview_dates
 * from existing flat Job records.
 *
 * Run from server/ with:  node scripts/migrate-job-positions.js
 */
const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.$queryRaw`
    SELECT id, trade_id, positions_required, positions_filled, salary_min,
           interview_date_start, interview_date_end
    FROM jobs
  `;

  console.log(`Found ${jobs.length} jobs to migrate.`);
  let positionsCreated = 0;
  let datesCreated = 0;

  for (const job of jobs) {
    // Skip if a position already exists for this job
    const existingPos = await prisma.jobPosition.findFirst({ where: { job_id: job.id } });
    if (!existingPos && job.trade_id && job.positions_required) {
      await prisma.jobPosition.create({
        data: {
          job_id: job.id,
          trade_id: job.trade_id,
          quantity: job.positions_required,
          salary: job.salary_min ?? null,
          positions_filled: job.positions_filled ?? 0,
          accommodation: false,
          transportation: false,
        },
      });
      positionsCreated++;
    }

    // Skip if interview dates already exist
    const existingDate = await prisma.jobInterviewDate.findFirst({ where: { job_id: job.id } });
    if (!existingDate && job.interview_date_start) {
      await prisma.jobInterviewDate.create({
        data: {
          job_id: job.id,
          date: job.interview_date_start,
          sort_order: 0,
        },
      });
      datesCreated++;

      if (
        job.interview_date_end &&
        job.interview_date_end.toISOString() !== job.interview_date_start.toISOString()
      ) {
        await prisma.jobInterviewDate.create({
          data: {
            job_id: job.id,
            date: job.interview_date_end,
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
