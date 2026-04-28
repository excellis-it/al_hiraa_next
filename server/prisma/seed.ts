import {
  PrismaClient,
  UserRole,
  GulfCountry,
  Industry,
  JobStatus,
  JobPriority,
  InterviewType,
  InterestStatus,
  CallOutcome,
  ProcessStepStatus,
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
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || 'postgresql://alhiraa:alhiraa_dev_2026@localhost:5432/alhiraa_atms' }) });

async function main() {
  console.log('Seeding database...');

  // ─── ADMIN USER ───────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@alhiraa.com' },
    update: { full_name: 'Seemab Ahmed' },
    create: {
      full_name: 'Seemab Ahmed',
      email: 'admin@alhiraa.com',
      phone: '9876543210',
      password_hash: adminPassword,
      role: UserRole.admin,
    },
  });

  // Create sample users for each role
  const roles = [
    { name: 'Data Entry Operator', email: 'dataentry@alhiraa.com', role: UserRole.data_entry },
    { name: 'Recruitment Consultant', email: 'recruiter@alhiraa.com', role: UserRole.recruiter },
    { name: 'Process Manager', email: 'process@alhiraa.com', role: UserRole.process_manager },
    { name: 'Office Manager', email: 'manager@alhiraa.com', role: UserRole.manager },
  ];

  const defaultPassword = await bcrypt.hash('Password@123', 10);
  for (const r of roles) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        full_name: r.name,
        email: r.email,
        phone: '9876543210',
        password_hash: defaultPassword,
        role: r.role,
      },
    });
  }

  // ─── TRADES ───────────────────────────────────────
  const trades = [
    'Welding', 'Plumbing', 'Electrical', 'Driving', 'Security Guard',
    'Hospitality', 'General Labor', 'Carpentry', 'Masonry', 'Painting',
    'HVAC Technician', 'Heavy Equipment Operator', 'Scaffolding',
    'Pipe Fitting', 'Steel Fixing', 'Shuttering', 'Tile Work',
    'AC Technician', 'Auto Mechanic', 'Cleaner', 'Cook / Chef',
    'Waiter / Steward', 'Housekeeping', 'Warehouse Worker',
    'Forklift Operator', 'Crane Operator',
  ];

  for (let i = 0; i < trades.length; i++) {
    await prisma.trade.upsert({
      where: { name: trades[i] },
      update: {},
      create: { name: trades[i], display_order: i + 1 },
    });
  }

  // ─── SOURCES ──────────────────────────────────────
  const sources = [
    'Al-Hiraa Office (Walk-in)',
    'Phone Inquiry',
    'Online / Website',
    'Associate Referral',
    'Social Media',
    'Recruitment Camp',
    'Newspaper Ad',
    'Word of Mouth',
  ];

  for (let i = 0; i < sources.length; i++) {
    await prisma.source.upsert({
      where: { name: sources[i] },
      update: {},
      create: { name: sources[i], display_order: i + 1 },
    });
  }

  // ─── STATES & CITIES ─────────────────────────────
  const statesAndCities: Record<string, string[]> = {
    'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman', 'Malda', 'Murshidabad'],
    'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
    'Uttar Pradesh': ['Lucknow', 'Varanasi', 'Agra', 'Kanpur', 'Allahabad', 'Gorakhpur', 'Bareilly'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli', 'Belgaum'],
    'Andhra Pradesh': ['Hyderabad', 'Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
    'Telangana': ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
    'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
    'Haryana': ['Gurugram', 'Faridabad', 'Ambala', 'Panipat', 'Hisar'],
    'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Haldwani'],
    'Manipur': ['Imphal'],
    'Meghalaya': ['Shillong'],
    'Mizoram': ['Aizawl'],
    'Nagaland': ['Kohima', 'Dimapur'],
    'Tripura': ['Agartala'],
    'Sikkim': ['Gangtok'],
    'Arunachal Pradesh': ['Itanagar'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama'],
    'Jammu & Kashmir': ['Srinagar', 'Jammu'],
    'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala'],
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

  // ─── COMPANIES ────────────────────────────────────
  console.log('Seeding companies...');

  await prisma.company.upsert({
    where: { name: 'Al Rajhi Construction Co.' },
    update: {},
    create: {
      name: 'Al Rajhi Construction Co.',
      country: GulfCountry.saudi_arabia,
      city: 'Riyadh',
      industry: Industry.construction,
      contact_person: 'Mohammed Al-Rashid',
      phone: '+966-11-2345678',
    },
  });

  await prisma.company.upsert({
    where: { name: 'Emirates Facilities Management' },
    update: {},
    create: {
      name: 'Emirates Facilities Management',
      country: GulfCountry.uae,
      city: 'Dubai',
      industry: Industry.facilities,
      contact_person: 'Ahmed Hassan',
      phone: '+971-4-3456789',
    },
  });

  await prisma.company.upsert({
    where: { name: 'Qatar National Projects' },
    update: {},
    create: {
      name: 'Qatar National Projects',
      country: GulfCountry.qatar,
      city: 'Doha',
      industry: Industry.construction,
      contact_person: 'Khalid Al-Thani',
      phone: '+974-4-5678901',
    },
  });

  await prisma.company.upsert({
    where: { name: 'Al Futtaim Engineering' },
    update: {},
    create: {
      name: 'Al Futtaim Engineering',
      country: GulfCountry.uae,
      city: 'Dubai',
      industry: Industry.manufacturing,
      contact_person: 'Saeed Al-Futtaim',
      phone: '+971-4-6789012',
    },
  });

  await prisma.company.upsert({
    where: { name: 'Saudi Oger Ltd' },
    update: {},
    create: {
      name: 'Saudi Oger Ltd',
      country: GulfCountry.saudi_arabia,
      city: 'Jeddah',
      industry: Industry.oil_and_gas,
      contact_person: 'Ibrahim Al-Oger',
      phone: '+966-12-7890123',
    },
  });

  // ─── JOB ORDERS ───────────────────────────────────
  console.log('Seeding job orders...');

  // Query admin user
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@alhiraa.com' } });
  if (!adminUser) throw new Error('Admin user not found');

  // Query companies
  const companyAlRajhi = await prisma.company.findFirst({ where: { name: 'Al Rajhi Construction Co.' } });
  const companyEmirates = await prisma.company.findFirst({ where: { name: 'Emirates Facilities Management' } });
  const companyQatar = await prisma.company.findFirst({ where: { name: 'Qatar National Projects' } });
  const companyAlFuttaim = await prisma.company.findFirst({ where: { name: 'Al Futtaim Engineering' } });
  const companySaudiOger = await prisma.company.findFirst({ where: { name: 'Saudi Oger Ltd' } });

  if (!companyAlRajhi || !companyEmirates || !companyQatar || !companyAlFuttaim || !companySaudiOger) {
    throw new Error('One or more companies not found');
  }

  // Query trades
  const tradeWelding = await prisma.trade.findFirst({ where: { name: 'Welding' } });
  const tradePlumbing = await prisma.trade.findFirst({ where: { name: 'Plumbing' } });
  const tradeElectrical = await prisma.trade.findFirst({ where: { name: 'Electrical' } });
  const tradeMasonry = await prisma.trade.findFirst({ where: { name: 'Masonry' } });
  const tradeGeneralLabor = await prisma.trade.findFirst({ where: { name: 'General Labor' } });
  const tradeDriving = await prisma.trade.findFirst({ where: { name: 'Driving' } });
  const tradeSecurityGuard = await prisma.trade.findFirst({ where: { name: 'Security Guard' } });
  const tradeHVAC = await prisma.trade.findFirst({ where: { name: 'HVAC Technician' } });

  if (!tradeWelding || !tradePlumbing || !tradeElectrical || !tradeMasonry ||
      !tradeGeneralLabor || !tradeDriving || !tradeSecurityGuard || !tradeHVAC) {
    throw new Error('One or more trades not found');
  }

  // Create jobs (upsert by title + company_id is not unique, so use findFirst + create pattern)
  const jobDefs = [
    {
      title: 'Senior Welder',
      company_id: companyAlRajhi.id,
      trade_id: tradeWelding.id,
      positions_required: 15,
      salary_min: 1800,
      salary_max: 2200,
      salary_currency: 'SAR',
      service_fee: 45000,
      priority: JobPriority.high,
      status: JobStatus.open,
      country: GulfCountry.saudi_arabia,
    },
    {
      title: 'Plumber',
      company_id: companyAlRajhi.id,
      trade_id: tradePlumbing.id,
      positions_required: 10,
      salary_min: 1600,
      salary_max: 1900,
      salary_currency: 'SAR',
      service_fee: 40000,
      priority: JobPriority.high,
      status: JobStatus.open,
      country: GulfCountry.saudi_arabia,
    },
    {
      title: 'Electrician',
      company_id: companyEmirates.id,
      trade_id: tradeElectrical.id,
      positions_required: 8,
      salary_min: 2000,
      salary_max: 2500,
      salary_currency: 'AED',
      service_fee: 42000,
      priority: JobPriority.medium,
      status: JobStatus.open,
      country: GulfCountry.uae,
    },
    {
      title: 'Mason',
      company_id: companyQatar.id,
      trade_id: tradeMasonry.id,
      positions_required: 20,
      salary_min: 1500,
      salary_max: 1800,
      salary_currency: 'QAR',
      service_fee: 38000,
      priority: JobPriority.high,
      status: JobStatus.interviews_scheduled,
      country: GulfCountry.qatar,
      interview_date_start: new Date('2026-04-15'),
    },
    {
      title: 'General Helper',
      company_id: companySaudiOger.id,
      trade_id: tradeGeneralLabor.id,
      positions_required: 50,
      salary_min: 1200,
      salary_max: 1400,
      salary_currency: 'SAR',
      service_fee: 30000,
      priority: JobPriority.low,
      status: JobStatus.open,
      country: GulfCountry.saudi_arabia,
    },
    {
      title: 'Driver (Heavy Vehicle)',
      company_id: companyAlRajhi.id,
      trade_id: tradeDriving.id,
      positions_required: 5,
      salary_min: 2000,
      salary_max: 2500,
      salary_currency: 'SAR',
      service_fee: 50000,
      priority: JobPriority.medium,
      status: JobStatus.open,
      country: GulfCountry.saudi_arabia,
    },
    {
      title: 'Security Guard',
      company_id: companyEmirates.id,
      trade_id: tradeSecurityGuard.id,
      positions_required: 12,
      salary_min: 1800,
      salary_max: 2000,
      salary_currency: 'AED',
      service_fee: 35000,
      priority: JobPriority.medium,
      status: JobStatus.in_process,
      country: GulfCountry.uae,
    },
    {
      title: 'HVAC Technician',
      company_id: companyAlFuttaim.id,
      trade_id: tradeHVAC.id,
      positions_required: 6,
      salary_min: 2500,
      salary_max: 3000,
      salary_currency: 'AED',
      service_fee: 55000,
      priority: JobPriority.high,
      status: JobStatus.open,
      country: GulfCountry.uae,
    },
  ];

  for (const jobDef of jobDefs) {
    const existing = await prisma.job.findFirst({
      where: { title: jobDef.title, company_id: jobDef.company_id },
    });
    if (!existing) {
      await prisma.job.create({
        data: {
          ...jobDef,
          created_by: adminUser.id,
        },
      });
    }
  }

  // ─── CANDIDATES ───────────────────────────────────
  console.log('Seeding candidates...');

  // Query state/city IDs needed
  const stateWestBengal = await prisma.state.findFirst({ where: { name: 'West Bengal' } });
  const stateBihar = await prisma.state.findFirst({ where: { name: 'Bihar' } });
  const stateJharkhand = await prisma.state.findFirst({ where: { name: 'Jharkhand' } });
  const stateUP = await prisma.state.findFirst({ where: { name: 'Uttar Pradesh' } });
  const stateOdisha = await prisma.state.findFirst({ where: { name: 'Odisha' } });

  if (!stateWestBengal || !stateBihar || !stateJharkhand || !stateUP || !stateOdisha) {
    throw new Error('One or more states not found');
  }

  const cityKolkata = await prisma.city.findFirst({ where: { name: 'Kolkata', state_id: stateWestBengal.id } });
  const cityHowrah = await prisma.city.findFirst({ where: { name: 'Howrah', state_id: stateWestBengal.id } });
  const cityDurgapur = await prisma.city.findFirst({ where: { name: 'Durgapur', state_id: stateWestBengal.id } });
  const cityMurshidabad = await prisma.city.findFirst({ where: { name: 'Murshidabad', state_id: stateWestBengal.id } });
  const cityPatna = await prisma.city.findFirst({ where: { name: 'Patna', state_id: stateBihar.id } });
  const cityGaya = await prisma.city.findFirst({ where: { name: 'Gaya', state_id: stateBihar.id } });
  const cityMuzaffarpur = await prisma.city.findFirst({ where: { name: 'Muzaffarpur', state_id: stateBihar.id } });
  const cityRanchi = await prisma.city.findFirst({ where: { name: 'Ranchi', state_id: stateJharkhand.id } });
  const cityJamshedpur = await prisma.city.findFirst({ where: { name: 'Jamshedpur', state_id: stateJharkhand.id } });
  const cityDhanbad = await prisma.city.findFirst({ where: { name: 'Dhanbad', state_id: stateJharkhand.id } });
  const cityVaranasi = await prisma.city.findFirst({ where: { name: 'Varanasi', state_id: stateUP.id } });
  const cityBhubaneswar = await prisma.city.findFirst({ where: { name: 'Bhubaneswar', state_id: stateOdisha.id } });

  if (!cityKolkata || !cityHowrah || !cityDurgapur || !cityMurshidabad ||
      !cityPatna || !cityGaya || !cityMuzaffarpur ||
      !cityRanchi || !cityJamshedpur || !cityDhanbad ||
      !cityVaranasi || !cityBhubaneswar) {
    throw new Error('One or more cities not found');
  }

  // Query first source
  const firstSource = await prisma.source.findFirst({ orderBy: { display_order: 'asc' } });
  if (!firstSource) throw new Error('No source found');

  const candidateDefs = [
    {
      full_name: 'Mohammed Rafiq',
      gender: Gender.male,
      whatsapp_no: '9831012345',
      passport_no: 'P1234567',
      education: '10th Pass',
      position_1_id: tradeWelding.id,
      state_id: stateWestBengal.id,
      city_id: cityKolkata.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1990-01-01'),
    },
    {
      full_name: 'Sk. Alam Hossain',
      gender: Gender.male,
      whatsapp_no: '9831023456',
      passport_no: 'P2345678',
      education: '8th Pass',
      position_1_id: tradeGeneralLabor.id,
      state_id: stateWestBengal.id,
      city_id: cityHowrah.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1991-01-01'),
    },
    {
      full_name: 'Ramesh Kumar Mahato',
      gender: Gender.male,
      whatsapp_no: '9831034567',
      passport_no: 'P3456789',
      education: '10th Pass',
      position_1_id: tradeMasonry.id,
      state_id: stateJharkhand.id,
      city_id: cityDhanbad.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.phone,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1992-01-01'),
    },
    {
      full_name: 'Abdul Karim Sheikh',
      gender: Gender.male,
      whatsapp_no: '9831045678',
      passport_no: 'P4567890',
      education: '12th Pass',
      position_1_id: tradeDriving.id,
      state_id: stateWestBengal.id,
      city_id: cityKolkata.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecnr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1993-01-01'),
    },
    {
      full_name: 'Bikash Roy',
      gender: Gender.male,
      whatsapp_no: '9831056789',
      education: '10th Pass',
      position_1_id: tradeWelding.id,
      state_id: stateWestBengal.id,
      city_id: cityHowrah.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.phone,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.incomplete,
      dob: new Date('1994-01-01'),
    },
    {
      full_name: 'Md. Sohel Rana',
      gender: Gender.male,
      whatsapp_no: '9831067890',
      passport_no: 'P5678901',
      education: '10th Pass',
      position_1_id: tradePlumbing.id,
      state_id: stateWestBengal.id,
      city_id: cityKolkata.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1995-01-01'),
    },
    {
      full_name: 'Santosh Mistry',
      gender: Gender.male,
      whatsapp_no: '9831078901',
      education: '12th Pass',
      position_1_id: tradeElectrical.id,
      state_id: stateBihar.id,
      city_id: cityPatna.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.referral,
      ecr_type: EcrType.ecnr,
      completion_status: CompletionStatus.incomplete,
      dob: new Date('1996-01-01'),
    },
    {
      full_name: 'Raju Sharma',
      gender: Gender.male,
      whatsapp_no: '9831089012',
      passport_no: 'P6789012',
      education: 'Diploma',
      position_1_id: tradeHVAC.id,
      state_id: stateWestBengal.id,
      city_id: cityKolkata.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.online,
      ecr_type: EcrType.ecnr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1997-01-01'),
    },
    {
      full_name: 'Tarik Hossain',
      gender: Gender.male,
      whatsapp_no: '9831090123',
      education: '8th Pass',
      position_1_id: tradeGeneralLabor.id,
      state_id: stateOdisha.id,
      city_id: cityBhubaneswar.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.camp,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.incomplete,
      dob: new Date('1998-01-01'),
    },
    {
      full_name: 'Anil Kumar Singh',
      gender: Gender.male,
      whatsapp_no: '9831101234',
      passport_no: 'P7890123',
      education: '10th Pass',
      position_1_id: tradeMasonry.id,
      state_id: stateBihar.id,
      city_id: cityGaya.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1999-01-01'),
    },
    {
      full_name: 'Firoz Ahmed',
      gender: Gender.male,
      whatsapp_no: '9831112345',
      education: '10th Pass',
      position_1_id: tradeWelding.id,
      state_id: stateWestBengal.id,
      city_id: cityMurshidabad.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.referral,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.incomplete,
      dob: new Date('2000-01-01'),
    },
    {
      full_name: 'Prabhat Tudu',
      gender: Gender.male,
      whatsapp_no: '9831123456',
      passport_no: 'P8901234',
      education: '8th Pass',
      position_1_id: tradeGeneralLabor.id,
      state_id: stateJharkhand.id,
      city_id: cityRanchi.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.camp,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1990-02-01'),
    },
    {
      full_name: 'Dilip Das',
      gender: Gender.male,
      whatsapp_no: '9831134567',
      education: '10th Pass',
      position_1_id: tradeMasonry.id,
      state_id: stateWestBengal.id,
      city_id: cityDurgapur.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.incomplete,
      dob: new Date('1991-02-01'),
    },
    {
      full_name: 'Md. Rakibul Islam',
      gender: Gender.male,
      whatsapp_no: '9831145678',
      passport_no: 'P9012345',
      education: '12th Pass',
      position_1_id: tradeSecurityGuard.id,
      state_id: stateWestBengal.id,
      city_id: cityKolkata.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecnr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1992-02-01'),
    },
    {
      full_name: 'Sunil Mahato',
      gender: Gender.male,
      whatsapp_no: '9831156789',
      education: '10th Pass',
      position_1_id: tradeDriving.id,
      state_id: stateJharkhand.id,
      city_id: cityJamshedpur.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.phone,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.incomplete,
      dob: new Date('1993-02-01'),
    },
    {
      full_name: 'Rajesh Yadav',
      gender: Gender.male,
      whatsapp_no: '9831167890',
      passport_no: 'P0123456',
      education: '10th Pass',
      position_1_id: tradeGeneralLabor.id,
      state_id: stateUP.id,
      city_id: cityVaranasi.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.camp,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1994-02-01'),
    },
    {
      full_name: 'Bablu Mondal',
      gender: Gender.male,
      whatsapp_no: '9831178901',
      education: '8th Pass',
      position_1_id: tradeMasonry.id,
      state_id: stateWestBengal.id,
      city_id: cityHowrah.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.incomplete,
      dob: new Date('1995-02-01'),
    },
    {
      full_name: 'Jakir Hossain',
      gender: Gender.male,
      whatsapp_no: '9831189012',
      passport_no: 'P1234568',
      education: '10th Pass',
      position_1_id: tradePlumbing.id,
      state_id: stateWestBengal.id,
      city_id: cityKolkata.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.walk_in,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1996-02-01'),
    },
    {
      full_name: 'Kartik Oraon',
      gender: Gender.male,
      whatsapp_no: '9831190123',
      education: '8th Pass',
      position_1_id: tradeGeneralLabor.id,
      state_id: stateJharkhand.id,
      city_id: cityRanchi.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.camp,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.incomplete,
      dob: new Date('1997-02-01'),
    },
    {
      full_name: 'Noor Mohammad',
      gender: Gender.male,
      whatsapp_no: '9831201234',
      passport_no: 'P2345679',
      education: '10th Pass',
      position_1_id: tradeWelding.id,
      state_id: stateBihar.id,
      city_id: cityMuzaffarpur.id,
      status: CandidateStatus.active,
      registration_mode: RegistrationMode.phone,
      ecr_type: EcrType.ecr,
      completion_status: CompletionStatus.complete,
      dob: new Date('1998-02-01'),
    },
  ];

  for (const cand of candidateDefs) {
    await prisma.candidate.upsert({
      where: { whatsapp_no: cand.whatsapp_no },
      update: {},
      create: {
        ...cand,
        source_id: firstSource.id,
        registered_by: adminUser.id,
      },
    });
  }

  // ─── PIPELINE ENTRIES (CandidateJob) ─────────────
  console.log('Seeding pipeline entries...');

  // Re-query all candidates by whatsapp
  const candMohammedRafiq = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831012345' } });
  const candSkAlam = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831023456' } });
  const candRamesh = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831034567' } });
  const candAbdulKarim = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831045678' } });
  const candBikash = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831056789' } });
  const candSohel = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831067890' } });
  const candSantosh = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831078901' } });
  const candRaju = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831089012' } });
  const candTarik = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831090123' } });
  const candAnil = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831101234' } });
  const candFiroz = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831112345' } });
  const candPrabhat = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831123456' } });
  const candDilip = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831134567' } });
  const candRakibul = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831145678' } });
  const candSunil = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831156789' } });
  const candRajesh = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831167890' } });
  const candBablu = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831178901' } });
  const candJakir = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831189012' } });
  const candKartik = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831190123' } });
  const candNoor = await prisma.candidate.findFirst({ where: { whatsapp_no: '9831201234' } });

  // Query jobs by title + company
  const jobSeniorWelder = await prisma.job.findFirst({ where: { title: 'Senior Welder', company_id: companyAlRajhi.id } });
  const jobPlumber = await prisma.job.findFirst({ where: { title: 'Plumber', company_id: companyAlRajhi.id } });
  const jobElectrician = await prisma.job.findFirst({ where: { title: 'Electrician', company_id: companyEmirates.id } });
  const jobMason = await prisma.job.findFirst({ where: { title: 'Mason', company_id: companyQatar.id } });
  const jobGeneralHelper = await prisma.job.findFirst({ where: { title: 'General Helper', company_id: companySaudiOger.id } });
  const jobDriver = await prisma.job.findFirst({ where: { title: 'Driver (Heavy Vehicle)', company_id: companyAlRajhi.id } });
  const jobSecurityGuard = await prisma.job.findFirst({ where: { title: 'Security Guard', company_id: companyEmirates.id } });
  const jobHVAC = await prisma.job.findFirst({ where: { title: 'HVAC Technician', company_id: companyAlFuttaim.id } });

  if (!jobSeniorWelder || !jobPlumber || !jobElectrician || !jobMason ||
      !jobGeneralHelper || !jobDriver || !jobSecurityGuard || !jobHVAC) {
    throw new Error('One or more jobs not found');
  }

  const recruiterUser = await prisma.user.findFirst({ where: { email: 'recruiter@alhiraa.com' } });
  if (!recruiterUser) throw new Error('Recruiter user not found');

  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const threeDaysFromNow = new Date(now); threeDaysFromNow.setDate(now.getDate() + 3);
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

  const pipelineDefs = [
    { candidate: candMohammedRafiq, job: jobSeniorWelder, status: InterestStatus.lined_up, follow_up_date: null },
    { candidate: candFiroz, job: jobSeniorWelder, status: InterestStatus.contacted_interested, follow_up_date: null },
    { candidate: candNoor, job: jobSeniorWelder, status: InterestStatus.not_contacted, follow_up_date: null },
    { candidate: candSohel, job: jobPlumber, status: InterestStatus.lined_up, follow_up_date: null },
    { candidate: candJakir, job: jobPlumber, status: InterestStatus.contacted_interested, follow_up_date: null },
    { candidate: candSantosh, job: jobElectrician, status: InterestStatus.interview_selected, follow_up_date: null },
    { candidate: candRaju, job: jobHVAC, status: InterestStatus.lined_up, follow_up_date: tomorrow },
    { candidate: candRamesh, job: jobMason, status: InterestStatus.interview_selected, follow_up_date: null },
    { candidate: candAnil, job: jobMason, status: InterestStatus.lined_up, follow_up_date: null },
    { candidate: candDilip, job: jobMason, status: InterestStatus.contacted_interested, follow_up_date: null },
    { candidate: candBikash, job: jobSeniorWelder, status: InterestStatus.contacted_not_interested, follow_up_date: null },
    { candidate: candAbdulKarim, job: jobDriver, status: InterestStatus.lined_up, follow_up_date: null },
    { candidate: candSunil, job: jobDriver, status: InterestStatus.contacted_interested, follow_up_date: null },
    { candidate: candRakibul, job: jobSecurityGuard, status: InterestStatus.interview_selected, follow_up_date: null },
    { candidate: candTarik, job: jobGeneralHelper, status: InterestStatus.not_contacted, follow_up_date: null },
    { candidate: candPrabhat, job: jobGeneralHelper, status: InterestStatus.not_contacted, follow_up_date: null },
    { candidate: candRajesh, job: jobGeneralHelper, status: InterestStatus.contacted_maybe_later, follow_up_date: threeDaysFromNow },
    { candidate: candKartik, job: jobGeneralHelper, status: InterestStatus.contacted_interested, follow_up_date: null },
    { candidate: candSkAlam, job: jobGeneralHelper, status: InterestStatus.not_contacted, follow_up_date: null },
    { candidate: candBablu, job: jobMason, status: InterestStatus.not_contacted, follow_up_date: null },
  ];

  for (const entry of pipelineDefs) {
    if (!entry.candidate || !entry.job) continue;
    try {
      await prisma.candidateJob.upsert({
        where: {
          candidate_id_job_id: {
            candidate_id: entry.candidate.id,
            job_id: entry.job.id,
          },
        },
        update: {},
        create: {
          candidate_id: entry.candidate.id,
          job_id: entry.job.id,
          status: entry.status,
          follow_up_date: entry.follow_up_date,
          assigned_to: recruiterUser.id,
        },
      });
    } catch (e) {
      console.warn(`Skipping pipeline entry for candidate ${entry.candidate.full_name} / job ${entry.job.title}`);
    }
  }

  // ─── CALL LOGS ────────────────────────────────────
  console.log('Seeding call logs...');

  const cjMohammedWelder = await prisma.candidateJob.findFirst({
    where: { candidate_id: candMohammedRafiq!.id, job_id: jobSeniorWelder.id },
  });
  const cjSohelPlumber = await prisma.candidateJob.findFirst({
    where: { candidate_id: candSohel!.id, job_id: jobPlumber.id },
  });
  const cjRameshMason = await prisma.candidateJob.findFirst({
    where: { candidate_id: candRamesh!.id, job_id: jobMason.id },
  });
  const cjDilipMason = await prisma.candidateJob.findFirst({
    where: { candidate_id: candDilip!.id, job_id: jobMason.id },
  });
  const cjRajeshHelper = await prisma.candidateJob.findFirst({
    where: { candidate_id: candRajesh!.id, job_id: jobGeneralHelper.id },
  });

  if (cjMohammedWelder) {
    // Check if call logs already exist to avoid duplicates on re-run
    const existingCalls = await prisma.callLog.count({ where: { candidate_job_id: cjMohammedWelder.id } });
    if (existingCalls === 0) {
      await prisma.callLog.create({
        data: {
          candidate_job_id: cjMohammedWelder.id,
          caller_id: recruiterUser.id,
          outcome: CallOutcome.reached,
          notes: 'Candidate is very interested, confirmed availability',
          call_attempt_number: 1,
        },
      });
      await prisma.callLog.create({
        data: {
          candidate_job_id: cjMohammedWelder.id,
          caller_id: recruiterUser.id,
          outcome: CallOutcome.reached,
          notes: 'Confirmed documents ready, asked to come for briefing',
          call_attempt_number: 2,
        },
      });
    }
  }

  if (cjSohelPlumber) {
    const existingCalls = await prisma.callLog.count({ where: { candidate_job_id: cjSohelPlumber.id } });
    if (existingCalls === 0) {
      await prisma.callLog.create({
        data: {
          candidate_job_id: cjSohelPlumber.id,
          caller_id: recruiterUser.id,
          outcome: CallOutcome.reached,
          notes: 'Interested in plumber position, has 3 years experience',
          call_attempt_number: 1,
        },
      });
    }
  }

  if (cjRameshMason) {
    const existingCalls = await prisma.callLog.count({ where: { candidate_job_id: cjRameshMason.id } });
    if (existingCalls === 0) {
      await prisma.callLog.create({
        data: {
          candidate_job_id: cjRameshMason.id,
          caller_id: recruiterUser.id,
          outcome: CallOutcome.reached,
          notes: 'Confirmed for interview on 15th April',
          call_attempt_number: 1,
        },
      });
    }
  }

  if (cjDilipMason) {
    const existingCalls = await prisma.callLog.count({ where: { candidate_job_id: cjDilipMason.id } });
    if (existingCalls === 0) {
      await prisma.callLog.create({
        data: {
          candidate_job_id: cjDilipMason.id,
          caller_id: recruiterUser.id,
          outcome: CallOutcome.not_reachable,
          call_attempt_number: 1,
        },
      });
      await prisma.callLog.create({
        data: {
          candidate_job_id: cjDilipMason.id,
          caller_id: recruiterUser.id,
          outcome: CallOutcome.reached,
          notes: 'Will come after discussing with family',
          call_attempt_number: 2,
        },
      });
    }
  }

  if (cjRajeshHelper) {
    const existingCalls = await prisma.callLog.count({ where: { candidate_job_id: cjRajeshHelper.id } });
    if (existingCalls === 0) {
      await prisma.callLog.create({
        data: {
          candidate_job_id: cjRajeshHelper.id,
          caller_id: recruiterUser.id,
          outcome: CallOutcome.reached,
          notes: 'Currently in another state, will be back in 3 days. Asked to call again.',
          call_attempt_number: 1,
          follow_up_date: threeDaysFromNow,
        },
      });
    }
  }

  // ─── PROCESS TRACKING ────────────────────────────
  console.log('Seeding process tracking...');

  const processManagerUser = await prisma.user.findFirst({ where: { email: 'process@alhiraa.com' } });
  if (!processManagerUser) throw new Error('Process manager user not found');

  const cjSantoshElectrician = await prisma.candidateJob.findFirst({
    where: { candidate_id: candSantosh!.id, job_id: jobElectrician.id },
  });
  const cjRakibulSecurity = await prisma.candidateJob.findFirst({
    where: { candidate_id: candRakibul!.id, job_id: jobSecurityGuard.id },
  });

  const processSteps = [
    { step_number: 1, step_name: 'Document Collection', status: ProcessStepStatus.completed, completed_at: threeDaysAgo, started_at: threeDaysAgo },
    { step_number: 2, step_name: 'Medical Test', status: ProcessStepStatus.in_progress, started_at: yesterday, completed_at: null },
    { step_number: 3, step_name: 'GAMCA Slip', status: ProcessStepStatus.not_started, started_at: null, completed_at: null },
    { step_number: 4, step_name: 'Visa Processing', status: ProcessStepStatus.not_started, started_at: null, completed_at: null },
    { step_number: 5, step_name: 'Visa Stamping', status: ProcessStepStatus.not_started, started_at: null, completed_at: null },
    { step_number: 6, step_name: 'Air Ticket / Departure', status: ProcessStepStatus.not_started, started_at: null, completed_at: null },
  ];

  for (const cjId of [cjSantoshElectrician?.id, cjRakibulSecurity?.id]) {
    if (!cjId) continue;
    for (const step of processSteps) {
      await prisma.processTracking.upsert({
        where: {
          candidate_job_id_step_number: {
            candidate_job_id: cjId,
            step_number: step.step_number,
          },
        },
        update: {},
        create: {
          candidate_job_id: cjId,
          step_number: step.step_number,
          step_name: step.step_name,
          status: step.status,
          started_at: step.started_at,
          completed_at: step.completed_at,
          updated_by: processManagerUser.id,
        },
      });
    }
  }

  // ─── INTERVIEW EVENT ─────────────────────────────
  console.log('Seeding interview event...');

  // Check if interview event already exists for Mason job on that date
  let interviewEvent = await prisma.interviewEvent.findFirst({
    where: { job_id: jobMason.id, event_date: new Date('2026-04-15') },
  });

  if (!interviewEvent) {
    interviewEvent = await prisma.interviewEvent.create({
      data: {
        job_id: jobMason.id,
        event_date: new Date('2026-04-15'),
        venue_name: 'Al-Hiraa Office, Kolkata',
        venue_address: '12, Park Street, Kolkata - 700016',
        capacity: 25,
        interviewer_name: 'Mr. Khalid Al-Thani',
        interview_type: InterviewType.in_person,
        status: InterviewEventStatus.scheduled,
        created_by: adminUser.id,
      },
    });
  }

  // Add check-ins for Ramesh Kumar and Anil Kumar Singh
  const cjRameshMasonForCheckin = await prisma.candidateJob.findFirst({
    where: { candidate_id: candRamesh!.id, job_id: jobMason.id },
  });
  const cjAnilMason = await prisma.candidateJob.findFirst({
    where: { candidate_id: candAnil!.id, job_id: jobMason.id },
  });

  if (cjRameshMasonForCheckin) {
    const existingCheckin = await prisma.interviewCheckin.findFirst({
      where: { interview_event_id: interviewEvent.id, candidate_job_id: cjRameshMasonForCheckin.id },
    });
    if (!existingCheckin) {
      await prisma.interviewCheckin.create({
        data: {
          interview_event_id: interviewEvent.id,
          candidate_job_id: cjRameshMasonForCheckin.id,
          checkin_status: CheckinStatus.arrived,
          result: InterviewResult.selected,
        },
      });
    }
  }

  if (cjAnilMason) {
    const existingCheckin = await prisma.interviewCheckin.findFirst({
      where: { interview_event_id: interviewEvent.id, candidate_job_id: cjAnilMason.id },
    });
    if (!existingCheckin) {
      await prisma.interviewCheckin.create({
        data: {
          interview_event_id: interviewEvent.id,
          candidate_job_id: cjAnilMason.id,
          checkin_status: CheckinStatus.expected,
        },
      });
    }
  }

  console.log('Seed complete!');
  console.log('Admin login: admin@alhiraa.com / Admin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
