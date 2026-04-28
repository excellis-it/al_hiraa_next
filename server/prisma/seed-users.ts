import { PrismaClient, UserRole } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || 'postgresql://alhiraa:alhiraa_dev_2026@localhost:5432/alhiraa_atms' }) });

async function main() {
  console.log('Seeding users & associates...');
  const pw = await bcrypt.hash('Password@123', 10);

  // 10 Data Entry users
  const deNames = [
    'Priya Sharma', 'Amit Verma', 'Neha Gupta', 'Rohit Patel', 'Kavita Singh',
    'Sanjay Mondal', 'Ritu Das', 'Aakash Kumar', 'Sunita Devi', 'Vikas Tiwari',
  ];
  for (let i = 0; i < 10; i++) {
    await prisma.user.upsert({
      where: { email: `de${i + 1}@alhiraa.com` },
      update: {},
      create: { full_name: deNames[i], email: `de${i + 1}@alhiraa.com`, password_hash: pw, role: UserRole.data_entry, phone: `98100${String(10001 + i)}` },
    });
  }
  console.log('  ✓ 10 data_entry users');

  // 5 Recruiter users
  const recNames = ['Farhan Sheikh', 'Ananya Roy', 'Imran Hussain', 'Deepa Nath', 'Rajiv Chauhan'];
  for (let i = 0; i < 5; i++) {
    await prisma.user.upsert({
      where: { email: `rec${i + 1}@alhiraa.com` },
      update: {},
      create: { full_name: recNames[i], email: `rec${i + 1}@alhiraa.com`, password_hash: pw, role: UserRole.recruiter, phone: `98200${String(20001 + i)}` },
    });
  }
  console.log('  ✓ 5 recruiter users');

  // 2 Process Manager users
  const pmNames = ['Arjun Biswas', 'Meena Lakra'];
  for (let i = 0; i < 2; i++) {
    await prisma.user.upsert({
      where: { email: `pm${i + 1}@alhiraa.com` },
      update: {},
      create: { full_name: pmNames[i], email: `pm${i + 1}@alhiraa.com`, password_hash: pw, role: UserRole.process_manager, phone: `98300${String(30001 + i)}` },
    });
  }
  console.log('  ✓ 2 process_manager users');

  // 1 Manager
  await prisma.user.upsert({
    where: { email: 'manager@alhiraa.com' },
    update: {},
    create: { full_name: 'Salim Ahmed', email: 'manager@alhiraa.com', password_hash: pw, role: UserRole.manager, phone: '9840040001' },
  });
  console.log('  ✓ 1 manager user');

  // 5 Associates
  const assocNames = [
    { name: 'Mohammad Rafiq', phone: '9850050001', rate: 5 },
    { name: 'Baldev Singh', phone: '9850050002', rate: 4 },
    { name: 'Karim Ansari', phone: '9850050003', rate: 6 },
    { name: 'Suraj Oraon', phone: '9850050004', rate: 5 },
    { name: 'Firoz Alam', phone: '9850050005', rate: 3 },
  ];
  for (const a of assocNames) {
    await prisma.associate.upsert({
      where: { phone: a.phone },
      update: {},
      create: { full_name: a.name, phone: a.phone, commission_rate: a.rate, status: 'active', password_hash: pw },
    });
  }
  console.log('  ✓ 5 associates');

  console.log('\nDone! User seed complete.');
  console.log('All new users password: Password@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
