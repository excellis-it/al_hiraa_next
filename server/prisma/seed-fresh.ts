/**
 * seed-fresh.ts — Full reset + deterministic seed for Al-Hiraa ATMS
 * Covers all 28 models. Clears transactional tables in FK-safe order, then re-seeds.
 *
 * Run:  cd server && npx ts-node prisma/seed-fresh.ts
 * Or:   npm run prisma:seed-fresh --workspace=server
 */
import {
  PrismaClient,
  UserRole,
  Gender,
  EcrType,
  RegistrationMode,
  CandidateStatus,
  CompletionStatus,
  CallOutcome,
  InterestStatus,
  JobStatus,
  JobPriority,
  GulfCountry,
  Industry,
  ProcessStepStatus,
  DeploymentStatus,
  InterviewType,
  InterviewEventStatus,
  CheckinStatus,
  InterviewResult,
  InterviewStatus,
  PaymentStatus,
  CommissionStatus,
  FeeChangeStatus,
  AssociateStatus,
  DropoutReason,
  EnglishLevel,
} from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://alhiraa:alhiraa_dev_2026@localhost:5432/alhiraa_atms',
  }),
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysAhead(n: number): Date { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function dateAt(base: Date, offsetDays: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

// ── STEP 1: Seed Masters (never cleared) ────────────────────────────────────
async function seedMasters() {
  console.log('\n[1] Seeding master tables (upsert)...');

  const tradeNames = [
    'Welder', 'Plumber', 'Electrician', 'Mason', 'Security Guard',
    'Cook / Chef', 'HVAC Technician', 'Pipe Fitter', 'Steel Fixer', 'Scaffolder',
    'Carpenter', 'Painter', 'Rigger', 'Helper / General Labor', 'Driver - LMV',
    'Driver - HMV', 'Crane Operator', 'Forklift Operator', 'Tile Worker',
    'AC Technician', 'Waiter / Steward', 'Housekeeping', 'Warehouse Worker',
    'Safety Officer', 'Electrician 440V', 'Auto Mechanic',
  ];
  for (let i = 0; i < tradeNames.length; i++) {
    await prisma.trade.upsert({
      where: { name: tradeNames[i] },
      update: {},
      create: { name: tradeNames[i], display_order: i + 1 },
    });
  }

  const sourceNames = [
    'Al-Hiraa Office (Walk-in)', 'Phone Inquiry', 'Online / Website',
    'Associate Referral', 'Social Media', 'Recruitment Camp',
    'Newspaper Ad', 'Word of Mouth',
  ];
  for (let i = 0; i < sourceNames.length; i++) {
    await prisma.source.upsert({
      where: { name: sourceNames[i] },
      update: {},
      create: { name: sourceNames[i], display_order: i + 1 },
    });
  }

  const statesAndCities: Record<string, string[]> = {
    'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman', 'Malda', 'Murshidabad'],
    'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
    'Uttar Pradesh': ['Lucknow', 'Varanasi', 'Agra', 'Kanpur', 'Allahabad', 'Gorakhpur'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru'],
    'Delhi': ['New Delhi', 'North Delhi', 'South Delhi'],
    'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar'],
    'Haryana': ['Gurugram', 'Faridabad', 'Ambala'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
  };

  let stateOrder = 1;
  for (const [stateName, cities] of Object.entries(statesAndCities)) {
    const state = await prisma.state.upsert({
      where: { name: stateName },
      update: {},
      create: { name: stateName, display_order: stateOrder++ },
    });
    for (let i = 0; i < cities.length; i++) {
      await prisma.city.upsert({
        where: { name_state_id: { name: cities[i], state_id: state.id } },
        update: {},
        create: { name: cities[i], state_id: state.id, display_order: i + 1 },
      });
    }
  }
  console.log(`   Trades: ${tradeNames.length}, Sources: ${sourceNames.length}, States: ${Object.keys(statesAndCities).length}`);
}

// ── STEP 2: Clear All Transactional Tables ──────────────────────────────────
async function clearAll() {
  console.log('\n[2] Clearing transactional tables (FK-safe order)...');
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.associateCommission.deleteMany();
  await prisma.feeChangeRequest.deleteMany();
  await prisma.dropout.deleteMany();
  await prisma.interviewCheckin.deleteMany();
  await prisma.interviewEvent.deleteMany();
  await prisma.processTracking.deleteMany();
  await prisma.processDetails.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.candidateJob.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.associate.deleteMany();
  await prisma.referrer.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.messageTemplate.deleteMany();
  console.log('   All transactional tables cleared.');
}

// ── STEP 3: Seed Users ───────────────────────────────────────────────────────
async function seedUsers(pw: string) {
  console.log('\n[3] Seeding users...');
  const defs = [
    { full_name: 'Seemab Ahmed',      email: 'admin@alhiraa.com',       phone: '9876543210', role: UserRole.admin },
    { full_name: 'Arjun Biswas',      email: 'manager1@alhiraa.com',    phone: '9876541001', role: UserRole.manager },
    { full_name: 'Meena Lakra',       email: 'manager2@alhiraa.com',    phone: '9876541002', role: UserRole.manager },
    { full_name: 'Farhan Sheikh',     email: 'recruiter1@alhiraa.com',  phone: '9876542001', role: UserRole.recruiter },
    { full_name: 'Ananya Roy',        email: 'recruiter2@alhiraa.com',  phone: '9876542002', role: UserRole.recruiter },
    { full_name: 'Priya Sharma',      email: 'de1@alhiraa.com',         phone: '9876543001', role: UserRole.data_entry },
    { full_name: 'Rohit Patel',       email: 'de2@alhiraa.com',         phone: '9876543002', role: UserRole.data_entry },
    { full_name: 'Sanjay Mondal',     email: 'de3@alhiraa.com',         phone: '9876543003', role: UserRole.data_entry },
    { full_name: 'Kavita Singh',      email: 'pm1@alhiraa.com',         phone: '9876544001', role: UserRole.process_manager },
    { full_name: 'Vikas Tiwari',      email: 'pm2@alhiraa.com',         phone: '9876544002', role: UserRole.process_manager },
  ];
  const users: Record<string, any> = {};
  for (const d of defs) {
    const u = await prisma.user.create({ data: { ...d, password_hash: pw } });
    const key = d.email.split('@')[0].replace(/\d/g, '') + (d.email.match(/\d+/)?.[0] ?? '');
    users[key] = u;
  }
  console.log(`   Created ${defs.length} users.`);
  return users;
}

// ── STEP 4: Seed Companies ───────────────────────────────────────────────────
async function seedCompanies() {
  console.log('\n[4] Seeding companies...');
  const defs = [
    // Saudi Arabia
    { name: 'Al Rajhi Construction Co.',   country: GulfCountry.saudi_arabia, city: 'Riyadh',      industry: Industry.construction,  contact_person: 'Mohammed Al-Rashid', phone: '+966-11-2345678', email: 'hr@alrajhicc.com',        agreement_details: 'Service fee INR 45,000 per candidate. 12-month contract.' },
    { name: 'Saudi Oger Ltd',              country: GulfCountry.saudi_arabia, city: 'Jeddah',      industry: Industry.oil_and_gas,   contact_person: 'Ibrahim Al-Oger',    phone: '+966-12-7890123', email: 'recruit@saudioger.com',   agreement_details: 'Service fee INR 55,000 per candidate. 24-month contract.' },
    { name: 'Gulf Catering Company',       country: GulfCountry.saudi_arabia, city: 'Riyadh',      industry: Industry.hospitality,   contact_person: 'Nasser Al-Qahtani', phone: '+966-11-3456789', email: 'hr@gulfcatering.sa',       agreement_details: 'Service fee INR 35,000 per candidate. 12-month contract.' },
    // UAE
    { name: 'Emirates Facilities Mgmt',   country: GulfCountry.uae,          city: 'Dubai',       industry: Industry.facilities,    contact_person: 'Ahmed Hassan',       phone: '+971-4-3456789',  email: 'jobs@efm.ae',              agreement_details: 'Service fee AED 6,000 per candidate. 24-month contract.' },
    { name: 'Al Futtaim Engineering',      country: GulfCountry.uae,          city: 'Abu Dhabi',   industry: Industry.manufacturing, contact_person: 'Saeed Al-Futtaim',  phone: '+971-2-6789012',  email: 'hr@alfuttaim.ae',          agreement_details: 'Service fee INR 50,000 per candidate. 24-month contract.' },
    { name: 'Naffco Fire Fighting LLC',    country: GulfCountry.uae,          city: 'Dubai',       industry: Industry.manufacturing, contact_person: 'James Mathew',       phone: '+971-4-2222333',  email: 'hr@naffco.com',            agreement_details: 'Service fee INR 40,000 per candidate. 12-month contract.' },
    // Qatar
    { name: 'Qatar National Projects',    country: GulfCountry.qatar,        city: 'Doha',        industry: Industry.construction,  contact_person: 'Khalid Al-Thani',   phone: '+974-4-5678901',  email: 'hr@qnp.qa',                agreement_details: 'Service fee INR 45,000 per candidate. 24-month contract.' },
    { name: 'Qatar Airways Catering',     country: GulfCountry.qatar,        city: 'Doha',        industry: Industry.hospitality,   contact_person: 'Sara Al-Subaie',    phone: '+974-4-1122334',  email: 'recruit@qacatering.qa',    agreement_details: 'Service fee INR 35,000 per candidate. 12-month contract.' },
    // Kuwait
    { name: 'Kuwait National Petroleum',  country: GulfCountry.kuwait,       city: 'Kuwait City', industry: Industry.oil_and_gas,   contact_person: 'Ali Al-Mutairi',    phone: '+965-2-3456789',  email: 'hr@knpc.kw',               agreement_details: 'Service fee INR 50,000 per candidate. 24-month contract.' },
    // Oman
    { name: 'Oman Mechanical Services',   country: GulfCountry.oman,         city: 'Muscat',      industry: Industry.other,         contact_person: 'Hamed Al-Balushi',  phone: '+968-2-1234567',  email: 'jobs@oms.om',              agreement_details: 'Service fee INR 45,000 per candidate. 12-month contract.' },
    // Extra companies for preview
    { name: 'Riyadh Metro Contracting',   country: GulfCountry.saudi_arabia, city: 'Riyadh',      industry: Industry.construction,  contact_person: 'Abdullah Al-Dosari', phone: '+966-11-8877665', email: 'hr@riyadhmetro.sa',       agreement_details: 'Service fee INR 48,000 per candidate. 24-month contract.' },
    { name: 'Dubai Logistics Hub',        country: GulfCountry.uae,          city: 'Dubai',       industry: Industry.other,         contact_person: 'Rashid Al-Maktoum', phone: '+971-4-9988776',  email: 'careers@dlhub.ae',        agreement_details: 'Service fee AED 5,500 per candidate. 12-month contract.' },
    { name: 'Qatar Steel Industries',     country: GulfCountry.qatar,        city: 'Mesaieed',    industry: Industry.manufacturing, contact_person: 'Tariq Al-Kuwari',   phone: '+974-4-5566778',  email: 'hr@qatarsteel.qa',        agreement_details: 'Service fee INR 52,000 per candidate. 24-month contract.' },
    { name: 'Kuwait Oilfield Services',   country: GulfCountry.kuwait,       city: 'Ahmadi',      industry: Industry.oil_and_gas,   contact_person: 'Yousef Al-Sabah',   phone: '+965-2-7788990',  email: 'jobs@kofs.kw',            agreement_details: 'Service fee INR 55,000 per candidate. 24-month contract.' },
    { name: 'Salalah Port Services',      country: GulfCountry.oman,         city: 'Salalah',     industry: Industry.facilities,    contact_person: 'Majid Al-Habsi',    phone: '+968-2-9988776',  email: 'hr@salalahports.om',      agreement_details: 'Service fee INR 42,000 per candidate. 12-month contract.' },
  ];
  const companies: any[] = [];
  for (const d of defs) {
    companies.push(await prisma.company.create({ data: d }));
  }
  console.log(`   Created ${companies.length} companies.`);
  return companies;
}

// ── STEP 5: Seed Jobs ────────────────────────────────────────────────────────
async function seedJobs(companies: any[], trades: any[], users: Record<string, any>) {
  console.log('\n[5] Seeding jobs...');

  const tradeMap: Record<string, number> = {};
  for (const t of trades) tradeMap[t.name] = t.id;

  const tf = (n: string) => tradeMap[n] ?? trades[0].id;

  const defs = [
    // Al Rajhi (2 jobs)
    { companyIdx: 0, title: 'Senior Welder',    tradeName: 'Welder',               positions: 15, salMin: 1800, salMax: 2200, cur: 'SAR', fee: 45000, priority: JobPriority.high,   status: JobStatus.open,                   country: GulfCountry.saudi_arabia },
    { companyIdx: 0, title: 'Plumber',           tradeName: 'Plumber',              positions: 10, salMin: 1600, salMax: 1900, cur: 'SAR', fee: 38000, priority: JobPriority.medium, status: JobStatus.interviews_scheduled,   country: GulfCountry.saudi_arabia },
    // Saudi Oger (2 jobs)
    { companyIdx: 1, title: 'Pipe Fitter',       tradeName: 'Pipe Fitter',          positions: 20, salMin: 2000, salMax: 2500, cur: 'SAR', fee: 55000, priority: JobPriority.high,   status: JobStatus.open,                   country: GulfCountry.saudi_arabia },
    { companyIdx: 1, title: 'Safety Officer',    tradeName: 'Safety Officer',       positions:  5, salMin: 3000, salMax: 4000, cur: 'SAR', fee: 65000, priority: JobPriority.medium, status: JobStatus.in_process,             country: GulfCountry.saudi_arabia },
    // Gulf Catering (2 jobs)
    { companyIdx: 2, title: 'Cook / Chef',       tradeName: 'Cook / Chef',          positions: 12, salMin: 1400, salMax: 1800, cur: 'SAR', fee: 35000, priority: JobPriority.medium, status: JobStatus.open,                   country: GulfCountry.saudi_arabia },
    { companyIdx: 2, title: 'Waiter / Steward',  tradeName: 'Waiter / Steward',     positions: 20, salMin: 1200, salMax: 1500, cur: 'SAR', fee: 32000, priority: JobPriority.low,    status: JobStatus.closed,                 country: GulfCountry.saudi_arabia },
    // Emirates FM (2 jobs)
    { companyIdx: 3, title: 'Electrician 440V',  tradeName: 'Electrician 440V',     positions:  8, salMin: 2000, salMax: 2500, cur: 'AED', fee: 42000, priority: JobPriority.high,   status: JobStatus.interviews_scheduled,   country: GulfCountry.uae },
    { companyIdx: 3, title: 'HVAC Technician',   tradeName: 'HVAC Technician',      positions:  6, salMin: 2200, salMax: 2800, cur: 'AED', fee: 48000, priority: JobPriority.high,   status: JobStatus.open,                   country: GulfCountry.uae },
    // Al Futtaim (2 jobs)
    { companyIdx: 4, title: 'Steel Fixer',        tradeName: 'Steel Fixer',          positions: 18, salMin: 1800, salMax: 2200, cur: 'AED', fee: 50000, priority: JobPriority.high,   status: JobStatus.in_process,             country: GulfCountry.uae },
    { companyIdx: 4, title: 'Mason',              tradeName: 'Mason',                positions: 25, salMin: 1500, salMax: 1900, cur: 'AED', fee: 40000, priority: JobPriority.medium, status: JobStatus.on_hold,                country: GulfCountry.uae },
    // Naffco (2 jobs)
    { companyIdx: 5, title: 'Scaffolder',         tradeName: 'Scaffolder',           positions: 15, salMin: 1700, salMax: 2100, cur: 'AED', fee: 40000, priority: JobPriority.medium, status: JobStatus.open,                   country: GulfCountry.uae },
    { companyIdx: 5, title: 'Security Guard',     tradeName: 'Security Guard',       positions: 20, salMin: 1500, salMax: 1800, cur: 'AED', fee: 36000, priority: JobPriority.low,    status: JobStatus.closed,                 country: GulfCountry.uae },
    // Qatar National (2 jobs)
    { companyIdx: 6, title: 'Mason',              tradeName: 'Mason',                positions: 30, salMin: 1600, salMax: 2000, cur: 'QAR', fee: 45000, priority: JobPriority.high,   status: JobStatus.interviews_scheduled,   country: GulfCountry.qatar },
    { companyIdx: 6, title: 'Rigger',             tradeName: 'Rigger',               positions: 10, salMin: 1800, salMax: 2200, cur: 'QAR', fee: 48000, priority: JobPriority.medium, status: JobStatus.in_process,             country: GulfCountry.qatar },
    // Qatar Airways (2 jobs)
    { companyIdx: 7, title: 'Cook / Chef',        tradeName: 'Cook / Chef',          positions: 15, salMin: 1500, salMax: 2000, cur: 'QAR', fee: 35000, priority: JobPriority.medium, status: JobStatus.open,                   country: GulfCountry.qatar },
    { companyIdx: 7, title: 'Housekeeping',       tradeName: 'Housekeeping',         positions: 25, salMin: 1200, salMax: 1500, cur: 'QAR', fee: 30000, priority: JobPriority.low,    status: JobStatus.closed,                 country: GulfCountry.qatar },
    // Kuwait National (2 jobs)
    { companyIdx: 8, title: 'Security Guard',     tradeName: 'Security Guard',       positions: 25, salMin: 180,  salMax: 220,  cur: 'KWD', fee: 45000, priority: JobPriority.medium, status: JobStatus.interviews_scheduled,   country: GulfCountry.kuwait },
    { companyIdx: 8, title: 'Pipe Fitter',        tradeName: 'Pipe Fitter',          positions: 12, salMin: 250,  salMax: 300,  cur: 'KWD', fee: 55000, priority: JobPriority.high,   status: JobStatus.in_process,             country: GulfCountry.kuwait },
    // Oman Mechanical (2 jobs)
    { companyIdx: 9, title: 'Rigger',             tradeName: 'Rigger',               positions: 10, salMin:  700, salMax: 900,  cur: 'OMR', fee: 42000, priority: JobPriority.medium, status: JobStatus.on_hold,                country: GulfCountry.oman },
    { companyIdx: 9, title: 'Driver - LMV',       tradeName: 'Driver - LMV',         positions:  8, salMin:  600, salMax: 800,  cur: 'OMR', fee: 36000, priority: JobPriority.low,    status: JobStatus.on_hold,                country: GulfCountry.oman },
    // Riyadh Metro Contracting (2 jobs)
    { companyIdx: 10, title: 'Shuttering Carpenter', tradeName: 'Carpenter',          positions: 20, salMin: 1800, salMax: 2200, cur: 'SAR', fee: 46000, priority: JobPriority.high,   status: JobStatus.open,                   country: GulfCountry.saudi_arabia },
    { companyIdx: 10, title: 'Steel Fixer',          tradeName: 'Steel Fixer',        positions: 25, salMin: 1700, salMax: 2100, cur: 'SAR', fee: 44000, priority: JobPriority.medium, status: JobStatus.open,                   country: GulfCountry.saudi_arabia },
    // Dubai Logistics Hub (2 jobs)
    { companyIdx: 11, title: 'Warehouse Helper',     tradeName: 'Helper / General Labor',             positions: 30, salMin: 1400, salMax: 1700, cur: 'AED', fee: 32000, priority: JobPriority.medium, status: JobStatus.open,                   country: GulfCountry.uae },
    { companyIdx: 11, title: 'Driver - HMV',         tradeName: 'Driver - HMV',       positions: 12, salMin: 2200, salMax: 2800, cur: 'AED', fee: 48000, priority: JobPriority.high,   status: JobStatus.open,                   country: GulfCountry.uae },
    // Qatar Steel (2 jobs)
    { companyIdx: 12, title: 'Welder 6G',            tradeName: 'Welder',             positions: 15, salMin: 2400, salMax: 2900, cur: 'QAR', fee: 55000, priority: JobPriority.high,   status: JobStatus.open,                   country: GulfCountry.qatar },
    { companyIdx: 12, title: 'Crane Operator',       tradeName: 'Rigger',             positions:  6, salMin: 2600, salMax: 3200, cur: 'QAR', fee: 60000, priority: JobPriority.high,   status: JobStatus.interviews_scheduled,   country: GulfCountry.qatar },
    // Kuwait Oilfield (2 jobs)
    { companyIdx: 13, title: 'Mechanical Fitter',    tradeName: 'Pipe Fitter',        positions: 10, salMin:  260, salMax:  320, cur: 'KWD', fee: 52000, priority: JobPriority.high,   status: JobStatus.open,                   country: GulfCountry.kuwait },
    { companyIdx: 13, title: 'Electrician 440V',     tradeName: 'Electrician 440V',   positions:  8, salMin:  280, salMax:  340, cur: 'KWD', fee: 54000, priority: JobPriority.medium, status: JobStatus.in_process,             country: GulfCountry.kuwait },
    // Salalah Port Services (2 jobs)
    { companyIdx: 14, title: 'Forklift Operator',    tradeName: 'Driver - LMV',       positions: 12, salMin:  650, salMax:  850, cur: 'OMR', fee: 40000, priority: JobPriority.medium, status: JobStatus.open,                   country: GulfCountry.oman },
    { companyIdx: 14, title: 'Facility Helper',      tradeName: 'Helper / General Labor',             positions: 20, salMin:  550, salMax:  700, cur: 'OMR', fee: 32000, priority: JobPriority.low,    status: JobStatus.interviews_scheduled,   country: GulfCountry.oman },
  ];

  const jobs: any[] = [];
  for (const d of defs) {
    jobs.push(await prisma.job.create({
      data: {
        company_id: companies[d.companyIdx].id,
        title: d.title,
        trade_id: tf(d.tradeName),
        positions_required: d.positions,
        positions_filled: 0,
        salary_min: d.salMin,
        salary_max: d.salMax,
        salary_currency: d.cur,
        service_fee: d.fee,
        country: d.country,
        status: d.status,
        priority: d.priority,
        created_by: users['admin'].id,
      },
    }));
  }
  console.log(`   Created ${jobs.length} jobs.`);
  return jobs;
}

// ── STEP 6: Seed Associates ──────────────────────────────────────────────────
async function seedAssociates(pw: string) {
  console.log('\n[6] Seeding associates...');
  const defs = [
    { full_name: 'Mohammad Rafiq',    phone: '9850050001', email: 'rafiq@assoc.in',     commission_rate: 5, state: 'West Bengal', city: 'Kolkata',        bank_name: 'SBI',  bank_account_number: '10001001001', bank_ifsc: 'SBIN0001234', status: AssociateStatus.active },
    { full_name: 'Baldev Singh',      phone: '9850050002', email: 'baldev@assoc.in',    commission_rate: 4, state: 'Bihar',       city: 'Patna',          bank_name: 'PNB',  bank_account_number: '20002002002', bank_ifsc: 'PUNB0001234', status: AssociateStatus.active },
    { full_name: 'Karim Ansari',      phone: '9850050003', email: 'karim@assoc.in',     commission_rate: 6, state: 'Jharkhand',   city: 'Ranchi',         bank_name: 'HDFC', bank_account_number: '30003003003', bank_ifsc: 'HDFC0001234', status: AssociateStatus.active },
    { full_name: 'Suresh Yadav',      phone: '9850050004', email: 'suresh@assoc.in',    commission_rate: 5, state: 'Uttar Pradesh', city: 'Lucknow',      bank_name: 'ICICI', bank_account_number: '40004004004', bank_ifsc: 'ICIC0001234', status: AssociateStatus.active },
    { full_name: 'Bikash Datta',      phone: '9850050005', email: 'bikash@assoc.in',    commission_rate: 4, state: 'West Bengal', city: 'Howrah',         bank_name: 'UCO',  bank_account_number: '50005005005', bank_ifsc: 'UCBA0001234', status: AssociateStatus.active },
    { full_name: 'Deepak Mishra',     phone: '9850050006', email: 'deepak@assoc.in',    commission_rate: 5, state: 'Bihar',       city: 'Gaya',           bank_name: 'BOI',  bank_account_number: '60006006006', bank_ifsc: 'BKID0001234', status: AssociateStatus.active },
    { full_name: 'Arun Kumar Das',    phone: '9850050007', email: 'arun@assoc.in',      commission_rate: 6, state: 'Odisha',      city: 'Bhubaneswar',    bank_name: 'SBI',  bank_account_number: '70007007007', bank_ifsc: 'SBIN0005678', status: AssociateStatus.active },
    { full_name: 'Md Sabir Khan',     phone: '9850050008', email: 'sabir@assoc.in',     commission_rate: 4, state: 'West Bengal', city: 'Murshidabad',    bank_name: 'UBI',  bank_account_number: '80008008008', bank_ifsc: 'UBIN0001234', status: AssociateStatus.active },
    { full_name: 'Pawan Sahu',        phone: '9850050009', email: 'pawan@assoc.in',     commission_rate: 3, state: 'Jharkhand',   city: 'Dhanbad',        bank_name: 'PNB',  bank_account_number: '90009009009', bank_ifsc: 'PUNB0005678', status: AssociateStatus.inactive },
    { full_name: 'Ramesh Bari',       phone: '9850050010', email: 'ramesh.b@assoc.in',  commission_rate: 5, state: 'Assam',       city: 'Guwahati',       bank_name: 'SBI',  bank_account_number: '10101010101', bank_ifsc: 'SBIN0009012', status: AssociateStatus.inactive },
  ];
  const associates: any[] = [];
  for (const d of defs) {
    associates.push(await prisma.associate.create({
      data: {
        full_name: d.full_name,
        phone: d.phone,
        email: d.email,
        commission_rate: d.commission_rate,
        commission_type: 'per_deployment',
        location_state: d.state,
        location_city: d.city,
        bank_name: d.bank_name,
        bank_account_name: d.full_name,
        bank_account_number: d.bank_account_number,
        bank_ifsc: d.bank_ifsc,
        status: d.status,
        password_hash: pw,
        total_commission_earned: 0,
        total_commission_paid: 0,
      },
    }));
  }
  console.log(`   Created ${associates.length} associates.`);
  return associates;
}

// ── STEP 7: Seed Referrers ───────────────────────────────────────────────────
async function seedReferrers() {
  console.log('\n[7] Seeding referrers...');
  const defs = [
    { name: 'Abdul Mannan',    phone: '9860060001', email: 'mannan@gmail.com',    is_active: true },
    { name: 'Goutam Haldar',   phone: '9860060002', email: 'goutam.h@gmail.com',  is_active: true },
    { name: 'Md Sajjad Ali',   phone: '9860060003', email: 'sajjad@gmail.com',    is_active: true },
    { name: 'Ratan Mondal',    phone: '9860060004', email: 'ratan.m@gmail.com',   is_active: true },
    { name: 'Subrata Das',     phone: '9860060005', email: 'subrata.d@gmail.com', is_active: true },
    { name: 'Rina Devi',       phone: '9860060006', email: 'rina.devi@gmail.com', is_active: true },
    { name: 'Ajit Kumar',      phone: '9860060007', email: 'ajit.k@gmail.com',    is_active: true },
    { name: 'Naresh Paswan',   phone: '9860060008', email: 'naresh.p@gmail.com',  is_active: true },
    { name: 'Champa Begum',    phone: '9860060009', email: 'champa.b@gmail.com',  is_active: true },
    { name: 'Dilip Roy',       phone: '9860060010', email: 'dilip.r@gmail.com',   is_active: false },
  ];
  const referrers: any[] = [];
  for (const d of defs) {
    referrers.push(await prisma.referrer.create({ data: d }));
  }
  console.log(`   Created ${referrers.length} referrers.`);
  return referrers;
}

// ── STEP 8: Seed 100 Candidates ──────────────────────────────────────────────
async function seedCandidates(
  states: any[], cities: any[], trades: any[], sources: any[],
  associates: any[], referrers: any[]
) {
  console.log('\n[8] Seeding 100 candidates...');

  const maleNames = [
    'Mohammad Arif', 'Sk. Alam Hossain', 'Ramesh Kumar Mahato', 'Abdul Karim Sheikh',
    'Bikash Chandra Das', 'Md Taufiq Ansari', 'Suresh Prasad Yadav', 'Raju Mondal',
    'Md Imran Khan', 'Santosh Kumar Bind', 'Anil Kumar Singh', 'Pankaj Sharma',
    'Vikram Yadav', 'Aakash Gupta', 'Rahul Verma', 'Deepak Kumar',
    'Sunil Paswan', 'Manoj Tiwari', 'Ajay Singh', 'Sanjay Kumar',
    'Md Salim', 'Hafizur Rahman', 'Moinul Haque', 'Saurav Ghosh',
    'Tarun Das', 'Nitesh Kumar', 'Amit Roy', 'Rajesh Mandal',
    'Kamal Hossain', 'Pintu Sarkar', 'Md Akhtar', 'Bablu Yadav',
    'Pranab Chatterjee', 'Tapas Bag', 'Uttam Biswas', 'Liton Mondal',
    'Shyamal Ghosh', 'Biswajit Paul', 'Sudip Dey', 'Niloy Sen',
    'Md Hasibur Rahman', 'Sk. Miraj Ali', 'Dipankar Roy', 'Palash Saha',
    'Rinku Das', 'Tapan Mandal', 'Bikas Tudu', 'Suman Mahato',
    'Ashok Kumar Mahato', 'Ranjit Singh', 'Dipen Borah', 'Bhupen Saikia',
    'Lakhan Sahu', 'Pradeep Nayak', 'Santanu Mishra', 'Gobinda Patra',
    'Madan Mohan Das', 'Rabi Sharma', 'Kailash Yadav', 'Chandrakant Bind',
  ];
  const femaleNames = [
    'Rina Begum', 'Puja Kumari', 'Sunita Devi', 'Chameli Devi', 'Nasima Begum',
    'Sangita Mondal', 'Priya Kumari', 'Rekha Devi', 'Mamata Das', 'Anita Singh',
    'Meenu Sharma', 'Kavita Yadav', 'Sushila Devi', 'Geeta Kumari', 'Lalita Devi',
    'Pushpa Devi', 'Savita Kumari', 'Manju Devi', 'Shanti Devi', 'Durga Devi',
    'Roshni Begum', 'Saima Khatun', 'Hafiza Begum', 'Jasmin Khatun', 'Sania Parveen',
    'Bindu Kumari', 'Usha Devi', 'Gita Devi', 'Asha Rani', 'Nandita Mondal',
    'Suparna Roy', 'Kakali Das', 'Mita Paul', 'Soma Saha', 'Chumki Ghosh',
    'Jharna Devi', 'Pampa Mondal', 'Ratna Kumari', 'Swapna Das', 'Lipi Roy',
  ];

  const educations = ['8th_pass', '10th_pass', '12th_pass', 'graduate', 'iti', 'diploma', 'other'];
  const regModes: RegistrationMode[] = [
    RegistrationMode.walk_in, RegistrationMode.walk_in, RegistrationMode.walk_in,
    RegistrationMode.phone, RegistrationMode.phone,
    RegistrationMode.online, RegistrationMode.online,
    RegistrationMode.camp,
    RegistrationMode.referral,
    RegistrationMode.associate,
  ];
  const englishLevels: EnglishLevel[] = [
    EnglishLevel.none, EnglishLevel.none, EnglishLevel.basic,
    EnglishLevel.basic, EnglishLevel.conversational, EnglishLevel.fluent,
  ];

  // State/city pool for candidates (6 key states)
  const statePool = states.filter(s => ['West Bengal', 'Bihar', 'Jharkhand', 'Uttar Pradesh', 'Odisha', 'Assam'].includes(s.name));
  const cityPool: Record<number, any[]> = {};
  for (const s of statePool) {
    cityPool[s.id] = cities.filter((c: any) => c.state_id === s.id);
  }

  const candidates: any[] = [];
  let maleIdx = 0, femaleIdx = 0;

  for (let i = 0; i < 100; i++) {
    const isFemale = i >= 60;
    const name = isFemale ? femaleNames[femaleIdx++] : maleNames[maleIdx++];
    const gender: Gender = isFemale ? Gender.female : Gender.male;
    const isComplete = i < 70;
    const hasPassport = i < 80;

    // deterministic phone & passport
    const phone = '991' + String(i).padStart(7, '0');
    const passport = hasPassport ? ('P' + String(1000001 + i).slice(1)) : null;

    // state/city selection (weighted: WB=25, Bihar=20, Jharkhand=15, UP=20, Odisha=10, Assam=10)
    const stateWeights = [25, 20, 15, 20, 10, 10];
    let cumulative = 0;
    const rndVal = (i * 7) % 100;
    let selectedState = statePool[0];
    for (let si = 0; si < statePool.length; si++) {
      cumulative += stateWeights[si];
      if (rndVal < cumulative) { selectedState = statePool[si]; break; }
    }
    const citiesForState = cityPool[selectedState.id] ?? [];
    const selectedCity = citiesForState[i % Math.max(citiesForState.length, 1)];

    // Registration mode & source
    const regMode = isComplete ? regModes[i % regModes.length] : RegistrationMode.walk_in;
    const source = sources[i % sources.length];

    // associate / referrer linkage
    const associateId = (regMode === RegistrationMode.associate && i >= 90)
      ? associates[i % associates.length]?.id ?? null : null;
    const referrerId = (regMode === RegistrationMode.referral && i >= 80 && i < 90)
      ? referrers[i % referrers.length]?.id ?? null : null;

    // Status distribution
    let status: CandidateStatus;
    if (i < 80) status = CandidateStatus.active;
    else if (i < 90) status = CandidateStatus.inactive;
    else if (i < 97) status = CandidateStatus.deployed;
    else status = CandidateStatus.blacklisted;

    // DOB
    const dob = new Date(1978 + (i % 20), (i * 3) % 12, (i % 28) + 1);

    // Positions
    const pos1 = trades[i % trades.length].id;
    const pos2 = trades[(i + 3) % trades.length].id;
    const pos3 = isComplete ? trades[(i + 6) % trades.length].id : null;

    const candidateData: any = {
      full_name: name,
      dob,
      whatsapp_no: phone,
      gender,
      ecr_type: i % 3 === 0 ? EcrType.ecnr : EcrType.ecr,
      state_id: selectedState.id,
      city_id: selectedCity?.id ?? undefined,
      education: educations[i % educations.length],
      position_1_id: pos1,
      position_2_id: pos2,
      position_3_id: pos3,
      source_id: source.id,
      registration_mode: regMode,
      status,
      completion_status: isComplete ? CompletionStatus.complete : CompletionStatus.incomplete,
      english_speaking: englishLevels[i % englishLevels.length],
      gulf_return: i % 4 === 0,
      remarks: isComplete ? null : `Incomplete — follow up needed`,
      registered_by: 'de1@alhiraa.com',
      created_at: daysAgo(120 - i),
    };

    if (hasPassport) {
      candidateData.passport_no = passport;
    }
    if (associateId) candidateData.associate_id = associateId;
    if (referrerId) candidateData.referrer_id = referrerId;
    if (i % 5 === 0) candidateData.indian_experience = `${1 + (i % 5)} years`;
    if (i % 7 === 0) candidateData.alternate_contact = '998' + String(i).padStart(7, '0');

    candidates.push(await prisma.candidate.create({ data: candidateData }));
  }
  console.log(`   Created ${candidates.length} candidates.`);
  return candidates;
}

// ── STEP 9: Seed Pipeline (CandidateJob) ─────────────────────────────────────
async function seedPipeline(candidates: any[], jobs: any[], users: Record<string, any>) {
  console.log('\n[9] Seeding pipeline entries...');

  const recruiters = [users['recruiter1'], users['recruiter2']];
  const pms = [users['pm1'], users['pm2']];

  // Status distribution by candidate index range
  const getStatus = (idx: number): InterestStatus => {
    if (idx < 15) return InterestStatus.not_contacted;
    if (idx < 25) return InterestStatus.contacted_interested;
    if (idx < 30) return InterestStatus.contacted_not_interested;
    if (idx < 35) return InterestStatus.contacted_maybe_later;
    if (idx < 40) return InterestStatus.contacted_not_reachable;
    if (idx < 55) return InterestStatus.lined_up;
    if (idx < 70) return InterestStatus.interview_selected;
    if (idx < 75) return InterestStatus.interview_rejected;
    if (idx < 80) return InterestStatus.interview_on_hold;
    return InterestStatus.not_contacted;
  };

  const cjobs: any[] = [];
  const usedPairs = new Set<string>();

  // Primary pipeline: candidates 0–79 each get one job
  for (let i = 0; i < 80; i++) {
    const candidate = candidates[i];
    const job = jobs[i % jobs.length];
    const pair = `${candidate.id}-${job.id}`;
    if (usedPairs.has(pair)) continue;
    usedPairs.add(pair);

    const status = getStatus(i);
    const assignedTo = (status === InterestStatus.lined_up || status === InterestStatus.interview_selected)
      ? pms[i % 2].id
      : recruiters[i % 2].id;

    const followUpDate = (i % 3 === 0) ? daysAhead(rnd(1, 14)) : null;

    cjobs.push(await prisma.candidateJob.create({
      data: {
        candidate_id: candidate.id,
        job_id: job.id,
        status,
        assigned_to: assignedTo,
        follow_up_date: followUpDate,
        created_at: daysAgo(90 - i),
      },
    }));
  }

  // Secondary pipeline: candidates 0–39 also in a second job (different from first)
  for (let i = 0; i < 40; i++) {
    const candidate = candidates[i];
    const job = jobs[(i + 7) % jobs.length]; // offset to avoid same job
    const pair = `${candidate.id}-${job.id}`;
    if (usedPairs.has(pair)) continue;
    usedPairs.add(pair);

    const status = i < 20 ? InterestStatus.not_contacted : InterestStatus.contacted_interested;
    cjobs.push(await prisma.candidateJob.create({
      data: {
        candidate_id: candidate.id,
        job_id: job.id,
        status,
        assigned_to: recruiters[i % 2].id,
        created_at: daysAgo(60 - i),
      },
    }));
  }

  console.log(`   Created ${cjobs.length} pipeline entries.`);
  return cjobs;
}

// ── STEP 10: Seed 5 Interview Events + Checkins ──────────────────────────────
async function seedInterviews(
  cjobs: any[], jobs: any[], companies: any[], candidates: any[], users: Record<string, any>
) {
  console.log('\n[10] Seeding interview events + checkins...');

  // Events linked to specific job indices
  const eventDefs = [
    { jobIdx: 0,  company: 'Al Rajhi — Senior Welder',   date: new Date('2026-03-15'), venue: 'Al-Hiraa Office, 14B Ripon Street, Kolkata',   capacity: 25, interviewer: 'Mr. Khalid Al-Rashid',  type: InterviewType.trade_test, status: InterviewEventStatus.completed, notes: 'Trade test conducted. Results declared same day.' },
    { jobIdx: 12, company: 'Qatar National — Mason',      date: new Date('2026-03-28'), venue: 'Hotel Hindustan International, Kolkata',       capacity: 20, interviewer: 'Mr. Ahmed Al-Thani',    type: InterviewType.in_person,  status: InterviewEventStatus.completed, notes: 'In-person interview. Results on same day.' },
    { jobIdx: 6,  company: 'Emirates FM — Electrician',  date: new Date('2026-04-05'), venue: 'ITDC Patliputra Hotel, Patna',                 capacity: 15, interviewer: 'Mr. Hassan Al-Maktoum', type: InterviewType.trade_test, status: InterviewEventStatus.completed, notes: 'Trade test + interview combined.' },
    { jobIdx: 16, company: 'Kuwait National — Security',  date: new Date('2026-04-20'), venue: 'Al-Hiraa Camp Office, Ranchi',                 capacity: 30, interviewer: 'Mr. Ali Al-Mutairi',    type: InterviewType.in_person,  status: InterviewEventStatus.scheduled, notes: 'Physical fitness + documentation check.' },
    { jobIdx: 18, company: 'Oman Mechanical — Rigger',   date: new Date('2026-05-10'), venue: 'Hotel Maurya, Patna',                          capacity: 20, interviewer: 'Mr. Hamed Al-Balushi',  type: InterviewType.combined,   status: InterviewEventStatus.scheduled, notes: 'Trade test + medical pre-screening.' },
  ];

  // Checkin counts for each event: [selected, rejected, on_hold, no_show]
  const checkinCounts = [
    [12, 5, 3, 0], // event 1: 20 total (all arrived)
    [8,  4, 3, 0], // event 2: 15 total
    [7,  3, 2, 0], // event 3: 12 total
    [0,  0, 0, 0], // event 4: 25 expected (all expected status)
    [0,  0, 0, 0], // event 5: 18 expected
  ];
  const scheduledCounts = [25, 18]; // events 4 & 5

  const events: any[] = [];
  const allCheckins: any[] = [];
  let cjobPointer = 0; // walk through cjobs to pick candidates for checkins

  // Get lined_up & interview_selected cjobs (for completed events)
  const selectedCjobs = cjobs.filter(cj =>
    cj.status === InterestStatus.lined_up || cj.status === InterestStatus.interview_selected
  );
  const notContactedCjobs = cjobs.filter(cj => cj.status === InterestStatus.not_contacted);

  for (let ei = 0; ei < eventDefs.length; ei++) {
    const def = eventDefs[ei];
    const job = jobs[def.jobIdx];
    const event = await prisma.interviewEvent.create({
      data: {
        job_id: job.id,
        event_date: def.date,
        venue_name: def.venue,
        interviewer_name: def.interviewer,
        interview_type: def.type,
        capacity: def.capacity,
        status: def.status,
        notes: def.notes,
        created_by: users['manager1'].id,
        created_at: daysAgo(60 - ei * 10),
      },
    });
    events.push(event);

    if (def.status === InterviewEventStatus.completed) {
      const [nSel, nRej, nHold] = checkinCounts[ei];
      const total = nSel + nRej + nHold;
      let slot = 1;

      // Pull cjobs for this event (use selectedCjobs for realistic data)
      for (let ci = 0; ci < total; ci++) {
        const poolIdx = (cjobPointer + ci) % selectedCjobs.length;
        const cj = selectedCjobs[poolIdx];

        let result: InterviewResult;
        if (ci < nSel) result = InterviewResult.selected;
        else if (ci < nSel + nRej) result = InterviewResult.rejected;
        else result = InterviewResult.on_hold;

        const checkin = await prisma.interviewCheckin.create({
          data: {
            interview_event_id: event.id,
            candidate_job_id: cj.id,
            checkin_status: CheckinStatus.arrived,
            checkin_time: new Date(def.date.getTime() + slot * 15 * 60000),
            interview_status: InterviewStatus.completed,
            result,
            result_notes: result === InterviewResult.selected ? 'Passed trade test. Good hands-on skills.' : result === InterviewResult.rejected ? 'Failed technical assessment.' : 'Put on hold pending company confirmation.',
            slot_number: slot++,
            checked_in_by: users['recruiter1'].id,
            created_at: def.date,
          },
        });
        allCheckins.push(checkin);

        // Update CandidateJob status based on result
        const newStatus = result === InterviewResult.selected ? InterestStatus.interview_selected
          : result === InterviewResult.rejected ? InterestStatus.interview_rejected
          : InterestStatus.interview_on_hold;
        await prisma.candidateJob.update({
          where: { id: cj.id },
          data: { status: newStatus },
        });
      }
      cjobPointer += total;

      // Update job positions_filled for selected
      await prisma.job.update({
        where: { id: job.id },
        data: { positions_filled: { increment: nSel } },
      });
    } else {
      // Scheduled events — create expected checkins
      const count = scheduledCounts[ei === 3 ? 0 : 1];
      for (let ci = 0; ci < count; ci++) {
        const cj = notContactedCjobs[ci % notContactedCjobs.length];
        allCheckins.push(await prisma.interviewCheckin.create({
          data: {
            interview_event_id: event.id,
            candidate_job_id: cj.id,
            checkin_status: CheckinStatus.expected,
            slot_number: ci + 1,
            created_at: daysAgo(5),
          },
        }));
      }
    }
  }

  console.log(`   Created ${events.length} interview events, ${allCheckins.length} checkins.`);
  return { events, checkins: allCheckins };
}

// ── STEP 11: Seed 50 Payments ────────────────────────────────────────────────
async function seedPayments(cjobs: any[], jobs: any[], users: Record<string, any>) {
  console.log('\n[11] Seeding payments...');

  const collectors = [users['de1'], users['de2'], users['de3'], users['pm1'], users['pm2']];

  // Target lined_up and interview_selected cjobs for payments
  const eligibleCjobs = cjobs.filter(cj =>
    cj.status === InterestStatus.lined_up ||
    cj.status === InterestStatus.interview_selected ||
    cj.status === InterestStatus.interview_rejected // overdue candidates
  ).slice(0, 35);

  const payments: any[] = [];
  let paymentCount = 0;

  for (let i = 0; i < eligibleCjobs.length && paymentCount < 50; i++) {
    const cj = eligibleCjobs[i];
    const job = jobs.find((j: any) => j.id === cj.job_id) ?? jobs[0];
    const totalFee = Number(job.service_fee);
    const numInstallments = i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1;
    const installmentAmount = Math.round(totalFee / numInstallments);

    for (let inst = 1; inst <= numInstallments && paymentCount < 50; inst++) {
      // Status distribution: paid(20), pending(15), overdue(10), waived(5)
      let status: PaymentStatus;
      let amountPaid = 0;
      let paidDate: Date | null = null;
      let feeWaiverAmount = 0;
      let feeWaiverApprovedBy: string | null = null;
      let receiptNumber: string | null = null;

      if (paymentCount < 20) {
        status = PaymentStatus.paid;
        amountPaid = installmentAmount;
        paidDate = daysAgo(rnd(5, 45));
        receiptNumber = `RCPT-${String(paymentCount + 1001).padStart(4, '0')}`;
      } else if (paymentCount < 35) {
        status = PaymentStatus.pending;
        amountPaid = 0;
      } else if (paymentCount < 45) {
        status = PaymentStatus.overdue;
        amountPaid = 0;
      } else {
        status = PaymentStatus.waived;
        feeWaiverAmount = Math.round(installmentAmount * 0.3);
        amountPaid = installmentAmount - feeWaiverAmount;
        feeWaiverApprovedBy = users['manager1'].id;
        paidDate = daysAgo(10);
        receiptNumber = `RCPT-WAIV-${String(paymentCount + 1).padStart(3, '0')}`;
      }

      const dueDate = paymentCount < 35 ? daysAhead(rnd(7, 30)) : daysAgo(rnd(1, 30));

      const pmData: any = {
        candidate_job_id: cj.id,
        total_fee: totalFee,
        installment_number: inst,
        amount_due: installmentAmount,
        amount_paid: amountPaid,
        fee_waiver_amount: feeWaiverAmount,
        due_date: dueDate,
        status,
        notes: status === PaymentStatus.waived ? 'Fee waiver approved by manager due to financial hardship.' : null,
      };
      if (paidDate) pmData.paid_date = paidDate;
      if (receiptNumber) pmData.receipt_number = receiptNumber;
      if (status !== PaymentStatus.pending && status !== PaymentStatus.overdue) {
        pmData.collected_by = collectors[paymentCount % collectors.length].id;
      }
      if (feeWaiverApprovedBy) pmData.fee_waiver_approved_by = feeWaiverApprovedBy;
      if (status === PaymentStatus.paid || status === PaymentStatus.waived) {
        pmData.payment_method = ['cash', 'bank_transfer', 'upi'][paymentCount % 3];
      }

      payments.push(await prisma.payment.create({ data: pmData }));
      paymentCount++;
    }
  }

  console.log(`   Created ${payments.length} payments.`);
  return payments;
}

// ── STEP 12: Seed 30 Deployments ─────────────────────────────────────────────
async function seedDeployments(
  candidates: any[], cjobs: any[], companies: any[], trades: any[], users: Record<string, any>
) {
  console.log('\n[12] Seeding deployments...');

  const statuses: DeploymentStatus[] = [
    ...Array(20).fill(DeploymentStatus.active),
    ...Array(5).fill(DeploymentStatus.completed),
    ...Array(3).fill(DeploymentStatus.terminated),
    ...Array(2).fill(DeploymentStatus.extended),
  ];

  const currencyMap: Record<string, string> = {
    saudi_arabia: 'SAR', uae: 'AED', qatar: 'QAR',
    kuwait: 'KWD', oman: 'OMR', bahrain: 'BHD',
  };

  // Use deployed candidates (status === deployed, index 90–96)
  const deployCandidates = candidates.filter((c: any) => c.status === CandidateStatus.deployed);
  // Supplement with active candidates
  const activeCandidates = candidates.filter((c: any) => c.status === CandidateStatus.active).slice(0, 23);
  const deployPool = [...deployCandidates, ...activeCandidates].slice(0, 30);

  const deployments: any[] = [];
  for (let i = 0; i < 30; i++) {
    const candidate = deployPool[i];
    const company = companies[i % companies.length];
    const status = statuses[i];
    const trade = trades[i % trades.length];
    const country = company.country as string;
    const currency = currencyMap[country] ?? 'SAR';

    const deployDate = daysAgo(rnd(30, 365));
    const contractMonths = [12, 18, 24, 36][i % 4];
    const contractEnd = dateAt(deployDate, contractMonths * 30);

    // Find linked cjob if any
    const linkedCj = cjobs.find((cj: any) => cj.candidate_id === candidate.id);

    const deployData: any = {
      candidate_id: candidate.id,
      company_id: company.id,
      position_id: trade.id,
      deployment_date: deployDate,
      contract_end_date: contractEnd,
      salary_amount: rnd(1200, 3500),
      salary_currency: currency,
      country: company.country,
      visa_number: `V${String(100000 + i).padStart(6, '0')}`,
      emergency_contact_name: `Family of ${candidate.full_name}`,
      emergency_contact_phone: '998' + String(i).padStart(7, '0'),
      status,
      notes: status === DeploymentStatus.terminated ? 'Terminated due to project completion.' : null,
      expiry_notified: status === DeploymentStatus.active && contractMonths <= 12,
      created_by: [users['pm1'], users['pm2']][i % 2].id,
      created_at: deployDate,
    };
    if (linkedCj) deployData.candidate_job_id = linkedCj.id;

    deployments.push(await prisma.deployment.create({ data: deployData }));
  }

  console.log(`   Created ${deployments.length} deployments.`);
  return deployments;
}

// ── STEP 13: Seed 200+ Call Logs ─────────────────────────────────────────────
async function seedCallLogs(cjobs: any[], users: Record<string, any>) {
  console.log('\n[13] Seeding call logs...');

  const callers = [users['recruiter1'], users['recruiter2'], users['de1'], users['de2'], users['de3']];
  const outcomes: CallOutcome[] = [
    CallOutcome.reached, CallOutcome.not_reachable, CallOutcome.call_back,
    CallOutcome.interested, CallOutcome.not_interested, CallOutcome.voicemail,
    CallOutcome.switched_off, CallOutcome.line_busy, CallOutcome.wrong_number,
  ];
  const noteTemplates = [
    'Candidate is interested. Will visit office this week.',
    'Number not reachable. Try again tomorrow.',
    'Candidate asked to call back after 3 days.',
    'Very interested. Has valid passport. Ready to join.',
    'Not interested currently. Has local job.',
    'Left voicemail with interview details.',
    'Number switched off. Try alternate contact.',
    'Line was busy. Called twice.',
    'Wrong number. Update contact details.',
  ];

  let totalLogs = 0;
  for (let i = 0; i < cjobs.length; i++) {
    const cj = cjobs[i];
    const numCalls = 2 + (i % 4); // 2–5 calls per pipeline entry
    for (let c = 0; c < numCalls; c++) {
      const outcomeIdx = (i + c * 3) % outcomes.length;
      await prisma.callLog.create({
        data: {
          candidate_job_id: cj.id,
          caller_id: callers[(i + c) % callers.length].id,
          call_timestamp: daysAgo(rnd(1, 30) + c),
          outcome: outcomes[outcomeIdx],
          notes: noteTemplates[outcomeIdx],
          call_attempt_number: c + 1,
          follow_up_date: outcomeIdx === 2 ? daysAhead(rnd(3, 10)) : null,
          follow_up_reminder_sent: false,
        },
      });
      totalLogs++;
    }
  }
  console.log(`   Created ${totalLogs} call logs.`);
}

// ── STEP 14: Seed 40 ProcessDetails ──────────────────────────────────────────
async function seedProcessDetails(cjobs: any[]) {
  console.log('\n[14] Seeding process details...');

  const selectedCjobs = cjobs.filter(cj =>
    cj.status === InterestStatus.interview_selected ||
    cj.status === InterestStatus.lined_up
  ).slice(0, 40);

  // Stage distribution: 0=selection only, 1=medical, 2=visa, 3=deployment
  const stages = ['selection', 'medical', 'visa', 'collection', 'deployment'];

  let count = 0;
  for (let i = 0; i < selectedCjobs.length; i++) {
    const cj = selectedCjobs[i];
    const stage = stages[i % stages.length];
    const selDate = daysAgo(60 - i);

    const pdData: any = {
      candidate_job_id: cj.id,
      year_of_selection: 2026,
      date_of_interview: daysAgo(70 - i),
      date_of_selection: selDate,
      selection_month: selDate.toLocaleString('default', { month: 'long' }),
      mode_of_selection: 'Trade Test',
      candidate_status: stage,
      total_receivable_amount: 45000 + (i * 1000),
      created_at: selDate,
    };

    if (stage === 'medical' || stage === 'visa' || stage === 'collection' || stage === 'deployment') {
      pdData.medical_status = 'fit';
      pdData.medical_app_date = dateAt(selDate, 7);
      pdData.medical_completion_date = dateAt(selDate, 14);
    }

    if (stage === 'visa' || stage === 'collection' || stage === 'deployment') {
      pdData.mofa_number = `MOFA-2026-${String(1000 + i).padStart(4, '0')}`;
      pdData.mofa_date = dateAt(selDate, 20);
      pdData.visa_issue_date = dateAt(selDate, 35);
    }

    if (stage === 'collection' || stage === 'deployment') {
      pdData.ticket_booking_date = dateAt(selDate, 40);
      pdData.advance_received = 15000 + (i * 500);
    }

    if (stage === 'deployment') {
      pdData.deployment_date = dateAt(selDate, 50);
      pdData.deployment_month = 'April';
      pdData.total_received_amount = 45000 + (i * 1000);
    }

    // Avoid duplicate candidate_job_id (unique constraint)
    const existing = await prisma.processDetails.findUnique({ where: { candidate_job_id: cj.id } });
    if (!existing) {
      await prisma.processDetails.create({ data: pdData });
      count++;
    }
  }

  console.log(`   Created ${count} process detail records.`);
}

// ── STEP 15: Seed ProcessTracking (6 steps × 20 candidates) ──────────────────
async function seedProcessTracking(cjobs: any[], users: Record<string, any>) {
  console.log('\n[15] Seeding process tracking steps...');

  const STEPS = [
    'Document Collection',
    'Medical Test',
    'GAMCA Slip',
    'Visa Processing',
    'Visa Stamping',
    'Air Ticket / Departure',
  ];

  const eligibleCjobs = cjobs.filter(cj =>
    cj.status === InterestStatus.interview_selected
  ).slice(0, 20);

  let totalSteps = 0;
  for (let i = 0; i < eligibleCjobs.length; i++) {
    const cj = eligibleCjobs[i];
    const completedCount = i % 6; // 0–5 completed steps

    for (let s = 0; s < STEPS.length; s++) {
      let status: ProcessStepStatus;
      let startedAt: Date | null = null;
      let completedAt: Date | null = null;

      if (s < completedCount) {
        status = ProcessStepStatus.completed;
        startedAt = daysAgo(50 - s * 7);
        completedAt = daysAgo(44 - s * 7);
      } else if (s === completedCount) {
        status = ProcessStepStatus.in_progress;
        startedAt = daysAgo(5);
      } else {
        status = ProcessStepStatus.not_started;
      }

      const existing = await prisma.processTracking.findFirst({
        where: { candidate_job_id: cj.id, step_number: s + 1 },
      });
      if (!existing) {
        await prisma.processTracking.create({
          data: {
            candidate_job_id: cj.id,
            step_number: s + 1,
            step_name: STEPS[s],
            status,
            started_at: startedAt ?? undefined,
            completed_at: completedAt ?? undefined,
            updated_by: [users['pm1'], users['pm2']][i % 2].id,
          },
        });
        totalSteps++;
      }
    }
  }
  console.log(`   Created ${totalSteps} process tracking steps.`);
}

// ── STEP 16: Seed Associate Commissions ───────────────────────────────────────
async function seedCommissions(associates: any[], cjobs: any[]) {
  console.log('\n[16] Seeding associate commissions...');

  // Find cjobs where candidate has an associate_id
  const assocCjobs = cjobs.filter((cj: any) => cj.status !== InterestStatus.not_contacted).slice(0, 20);
  const statuses: CommissionStatus[] = [
    ...Array(10).fill(CommissionStatus.earned),
    ...Array(7).fill(CommissionStatus.paid),
    ...Array(3).fill(CommissionStatus.cancelled),
  ];

  let count = 0;
  for (let i = 0; i < Math.min(assocCjobs.length, 20); i++) {
    const cj = assocCjobs[i];
    const associate = associates[i % associates.length];
    const commissionAmount = Math.round(45000 * Number(associate.commission_rate) / 100);
    const status = statuses[i];
    const earnedDate = daysAgo(30 - i);

    await prisma.associateCommission.create({
      data: {
        associate_id: associate.id,
        candidate_job_id: cj.id,
        commission_amount: commissionAmount,
        status,
        earned_date: earnedDate,
        paid_date: status === CommissionStatus.paid ? daysAgo(5) : null,
        payment_reference: status === CommissionStatus.paid ? `PAY-ASSOC-${String(i + 1001).padStart(4, '0')}` : null,
      },
    });
    count++;
  }
  console.log(`   Created ${count} associate commissions.`);
}

// ── STEP 17: Seed 15 Dropouts ────────────────────────────────────────────────
async function seedDropouts(cjobs: any[], users: Record<string, any>) {
  console.log('\n[17] Seeding dropouts...');

  const reasons: DropoutReason[] = [
    DropoutReason.other_offer, DropoutReason.family_pressure, DropoutReason.financial_issues,
    DropoutReason.medical_unfit, DropoutReason.visa_rejected, DropoutReason.salary_mismatch,
    DropoutReason.personal_reasons, DropoutReason.other,
  ];
  const stages = ['selection', 'medical', 'visa', 'documentation', 'post_selection'];
  const recorders = [users['recruiter1'], users['recruiter2'], users['pm1']];

  const eligible = cjobs.filter(cj =>
    cj.status === InterestStatus.contacted_not_interested ||
    cj.status === InterestStatus.interview_rejected ||
    cj.status === InterestStatus.interview_on_hold
  ).slice(0, 15);

  let count = 0;
  for (let i = 0; i < Math.min(eligible.length, 15); i++) {
    const cj = eligible[i];
    const reason = reasons[i % reasons.length];
    await prisma.dropout.create({
      data: {
        candidate_job_id: cj.id,
        dropout_stage: stages[i % stages.length],
        dropout_reason: reason,
        reason_details: `Candidate withdrew: ${reason.replace(/_/g, ' ')}. Documented by recruiter.`,
        recorded_by: recorders[i % recorders.length].id,
        created_at: daysAgo(20 - i),
      },
    });
    count++;
  }
  console.log(`   Created ${count} dropout records.`);
}

// ── STEP 18: Seed 10 Fee Change Requests ─────────────────────────────────────
async function seedFeeRequests(cjobs: any[], jobs: any[], users: Record<string, any>) {
  console.log('\n[18] Seeding fee change requests...');

  const eligible = cjobs.filter(cj =>
    cj.status === InterestStatus.lined_up || cj.status === InterestStatus.interview_selected
  ).slice(0, 10);

  const statuses: FeeChangeStatus[] = [
    ...Array(4).fill(FeeChangeStatus.pending),
    ...Array(4).fill(FeeChangeStatus.approved),
    ...Array(2).fill(FeeChangeStatus.rejected),
  ];

  let count = 0;
  for (let i = 0; i < Math.min(eligible.length, 10); i++) {
    const cj = eligible[i];
    const job = jobs.find((j: any) => j.id === cj.job_id) ?? jobs[0];
    const originalFee = Number(job.service_fee);
    const requestedFee = originalFee - rnd(3000, 10000);
    const status = statuses[i];

    const frData: any = {
      candidate_job_id: cj.id,
      requested_by: [users['recruiter1'], users['pm1']][i % 2].id,
      original_fee: originalFee,
      requested_fee: requestedFee,
      reason: ['Financial hardship', 'Candidate has dependents', 'Market rate adjustment', 'Loyalty discount'][i % 4],
      status,
      created_at: daysAgo(15 - i),
    };

    if (status !== FeeChangeStatus.pending) {
      frData.approved_by = [users['manager1'], users['manager2']][i % 2].id;
      frData.approved_at = daysAgo(10 - i);
    }

    await prisma.feeChangeRequest.create({ data: frData });
    count++;
  }
  console.log(`   Created ${count} fee change requests.`);
}

// ── STEP 19: Seed 60 Notifications ───────────────────────────────────────────
async function seedNotifications(users: Record<string, any>) {
  console.log('\n[19] Seeding notifications...');

  const targetUsers = [
    { key: 'admin',      count: 15 },
    { key: 'manager1',   count: 12 },
    { key: 'manager2',   count: 10 },
    { key: 'recruiter1', count: 12 },
    { key: 'pm1',        count: 11 },
  ];

  const messages = [
    { msg: 'New candidate registered: Mohammad Arif — ALH-26-001', type: 'info' },
    { msg: 'Follow-up due today: 12 candidates awaiting callback', type: 'follow_up' },
    { msg: 'Contract expiring in 15 days: Ramesh Kumar at Al Rajhi', type: 'contract_expiry' },
    { msg: 'Interview selected: Abdul Karim for Senior Welder position', type: 'pipeline' },
    { msg: 'Payment received: ₹45,000 for ALH-26-023', type: 'payment' },
    { msg: 'Deployment created: Bikash Das to Emirates FM', type: 'deployment' },
    { msg: 'Fee change request approved: candidate #045', type: 'payment' },
    { msg: 'Interview event scheduled: Qatar National — 20 Apr 2026', type: 'info' },
    { msg: '15 incomplete candidate records need attention', type: 'info' },
    { msg: 'Document missing: Medical fitness report for ALH-26-034', type: 'info' },
    { msg: 'Associate commission pending payout: ₹12,500', type: 'payment' },
    { msg: 'New job order: 20 Scaffolders for Naffco LLC', type: 'info' },
    { msg: 'Visa approved for Suresh Yadav — Saudi Arabia', type: 'pipeline' },
    { msg: 'Flight ticket booked for Md Imran Khan on 2026-04-28', type: 'deployment' },
    { msg: '3 candidates overdue on payment — action required', type: 'payment' },
  ];

  let total = 0;
  for (const { key, count } of targetUsers) {
    const user = users[key];
    if (!user) continue;
    for (let i = 0; i < count; i++) {
      const m = messages[(total + i) % messages.length];
      const isRead = total % 2 === 0; // 50% read (alternate by cumulative count)
      const createdAt = daysAgo(rnd(1, 30));
      await prisma.notification.create({
        data: {
          user_id: user.id,
          message: m.msg,
          type: m.type,
          is_read: isRead,
          read_at: isRead ? dateAt(createdAt, 1) : null,
          created_at: createdAt,
        },
      });
      total++;
    }
  }
  console.log(`   Created ${total} notifications.`);
}

// ── STEP 20: Seed 10 Message Templates ───────────────────────────────────────
async function seedTemplates(users: Record<string, any>) {
  console.log('\n[20] Seeding message templates...');

  const defs = [
    { name: 'Interview Invitation',     type: 'whatsapp', subject: 'Interview Call Letter',        body: 'Dear {{candidate_name}}, you are invited for an interview on {{date}} at {{venue}} for the position of {{position}}. Please bring original passport and 2 photos.' },
    { name: 'Interview Reminder',       type: 'whatsapp', subject: null,                            body: 'Reminder: Interview tomorrow at {{time}}, {{venue}}. Required documents: Passport (original), 10 passport photos, Bio-data, Educational certificates.' },
    { name: 'Selection Congratulations',type: 'whatsapp', subject: 'You are Selected!',             body: 'Congratulations {{candidate_name}}! You have been selected for the position of {{position}} at {{company}}, {{country}}. Please visit our office for next steps.' },
    { name: 'Medical Test Instruction', type: 'whatsapp', subject: null,                            body: 'Dear {{candidate_name}}, please attend your medical fitness test at {{medical_center}} on {{date}}. Carry original passport, 4 photos, and this message.' },
    { name: 'Visa Processing Update',   type: 'whatsapp', subject: 'Visa Status Update',           body: 'Good news {{candidate_name}}! Your visa for {{country}} is in process. Expected completion in {{days}} working days. We will notify you upon receipt.' },
    { name: 'Departure Notice',         type: 'whatsapp', subject: 'Travel Instructions',          body: 'Dear {{candidate_name}}, your departure is confirmed for {{date}}. Flight: {{flight_details}}. Please reach airport {{airport_report_time}} before departure. Safe journey!' },
    { name: 'Document Checklist',       type: 'whatsapp', subject: 'Required Documents',           body: 'Documents required for processing: 1) Original Passport (valid 2+ yrs) 2) 10 Passport Photos 3) Educational Certificates 4) Medical Fitness Certificate 5) Police Clearance Certificate.' },
    { name: 'Payment Receipt',          type: 'sms',      subject: null,                            body: 'Receipt: Amt ₹{{amount}} received on {{date}} from {{candidate_name}} against service fee. Receipt No: {{receipt_no}}. Al-Hiraa Manpower Consultants.' },
    { name: 'Follow-up Call Script',    type: 'script',   subject: 'Recruiter Script',              body: 'Hello, may I speak with {{candidate_name}}? I am calling from Al-Hiraa Manpower Consultants, Kolkata. Are you still interested in a Gulf job opportunity for {{position}}? We have urgent openings.' },
    { name: 'Dropout Acknowledgment',   type: 'sms',      subject: null,                            body: 'Dear {{candidate_name}}, we acknowledge your decision. Your file has been closed. You are welcome to re-register with us at any time. Best wishes. - Al-Hiraa Team.' },
  ];

  let count = 0;
  for (const d of defs) {
    await prisma.messageTemplate.create({
      data: {
        name: d.name,
        template_type: d.type,
        subject: d.subject,
        body: d.body,
        is_active: true,
        created_by: users['manager1'].id,
      },
    });
    count++;
  }
  console.log(`   Created ${count} message templates.`);
}

// ── STEP 21: Seed 50 Activity Logs ───────────────────────────────────────────
async function seedActivityLog(users: Record<string, any>, candidates: any[], jobs: any[]) {
  console.log('\n[21] Seeding activity logs...');

  const allUsers = Object.values(users);
  const entityTypes = ['candidate', 'job', 'candidateJob', 'payment', 'deployment'];
  const actions = ['create', 'update', 'status_change', 'delete'];
  const actionDescriptions: Record<string, string> = {
    create: 'Record created',
    update: 'Record updated',
    status_change: 'Status changed',
    delete: 'Record removed',
  };

  let count = 0;
  for (let i = 0; i < 50; i++) {
    const user = allUsers[i % allUsers.length];
    const entityType = entityTypes[i % entityTypes.length];
    const action = actions[i % actions.length];
    const entityId = entityType === 'candidate'
      ? String(candidates[i % candidates.length].id)
      : entityType === 'job'
        ? String(jobs[i % jobs.length].id)
        : String(1000 + i);

    await prisma.activityLog.create({
      data: {
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        action,
        new_value: { description: actionDescriptions[action], timestamp: new Date().toISOString() },
        created_at: daysAgo(60 - i),
      },
    });
    count++;
  }
  console.log(`   Created ${count} activity log entries.`);
}

// ── STEP 22: Print Final Counts ───────────────────────────────────────────────
async function printCounts() {
  console.log('\n[22] Final row counts:');
  const models: Array<[string, () => Promise<number>]> = [
    ['User',              () => prisma.user.count()],
    ['Company',           () => prisma.company.count()],
    ['Job',               () => prisma.job.count()],
    ['Trade',             () => prisma.trade.count()],
    ['State',             () => prisma.state.count()],
    ['Source',            () => prisma.source.count()],
    ['Candidate',         () => prisma.candidate.count()],
    ['CandidateJob',      () => prisma.candidateJob.count()],
    ['InterviewEvent',    () => prisma.interviewEvent.count()],
    ['InterviewCheckin',  () => prisma.interviewCheckin.count()],
    ['Payment',           () => prisma.payment.count()],
    ['Deployment',        () => prisma.deployment.count()],
    ['Associate',         () => prisma.associate.count()],
    ['Referrer',          () => prisma.referrer.count()],
    ['AssociateCommission', () => prisma.associateCommission.count()],
    ['CallLog',           () => prisma.callLog.count()],
    ['ProcessDetails',    () => prisma.processDetails.count()],
    ['ProcessTracking',   () => prisma.processTracking.count()],
    ['Dropout',           () => prisma.dropout.count()],
    ['FeeChangeRequest',  () => prisma.feeChangeRequest.count()],
    ['Notification',      () => prisma.notification.count()],
    ['MessageTemplate',   () => prisma.messageTemplate.count()],
    ['ActivityLog',       () => prisma.activityLog.count()],
  ];

  for (const [name, fn] of models) {
    const count = await fn();
    console.log(`   ${name.padEnd(22)}: ${count}`);
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Al-Hiraa ATMS — Fresh Seed Script');
  console.log('═══════════════════════════════════════════════════════');

  const pw = await bcrypt.hash('Admin@123', 10);

  await seedMasters();
  await clearAll();

  const users    = await seedUsers(pw);
  const companies = await seedCompanies();

  // Load master refs needed by subsequent steps
  const trades   = await prisma.trade.findMany({ orderBy: { display_order: 'asc' } });
  const states   = await prisma.state.findMany({ orderBy: { display_order: 'asc' } });
  const cities   = await prisma.city.findMany();
  const sources  = await prisma.source.findMany({ orderBy: { display_order: 'asc' } });

  const jobs        = await seedJobs(companies, trades, users);
  const associates  = await seedAssociates(pw);
  const referrers   = await seedReferrers();
  const candidates  = await seedCandidates(states, cities, trades, sources, associates, referrers);
  const cjobs       = await seedPipeline(candidates, jobs, users);

  await seedInterviews(cjobs, jobs, companies, candidates, users);
  await seedPayments(cjobs, jobs, users);
  await seedDeployments(candidates, cjobs, companies, trades, users);
  await seedCallLogs(cjobs, users);
  await seedProcessDetails(cjobs);
  await seedProcessTracking(cjobs, users);
  await seedCommissions(associates, cjobs);
  await seedDropouts(cjobs, users);
  await seedFeeRequests(cjobs, jobs, users);
  await seedNotifications(users);
  await seedTemplates(users);
  await seedActivityLog(users, candidates, jobs);

  await printCounts();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' Seed complete! Login with any user below:');
  console.log('   admin@alhiraa.com    / Admin@123  (Admin)');
  console.log('   manager1@alhiraa.com / Admin@123  (Manager)');
  console.log('   recruiter1@alhiraa.com / Admin@123 (Recruiter)');
  console.log('   de1@alhiraa.com     / Admin@123  (Data Entry)');
  console.log('   pm1@alhiraa.com     / Admin@123  (Process Manager)');
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
