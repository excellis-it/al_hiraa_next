import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDropoutDto } from './dto/create-dropout.dto';

@Injectable()
export class DropoutsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDropoutDto, userId: string) {
    const candidateJob = await this.prisma.candidateJob.findUnique({
      where: { id: dto.candidate_job_id },
      select: { id: true, candidate_id: true },
    });
    if (!candidateJob) throw new NotFoundException('CandidateJob not found');

    const [dropout] = await this.prisma.$transaction([
      this.prisma.dropout.create({
        data: {
          candidate_job_id: dto.candidate_job_id,
          dropout_stage: dto.dropout_stage,
          dropout_reason: dto.dropout_reason,
          reason_details: dto.reason_details,
          recorded_by: userId,
        },
        include: {
          candidate_job: {
            include: {
              candidate: {
                select: {
                  id: true,
                  full_name: true,
                  whatsapp_no: true,
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
          },
        },
      }),
      this.prisma.candidateJob.update({
        where: { id: dto.candidate_job_id },
        data: { status: 'contacted_not_interested' },
      }),
      // Sync Candidate.status to inactive so they don't appear as active
      this.prisma.candidate.update({
        where: { id: candidateJob.candidate_id },
        data: { status: 'inactive' },
      }),
    ]);

    return dropout;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    stage?: string;
    reason?: string;
  }) {
    const { page = 1, limit = 20, stage, reason } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (stage) where.dropout_stage = stage;
    if (reason) where.dropout_reason = reason;

    const [records, total] = await Promise.all([
      this.prisma.dropout.findMany({
        where,
        include: {
          candidate_job: {
            include: {
              candidate: {
                select: {
                  id: true,
                  full_name: true,
                  whatsapp_no: true,
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
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.dropout.count({ where }),
    ]);

    return {
      data: records,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
}
