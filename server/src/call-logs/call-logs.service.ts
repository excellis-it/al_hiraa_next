import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCallLogDto } from './dto/create-call-log.dto';
import { CallOutcome, InterestStatus } from '../generated/prisma';

@Injectable()
export class CallLogsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCallLogDto, callerId: string) {
    // Resolve candidate_job_id: use provided one, or find from candidate_id
    let candidateJobId = dto.candidate_job_id;

    if (!candidateJobId && dto.candidate_id) {
      // Find the latest candidate_job for this candidate
      const existingCJ = await this.prisma.candidateJob.findFirst({
        where: { candidate_id: dto.candidate_id },
        orderBy: { created_at: 'desc' },
        select: { id: true },
      });
      if (existingCJ) {
        candidateJobId = existingCJ.id;
      }
    }

    if (!candidateJobId) {
      throw new NotFoundException('Candidate must be added to a job pipeline before logging calls.');
    }

    // Determine attempt number atomically using MAX+1 to avoid race conditions
    const maxResult = await this.prisma.callLog.aggregate({
      where: { candidate_job_id: candidateJobId },
      _max: { call_attempt_number: true },
    });
    const call_attempt_number = (maxResult._max.call_attempt_number ?? 0) + 1;

    // 2. Create the call log
    const callLog = await this.prisma.callLog.create({
      data: {
        candidate_job_id: candidateJobId,
        caller_id: callerId,
        outcome: dto.outcome,
        notes: dto.notes,
        follow_up_date: dto.follow_up_date
          ? new Date(dto.follow_up_date)
          : undefined,
        call_attempt_number,
      },
      include: {
        caller: { select: { id: true, full_name: true } },
      },
    });

    // 3. If follow_up_date provided, update CandidateJob
    if (dto.follow_up_date) {
      await this.prisma.candidateJob.update({
        where: { id: candidateJobId },
        data: { follow_up_date: new Date(dto.follow_up_date) },
      });
    }

    // 4. If outcome is 'reached' and CandidateJob status is 'not_contacted', advance to 'contacted_interested'
    if (dto.outcome === CallOutcome.reached) {
      const candidateJob = await this.prisma.candidateJob.findUnique({
        where: { id: candidateJobId },
        select: { status: true },
      });

      if (candidateJob && candidateJob.status === InterestStatus.not_contacted) {
        await this.prisma.candidateJob.update({
          where: { id: candidateJobId },
          data: { status: InterestStatus.contacted_interested },
        });
      }
    }

    return callLog;
  }

  async findByCandidateJob(candidateJobId: number) {
    const candidateJob = await this.prisma.candidateJob.findUnique({
      where: { id: candidateJobId },
      select: { id: true },
    });

    if (!candidateJob) {
      throw new NotFoundException('CandidateJob not found');
    }

    return this.prisma.callLog.findMany({
      where: { candidate_job_id: candidateJobId },
      include: {
        caller: { select: { id: true, full_name: true } },
      },
      orderBy: { call_timestamp: 'desc' },
    });
  }

  async findByCandidate(candidateId: number) {
    return this.prisma.callLog.findMany({
      where: { candidate_job: { candidate_id: candidateId } },
      include: {
        caller: { select: { id: true, full_name: true } },
        candidate_job: {
          select: {
            id: true,
            job: { select: { title: true } },
          },
        },
      },
      orderBy: { call_timestamp: 'desc' },
      take: 50,
    });
  }
}
