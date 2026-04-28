/**
 * Seed script: creates interview events and process records
 * - A backdated March 31 interview for Kuwait National Petroleum with 50 selected candidates
 * - A future interview event synced with Active Jobs
 */
import {
  PrismaClient,
  GulfCountry,
  Industry,
  JobStatus,
  JobPriority,
  InterviewType,
  InterestStatus,
  InterviewEventStatus,
  CheckinStatus,
  InterviewResult,
  CandidateStatus,
  CompletionStatus,
  Gender,
  EcrType,
  RegistrationMode,
} from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || 'postgresql://alhiraa:alhiraa_dev_2026@localhost:5432/alhiraa_atms' }) });

// ── Helper: Indian names pool ──────────────────────────────────────────────
const FIRST_NAMES = [
  'Aamir', 'Rahul', 'Vikram', 'Suresh', 'Manoj', 'Deepak', 'Arun', 'Kiran',
  'Ravi', 'Gopal', 'Sanjay', 'Ajay', 'Vinod', 'Harish', 'Prakash', 'Mohan',
  'Ashok', 'Balram', 'Chandan', 'Deven', 'Firoz', 'Ganesh', 'Hari', 'Imran',
  'Jagdish', 'Kamal', 'Lakshman', 'Mukesh', 'Navin', 'Om', 'Pawan', 'Qadir',
  'Rajendra', 'Shyam', 'Tarun', 'Umesh', 'Vijay', 'Wasim', 'Yashpal', 'Zakir',
  'Arjun', 'Bharat', 'Chirag', 'Dinesh', 'Ehsan', 'Farhan', 'Gautam', 'Hemant',
  'Irfan', 'Jatin',
];
const LAST_NAMES = [
  'Kumar', 'Singh', 'Sharma', 'Das', 'Yadav', 'Mondal', 'Patel', 'Khan',
  'Gupta', 'Mahato', 'Oraon', 'Soren', 'Munda', 'Thakur', 'Verma', 'Prasad',
  'Chauhan', 'Tiwari', 'Mishra', 'Ansari', 'Ali', 'Sheikh', 'Roy', 'Bose',
  'Dey', 'Sen', 'Nath', 'Biswas', 'Sarkar', 'Ghosh', 'Mandal', 'Mallick',
  'Barman', 'Hazra', 'Murmu', 'Tudu', 'Hembram', 'Khatun', 'Akhtar', 'Raza',
  'Hussain', 'Rajak', 'Paswan', 'Ram', 'Kisku', 'Tirkey', 'Lakra', 'Kerketta',
  'Toppo', 'Minj',
];
const STATES = ['Bihar', 'Jharkhand', 'West Bengal', 'Uttar Pradesh', 'Odisha', 'Assam'];

const MEDICAL_STATUSES = ['pending', 'fit', 'fit', 'fit', 'fit', 'fit', 'awaited'];

