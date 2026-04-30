import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import {
  BatchImportRowDto,
  BatchImportToInterviewDto,
} from './dto/batch-import.dto';
import { CompletionStatus, InterestStatus } from '../generated/prisma';

// Required fields for "complete" status
const REQUIRED_FIELDS = [
  'full_name',
  'dob',
  'whatsapp_no',
  'gender',
  'passport_no',
  'ecr_type',
  'state_id',
  'city_id',
  'education',
  'position_1_id',
  'registration_mode',
  'source_id',
] as const;

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  private calculateCompletionStatus(data: any): CompletionStatus {
    const allFilled = REQUIRED_FIELDS.every((field) => {
      const value = data[field];
      return value !== null && value !== undefined && value !== '';
    });
    return allFilled ? CompletionStatus.complete : CompletionStatus.incomplete;
  }

  private formatCandidateCode(
    id: number,
    createdAt?: Date | null,
    yearSequence?: number | null,
  ): string {
    if (yearSequence && createdAt) {
      const yy = String(createdAt.getFullYear() % 100).padStart(2, '0');
      return `ALH-${yy}-${String(yearSequence).padStart(3, '0')}`;
    }
    // Fallback for candidates without year_sequence
    return `ALH-${String(id).padStart(5, '0')}`;
  }

  async create(dto: CreateCandidateDto, registeredBy: string) {
    // Check duplicates
    if (dto.passport_no) {
      const existingPassport = await this.prisma.candidate.findUnique({
        where: { passport_no: dto.passport_no },
      });
      if (existingPassport) {
        throw new ConflictException({
          message: 'Duplicate passport number',
          existing: {
            id: existingPassport.id,
            code: this.formatCandidateCode(existingPassport.id, existingPassport.created_at, existingPassport.year_sequence),
            full_name: existingPassport.full_name,
          },
        });
      }
    }

    // Generate placeholder whatsapp_no if not provided (DB requires a unique value)
    const whatsapp_no = dto.whatsapp_no?.trim()
      || `PP-${dto.passport_no?.replace(/\s/g, '') || Date.now()}`;

    if (dto.whatsapp_no) {
      const existingPhone = await this.prisma.candidate.findUnique({
        where: { whatsapp_no },
      });
      if (existingPhone) {
        throw new ConflictException({
          message: 'Duplicate WhatsApp number',
          existing: {
            id: existingPhone.id,
            code: this.formatCandidateCode(existingPhone.id, existingPhone.created_at, existingPhone.year_sequence),
            full_name: existingPhone.full_name,
          },
        });
      }
    }

    const completion_status = this.calculateCompletionStatus(dto);

    // Use transaction to compute year_sequence atomically
    const candidate = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

      // Count existing candidates this year
      const countThisYear = await tx.candidate.count({
        where: {
          created_at: { gte: yearStart, lt: yearEnd },
          year_sequence: { not: null },
        },
      });

      const yearSeq = countThisYear + 1;

      return tx.candidate.create({
        data: {
          ...dto,
          whatsapp_no,
          dob: dto.dob ? new Date(dto.dob) : null,
          indian_driving_license: dto.indian_driving_license || [],
          gulf_driving_license: dto.gulf_driving_license || [],
          completion_status,
          registered_by: registeredBy,
          year_sequence: yearSeq,
        },
        include: {
          state: { select: { name: true } },
          city: { select: { name: true } },
          position_1: { select: { name: true } },
          position_2: { select: { name: true } },
          position_3: { select: { name: true } },
          source: { select: { name: true } },
        },
      });
    });

    return {
      ...candidate,
      candidate_code: this.formatCandidateCode(candidate.id, candidate.created_at, candidate.year_sequence),
    };
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    completion_status?: string;
    position_ids?: number[];
    state_id?: number;
    city_id?: number;
    source_id?: number;
    date_from?: string;
    date_to?: string;
    gulf_return?: boolean;
    ecr_type?: string;
    include_external?: boolean;
  }) {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      completion_status,
      position_ids,
      state_id,
      city_id,
      source_id,
      date_from,
      date_to,
      gulf_return,
      ecr_type,
      include_external,
    } = params;
    const skip = (page - 1) * limit;

    const conditions: any[] = [];

    if (!include_external) {
      conditions.push({ external_only: false });
    }

    if (search) {
      conditions.push({
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { passport_no: { contains: search, mode: 'insensitive' } },
          { whatsapp_no: { contains: search } },
          { position_1: { name: { contains: search, mode: 'insensitive' } } },
          { position_2: { name: { contains: search, mode: 'insensitive' } } },
          { position_3: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    if (status) conditions.push({ status });
    if (completion_status) conditions.push({ completion_status });
    if (position_ids && position_ids.length > 0) {
      conditions.push({
        OR: [
          { position_1_id: { in: position_ids } },
          { position_2_id: { in: position_ids } },
          { position_3_id: { in: position_ids } },
        ],
      });
    }
    if (state_id) conditions.push({ state_id });
    if (city_id) conditions.push({ city_id });
    if (source_id) conditions.push({ source_id });
    if (gulf_return !== undefined) conditions.push({ gulf_return });
    if (ecr_type) conditions.push({ ecr_type });
    if (date_from || date_to) {
      const created_at: any = {};
      if (date_from) created_at.gte = new Date(date_from);
      if (date_to) {
        const end = new Date(date_to);
        end.setHours(23, 59, 59, 999);
        created_at.lte = end;
      }
      conditions.push({ created_at });
    }

    const where: any = conditions.length > 0 ? { AND: conditions } : {};

    const [candidates, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        include: {
          state: { select: { name: true } },
          city: { select: { name: true } },
          position_1: { select: { name: true } },
          position_2: { select: { name: true } },
          position_3: { select: { name: true } },
          source: { select: { name: true } },
          associate: { select: { full_name: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    const candidateIds = candidates.map((c) => c.id);

    // Batch: resolve registered_by and updated_by user names
    const allUserIds = [...new Set([
      ...candidates.map((c) => c.registered_by),
      ...candidates.map((c) => (c as any).updated_by),
    ].filter(Boolean))];
    const registeredByUsers = await this.prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, full_name: true },
    });
    const userMap = new Map(registeredByUsers.map((u) => [u.id, u.full_name]));

    // Batch: latest call outcome per candidate
    const latestCallLogs = await this.prisma.callLog.findMany({
      where: { candidate_job: { candidate_id: { in: candidateIds } } },
      select: {
        outcome: true,
        call_timestamp: true,
        caller: { select: { full_name: true } },
        candidate_job: { select: { candidate_id: true } },
      },
      orderBy: { call_timestamp: 'desc' },
    });
    const lastCallMap = new Map<number, string>();
    const lastCallByMap = new Map<number, string>();
    for (const log of latestCallLogs) {
      const candId = log.candidate_job.candidate_id;
      if (!lastCallMap.has(candId)) {
        lastCallMap.set(candId, log.outcome);
        lastCallByMap.set(candId, log.caller?.full_name ?? '');
      }
    }

    // Batch: latest interview result per candidate
    const latestCheckins = await this.prisma.interviewCheckin.findMany({
      where: { candidate_job: { candidate_id: { in: candidateIds } } },
      select: {
        result: true,
        checkin_status: true,
        updated_at: true,
        candidate_job: { select: { candidate_id: true } },
      },
      orderBy: { updated_at: 'desc' },
    });
    const lastInterviewMap = new Map<number, string>();
    for (const checkin of latestCheckins) {
      const candId = checkin.candidate_job.candidate_id;
      if (!lastInterviewMap.has(candId)) {
        lastInterviewMap.set(candId, checkin.result || checkin.checkin_status);
      }
    }

    return {
      data: candidates.map((c) => ({
        ...c,
        candidate_code: this.formatCandidateCode(c.id, c.created_at, c.year_sequence),
        registered_by_name: userMap.get(c.registered_by) || c.registered_by,
        updated_by_name: (c as any).updated_by ? (userMap.get((c as any).updated_by) || (c as any).updated_by) : null,
        last_call_status: lastCallMap.get(c.id) || null,
        last_call_by: lastCallByMap.get(c.id) || null,
        interview_status: lastInterviewMap.get(c.id) || null,
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        state: { select: { name: true } },
        city: { select: { name: true } },
        position_1: { select: { name: true } },
        position_2: { select: { name: true } },
        position_3: { select: { name: true } },
        source: { select: { name: true } },
        associate: { select: { full_name: true } },
        candidate_jobs: {
          select: { id: true, status: true, job: { select: { title: true } } },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!candidate) throw new NotFoundException('Candidate not found');

    // Resolve registered_by user name
    let registered_by_name = candidate.registered_by;
    if (candidate.registered_by) {
      const user = await this.prisma.user.findUnique({
        where: { id: candidate.registered_by },
        select: { full_name: true },
      });
      if (user) registered_by_name = user.full_name;
    }

    return {
      ...candidate,
      candidate_code: this.formatCandidateCode(candidate.id, candidate.created_at, candidate.year_sequence),
      registered_by: registered_by_name,
      active_candidate_job_id: candidate.candidate_jobs[0]?.id ?? null,
      active_job_title: candidate.candidate_jobs[0]?.job?.title ?? null,
    };
  }

  async update(id: number, data: Partial<CreateCandidateDto>, userId?: string) {
    await this.findOne(id);

    // If updating passport or phone, check duplicates
    if (data.passport_no) {
      const existing = await this.prisma.candidate.findFirst({
        where: { passport_no: data.passport_no, NOT: { id } },
      });
      if (existing) throw new ConflictException('Passport number already exists');
    }
    if (data.whatsapp_no) {
      const existing = await this.prisma.candidate.findFirst({
        where: { whatsapp_no: data.whatsapp_no, NOT: { id } },
      });
      if (existing) throw new ConflictException('WhatsApp number already exists');
    }

    // Merge existing data with update to recalculate completion
    const current = await this.prisma.candidate.findUnique({ where: { id } });
    const merged = { ...current, ...data };
    const completion_status = this.calculateCompletionStatus(merged);

    const updateData: any = { ...data, completion_status };
    if (data.dob) updateData.dob = new Date(data.dob);
    if (userId) updateData.updated_by = userId;

    const candidate = await this.prisma.candidate.update({
      where: { id },
      data: updateData,
      include: {
        state: { select: { name: true } },
        city: { select: { name: true } },
        position_1: { select: { name: true } },
        source: { select: { name: true } },
      },
    });

    return {
      ...candidate,
      candidate_code: this.formatCandidateCode(candidate.id, candidate.created_at, candidate.year_sequence),
    };
  }

  async duplicateCheck(passport_no?: string, whatsapp_no?: string) {
    const results: any[] = [];

    if (passport_no) {
      const match = await this.prisma.candidate.findUnique({
        where: { passport_no },
        select: { id: true, full_name: true, whatsapp_no: true, status: true, created_at: true, year_sequence: true },
      });
      if (match) {
        results.push({
          ...match,
          candidate_code: this.formatCandidateCode(match.id, match.created_at, match.year_sequence),
          match_type: 'passport',
        });
      }
    }

    if (whatsapp_no) {
      const match = await this.prisma.candidate.findUnique({
        where: { whatsapp_no },
        select: { id: true, full_name: true, passport_no: true, status: true, created_at: true, year_sequence: true },
      });
      if (match) {
        results.push({
          ...match,
          candidate_code: this.formatCandidateCode(match.id, match.created_at, match.year_sequence),
          match_type: 'whatsapp',
        });
      }
    }

    return { duplicates: results, has_duplicates: results.length > 0 };
  }

  async getIncompleteQueue(params: {
    page?: number;
    limit?: number;
    registered_by?: string;
    date_from?: string;
    date_to?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 50, registered_by, date_from, date_to, sort_order = 'asc' } = params;
    const skip = (page - 1) * limit;

    const conditions: any[] = [{ completion_status: CompletionStatus.incomplete }];
    if (registered_by) conditions.push({ registered_by });
    if (date_from || date_to) {
      const created_at: any = {};
      if (date_from) created_at.gte = new Date(date_from);
      if (date_to) { const e = new Date(date_to); e.setHours(23, 59, 59, 999); created_at.lte = e; }
      conditions.push({ created_at });
    }
    const where = { AND: conditions };

    const [candidates, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        select: {
          id: true,
          full_name: true,
          whatsapp_no: true,
          passport_no: true,
          position_1: { select: { name: true } },
          state: { select: { name: true } },
          city: { select: { name: true } },
          status: true,
          created_at: true,
          year_sequence: true,
          registered_by: true,
        },
        skip,
        take: limit,
        orderBy: { created_at: sort_order },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    // Resolve registered_by user names
    const userIds = [...new Set(candidates.map((c) => c.registered_by).filter(Boolean))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, full_name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.full_name]));

    return {
      data: candidates.map((c) => ({
        ...c,
        candidate_code: this.formatCandidateCode(c.id, c.created_at, c.year_sequence),
        registered_by_name: userMap.get(c.registered_by) || c.registered_by || '—',
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async bulkDeleteIncomplete(ids: number[]) {
    if (!ids?.length) return { deleted: 0 };
    const result = await this.prisma.candidate.deleteMany({
      where: {
        id: { in: ids },
        completion_status: CompletionStatus.incomplete,
      },
    });
    return { deleted: result.count };
  }

  async importCandidate(row: any, importedBy: string) {
    if (!row.passport_no) throw new BadRequestException('passport_no is required');

    // 1. Find or create state
    let stateId: number | null = null;
    if (row.state) {
      let state = await this.prisma.state.findFirst({
        where: { name: { equals: row.state, mode: 'insensitive' } },
      });
      if (!state) {
        state = await this.prisma.state.create({ data: { name: row.state } });
      }
      stateId = state.id;
    }

    // 2. Find or create trade/position
    let positionId: number | null = null;
    if (row.position) {
      let trade = await this.prisma.trade.findFirst({
        where: { name: { equals: row.position, mode: 'insensitive' } },
      });
      if (!trade) {
        trade = await this.prisma.trade.create({ data: { name: row.position } });
      }
      positionId = trade.id;
    }

    // 3. Upsert candidate by passport_no (phone may be blank for associate imports)
    // whatsapp_no is required+unique in DB; use IMPORT-{passport} as placeholder if missing
    const rawWhatsapp = row.whatsapp_no ? String(row.whatsapp_no).trim() : '';
    const whatsapp = rawWhatsapp || `IMPORT-${String(row.passport_no).replace(/\s/g, '')}`;

    // Check for existing candidate
    let candidate = await this.prisma.candidate.findUnique({
      where: { passport_no: String(row.passport_no) },
    });

    if (!candidate) {
      // Check phone uniqueness if a real phone was provided
      if (rawWhatsapp) {
        const phoneExists = await this.prisma.candidate.findUnique({
          where: { whatsapp_no: rawWhatsapp },
        });
        if (phoneExists) throw new ConflictException(`Phone ${rawWhatsapp} already exists`);
      }

      const completion_status = this.calculateCompletionStatus({
        full_name: row.full_name,
        passport_no: row.passport_no,
        whatsapp_no: whatsapp,
        gender: row.gender,
        state_id: stateId,
        position_1_id: positionId,
      });

      candidate = await this.prisma.candidate.create({
        data: {
          full_name: row.full_name || 'Unknown',
          passport_no: String(row.passport_no),
          whatsapp_no: whatsapp,
          gender: row.gender || null,
          dob: row.dob ? new Date(row.dob) : null,
          state_id: stateId,
          position_1_id: positionId,
          completion_status,
          registered_by: importedBy,
          indian_driving_license: [],
          gulf_driving_license: [],
        } as any,
      });
    }

    // 4. Find or create company
    let companyId: number | null = null;
    if (row.company) {
      let company = await this.prisma.company.findFirst({
        where: { name: { equals: row.company, mode: 'insensitive' } },
      });
      if (!company) {
        company = await this.prisma.company.create({
          data: {
            name: row.company,
            country: 'saudi_arabia',
          },
        });
      }
      companyId = company.id;
    }

    // 5. Find or create job
    let jobId: number | null = null;
    if (companyId && row.job_title) {
      const interviewDate = row.interview_date ? new Date(row.interview_date) : null;
      let job = await this.prisma.job.findFirst({
        where: {
          company_id: companyId,
          title: { equals: row.job_title, mode: 'insensitive' },
          ...(interviewDate
            ? { interview_date_start: { gte: new Date(interviewDate.getFullYear(), interviewDate.getMonth(), interviewDate.getDate()) } }
            : {}),
        },
      });
      if (!job) {
        // Need a trade for the job
        let tradeId = positionId;
        if (!tradeId) {
          const fallbackTrade = await this.prisma.trade.findFirst();
          tradeId = fallbackTrade?.id ?? null;
        }
        if (tradeId) {
          job = await this.prisma.job.create({
            data: {
              company_id: companyId,
              title: row.job_title,
              trade_id: tradeId,
              positions_required: 1,
              country: 'saudi_arabia',
              service_fee: row.service_fee ? parseFloat(String(row.service_fee).replace(/[^0-9.]/g, '')) : 0,
              interview_date_start: interviewDate,
              created_by: importedBy,
            },
          });
        }
      }
      jobId = job?.id ?? null;
    }

    if (!jobId) {
      return {
        candidate_id: candidate.id,
        candidate_code: this.formatCandidateCode(candidate.id, candidate.created_at, candidate.year_sequence),
        message: 'Candidate created/found. No job linked (company or job_title missing).',
      };
    }

    // 6. Create CandidateJob if not already exists
    let candidateJob = await this.prisma.candidateJob.findFirst({
      where: { candidate_id: candidate.id, job_id: jobId },
    });
    if (!candidateJob) {
      candidateJob = await this.prisma.candidateJob.create({
        data: {
          candidate_id: candidate.id,
          job_id: jobId,
          status: 'interview_selected',
        },
      });
    }

    // 7. Create ProcessDetails entry at selection stage
    await this.prisma.processDetails.upsert({
      where: { candidate_job_id: candidateJob.id },
      update: {},
      create: {
        candidate_job_id: candidateJob.id,
        date_of_interview: row.interview_date ? new Date(row.interview_date) : null,
        candidate_status: 'selected',
        year_of_selection: new Date().getFullYear(),
        remarks: row.notes || null,
      },
    });

    return {
      candidate_id: candidate.id,
      candidate_job_id: candidateJob.id,
      candidate_code: this.formatCandidateCode(candidate.id, candidate.created_at, candidate.year_sequence),
      message: 'Imported successfully',
    };
  }

  async phonesCheck(phones: string[]): Promise<{ existing: string[] }> {
    if (!phones.length) return { existing: [] };
    const found = await this.prisma.candidate.findMany({
      where: { whatsapp_no: { in: phones } },
      select: { whatsapp_no: true },
    });
    return { existing: found.map((c) => c.whatsapp_no) };
  }

  async bulkImportAll(
    rows: any[],
    importedBy: string,
  ): Promise<{ added: number; duplicates: any[]; errors: { row: any; error: string }[] }> {
    const allPhones = rows.map((r) => r.whatsapp_no?.trim()).filter((p): p is string => !!p);

    const existingCandidates = await this.prisma.candidate.findMany({
      where: { whatsapp_no: { in: allPhones } },
      select: { whatsapp_no: true },
    });
    const existingPhoneSet = new Set(existingCandidates.map((c) => c.whatsapp_no));

    const [states, cities, trades, sources, associates] = await Promise.all([
      this.prisma.state.findMany({ select: { id: true, name: true } }),
      this.prisma.city.findMany({ select: { id: true, name: true } }),
      this.prisma.trade.findMany({ select: { id: true, name: true } }),
      this.prisma.source.findMany({ select: { id: true, name: true } }),
      this.prisma.associate.findMany({ select: { id: true, full_name: true } }),
    ]);

    const stateMap = new Map(states.map((s) => [s.name.toLowerCase(), s.id]));
    const cityMap = new Map(cities.map((c) => [c.name.toLowerCase(), c.id]));
    const tradeMap = new Map(trades.map((t) => [t.name.toLowerCase(), t.id]));
    const sourceMap = new Map(sources.map((s) => [s.name.toLowerCase(), s.id]));
    const associateMap = new Map(associates.map((a) => [a.full_name.toLowerCase(), a.id]));

    const resolve = (map: Map<string, number>, name?: string) =>
      name?.trim() ? (map.get(name.trim().toLowerCase()) ?? null) : null;

    const duplicates: any[] = [];
    const toCreate: any[] = [];
    const seenPhones = new Set(existingPhoneSet);

    for (const row of rows) {
      const phone = row.whatsapp_no?.trim();
      if (!phone) continue;
      if (seenPhones.has(phone)) { duplicates.push(row); continue; }
      seenPhones.add(phone);
      toCreate.push(row);
    }

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    let yearSeqBase = await this.prisma.candidate.count({
      where: { created_at: { gte: yearStart, lt: yearEnd }, year_sequence: { not: null } },
    });

    let added = 0;
    const errors: { row: any; error: string }[] = [];

    const parseBoolean = (val?: string) =>
      val?.toLowerCase() === 'yes' || val === 'true' || val === '1';
    const parseList = (val?: string) =>
      val ? val.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    for (const row of toCreate) {
      try {
        const state_id = resolve(stateMap, row.state);
        const city_id = resolve(cityMap, row.city);
        const position_1_id = resolve(tradeMap, row.position_1);
        const position_2_id = resolve(tradeMap, row.position_2);
        const position_3_id = resolve(tradeMap, row.position_3);
        const source_id = resolve(sourceMap, row.source);
        const associate_id = resolve(associateMap, row.associate_name);

        const completion_status = this.calculateCompletionStatus({
          full_name: row.full_name,
          dob: row.dob,
          whatsapp_no: row.whatsapp_no,
          gender: row.gender,
          passport_no: row.passport_no,
          ecr_type: row.ecr_type,
          state_id,
          city_id,
          education: row.education,
          position_1_id,
          registration_mode: row.registration_mode || 'walk_in',
          source_id,
        });

        yearSeqBase++;

        await this.prisma.candidate.create({
          data: {
            full_name: row.full_name || 'Unknown',
            whatsapp_no: row.whatsapp_no.trim(),
            alternate_contact: row.alternate_contact || null,
            dob: row.dob ? new Date(row.dob) : null,
            gender: (row.gender as any) || null,
            email: row.email || null,
            passport_no: row.passport_no || null,
            ecr_type: (row.ecr_type as any) || null,
            state_id,
            city_id,
            religion: row.religion || null,
            education: (row.education as any) || null,
            education_other: row.education_other || null,
            position_1_id,
            position_2_id,
            position_3_id,
            registration_mode: (row.registration_mode as any) || 'walk_in',
            source_id,
            referred_by: row.referred_by || null,
            associate_id,
            indian_driving_license: parseList(row.indian_driving_license),
            gulf_driving_license: parseList(row.gulf_driving_license),
            english_speaking: (row.english_speaking as any) || null,
            arabic_speaking: parseBoolean(row.arabic_speaking),
            gulf_return: parseBoolean(row.gulf_return),
            gulf_return_details: row.gulf_return_details || null,
            indian_experience: row.indian_experience || null,
            abroad_experience: row.abroad_experience || null,
            remarks: row.remarks || null,
            completion_status,
            registered_by: importedBy,
            year_sequence: yearSeqBase,
          } as any,
        });

        added++;
      } catch (e: any) {
        errors.push({ row, error: e?.message || 'Unknown error' });
      }
    }

    return { added, duplicates, errors };
  }

  async getDashboardStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayCount, weekCount, monthCount, incompleteCount, totalCount] =
      await Promise.all([
        this.prisma.candidate.count({
          where: { created_at: { gte: today } },
        }),
        this.prisma.candidate.count({
          where: { created_at: { gte: weekAgo } },
        }),
        this.prisma.candidate.count({
          where: { created_at: { gte: monthStart } },
        }),
        this.prisma.candidate.count({
          where: { completion_status: CompletionStatus.incomplete },
        }),
        this.prisma.candidate.count(),
      ]);

    // 30-day trend data
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyCounts = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM candidates
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return {
      today: todayCount,
      this_week: weekCount,
      this_month: monthCount,
      incomplete: incompleteCount,
      total: totalCount,
      trend: dailyCounts.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
    };
  }

  /**
   * Upsert a candidate keyed by passport_no.
   * If the passport exists we return the existing row and only fill blank fields
   * (never overwrite non-empty values). If not, we create a new candidate.
   * Used by associate/sub-agent imports where the same passport can appear
   * under multiple agents.
   */
  async upsertByPassport(row: BatchImportRowDto, registeredBy: string) {
    if (!row.passport_no?.trim()) {
      throw new BadRequestException('passport_no is required');
    }
    const passport_no = row.passport_no.trim();
    const rawWhatsapp = row.whatsapp_no?.trim() || '';
    const whatsapp_no =
      rawWhatsapp || `IMPORT-${passport_no.replace(/\s/g, '')}`;

    const existing = await this.prisma.candidate.findUnique({
      where: { passport_no },
    });

    if (existing) {
      // Fill only missing fields; never overwrite.
      const patch: any = {};
      if (!existing.whatsapp_no?.startsWith('IMPORT-') && rawWhatsapp && !existing.whatsapp_no) {
        patch.whatsapp_no = rawWhatsapp;
      }
      if (!existing.full_name && row.full_name) patch.full_name = row.full_name;
      if (!existing.dob && row.dob) patch.dob = new Date(row.dob);
      if (!existing.gender && row.gender) patch.gender = row.gender;
      if (!existing.ecr_type && row.ecr_type) patch.ecr_type = row.ecr_type;
      if (!existing.education && row.education) patch.education = row.education;
      if (!existing.indian_experience && row.indian_experience) {
        patch.indian_experience = row.indian_experience;
      }
      if (!existing.abroad_experience && row.abroad_experience) {
        patch.abroad_experience = row.abroad_experience;
      }
      if (!existing.associate_id && row.associate_id) patch.associate_id = row.associate_id;
      if (!existing.referrer_id && row.referrer_id) patch.referrer_id = row.referrer_id;
      if (!existing.registration_mode && row.registration_mode) {
        patch.registration_mode = row.registration_mode;
      }
      if (Object.keys(patch).length > 0) {
        return {
          candidate: await this.prisma.candidate.update({
            where: { id: existing.id },
            data: patch,
          }),
          wasExisting: true,
        };
      }
      return { candidate: existing, wasExisting: true };
    }

    // Check phone uniqueness if a real phone was supplied.
    if (rawWhatsapp) {
      const phoneExists = await this.prisma.candidate.findUnique({
        where: { whatsapp_no: rawWhatsapp },
      });
      if (phoneExists) {
        throw new ConflictException(
          `Phone ${rawWhatsapp} already assigned to another candidate`,
        );
      }
    }

    const created = await this.prisma.candidate.create({
      data: {
        full_name: row.full_name || 'Unknown',
        passport_no,
        whatsapp_no,
        dob: row.dob ? new Date(row.dob) : null,
        gender: row.gender ?? null,
        ecr_type: row.ecr_type ?? null,
        education: row.education ?? null,
        indian_experience: row.indian_experience ?? null,
        abroad_experience: row.abroad_experience ?? null,
        associate_id: row.associate_id ?? null,
        referrer_id: row.referrer_id ?? null,
        registration_mode: row.registration_mode ?? null,
        indian_driving_license: [],
        gulf_driving_license: [],
        completion_status: CompletionStatus.incomplete,
        registered_by: registeredBy,
      },
    });
    return { candidate: created, wasExisting: false };
  }

  /**
   * Bulk add candidates from CSV (sub-agent sourced) directly into an
   * interview event's candidate pool. Keyed by passport; one pre-selected
   * trade for all rows.
   */
  async batchImportToInterview(
    dto: BatchImportToInterviewDto,
    userId: string,
  ) {
    const event = await this.prisma.interviewEvent.findUnique({
      where: { id: dto.event_id },
      select: { id: true, job_id: true },
    });
    if (!event) throw new NotFoundException('Interview event not found');

    const trade = await this.prisma.trade.findUnique({
      where: { id: dto.trade_id },
      select: { id: true },
    });
    if (!trade) throw new NotFoundException('Trade not found');

    const results = {
      created: 0,
      reused: 0,
      already_in_event: 0,
      errors: [] as { passport: string; error: string }[],
    };

    for (const row of dto.rows) {
      try {
        const { candidate, wasExisting } = await this.upsertByPassport(row, userId);

        // Find or create CandidateJob for (candidate, job)
        let candidateJob = await this.prisma.candidateJob.findUnique({
          where: {
            candidate_id_job_id: {
              candidate_id: candidate.id,
              job_id: event.job_id,
            },
          },
        });
        if (!candidateJob) {
          candidateJob = await this.prisma.candidateJob.create({
            data: {
              candidate_id: candidate.id,
              job_id: event.job_id,
              status: InterestStatus.lined_up,
              assigned_to: userId,
            },
          });
        }

        // Ensure InterviewCheckin exists for this event
        const existingCheckin = await this.prisma.interviewCheckin.findFirst({
          where: {
            interview_event_id: dto.event_id,
            candidate_job_id: candidateJob.id,
          },
        });
        if (existingCheckin) {
          results.already_in_event++;
          continue;
        }

        await this.prisma.interviewCheckin.create({
          data: {
            interview_event_id: dto.event_id,
            candidate_job_id: candidateJob.id,
            checkin_status: 'expected',
          },
        });

        if (wasExisting) results.reused++;
        else results.created++;
      } catch (err: any) {
        results.errors.push({
          passport: row.passport_no,
          error: err?.message ?? 'unknown error',
        });
      }
    }

    return results;
  }
}
