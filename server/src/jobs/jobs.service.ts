import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InterestStatus } from '../generated/prisma';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    company_id?: number;
    trade_id?: number;
    priority?: string;
    upcoming?: boolean;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      company_id,
      trade_id,
      priority,
      upcoming,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (company_id) where.company_id = company_id;
    if (trade_id) where.trade_id = trade_id;
    if (priority) where.priority = priority;
    if (upcoming) {
      // "Active": at least one interview scheduled today or in the future.
      // A job qualifies if interview_date_end >= today (covers single-day and ranges),
      // OR interview_date_start >= today (covers cases where end isn't set).
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.OR = [
        ...(where.OR || []),
        { interview_date_end:   { gte: today } },
        { interview_date_start: { gte: today } },
      ];
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          trade: { select: { id: true, name: true } },
          positions: {
            include: { trade: { select: { id: true, name: true } } },
          },
          _count: {
            select: { candidate_jobs: true },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.job.count({ where }),
    ]);

    // Get lined_up counts for each job in batch
    const jobIds = jobs.map((j) => j.id);
    const linedUpCounts = await this.prisma.candidateJob.groupBy({
      by: ['job_id'],
      where: {
        job_id: { in: jobIds },
        status: InterestStatus.lined_up,
      },
      _count: { id: true },
    });

    const linedUpMap = new Map(
      linedUpCounts.map((r) => [r.job_id, r._count.id]),
    );

    const data = jobs.map((job) => ({
      ...job,
      lined_up_count: linedUpMap.get(job.id) ?? 0,
    }));

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        company: true,
        trade: { select: { id: true, name: true } },
        positions: {
          include: { trade: { select: { id: true, name: true } } },
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    // Pipeline summary: count per interest_status
    const pipelineSummary = await this.prisma.candidateJob.groupBy({
      by: ['status'],
      where: { job_id: id },
      _count: { id: true },
    });

    const pipeline_by_status = pipelineSummary.reduce(
      (acc, row) => {
        acc[row.status] = row._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...job,
      pipeline_by_status,
    };
  }

  async create(dto: CreateJobDto, userId: string) {
    // If positions array is provided, derive job-level fields from positions
    const posArr = dto.positions ?? [];
    const hasPositions = posArr.length > 0;

    let title = dto.title;
    let tradeId = dto.trade_id;
    let positionsRequired = dto.positions_required;

    if (hasPositions) {
      // Resolve trade names for title generation
      const tradeIds = posArr.map((p) => p.trade_id);
      const trades = await this.prisma.trade.findMany({
        where: { id: { in: tradeIds } },
        select: { id: true, name: true },
      });
      const tradeMap = new Map(trades.map((t) => [t.id, t.name]));

      if (!title) {
        title = posArr
          .map((p) => tradeMap.get(p.trade_id) || `Trade #${p.trade_id}`)
          .join(', ');
      }
      if (!tradeId) tradeId = posArr[0].trade_id;
      if (!positionsRequired) {
        positionsRequired = posArr.reduce((sum, p) => sum + p.quantity, 0);
      }
    }

    const data: any = {
      company_id: dto.company_id,
      trade_id: tradeId,
      title: title || 'Untitled',
      positions_required: positionsRequired || 1,
      status: dto.status || 'open',
      priority: dto.priority || 'medium',
      created_by: userId,
    };

    if (dto.salary_min !== undefined) data.salary_min = dto.salary_min;
    if (dto.salary_max !== undefined) data.salary_max = dto.salary_max;
    if (dto.service_fee !== undefined) data.service_fee = dto.service_fee;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.flyer_headline !== undefined) data.flyer_headline = dto.flyer_headline;
    if (dto.venue_id !== undefined) data.venue_id = dto.venue_id;
    if (dto.coordinator_id !== undefined) data.coordinator_id = dto.coordinator_id;
    if (dto.experience_required !== undefined)
      data.experience_required = dto.experience_required;
    if (dto.other_requirements !== undefined)
      data.other_requirements = dto.other_requirements;
    if (dto.interview_date_start !== undefined)
      data.interview_date_start = new Date(dto.interview_date_start);
    if (dto.interview_date_end !== undefined)
      data.interview_date_end = new Date(dto.interview_date_end);

    // Use a transaction: create Job, JobPositions, and InterviewEvents together
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data,
        include: {
          company: { select: { id: true, name: true } },
          trade: { select: { id: true, name: true } },
        },
      });

      // Create JobPosition records
      if (hasPositions) {
        await tx.jobPosition.createMany({
          data: posArr.map((p) => ({
            job_id: job.id,
            trade_id: p.trade_id,
            quantity: p.quantity,
            salary: p.salary ?? null,
            accommodation: p.accommodation ?? false,
            transportation: p.transportation ?? false,
            contract_period: p.contract_period ?? null,
            age: p.age ?? null,
          })),
        });
      }

      // Resolve venue and coordinator for InterviewEvent creation
      let venueName: string | undefined;
      let venueAddress: string | undefined;
      let interviewerName: string | undefined;
      if (dto.venue_id) {
        const venue = await tx.interviewVenue.findUnique({ where: { id: dto.venue_id } });
        if (venue) {
          venueName = venue.name;
          venueAddress = venue.address ?? undefined;
        }
      }
      if (dto.coordinator_id) {
        const coordinator = await tx.user.findUnique({ where: { id: dto.coordinator_id }, select: { full_name: true } });
        if (coordinator) interviewerName = coordinator.full_name;
      }

      // Auto-create InterviewEvent(s) for each interview date
      const eventDefaults = {
        job_id: job.id,
        status: 'scheduled' as const,
        created_by: userId,
        ...(venueName ? { venue_name: venueName } : {}),
        ...(venueAddress ? { venue_address: venueAddress } : {}),
        ...(interviewerName ? { interviewer_name: interviewerName } : {}),
      };

      if (dto.interview_date_start) {
        await tx.interviewEvent.create({
          data: {
            ...eventDefaults,
            event_date: new Date(dto.interview_date_start),
          },
        });
      }
      if (dto.interview_date_end) {
        await tx.interviewEvent.create({
          data: {
            ...eventDefaults,
            event_date: new Date(dto.interview_date_end),
          },
        });
      }

      // Return job with positions included
      return tx.job.findUnique({
        where: { id: job.id },
        include: {
          company: { select: { id: true, name: true } },
          trade: { select: { id: true, name: true } },
          positions: {
            include: { trade: { select: { id: true, name: true } } },
          },
        },
      });
    });
  }

  async update(id: number, dto: UpdateJobDto) {
    await this.findOne(id);

    const data: any = {};
    if (dto.company_id !== undefined) data.company_id = dto.company_id;
    if (dto.trade_id !== undefined) data.trade_id = dto.trade_id;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.positions_required !== undefined) data.positions_required = dto.positions_required;
    if (dto.salary_min !== undefined) data.salary_min = dto.salary_min;
    if (dto.salary_max !== undefined) data.salary_max = dto.salary_max;
    if (dto.service_fee !== undefined) data.service_fee = dto.service_fee;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.experience_required !== undefined) data.experience_required = dto.experience_required;
    if (dto.other_requirements !== undefined) data.other_requirements = dto.other_requirements;
    if (dto.interview_date_start !== undefined)
      data.interview_date_start = dto.interview_date_start ? new Date(dto.interview_date_start) : null;
    if (dto.interview_date_end !== undefined)
      data.interview_date_end = dto.interview_date_end ? new Date(dto.interview_date_end) : null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.flyer_headline !== undefined) data.flyer_headline = dto.flyer_headline;
    if (dto.venue_id !== undefined) data.venue_id = dto.venue_id;
    if (dto.coordinator_id !== undefined) data.coordinator_id = dto.coordinator_id;

    // Build event-side patch when venue/coordinator/dates change
    const needEventPatch =
      dto.venue_id !== undefined ||
      dto.coordinator_id !== undefined ||
      dto.interview_date_start !== undefined ||
      dto.interview_date_end !== undefined;

    await this.prisma.$transaction(async (tx) => {
      // Update positions if provided
      if (dto.positions && dto.positions.length > 0) {
        await tx.jobPosition.deleteMany({ where: { job_id: id } });
        await tx.jobPosition.createMany({
          data: dto.positions.map((p) => ({
            job_id: id,
            trade_id: p.trade_id,
            quantity: p.quantity,
            salary: p.salary,
            accommodation: p.accommodation ?? false,
            transportation: p.transportation ?? false,
            contract_period: p.contract_period,
            age: p.age,
          })),
        });
        data.positions_required = dto.positions.reduce((s, p) => s + p.quantity, 0);
      }

      await tx.job.update({ where: { id }, data });

      if (needEventPatch) {
        let venueName: string | undefined;
        let venueAddress: string | undefined;
        let interviewerName: string | undefined;
        if (dto.venue_id) {
          const venue = await tx.interviewVenue.findUnique({ where: { id: dto.venue_id } });
          if (venue) {
            venueName = venue.name;
            venueAddress = venue.address ?? undefined;
          }
        }
        if (dto.coordinator_id) {
          const coord = await tx.user.findUnique({
            where: { id: dto.coordinator_id },
            select: { full_name: true },
          });
          if (coord) interviewerName = coord.full_name;
        }

        const eventPatch: any = {};
        if (venueName !== undefined) eventPatch.venue_name = venueName;
        if (venueAddress !== undefined) eventPatch.venue_address = venueAddress;
        if (interviewerName !== undefined) eventPatch.interviewer_name = interviewerName;

        if (Object.keys(eventPatch).length > 0) {
          await tx.interviewEvent.updateMany({ where: { job_id: id }, data: eventPatch });
        }
      }
    });

    return this.findOne(id);
  }

  async getDashboard(currentUser?: { id: string; role: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const notFinalStatuses: InterestStatus[] = [
      InterestStatus.interview_selected,
      InterestStatus.interview_rejected,
    ];

    // Recruiter sees only their own assigned candidate-jobs across every count below.
    // Job counts (and "Top 5 open jobs") aren't restricted by recruiter — those are global.
    const recruiterScope =
      currentUser?.role === 'recruiter' ? { assigned_to: currentUser.id } : {};

    const [
      openJobsCount,
      linedUpTotal,
      followUpsDueToday,
      interviewsThisWeek,
      pipelineByStatus,
    ] = await Promise.all([
      this.prisma.job.count({ where: { status: 'open' } }),
      this.prisma.candidateJob.count({ where: { ...recruiterScope, status: 'lined_up' } }),
      this.prisma.candidateJob.count({
        where: {
          ...recruiterScope,
          follow_up_date: { lte: todayEnd },
          status: { notIn: notFinalStatuses },
        },
      }),
      this.prisma.candidateJob.count({
        where: {
          ...recruiterScope,
          status: InterestStatus.interview_selected,
          updated_at: { gte: weekAgo },
        },
      }),
      this.prisma.candidateJob.groupBy({
        by: ['status'],
        where: recruiterScope,
        _count: { id: true },
      }),
    ]);

    // Top 5 open jobs
    const openJobs = await this.prisma.job.findMany({
      where: { status: 'open' },
      include: {
        company: { select: { name: true } },
        trade: { select: { name: true } },
        _count: { select: { candidate_jobs: true } },
      },
      orderBy: { positions_required: 'desc' },
      take: 5,
    });

    const topJobIds = openJobs.map((j) => j.id);
    const linedUpForTopJobs = await this.prisma.candidateJob.groupBy({
      by: ['job_id'],
      where: {
        ...recruiterScope,
        job_id: { in: topJobIds },
        status: InterestStatus.lined_up,
      },
      _count: { id: true },
    });
    const linedUpMap = new Map(
      linedUpForTopJobs.map((r) => [r.job_id, r._count.id]),
    );

    const top_open_jobs = openJobs.map((job) => ({
      id: job.id,
      title: job.title,
      positions_required: job.positions_required,
      positions_filled: job.positions_filled,
      lined_up_count: linedUpMap.get(job.id) ?? 0,
      company_name: job.company.name,
      trade_name: (job as any).trade?.name ?? null,
      priority: job.priority,
    }));

    // Build pipeline_by_status with all 9 statuses defaulting to 0
    const allStatuses: InterestStatus[] = [
      InterestStatus.not_contacted,
      InterestStatus.contacted_interested,
      InterestStatus.contacted_not_interested,
      InterestStatus.contacted_not_reachable,
      InterestStatus.contacted_maybe_later,
      InterestStatus.lined_up,
      InterestStatus.interview_selected,
      InterestStatus.interview_rejected,
      InterestStatus.interview_on_hold,
    ];

    const pipelineMap = pipelineByStatus.reduce(
      (acc, row) => {
        acc[row.status] = row._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    const pipeline_by_status = allStatuses.reduce(
      (acc, s) => {
        acc[s] = pipelineMap[s] ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      open_jobs: openJobsCount,
      lined_up_total: linedUpTotal,
      follow_ups_due_today: followUpsDueToday,
      interviews_this_week: interviewsThisWeek,
      pipeline_by_status,
      top_open_jobs,
    };
  }
}
