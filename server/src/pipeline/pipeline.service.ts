import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCandidateDto } from './dto/add-candidate.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { InterestStatus } from '../generated/prisma';

function formatCandidateCode(c: { id: number; created_at: Date; year_sequence?: number | null }): string {
  if (c.year_sequence && c.created_at) {
    const yy = String(c.created_at.getFullYear() % 100).padStart(2, '0');
    return `ALH-${yy}-${String(c.year_sequence).padStart(3, '0')}`;
  }
  return `ALH-${String(c.id).padStart(5, '0')}`;
}

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    job_id?: number;
    status?: string;
    assigned_to?: string;
    follow_up_today?: boolean;
    search?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      job_id,
      status,
      assigned_to,
      follow_up_today,
      search,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (job_id) where.job_id = job_id;
    if (status) where.status = status;
    if (assigned_to) where.assigned_to = assigned_to;

    if (search) {
      where.candidate = {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { passport_no: { contains: search, mode: 'insensitive' } },
          { whatsapp_no: { contains: search } },
        ],
      };
    }

    if (follow_up_today) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      where.follow_up_date = { gte: todayStart, lte: todayEnd };
    }

    const [records, total] = await Promise.all([
      this.prisma.candidateJob.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              full_name: true,
              whatsapp_no: true,
              created_at: true,
              year_sequence: true,
              position_1: { select: { name: true } },
            },
          },
          trade: { select: { id: true, name: true } },
          job: {
            select: {
              id: true,
              title: true,
              company: { select: { name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { follow_up_date: 'asc' },
          { created_at: 'desc' },
        ],
      }),
      this.prisma.candidateJob.count({ where }),
    ]);

    // Attach candidate_code to each record
    const data = records.map((r) => ({
      ...r,
      candidate: {
        ...r.candidate,
        candidate_code: formatCandidateCode(r.candidate),
      },
    }));

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const record = await this.prisma.candidateJob.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            state: { select: { name: true } },
            city: { select: { name: true } },
            position_1: { select: { name: true } },
            position_2: { select: { name: true } },
            position_3: { select: { name: true } },
            source: { select: { name: true } },
          },
        },
        job: {
          include: {
            company: { select: { id: true, name: true } },
            trade: { select: { id: true, name: true } },
          },
        },
        call_logs: {
          include: {
            caller: { select: { id: true, full_name: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!record) throw new NotFoundException('Pipeline record not found');

    return {
      ...record,
      candidate: {
        ...record.candidate,
        candidate_code: formatCandidateCode(record.candidate),
      },
    };
  }

  async addCandidate(dto: AddCandidateDto, userId: string) {
    // Check for existing CandidateJob
    const existing = await this.prisma.candidateJob.findUnique({
      where: {
        candidate_id_job_id: {
          candidate_id: dto.candidate_id,
          job_id: dto.job_id,
        },
      },
    });

    if (existing) {
      // Return existing record instead of throwing, so re-adding to events works
      const full = await this.prisma.candidateJob.findUnique({
        where: { id: existing.id },
        include: {
          candidate: {
            select: {
              id: true, full_name: true, whatsapp_no: true,
              created_at: true, year_sequence: true,
              position_1: { select: { name: true } },
            },
          },
          job: { select: { id: true, title: true, company: { select: { name: true } } } },
        },
      });
      return { ...full!, candidate: { ...full!.candidate, candidate_code: formatCandidateCode(full!.candidate) } };
    }

    const record = await this.prisma.candidateJob.create({
      data: {
        candidate_id: dto.candidate_id,
        job_id: dto.job_id,
        status: InterestStatus.not_contacted,
        assigned_to: dto.assigned_to || userId,
        call_notes: dto.notes,
      },
      include: {
        candidate: {
          select: {
            id: true,
            full_name: true,
            whatsapp_no: true,
            created_at: true,
            year_sequence: true,
            position_1: { select: { name: true } },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    return {
      ...record,
      candidate: {
        ...record.candidate,
        candidate_code: formatCandidateCode(record.candidate),
      },
    };
  }

  async updateStatus(id: number, dto: UpdateStatusDto, userId: string) {
    const current = await this.prisma.candidateJob.findUnique({
      where: { id },
    });

    if (!current) throw new NotFoundException('Pipeline record not found');

    const prevStatus = current.status;
    const newStatus = dto.status;

    const updateData: any = {};
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.follow_up_date !== undefined)
      updateData.follow_up_date = dto.follow_up_date
        ? new Date(dto.follow_up_date)
        : null;
    if (dto.notes !== undefined) updateData.call_notes = dto.notes;
    if (dto.assigned_to !== undefined) updateData.assigned_to = dto.assigned_to;

    // Handle positions_filled counter adjustments
    if (
      newStatus === InterestStatus.interview_selected &&
      prevStatus !== InterestStatus.interview_selected
    ) {
      // Transitioning INTO interview_selected: increment positions_filled
      const [updatedRecord] = await this.prisma.$transaction([
        this.prisma.candidateJob.update({
          where: { id },
          data: updateData,
        }),
        this.prisma.job.update({
          where: { id: current.job_id },
          data: { positions_filled: { increment: 1 } },
        }),
      ]);
      return updatedRecord;
    } else if (
      prevStatus === InterestStatus.interview_selected &&
      newStatus !== undefined &&
      newStatus !== InterestStatus.interview_selected
    ) {
      // Transitioning OUT of interview_selected: decrement positions_filled
      const [updatedRecord] = await this.prisma.$transaction([
        this.prisma.candidateJob.update({
          where: { id },
          data: updateData,
        }),
        this.prisma.job.update({
          where: { id: current.job_id },
          data: { positions_filled: { decrement: 1 } },
        }),
      ]);
      return updatedRecord;
    }

    // No counter change needed
    return this.prisma.candidateJob.update({
      where: { id },
      data: updateData,
    });
  }
}
