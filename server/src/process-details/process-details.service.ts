import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CANDIDATE_INCLUDE = {
  candidate: {
    select: {
      id: true, full_name: true, passport_no: true, whatsapp_no: true,
      ecr_type: true, state_id: true, city_id: true, gender: true,
      dob: true, education: true,
      state: { select: { name: true } },
      city:  { select: { name: true } },
    },
  },
  job: {
    select: {
      id: true, title: true, country: true,
      salary_min: true, salary_max: true, salary_currency: true,
      service_fee: true, positions_required: true,
      experience_required: true,
      company: { select: { name: true } },
    },
  },
  payments: {
    orderBy: { installment_number: 'asc' as const },
    select: {
      id: true, installment_number: true, total_fee: true,
      amount_due: true, amount_paid: true, fee_waiver_amount: true,
      due_date: true, paid_date: true, status: true,
      payment_method: true, receipt_number: true, notes: true,
    },
  },
};

const DATE_FIELDS = [
  'date_of_interview', 'date_of_selection',
  'medical_app_date', 'medical_completion_date', 'medical_approval_date',
  'medical_expiry_date', 'medical_repeat_date',
  'courier_sent_date', 'courier_received_date',
  'mofa_date', 'mofa_received_date',
  'visa_receiving_date', 'visa_issue_date', 'visa_expiry_date',
  'vfs_applied_date', 'vfs_received_date',
  'ticket_booking_date', 'ticket_confirm_date', 'exit_paper_date',
  'deployment_date', 'refund_date',
];

@Injectable()
export class ProcessDetailsService {
  constructor(private prisma: PrismaService) {}

  async getOrCreate(candidateJobId: number) {
    const existing = await this.prisma.processDetails.findUnique({
      where: { candidate_job_id: candidateJobId },
      include: { candidate_job: { include: CANDIDATE_INCLUDE } },
    });
    if (existing) return existing;
    return this.prisma.processDetails.create({
      data: { candidate_job_id: candidateJobId },
      include: { candidate_job: { include: CANDIDATE_INCLUDE } },
    });
  }

