import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeeRequestDto } from './dto/create-fee-request.dto';
import { ReviewFeeRequestDto } from './dto/review-fee-request.dto';

@Injectable()
export class FeeChangeRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFeeRequestDto, userId: string) {
    return this.prisma.feeChangeRequest.create({
      data: {
        candidate_job_id: dto.candidate_job_id,
        original_fee: dto.original_fee,
        requested_fee: dto.requested_fee,
        reason: dto.reason,
        requested_by: userId,
        status: 'pending',
      },
      include: {
        candidate_job: {
          include: {
            candidate: {
              select: { id: true, full_name: true },
            },
            job: {
              select: {
                id: true,
                title: true,
                company: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      this.prisma.feeChangeRequest.findMany({
        where,
        include: {
          candidate_job: {
            include: {
              candidate: {
                select: { id: true, full_name: true },
              },
              job: {
                select: {
                  id: true,
                  title: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.feeChangeRequest.count({ where }),
    ]);

    return {
      data: records,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async review(id: number, dto: ReviewFeeRequestDto, userId: string) {
    const request = await this.prisma.feeChangeRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Fee change request not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.feeChangeRequest.update({
        where: { id },
        data: {
          status: dto.status,
          approved_by: userId,
          approved_at: new Date(),
        },
        include: {
          candidate_job: {
            include: {
              candidate: { select: { id: true, full_name: true } },
              job: {
                select: {
                  id: true,
                  title: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      // When approved: update all pending/overdue payment records for this candidate_job
      if (dto.status === 'approved' && request.candidate_job_id) {
        const payments = await tx.payment.findMany({
          where: {
            candidate_job_id: request.candidate_job_id,
            status: { in: ['pending', 'overdue'] },
          },
          orderBy: { installment_number: 'asc' },
        });

        if (payments.length > 0) {
          const originalTotal = Number(request.original_fee);
          const newTotal = Number(request.requested_fee);
          const ratio = originalTotal > 0 ? newTotal / originalTotal : 1;

          for (const payment of payments) {
            const newDue = Math.round(Number(payment.amount_due) * ratio * 100) / 100;
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                total_fee: newTotal,
                amount_due: newDue,
              },
            });
          }
        }

        // Also update ProcessDetails.total_receivable_amount
        await tx.processDetails.upsert({
          where: { candidate_job_id: request.candidate_job_id },
          create: {
            candidate_job_id: request.candidate_job_id,
            total_receivable_amount: request.requested_fee,
          },
          update: {
            total_receivable_amount: request.requested_fee,
          },
        });
      }

      return updated;
    });
  }
}
