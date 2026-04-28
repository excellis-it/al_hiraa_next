import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';
import { CreateCommissionDto } from './dto/create-commission.dto';

@Injectable()
export class AssociatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const { page = 1, limit = 20, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [associates, total] = await Promise.all([
      this.prisma.associate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: { select: { commissions: true } },
        },
      }),
      this.prisma.associate.count({ where }),
    ]);

    // Get earned commission sums per associate
    const associateIds = associates.map((a) => a.id);
    const commissionSums = await this.prisma.associateCommission.groupBy({
      by: ['associate_id'],
      where: {
        associate_id: { in: associateIds },
        status: 'earned',
      },
      _sum: { commission_amount: true },
    });
    const commissionMap = new Map(
      commissionSums.map((c) => [c.associate_id, Number(c._sum.commission_amount ?? 0)]),
    );

    const data = associates.map((a) => ({
      id: a.id,
      full_name: a.full_name,
      phone: a.phone,
      email: a.email,
      commission_rate: Number(a.commission_rate),
      commission_type: a.commission_type,
      status: a.status,
      total_commission_earned: Number(a.total_commission_earned),
      total_commission_paid: Number(a.total_commission_paid),
      earned_pending: commissionMap.get(a.id) ?? 0,
      commissions_count: a._count.commissions,
      created_at: a.created_at,
    }));

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const associate = await this.prisma.associate.findUnique({
      where: { id },
      include: {
        commissions: {
          orderBy: { created_at: 'desc' },
          include: {
            candidate_job: {
              include: {
                candidate: { select: { id: true, full_name: true } },
                job: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    if (!associate) throw new NotFoundException('Associate not found');

    return {
      ...associate,
      commission_rate: Number(associate.commission_rate),
      total_commission_earned: Number(associate.total_commission_earned),
      total_commission_paid: Number(associate.total_commission_paid),
      commissions: associate.commissions.map((c) => ({
        id: c.id,
        commission_amount: Number(c.commission_amount),
        status: c.status,
        earned_date: c.earned_date,
        paid_date: c.paid_date,
        payment_reference: c.payment_reference,
        created_at: c.created_at,
        candidate_name: c.candidate_job.candidate.full_name,
        job_title: c.candidate_job.job.title,
        candidate_job_id: c.candidate_job_id,
      })),
    };
  }

  async create(dto: CreateAssociateDto) {
    const data: any = {
      full_name: dto.name,
      phone: dto.phone,
      password_hash: '',
    };

    if (dto.email !== undefined) data.email = dto.email;
    if (dto.commission_rate !== undefined) data.commission_rate = dto.commission_rate;

    return this.prisma.associate.create({ data });
  }

  async update(id: number, dto: UpdateAssociateDto) {
    await this.findOne(id);

    const data: any = {};
    if (dto.name !== undefined) data.full_name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.commission_rate !== undefined) data.commission_rate = dto.commission_rate;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.associate.update({
      where: { id },
      data,
    });
  }

  async createCommission(dto: CreateCommissionDto, _userId: string) {
    const data: any = {
      associate_id: dto.associate_id,
      candidate_job_id: dto.candidate_job_id,
      commission_amount: dto.amount,
      status: 'earned',
      earned_date: new Date(),
    };

    if (dto.notes !== undefined) data.payment_reference = dto.notes;

    const commission = await this.prisma.associateCommission.create({ data });

    // Update aggregate on associate
    await this.prisma.associate.update({
      where: { id: dto.associate_id },
      data: {
        total_commission_earned: {
          increment: dto.amount,
        },
      },
    });

    return commission;
  }

  async updateCommissionStatus(id: number, status: string) {
    const commission = await this.prisma.associateCommission.findUnique({
      where: { id },
    });

    if (!commission) throw new NotFoundException('Commission not found');

    const data: any = { status };
    if (status === 'paid') {
      data.paid_date = new Date();

      // Update aggregate on associate if transitioning to paid
      if (commission.status !== 'paid') {
        await this.prisma.associate.update({
          where: { id: commission.associate_id },
          data: {
            total_commission_paid: {
              increment: Number(commission.commission_amount),
            },
          },
        });
      }
    }

    return this.prisma.associateCommission.update({
      where: { id },
      data,
    });
  }

  async getCommissionSummary(associateId: number) {
    const associate = await this.prisma.associate.findUnique({
      where: { id: associateId },
    });

    if (!associate) throw new NotFoundException('Associate not found');

    const [earnedAgg, paidAgg, pendingAgg] = await Promise.all([
      this.prisma.associateCommission.aggregate({
        where: { associate_id: associateId },
        _sum: { commission_amount: true },
      }),
      this.prisma.associateCommission.aggregate({
        where: { associate_id: associateId, status: 'paid' },
        _sum: { commission_amount: true },
      }),
      this.prisma.associateCommission.aggregate({
        where: { associate_id: associateId, status: 'earned' },
        _sum: { commission_amount: true },
      }),
    ]);

    return {
      total_earned: Number(earnedAgg._sum.commission_amount ?? 0),
      total_paid: Number(paidAgg._sum.commission_amount ?? 0),
      total_pending: Number(pendingAgg._sum.commission_amount ?? 0),
    };
  }
}