  async update(candidateJobId: number, dto: any) {
    const data: any = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined || v === null) continue;
      data[k] = DATE_FIELDS.includes(k) ? (v ? new Date(v as string) : null) : v;
    }
    return this.prisma.processDetails.upsert({
      where: { candidate_job_id: candidateJobId },
      create: { candidate_job_id: candidateJobId, ...data },
      update: data,
    });
  }

  // ── Batch init from interview checkins ────────────────────────────────────
  async batchFromInterview(candidateJobIds: number[], initialData?: any) {
    const results = [];
    for (const candidateJobId of candidateJobIds) {
      const existing = await this.prisma.processDetails.findUnique({ where: { candidate_job_id: candidateJobId } });
      if (existing) { results.push(existing); continue; }
      const data: any = {};
      if (initialData) {
        for (const [k, v] of Object.entries(initialData)) {
          if (!v) continue;
          data[k] = DATE_FIELDS.includes(k) ? new Date(v as string) : v;
        }
      }
      results.push(await this.prisma.processDetails.create({
        data: { candidate_job_id: candidateJobId, ...data },
        include: { candidate_job: { include: CANDIDATE_INCLUDE } },
      }));
    }
    return results;
  }

  // ── Quick add: find/create candidate by passport + create candidateJob + processDetails ──
  async quickAdd(dto: {
    passport_no: string;
    full_name: string;
    whatsapp_no: string;
    job_id: number;
    registered_by: string;
    date_of_interview?: string;
    date_of_selection?: string;
    mode_of_selection?: string;
    interview_location?: string;
  }) {
    if (!dto.passport_no) throw new BadRequestException('Passport number is required');
    if (!dto.full_name)   throw new BadRequestException('Full name is required');
    if (!dto.whatsapp_no) throw new BadRequestException('Phone number is required');

    // 1. Find or create candidate by passport
    let candidate = await this.prisma.candidate.findUnique({ where: { passport_no: dto.passport_no } });
    if (!candidate) {
      // Fetch defaults for required FK fields
      const [defaultSource, defaultTrade] = await Promise.all([
        this.prisma.source.findFirst({ orderBy: { id: 'asc' } }),
        this.prisma.trade.findFirst({ orderBy: { id: 'asc' } }),
      ]);
      if (!defaultSource) throw new BadRequestException('No source configured in master data');
      if (!defaultTrade)  throw new BadRequestException('No trade/position configured in master data');

      // Ensure whatsapp_no uniqueness
      const existingPhone = await this.prisma.candidate.findUnique({ where: { whatsapp_no: dto.whatsapp_no } });
      if (existingPhone) throw new BadRequestException(`Phone ${dto.whatsapp_no} already registered`);

      candidate = await this.prisma.candidate.create({
        data: {
          full_name: dto.full_name,
          passport_no: dto.passport_no,
          whatsapp_no: dto.whatsapp_no,
          position_1_id: defaultTrade.id,
          registration_mode: 'walk_in',
          source_id: defaultSource.id,
          registered_by: dto.registered_by,
        },
      });
    }

    // 2. Find or create CandidateJob
    let candidateJob = await this.prisma.candidateJob.findUnique({
      where: { candidate_id_job_id: { candidate_id: candidate.id, job_id: dto.job_id } },
    });
    if (!candidateJob) {
      candidateJob = await this.prisma.candidateJob.create({
        data: { candidate_id: candidate.id, job_id: dto.job_id, status: 'interview_selected', assigned_to: dto.registered_by },
      });
    }

    // 3. Create/get process details with initial selection data
    const existing = await this.prisma.processDetails.findUnique({ where: { candidate_job_id: candidateJob.id } });
    if (existing) return existing;

    const data: any = { candidate_job_id: candidateJob.id };
    if (dto.date_of_interview) data.date_of_interview = new Date(dto.date_of_interview);
    if (dto.date_of_selection) data.date_of_selection = new Date(dto.date_of_selection);
    if (dto.mode_of_selection)  data.mode_of_selection  = dto.mode_of_selection;
    if (dto.interview_location) data.interview_location = dto.interview_location;
    data.candidate_status = 'selected';

    return this.prisma.processDetails.create({
      data,
      include: { candidate_job: { include: CANDIDATE_INCLUDE } },
    });
  }

  // ── CSV import: process array of rows ─────────────────────────────────────
  async importFromCsv(rows: any[], jobId: number, registeredBy: string) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const row of rows) {
      try {
        const passport = (row['Passport No'] || row['passport_no'] || row['PASSPORT_NO'] || '').trim();
        const name     = (row['Full Name']   || row['full_name']   || row['NAME'] || '').trim();
        const phone    = (row['Phone']       || row['whatsapp_no'] || row['PHONE'] || '').trim();
        if (!passport) { results.errors.push(`Row skipped: passport required`); continue; }
        const phone_final = phone || `TEMP_${passport}`;
        await this.quickAdd({ passport_no: passport, full_name: name || passport, whatsapp_no: phone_final, job_id: jobId, registered_by: registeredBy });
        results.created++;
      } catch (err: any) {
        results.errors.push(err.message || 'Unknown error');
        results.skipped++;
      }
    }
    return results;
  }

  // ── Stage summary ─────────────────────────────────────────────────────────
  async getStageSummary() {
    const all = await this.prisma.processDetails.findMany({
      select: { deployment_date: true, ticket_confirm_date: true, visa_issue_date: true, medical_app_date: true, medical_status: true },
    });
    const counts = { selection: 0, documents: 0, medical: 0, payment: 0, visa: 0, flight: 0, total: all.length };
    for (const r of all) {
      if (r.deployment_date) counts.flight++;
      else if (r.visa_issue_date) counts.visa++;
      else if (r.ticket_confirm_date) counts.payment++;
      else if (r.medical_status === 'fit' || r.medical_app_date) counts.medical++;
      else counts.selection++;
    }
    return counts;
  }

  // ── List all with enriched data ───────────────────────────────────────────
  async findAll(params: {
    page?: number; limit?: number; search?: string; medical_status?: string;
    candidate_status?: string; year?: number; job_id?: number;
    interview_event_id?: number;
  }) {
    const page  = params.page  || 1;
    const limit = Math.min(params.limit || 50, 1000);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (params.medical_status)  where.medical_status  = params.medical_status;
    if (params.candidate_status) where.candidate_status = params.candidate_status;
    if (params.year) where.year_of_selection = params.year;

    // Filter by job (for interview-specific view)
    const candidateJobWhere: any = {};
    if (params.job_id) candidateJobWhere.job_id = params.job_id;
    if (params.search) {
      candidateJobWhere.OR = [
        { candidate: { full_name: { contains: params.search, mode: 'insensitive' } } },
        { candidate: { passport_no: { contains: params.search, mode: 'insensitive' } } },
        { candidate: { whatsapp_no: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    if (Object.keys(candidateJobWhere).length > 0) where.candidate_job = candidateJobWhere;

    const [data, total] = await Promise.all([
      this.prisma.processDetails.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date_of_selection: 'desc' },
        include: { candidate_job: { include: CANDIDATE_INCLUDE } },
      }),
      this.prisma.processDetails.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }
}
