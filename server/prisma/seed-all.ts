/**
 * Comprehensive seed: adds ~100 records across all modules
 * Run: cd server && npx ts-node prisma/seed-all.ts
 */
import {
  PrismaClient, Gender, EcrType, RegistrationMode, CandidateStatus,
  CompletionStatus, CallOutcome, InterestStatus, JobStatus, JobPriority,
  GulfCountry, Industry, ProcessStepStatus, DeploymentStatus,
  InterviewType, InterviewEventStatus, CheckinStatus, InterviewResult,
  FeeChangeStatus,
} from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || 'postgresql://alhiraa:alhiraa_dev_2026@localhost:5432/alhiraa_atms' }) });
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const maybe = <T>(val: T, pct = 0.6): T | null => Math.random() < pct ? val : null;
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const fmtPhone = (n: number) => String(n);

async function main() {
  console.log('Loading reference data...');

  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@alhiraa.com' } });
  const deUser    = await prisma.user.findFirst({ where: { email: 'dataentry@alhiraa.com' } });
  const recruiter = await prisma.user.findFirst({ where: { email: 'recruiter@alhiraa.com' } });
  const procMgr   = await prisma.user.findFirst({ where: { email: 'process@alhiraa.com' } });
  const manager   = await prisma.user.findFirst({ where: { email: 'manager@alhiraa.com' } });
  if (!adminUser || !deUser || !recruiter || !procMgr || !manager) throw new Error('Run main seed first');

  const trades  = await prisma.trade.findMany();
  const sources = await prisma.source.findMany();
  const states  = await prisma.state.findMany({ include: { cities: true } });

  // ── 1. ASSOCIATES (20) ──────────────────────────────────────────────────────
  console.log('Seeding associates...');
  const associateNames = [
    'Kamal Hossain', 'Rafiqul Islam', 'Sanjib Das', 'Mohan Sharma', 'Dinesh Yadav',
    'Jakir Hussain', 'Pintu Mondal', 'Suresh Patel', 'Ramesh Tiwari', 'Abdul Mannan',
    'Bikram Singh', 'Dilwar Hossain', 'Noor Islam', 'Samir Ghosh', 'Tarun Roy',
    'Jahangir Alam', 'Pradip Kumar', 'Mafizul Hoque', 'Ratan Barman', 'Sujit Paul',
  ];
  const password = await bcrypt.hash('Password@123', 10);
  const associates: any[] = [];
  for (let i = 0; i < associateNames.length; i++) {
    const name = associateNames[i];
    const email = `associate${i + 1}@alhiraa.com`;
    try {
      const phone = fmtPhone(9800000100 + i);
      const a = await prisma.associate.upsert({
        where: { phone },
        update: {},
        create: {
          full_name: name,
          email,
          phone,
          commission_rate: 3 + (i % 5),
          password_hash: password,
          status: i < 17 ? 'active' : 'inactive',
          location_city: maybe(pick(['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Patna']), 0.6) as any,
        },
      });
      associates.push(a);
    } catch { /* skip dup */ }
  }
  console.log(`  ✓ ${associates.length} associates`);

  // ── 2. COMPANIES (10 more) ──────────────────────────────────────────────────
  console.log('Seeding companies...');
  const companyDefs = [
    { name: 'Naffco Fire Fighting', country: GulfCountry.uae, city: 'Dubai', industry: Industry.manufacturing },
    { name: 'Drake & Scull International', country: GulfCountry.uae, city: 'Abu Dhabi', industry: Industry.construction },
    { name: 'Bin Laden Group', country: GulfCountry.saudi_arabia, city: 'Mecca', industry: Industry.construction },
    { name: 'Arabtec Construction', country: GulfCountry.uae, city: 'Dubai', industry: Industry.construction },
    { name: 'Gulf Catering Company', country: GulfCountry.saudi_arabia, city: 'Riyadh', industry: Industry.hospitality },
    { name: 'Qatar Airways Catering', country: GulfCountry.qatar, city: 'Doha', industry: Industry.hospitality },
    { name: 'ALBA Aluminium', country: GulfCountry.bahrain, city: 'Manama', industry: Industry.manufacturing },
    { name: 'Oman Oil Company', country: GulfCountry.oman, city: 'Muscat', industry: Industry.oil_and_gas },
    { name: 'Kuwait National Petroleum', country: GulfCountry.kuwait, city: 'Kuwait City', industry: Industry.oil_and_gas },
    { name: 'Emaar Properties', country: GulfCountry.uae, city: 'Dubai', industry: Industry.construction },
  ];
  const newCompanies: any[] = [];
  for (const cd of companyDefs) {
    try {
      const c = await prisma.company.upsert({
        where: { name: cd.name },
        update: {},
        create: { ...cd, contact_person: `Manager ${cd.name.split(' ')[0]}`, phone: `+971-${rnd(10,99)}-${rnd(1000000,9999999)}` },
      });
      newCompanies.push(c);
    } catch { /* skip */ }
  }
  const allCompanies = await prisma.company.findMany();
  console.log(`  ✓ ${allCompanies.length} companies total`);

  // ── 3. JOB ORDERS (20 more) ─────────────────────────────────────────────────
  console.log('Seeding job orders...');
  const jobTitles = [
    ['Senior Electrician', 15, JobPriority.high],
    ['HVAC Technician', 12, JobPriority.high],
    ['Security Guard', 50, JobPriority.medium],
    ['Cook / Chef', 8, JobPriority.medium],
    ['Waiter', 20, JobPriority.low],
    ['Plumber', 10, JobPriority.high],
    ['Scaffolder', 25, JobPriority.medium],
    ['Steel Fixer', 30, JobPriority.high],
    ['Mason', 20, JobPriority.high],
    ['Crane Operator', 5, JobPriority.medium],
    ['Driver LMV', 15, JobPriority.low],
    ['Housekeeper', 30, JobPriority.low],
    ['Electrician 440V', 10, JobPriority.high],
    ['Pipe Fitter', 12, JobPriority.medium],
    ['General Helper', 60, JobPriority.low],
    ['AC Technician', 8, JobPriority.medium],
    ['Welder 6G', 10, JobPriority.high],
    ['Safety Officer', 4, JobPriority.medium],
    ['Shuttering Carpenter', 18, JobPriority.medium],
    ['Rigger', 12, JobPriority.medium],
  ];
  const newJobs: any[] = [];
  for (const [title, positions, priority] of jobTitles) {
    const company = pick(allCompanies);
    const trade = pick(trades);
    try {
      const j = await prisma.job.create({
        data: {
          title: title as string,
          company_id: company.id,
          trade_id: trade.id,
          positions_required: positions as number,
          salary_min: rnd(1200, 2000),
          salary_max: rnd(2000, 3500),
          service_fee: rnd(35000, 65000),
          country: company.country as GulfCountry,
          priority: priority as JobPriority,
          status: Math.random() > 0.2 ? JobStatus.open : JobStatus.closed,
          created_by: adminUser.id,
        },
      });
      newJobs.push(j);
    } catch { /* skip */ }
  }
  const allJobs = await prisma.job.findMany({ where: { status: JobStatus.open } });
  console.log(`  ✓ ${newJobs.length} new jobs, ${allJobs.length} open total`);

  // ── 4. MORE CANDIDATES (to reach 100) ───────────────────────────────────────
  console.log('Seeding more candidates...');
  const names = [
    { name: 'Hafizur Rahman', gender: Gender.male },
    { name: 'Moinul Haque', gender: Gender.male },
    { name: 'Saurav Ghosh', gender: Gender.male },
    { name: 'Arjun Sharma', gender: Gender.male },
    { name: 'Golam Kibria', gender: Gender.male },
    { name: 'Zahirul Islam', gender: Gender.male },
    { name: 'Bijoy Kumar Das', gender: Gender.male },
    { name: 'Masum Billah', gender: Gender.male },
    { name: 'Ruhul Amin', gender: Gender.male },
    { name: 'Safikul Islam', gender: Gender.male },
    { name: 'Chameli Devi', gender: Gender.female },
    { name: 'Nasima Begum', gender: Gender.female },
    { name: 'Rajkumari Singh', gender: Gender.female },
    { name: 'Sonia Khatun', gender: Gender.female },
    { name: 'Parveen Begum', gender: Gender.female },
    { name: 'Bashir Ahmed', gender: Gender.male },
    { name: 'Asraf Ali', gender: Gender.male },
    { name: 'Kafiluddin Sheikh', gender: Gender.male },
    { name: 'Habibur Mondal', gender: Gender.male },
    { name: 'Jiaul Haque', gender: Gender.male },
    { name: 'Rafikul Molla', gender: Gender.male },
    { name: 'Samsul Alam', gender: Gender.male },
  ];
  const educations = ['10th Pass', '12th Pass', 'Graduate', 'ITI', 'Diploma'];
  const newCandidates: any[] = [];
  let phoneBase = 9910000001;
  let passBase = 200001;
  for (let i = 0; i < names.length; i++) {
    const nd = names[i];
    const stateObj = states[i % states.length];
    const cityObj = stateObj.cities[i % Math.max(stateObj.cities.length, 1)];
    const daysAgo = rnd(1, 120);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    const assoc = associates.length > 0 && Math.random() > 0.7 ? pick(associates) : null;
    try {
      const c = await prisma.candidate.create({
        data: {
          full_name: nd.name,
          gender: nd.gender,
          dob: new Date(`${1975 + (i % 25)}-${String((i % 12) + 1).padStart(2, '0')}-10`),
          whatsapp_no: fmtPhone(phoneBase++),
          alternate_contact: maybe(fmtPhone(phoneBase++), 0.4) as any,
          email: maybe(`${nd.name.split(' ')[0].toLowerCase()}${i}x@gmail.com`, 0.5) as any,
          passport_no: Math.random() > 0.15 ? `Q${String(passBase++).padStart(7, '0')}` : null,
          ecr_type: pick([EcrType.ecr, EcrType.ecr, EcrType.ecnr]),
          state_id: stateObj.id,
          city_id: cityObj?.id,
          religion: pick(['Islam', 'Hindu', 'Christian']),
          education: pick(educations),
          position_1_id: pick(trades).id,
          position_2_id: maybe(pick(trades).id, 0.4) as any,
          registration_mode: pick([RegistrationMode.walk_in, RegistrationMode.phone, RegistrationMode.online, RegistrationMode.camp]),
          source_id: pick(sources).id,
          referred_by: maybe(`Ref. ${pick(['Ali', 'Khan', 'Das', 'Roy'])}`, 0.2) as any,
          associate_id: assoc ? assoc.id : null,
          indian_driving_license: Math.random() > 0.7 ? ['LMV'] : [],
          gulf_driving_license: [],
          english_speaking: pick(['none', 'basic', 'conversational']),
          arabic_speaking: Math.random() > 0.85,
          gulf_return: Math.random() > 0.7,
          indian_experience: maybe(`${rnd(1, 8)} years`, 0.6) as any,
          status: pick([CandidateStatus.active, CandidateStatus.active, CandidateStatus.active, CandidateStatus.inactive]),
          completion_status: Math.random() > 0.3 ? CompletionStatus.complete : CompletionStatus.incomplete,
          remarks: maybe(`Camp: ${pick(['Kolkata Jan', 'Patna Feb', 'Ranchi Mar'])}`, 0.3) as any,
          registered_by: pick([adminUser.id, deUser.id, deUser.id]),
          created_at: createdAt,
          updated_at: createdAt,
        },
      });
      newCandidates.push(c);
    } catch { /* skip dup */ }
  }
  console.log(`  ✓ ${newCandidates.length} new candidates`);

  const allCandidates = await prisma.candidate.findMany();
  console.log(`  Total candidates: ${allCandidates.length}`);

  // ── 5. PIPELINE + CALL LOGS ─────────────────────────────────────────────────
  console.log('Seeding pipeline entries and call logs...');
  const statuses = [
    InterestStatus.not_contacted, InterestStatus.contacted_interested,
    InterestStatus.contacted_interested, InterestStatus.contacted_not_interested,
    InterestStatus.contacted_not_reachable, InterestStatus.contacted_maybe_later,
    InterestStatus.lined_up, InterestStatus.lined_up,
    InterestStatus.interview_selected, InterestStatus.interview_rejected,
    InterestStatus.interview_on_hold,
  ];
  const outcomes = [
    CallOutcome.reached, CallOutcome.reached, CallOutcome.reached,
    CallOutcome.not_reachable, CallOutcome.voicemail,
    CallOutcome.line_busy, CallOutcome.switched_off,
  ];

  let pipelineCreated = 0;
  let callLogsCreated = 0;
  for (const candidate of allCandidates) {
    if (Math.random() > 0.5) continue; // 50% already have pipeline
    const job = pick(allJobs);
    try {
      const cj = await prisma.candidateJob.create({
        data: {
          candidate_id: candidate.id,
          job_id: job.id,
          status: pick(statuses),
          follow_up_date: maybe(new Date(Date.now() + rnd(1, 14) * 86400000), 0.3) as any,
        },
      });
      pipelineCreated++;

      const logCount = rnd(1, 4);
      for (let l = 0; l < logCount; l++) {
        const ts = new Date(Date.now() - rnd(0, 30) * 86400000);
        await prisma.callLog.create({
          data: {
            candidate_job_id: cj.id,
            caller_id: pick([recruiter.id, adminUser.id]),
            call_timestamp: ts,
            outcome: pick(outcomes),
            notes: maybe(pick([
              'Will confirm availability next week',
              'Passport ready, waiting for medical',
              'Interested in the position',
              'Ask to call back after Eid',
              'Number switched off, try WhatsApp',
              'Confirmed interview date',
            ]), 0.5) as any,
            follow_up_date: maybe(new Date(Date.now() + rnd(3, 10) * 86400000), 0.3) as any,
            call_attempt_number: l + 1,
          },
        });
        callLogsCreated++;
      }
    } catch { /* dup candidate_job */ }
  }
  console.log(`  ✓ ${pipelineCreated} pipeline entries, ${callLogsCreated} call logs`);

  // ── 6. PROCESS TRACKING ─────────────────────────────────────────────────────
  console.log('Seeding process tracking...');
  const linedUpJobs = await prisma.candidateJob.findMany({
    where: { status: { in: [InterestStatus.lined_up, InterestStatus.interview_selected] } },
    take: 20,
  });
  const steps = [
    'Document Verification', 'Medical Fitness Test', 'Visa Processing',
    'Emigration Clearance', 'Air Ticket Booking', 'Travel & Deployment',
  ];
  let ptCreated = 0;
  for (const cj of linedUpJobs) {
    const completedSteps = rnd(1, 5);
    for (let s = 0; s < steps.length; s++) {
      try {
        const status = s < completedSteps ? ProcessStepStatus.completed
          : s === completedSteps ? ProcessStepStatus.in_progress
          : ProcessStepStatus.not_started;
        await prisma.processTracking.upsert({
          where: { candidate_job_id_step_number: { candidate_job_id: cj.id, step_number: s + 1 } },
          update: {},
          create: {
            candidate_job_id: cj.id,
            step_number: s + 1,
            step_name: steps[s],
            status,
            started_at: status !== ProcessStepStatus.not_started ? new Date(Date.now() - rnd(5, 30) * 86400000) : null,
            completed_at: status === ProcessStepStatus.completed ? new Date(Date.now() - rnd(1, 10) * 86400000) : null,
            updated_by: procMgr.id,
          },
        });
        ptCreated++;
      } catch { /* skip */ }
    }
  }
  console.log(`  ✓ ${ptCreated} process tracking steps`);

  // ── 7. PAYMENTS ─────────────────────────────────────────────────────────────
  console.log('Seeding payments...');
  const linedUpForPayment = await prisma.candidateJob.findMany({
    where: { status: { in: [InterestStatus.lined_up, InterestStatus.interview_selected] } },
    take: 25,
    include: { job: { select: { service_fee: true } } },
  });
  let payCreated = 0;
  for (const cj of linedUpForPayment) {
    const fee = (cj.job as any).service_fee ?? 45000;
    const installments = rnd(1, 3);
    const perInstall = Math.round(fee / installments);
    try {
      for (let inst = 1; inst <= installments; inst++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (inst - 1) * 30);
        const isPaid = Math.random() > 0.5;
        await prisma.payment.create({
          data: {
            candidate_job_id: cj.id,
            total_fee: fee,
            installment_number: inst,
            amount_due: perInstall,
            amount_paid: isPaid ? perInstall : 0,
            due_date: dueDate,
            paid_date: isPaid ? new Date() : null,
            payment_method: isPaid ? pick(['cash', 'bank_transfer', 'upi', 'cheque']) : null,
            receipt_number: isPaid ? `RCP${Date.now()}${rnd(100, 999)}` : null,
            status: isPaid ? 'paid' : (dueDate < new Date() ? 'overdue' : 'pending'),
            collected_by: isPaid ? pick([adminUser.id, procMgr.id]) : null,
          },
        });
        payCreated++;
      }
    } catch { /* skip */ }
  }
  console.log(`  ✓ ${payCreated} payments`);

  // ── 8. INTERVIEW EVENT + CHECKINS ───────────────────────────────────────────
  console.log('Seeding interview events...');
  const openJobs = await prisma.job.findMany({ where: { status: JobStatus.open }, take: 5 });
  let eventsCreated = 0;
  for (const job of openJobs) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + rnd(-30, 30));
    try {
      const event = await prisma.interviewEvent.create({
        data: {
          job_id: job.id,
          event_date: eventDate,
          venue_name: pick(['Al-Hiraa Office Kolkata', 'Hotel Hindustan International', 'Salt Lake Stadium Ground', 'Patna Hotel Maurya']),
          interview_type: pick([InterviewType.in_person, InterviewType.video, InterviewType.trade_test]),
          status: eventDate > new Date() ? InterviewEventStatus.scheduled : InterviewEventStatus.completed,
          notes: maybe(`Client representative: ${pick(['Mr. Ahmed', 'Mr. Khalid', 'Mr. Hassan'])}`, 0.6) as any,
          created_by: adminUser.id,
        },
      });
      eventsCreated++;

      // Add 5–15 checkins per event
      const candidateJobs = await prisma.candidateJob.findMany({
        where: { job_id: job.id },
        take: rnd(5, 15),
      });
      for (const cj of candidateJobs) {
        const isCompleted = event.status === InterviewEventStatus.completed;
        try {
          await prisma.interviewCheckin.create({
            data: {
              interview_event_id: event.id,
              candidate_job_id: cj.id,
              checkin_status: isCompleted ? pick([CheckinStatus.arrived, CheckinStatus.no_show]) : CheckinStatus.expected,
              checkin_time: isCompleted && Math.random() > 0.2 ? eventDate : null,
              result: isCompleted && Math.random() > 0.3 ? pick([InterviewResult.selected, InterviewResult.rejected, InterviewResult.on_hold]) : null,
            },
          });
        } catch { /* dup */ }
      }
    } catch { /* skip */ }
  }
  console.log(`  ✓ ${eventsCreated} interview events`);

  // ── 9. DEPLOYMENTS (30) ─────────────────────────────────────────────────────
  console.log('Seeding deployments...');
  const deployedCandidates = await prisma.candidate.findMany({
    where: { status: CandidateStatus.active },
    take: 35,
    orderBy: { created_at: 'asc' },
  });
  const gulfCountries = [GulfCountry.saudi_arabia, GulfCountry.uae, GulfCountry.qatar, GulfCountry.kuwait, GulfCountry.oman, GulfCountry.bahrain];
  const currencies = ['SAR', 'AED', 'QAR', 'KWD', 'OMR', 'BHD'];
  let depCreated = 0;
  for (let i = 0; i < Math.min(deployedCandidates.length, 30); i++) {
    const cand = deployedCandidates[i];
    const company = pick(allCompanies);
    const position = pick(trades);
    const country = pick(gulfCountries);
    const ci = gulfCountries.indexOf(country);
    const currency = currencies[ci] ?? 'SAR';
    const deployDate = new Date();
    deployDate.setDate(deployDate.getDate() - rnd(30, 365));
    const contractMonths = rnd(12, 36);
    const contractEnd = new Date(deployDate);
    contractEnd.setMonth(contractEnd.getMonth() + contractMonths);
    const depStatus: DeploymentStatus = contractEnd < new Date()
      ? pick([DeploymentStatus.completed, DeploymentStatus.terminated])
      : DeploymentStatus.active;
    try {
      await prisma.deployment.create({
        data: {
          candidate_id: cand.id,
          company_id: company.id,
          position_id: position.id,
          deployment_date: deployDate,
          contract_end_date: contractEnd,
          salary_amount: rnd(1200, 3500),
          salary_currency: currency,
          country,
          visa_number: maybe(`${pick(['IQ', 'VZ', 'WP'])}${rnd(100000, 999999)}`, 0.7) as any,
          emergency_contact_name: maybe(`${pick(['Ahmed', 'Mohd', 'Raju', 'Sanjay'])} ${pick(['Ali', 'Khan', 'Das'])}`, 0.8) as any,
          emergency_contact_phone: maybe(fmtPhone(9800000200 + i), 0.8) as any,
          status: depStatus,
          notes: maybe(`Contract #${rnd(1000, 9999)}. ${pick(['2-year renewable', '3-year fixed', '1-year with extension option'])}`, 0.6) as any,
          expiry_notified: contractEnd < new Date() || Math.random() > 0.7,
          created_by: pick([adminUser.id, procMgr.id]),
        },
      });
      // update candidate status
      await prisma.candidate.update({
        where: { id: cand.id },
        data: { status: depStatus === DeploymentStatus.active ? CandidateStatus.deployed : CandidateStatus.inactive },
      });
      depCreated++;
    } catch { /* skip */ }
  }
  console.log(`  ✓ ${depCreated} deployments`);

  // ── 10. NOTIFICATIONS (50) ──────────────────────────────────────────────────
  console.log('Seeding notifications...');
  const notifMessages = [
    ['📋 New candidate registered: Mohammad Arif — ALH-00001', 'info'],
    ['📞 Follow-up due today: 12 candidates awaiting callback', 'follow_up'],
    ['⏰ Contract expiring in 15 days: Ramesh Kumar at Al Rajhi Construction', 'contract_expiry'],
    ['✅ Interview selected: Abdul Karim for Senior Welder position', 'pipeline'],
    ['💰 Payment received: ₹45,000 for ALH-00023', 'payment'],
    ['🚀 Deployment created: Bikash Das → Emirates Facilities Management', 'deployment'],
    ['📋 15 incomplete candidate records need attention', 'info'],
    ['⚠️ Contract expiring in 7 days: Suresh Yadav at Qatar National', 'contract_expiry'],
    ['✈️ Candidate departed: Firoz Ahmed — Visa stamped, travel confirmed', 'deployment'],
    ['📞 Call log reminder: 8 candidates not contacted in 7+ days', 'follow_up'],
    ['💼 New job order: 20 Scaffolders for Arabtec Construction', 'info'],
    ['🏆 Target achieved: 50 candidates lined up this month', 'info'],
    ['⚠️ Document missing: Medical fitness report for ALH-00034', 'info'],
    ['✅ Interview event scheduled: Qatar National Projects — 15 Mar', 'info'],
    ['💰 Fee change request approved: ALH-00045', 'payment'],
  ];
  const users = [adminUser, manager, recruiter, procMgr];
  let notifCreated = 0;
  for (let n = 0; n < 50; n++) {
    const [message, type] = pick(notifMessages);
    const user = pick(users);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - rnd(0, 30));
    await prisma.notification.create({
      data: {
        user_id: user.id,
        message: message as string,
        type: type as string,
        is_read: Math.random() > 0.4,
        created_at: createdAt,
      },
    });
    notifCreated++;
  }
  console.log(`  ✓ ${notifCreated} notifications`);

  // ── 11. ASSOCIATES COMMISSIONS ──────────────────────────────────────────────
  console.log('Seeding associate commissions...');
  const linedUpCandJobs = await prisma.candidateJob.findMany({
    where: { status: { in: [InterestStatus.lined_up, InterestStatus.interview_selected] } },
    take: 20,
  });
  let commCreated = 0;
  for (const cj of linedUpCandJobs) {
    if (associates.length === 0) break;
    try {
      await prisma.associateCommission.create({
        data: {
          associate_id: pick(associates).id,
          candidate_job_id: cj.id,
          commission_amount: rnd(2000, 8000),
          status: pick(['earned', 'paid', 'cancelled']),
        },
      });
      commCreated++;
    } catch { /* dup */ }
  }
  console.log(`  ✓ ${commCreated} commissions`);

  // ── 12. PROCESS DETAILS (full visa/medical sequences) ──────────────────────
  console.log('Seeding process details...');
  const selectedCJs = await prisma.candidateJob.findMany({
    where: { status: { in: [InterestStatus.interview_selected, InterestStatus.lined_up] } },
    include: { job: { select: { id: true, company: { select: { name: true } } } } },
    take: 30,
  });
  const medStatuses  = ['pending', 'fit', 'unfit', 'pending', 'fit', 'fit'];
  const candStatuses = ['selected', 'documents_pending', 'medical_done', 'visa_applied', 'visa_approved', 'deployed'];
  let pdCreated = 0;
  for (const cj of selectedCJs) {
    const stage = rnd(0, candStatuses.length - 1);
    const selDate = new Date(Date.now() - rnd(30, 180) * 86400000);
    try {
      await prisma.processDetails.upsert({
        where: { candidate_job_id: cj.id },
        update: {},
        create: {
          candidate_job_id: cj.id,
          date_of_interview: new Date(selDate.getTime() - rnd(7, 30) * 86400000),
          date_of_selection: selDate,
          candidate_status: candStatuses[stage],
          medical_status: stage >= 2 ? medStatuses[rnd(0, medStatuses.length - 1)] : 'pending',
          medical_app_date: stage >= 2 ? new Date(selDate.getTime() + rnd(7, 21) * 86400000) : null,
          mofa_date: stage >= 3 ? new Date(selDate.getTime() + rnd(21, 60) * 86400000) : null,
          visa_issue_date: stage >= 4 ? new Date(selDate.getTime() + rnd(45, 80) * 86400000) : null,
          deployment_date: stage === 5 ? new Date(selDate.getTime() + rnd(60, 120) * 86400000) : null,
          total_receivable_amount: rnd(35000, 70000),
          year_of_selection: selDate.getFullYear(),
        },
      });
      pdCreated++;
    } catch { /* dup */ }
  }
  console.log(`  ✓ ${pdCreated} process detail records`);

  // ── 13. FEE CHANGE REQUESTS ─────────────────────────────────────────────────
  console.log('Seeding fee change requests...');
  const paidCJs = await prisma.payment.findMany({
    where: { status: 'pending' },
    distinct: ['candidate_job_id'],
    take: 10,
    select: { candidate_job_id: true, total_fee: true },
  });
  const fcrStatuses: FeeChangeStatus[] = [FeeChangeStatus.pending, FeeChangeStatus.approved, FeeChangeStatus.approved, FeeChangeStatus.rejected];
  let fcrCreated = 0;
  for (const p of paidCJs) {
    const originalFee = Number(p.total_fee);
    const requestedFee = originalFee - rnd(3000, 10000);
    const status = pick(fcrStatuses);
    try {
      await prisma.feeChangeRequest.create({
        data: {
          candidate_job_id: p.candidate_job_id,
          requested_by: pick([procMgr.id, recruiter.id]),
          original_fee: originalFee,
          requested_fee: requestedFee,
          reason: pick([
            'Candidate has financial difficulty — requesting waiver',
            'Associate discount applied',
            'Camp candidate — reduced fee policy',
            'Referred by senior associate — special rate',
            'Client-requested discount for bulk deployment',
          ]),
          status,
          approved_by: status !== FeeChangeStatus.pending ? manager.id : null,
          approved_at: status !== FeeChangeStatus.pending ? new Date(Date.now() - rnd(1, 10) * 86400000) : null,
        },
      });
      fcrCreated++;
    } catch { /* dup */ }
  }
  console.log(`  ✓ ${fcrCreated} fee change requests`);

  // ── FINAL COUNTS ─────────────────────────────────────────────────────────────
  const [totCand, totCo, totJobs, totCJ, totCL, totPT, totPay, totDep, totAss, totNotif, totPD, totFCR] = await Promise.all([
    prisma.candidate.count(),
    prisma.company.count(),
    prisma.job.count(),
    prisma.candidateJob.count(),
    prisma.callLog.count(),
    prisma.processTracking.count(),
    prisma.payment.count(),
    prisma.deployment.count(),
    prisma.associate.count(),
    prisma.notification.count(),
    prisma.processDetails.count(),
    prisma.feeChangeRequest.count(),
  ]);

  console.log('\n═══ Final counts ═══');
  console.log(`Candidates:         ${totCand}`);
  console.log(`Companies:          ${totCo}`);
  console.log(`Job Orders:         ${totJobs}`);
  console.log(`Pipeline entries:   ${totCJ}`);
  console.log(`Call Logs:          ${totCL}`);
  console.log(`Process Steps:      ${totPT}`);
  console.log(`Process Details:    ${totPD}`);
  console.log(`Payments:           ${totPay}`);
  console.log(`Fee Change Reqs:    ${totFCR}`);
  console.log(`Deployments:        ${totDep}`);
  console.log(`Associates:         ${totAss}`);
  console.log(`Notifications:      ${totNotif}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
