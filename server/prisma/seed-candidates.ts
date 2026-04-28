/**
 * Supplementary seed: adds 60 candidates with varied data for testing
 * the All Candidates module filters and bulk actions.
 * Run: cd server && npx ts-node prisma/seed-candidates.ts
 */
import { PrismaClient, Gender, EcrType, RegistrationMode, CandidateStatus, CompletionStatus, CallOutcome, InterestStatus } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || 'postgresql://alhiraa:alhiraa_dev_2026@localhost:5432/alhiraa_atms' }) });

// Helpers
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const maybe = <T>(val: T, pct = 0.6): T | undefined => Math.random() < pct ? val : undefined;
const phone = (base: number) => String(base);

async function main() {
  console.log('Loading reference data...');

  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@alhiraa.com' } });
  const deUser = await prisma.user.findFirst({ where: { email: 'dataentry@alhiraa.com' } });
  const recruiter = await prisma.user.findFirst({ where: { email: 'recruiter@alhiraa.com' } });
  if (!adminUser || !deUser || !recruiter) throw new Error('Users missing — run main seed first');

  const trades = await prisma.trade.findMany();
  const sources = await prisma.source.findMany();
  const states = await prisma.state.findMany({ include: { cities: true } });
  const jobs = await prisma.job.findMany({ where: { status: 'open' }, take: 8 });

  if (!trades.length || !sources.length || !states.length) throw new Error('Masters missing — run main seed first');

  // ── Name pools ────────────────────────────────────────────────────────────
  const maleNames = [
    'Mohammad Arif', 'Raju Mondal', 'Sanjay Kumar', 'Bikash Das',
    'Firdaus Ali', 'Tarikul Islam', 'Suresh Yadav', 'Ravi Shankar',
    'Pintu Saha', 'Ajay Gupta', 'Naresh Paswan', 'Dilip Roy',
    'Minhajul Hoque', 'Bablu Sheikh', 'Kamal Mandal', 'Shyamal Biswas',
    'Nirmal Barman', 'Dipak Mahato', 'Santosh Kumar', 'Rakesh Thakur',
    'Jabbar Ali', 'Habibur Rahman', 'Nazrul Islam', 'Rezaul Karim',
    'Ashok Tiwari', 'Suman Ghosh', 'Pavan Kumar', 'Vinod Rajput',
    'Deepak Chaudhary', 'Mohan Lal',
  ];
  const femaleNames = [
    'Rina Begum', 'Puja Kumari', 'Sunita Devi', 'Nasrin Khatun',
    'Rekha Rani', 'Anjali Singh', 'Fatema Khatun', 'Sita Devi',
    'Rubina Begum', 'Kavita Sharma',
  ];

  const allNames = [
    ...maleNames.map(n => ({ name: n, gender: Gender.male })),
    ...femaleNames.map(n => ({ name: n, gender: Gender.female })),
  ];

  const statuses: CandidateStatus[] = [
    CandidateStatus.active, CandidateStatus.active, CandidateStatus.active,
    CandidateStatus.active, CandidateStatus.active, // 5x active weight
    CandidateStatus.inactive,
    CandidateStatus.deployed,
    CandidateStatus.blacklisted,
  ];

  const educations = ['10th Pass', '12th Pass', 'Graduate', 'ITI', 'Diploma', 'Illiterate'];
  const religions = ['Islam', 'Hindu', 'Christian', 'Sikh'];
  const regModes: RegistrationMode[] = [
    RegistrationMode.walk_in, RegistrationMode.walk_in,
    RegistrationMode.phone, RegistrationMode.online,
    RegistrationMode.camp, RegistrationMode.referral,
  ];
  const callOutcomes: CallOutcome[] = [
    CallOutcome.reached, CallOutcome.reached, CallOutcome.reached,
    CallOutcome.not_reachable, CallOutcome.voicemail, CallOutcome.line_busy,
    CallOutcome.switched_off,
  ];
  const interestStatuses: InterestStatus[] = [
    InterestStatus.not_contacted, InterestStatus.not_contacted,
    InterestStatus.contacted_interested, InterestStatus.contacted_interested,
    InterestStatus.contacted_not_interested,
    InterestStatus.contacted_not_reachable,
    InterestStatus.contacted_maybe_later,
    InterestStatus.lined_up, InterestStatus.lined_up,
    InterestStatus.interview_selected,
    InterestStatus.interview_rejected,
    InterestStatus.interview_on_hold,
  ];

  const registeredByIds = [adminUser.id, deUser.id, deUser.id, deUser.id]; // weight toward DE

  console.log('Creating 60 candidates...');

  let created = 0;
  let basePhone = 9900010001;
  let basePassport = 100001;
  const yearSeqCounters: Record<number, number> = {};

  for (let i = 0; i < 60; i++) {
    const nameData = allNames[i % allNames.length];
    const stateObj = states[i % states.length];
    const cityObj = stateObj.cities[i % Math.max(stateObj.cities.length, 1)];
    const trade1 = trades[i % trades.length];
    const trade2 = trades[(i + 3) % trades.length];
    const source = sources[i % sources.length];
    const status = statuses[i % statuses.length];
    const registeredBy = registeredByIds[i % registeredByIds.length];
    const daysAgo = Math.floor(Math.random() * 180); // random over last 6 months
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const dobYear = 1980 + (i % 20);
    const dob = new Date(`${dobYear}-${String((i % 12) + 1).padStart(2, '0')}-15`);

    const isComplete = i % 3 !== 0; // ~2/3 complete

    const whatsapp = phone(basePhone++);
    const passportNo = maybe(`P${String(basePassport++).padStart(7, '0')}`, 0.8);

    const data: any = {
      full_name: nameData.name,
      gender: nameData.gender,
      dob,
      whatsapp_no: whatsapp,
      alternate_contact: maybe(phone(basePhone++), 0.4),
      email: maybe(`${nameData.name.split(' ')[0].toLowerCase()}${i}@gmail.com`, 0.5),
      passport_no: passportNo,
      ecr_type: maybe(pick([EcrType.ecr, EcrType.ecnr]), 0.85),
      state_id: stateObj.id,
      city_id: cityObj?.id,
      religion: maybe(pick(religions), 0.7),
      education: pick(educations),
      education_other: maybe('ITI Fitter', 0.2),
      position_1_id: trade1.id,
      position_2_id: maybe(trade2.id, 0.4),
      registration_mode: pick(regModes),
      source_id: source.id,
      referred_by: maybe(`Referrer ${i}`, 0.2),
      indian_driving_license: maybe(['LMV'], 0.3) ?? [],
      gulf_driving_license: maybe(['LMV', 'HMV'], 0.15) ?? [],
      english_speaking: pick(['none', 'basic', 'conversational', 'fluent']),
      arabic_speaking: Math.random() > 0.8,
      gulf_return: Math.random() > 0.7,
      indian_experience: maybe(`${1 + (i % 5)} years in construction`, 0.6),
      abroad_experience: maybe(`${1 + (i % 3)} years in UAE`, 0.3),
      status,
      completion_status: isComplete ? CompletionStatus.complete : CompletionStatus.incomplete,
      remarks: maybe(`Good candidate, needs follow-up. Referred from ${pick(['Kolkata camp', 'Bihar camp', 'walk-in'])}`, 0.4),
      registered_by: registeredBy,
      year_sequence: undefined as any, // will be set below
      created_at: createdAt,
      updated_at: createdAt,
    };

    // Compute year_sequence
    const yr = createdAt.getFullYear();
    if (!yearSeqCounters[yr]) yearSeqCounters[yr] = 0;
    yearSeqCounters[yr]++;
    data.year_sequence = yearSeqCounters[yr];

    // Remove undefined values
    for (const key of Object.keys(data)) {
      if (data[key] === undefined) delete data[key];
    }

    try {
      const candidate = await prisma.candidate.create({ data });
      created++;

      // Add call log + pipeline entry for ~60% of candidates
      if (Math.random() < 0.6 && jobs.length > 0) {
        const job = jobs[i % jobs.length];

        // Create pipeline entry (candidate_job)
        try {
          const candidateJob = await prisma.candidateJob.create({
            data: {
              candidate_id: candidate.id,
              job_id: job.id,
              status: pick(interestStatuses),
            },
          });

          // Add 1–3 call logs
          const callCount = 1 + Math.floor(Math.random() * 3);
          for (let c = 0; c < callCount; c++) {
            const callDate = new Date(createdAt);
            callDate.setDate(callDate.getDate() + c * 3);
            await prisma.callLog.create({
              data: {
                candidate_job_id: candidateJob.id,
                caller_id: recruiter.id,
                call_timestamp: callDate,
                outcome: pick(callOutcomes),
                notes: maybe('Candidate is interested. Will confirm by EOD.', 0.4),
                follow_up_date: maybe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 0.3),
                call_attempt_number: c + 1,
              },
            });
          }
        } catch {
          // skip if duplicate candidate_job
        }
      }
    } catch (err: any) {
      // skip duplicate phone/passport
      if (err.code !== 'P2002') throw err;
    }
  }

  console.log(`✓ Created ${created} candidates with call logs`);

  const total = await prisma.candidate.count();
  const calls = await prisma.callLog.count();
  console.log(`Total: ${total} candidates, ${calls} call logs`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