async function main() {
  console.log('Seeding interview events & process records...');

  // ── Get existing references ────────────────────────────────────────────────
  const knpc = await prisma.company.findFirst({ where: { name: { contains: 'Kuwait National' } } });
  const alRajhi = await prisma.company.findFirst({ where: { name: { contains: 'Al Rajhi' } } });
  if (!knpc || !alRajhi) throw new Error('Companies not found — run main seed first');

  // Get or create trades needed
  const welderTrade = await prisma.trade.findFirst({ where: { name: { contains: 'Weld' } } });
  const masonTrade = await prisma.trade.findFirst({ where: { name: { contains: 'Mason' } } });
  const plumberTrade = await prisma.trade.findFirst({ where: { name: { contains: 'Plumb' } } });
  const electricianTrade = await prisma.trade.findFirst({ where: { name: { contains: 'Electri' } } });
  const helperTrade = await prisma.trade.findFirst({ where: { name: { contains: 'General' } } });
  const trades = [welderTrade, masonTrade, plumberTrade, electricianTrade, helperTrade].filter(Boolean);
  if (trades.length === 0) throw new Error('No trades found — run main seed first');

  // Get states
  const stateRecords = await prisma.state.findMany({ take: 6, include: { cities: { take: 1 } } });
  const sourceRecord = await prisma.source.findFirst({ where: { name: { contains: 'Walk' } } })
    || await prisma.source.findFirst();
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. BACKDATED MARCH 31 INTERVIEW — Kuwait National Petroleum, 50 candidates
  // ────────────────────────────────────────────────────────────────────────────
  console.log('Creating backdated March 31 interview with 50 candidates...');

  // Create a job for this interview
  const knpcJob = await prisma.job.create({
    data: {
      company_id: knpc.id,
      title: 'Welder 6G & Pipe Fitter',
      trade_id: welderTrade?.id || trades[0]!.id,
      positions_required: 60,
      positions_filled: 50,
      salary_min: 2000,
      salary_max: 3500,
      salary_currency: 'KWD',
      country: GulfCountry.kuwait,
      interview_date_start: new Date('2026-03-31'),
      interview_date_end: new Date('2026-03-31'),
      interview_type: InterviewType.in_person,
      service_fee: 55000,
      status: JobStatus.in_process,
      priority: JobPriority.high,
      created_by: adminUser!.id,
    },
  });

  // Create the interview event
  const march31Event = await prisma.interviewEvent.create({
    data: {
      job_id: knpcJob.id,
      event_date: new Date('2026-03-31T10:00:00'),
      venue_name: 'Al-Hiraa Office, Kolkata',
      venue_address: '22/1 Park Street, Kolkata 700016',
      interviewer_name: 'Mr. Ahmad Al-Sabah',
      interview_type: InterviewType.in_person,
      capacity: 70,
      candidate_count: 50,
      status: InterviewEventStatus.completed,
      notes: 'Kuwait National Petroleum selection drive — 50 selected out of 65 appeared',
      created_by: adminUser!.id,
    },
  });

  // Create 50 candidates with process records
  const processStages = [
    // 15 in selection (recently selected, nothing done yet)
    ...Array(15).fill('selection'),
    // 15 in medical (medical done/fit)
    ...Array(15).fill('medical'),
    // 10 in visa (visa issued)
    ...Array(10).fill('visa'),
    // 7 in collection (ticket confirmed)
    ...Array(7).fill('collection'),
    // 3 deployed
    ...Array(3).fill('deployment'),
  ];

  for (let i = 0; i < 50; i++) {
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i];
    const fullName = `${firstName} ${lastName}`;
    const stateRec = stateRecords[i % stateRecords.length];
    const trade = trades[i % trades.length];
    const stage = processStages[i];
    const passportNo = `K${String(900000 + i).padStart(7, '0')}`;
    const phone = `98${String(50000000 + i).padStart(8, '0')}`;

    // Create candidate
    const candidate = await prisma.candidate.create({
      data: {
        full_name: fullName,
        gender: i % 10 === 0 ? Gender.female : Gender.male,
        dob: new Date(1988 + (i % 12), i % 12, 1 + (i % 28)),
        whatsapp_no: phone,
        passport_no: passportNo,
        ecr_type: EcrType.ecr,
        state_id: stateRec?.id,
        city_id: stateRec?.cities?.[0]?.id,
        education: i % 3 === 0 ? '10th Pass' : i % 3 === 1 ? '12th Pass' : 'ITI',
        position_1_id: trade!.id,
        registration_mode: RegistrationMode.walk_in,
        source_id: sourceRecord!.id,
        status: stage === 'deployment' ? CandidateStatus.deployed : CandidateStatus.active,
        completion_status: CompletionStatus.complete,
        registered_by: adminUser!.id,
      },
    });

    // Create candidate-job link
    const candidateJob = await prisma.candidateJob.create({
      data: {
        candidate_id: candidate.id,
        job_id: knpcJob.id,
        status: InterestStatus.interview_selected,
        assigned_to: adminUser?.id,
      },
    });

    // Create interview checkin
    await prisma.interviewCheckin.create({
      data: {
        interview_event_id: march31Event.id,
        candidate_job_id: candidateJob.id,
        checkin_status: CheckinStatus.arrived,
        checkin_time: new Date('2026-03-31T10:15:00'),
        interview_status: 'completed',
        result: InterviewResult.selected,
        result_notes: `Selected for ${trade?.name || 'position'}`,
      },
    });

    // Create process details based on stage
    const processData: any = {
      candidate_job_id: candidateJob.id,
      year_of_selection: 2026,
      date_of_interview: new Date('2026-03-31'),
      date_of_selection: new Date('2026-03-31'),
      mode_of_selection: 'FACE TO FACE',
      interview_location: 'Kolkata',
      candidate_status: 'selected',
      vendor: 'Al-Hiraa',
      sponsor: 'Kuwait National Petroleum',
      client_remark: 'Selected',
    };

    if (stage === 'medical' || stage === 'visa' || stage === 'collection' || stage === 'deployment') {
      processData.medical_status = 'fit';
      processData.medical_app_date = new Date('2026-04-02');
    }

    if (stage === 'visa' || stage === 'collection' || stage === 'deployment') {
      processData.mofa_number = `E${750000 + i}`;
      processData.visa_receiving_date = new Date('2026-04-08');
      processData.visa_issue_date = new Date('2026-04-10');
      processData.visa_expiry_date = new Date('2026-07-10');
    }

    if (stage === 'collection' || stage === 'deployment') {
      processData.ticket_booking_date = new Date('2026-04-12');
      processData.ticket_confirm_date = new Date('2026-04-14');
      processData.total_receivable_amount = 55000;
      processData.advance_received = 20000;
      processData.total_received_amount = stage === 'deployment' ? 55000 : 20000;
    }

    if (stage === 'deployment') {
      processData.deployment_date = new Date('2026-04-16');
      processData.deployment_month = 'April 2026';
    }

    await prisma.processDetails.create({ data: processData });
  }

  console.log('  ✓ 50 candidates created for KNPC March 31 interview');

  // ────────────────────────────────────────────────────────────────────────────
  // 2. FUTURE INTERVIEW — Al Rajhi Construction, April 10 (syncs with Active Jobs)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('Creating future April 10 interview for Al Rajhi...');

  // Update the existing Plumber job to have the interview date
  const plumberJob = await prisma.job.findFirst({
    where: { company_id: alRajhi.id, title: { contains: 'Plumber' } },
  });

  if (plumberJob) {
    await prisma.job.update({
      where: { id: plumberJob.id },
      data: {
        interview_date_start: new Date('2026-04-10'),
        interview_date_end: new Date('2026-04-10'),
        interview_type: InterviewType.in_person,
        status: JobStatus.interviews_scheduled,
      },
    });

    await prisma.interviewEvent.create({
      data: {
        job_id: plumberJob.id,
        event_date: new Date('2026-04-10T09:30:00'),
        venue_name: 'Al-Hiraa Office, Kolkata',
        venue_address: '22/1 Park Street, Kolkata 700016',
        interviewer_name: 'Mr. Fahad Al-Rashid',
        interview_type: InterviewType.in_person,
        capacity: 40,
        candidate_count: 0,
        status: InterviewEventStatus.scheduled,
        notes: 'Al Rajhi Construction plumber selection drive',
        created_by: adminUser!.id,
      },
    });
    console.log('  ✓ Al Rajhi Plumber interview created for April 10');
  }

  // Also create an interview for the Senior Welder job
  const welderJob = await prisma.job.findFirst({
    where: { company_id: alRajhi.id, title: { contains: 'Senior Welder' } },
  });

  if (welderJob) {
    await prisma.job.update({
      where: { id: welderJob.id },
      data: {
        interview_date_start: new Date('2026-04-10'),
        interview_date_end: new Date('2026-04-10'),
        interview_type: InterviewType.combined,
        status: JobStatus.interviews_scheduled,
      },
    });

    await prisma.interviewEvent.create({
      data: {
        job_id: welderJob.id,
        event_date: new Date('2026-04-10T09:30:00'),
        venue_name: 'Al-Hiraa Office, Kolkata',
        venue_address: '22/1 Park Street, Kolkata 700016',
        interviewer_name: 'Mr. Fahad Al-Rashid',
        interview_type: InterviewType.combined,
        capacity: 30,
        candidate_count: 0,
        status: InterviewEventStatus.scheduled,
        notes: 'Al Rajhi welding selection — trade test + interview',
        created_by: adminUser!.id,
      },
    });
    console.log('  ✓ Al Rajhi Senior Welder interview created for April 10');
  }

  console.log('\nDone! Interview seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
