import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStepDto } from './dto/update-step.dto';

const PROCESS_STEPS = [
  { step_number: 1, step_name: 'Document Collection' },
  { step_number: 2, step_name: 'Medical Test' },
  { step_number: 3, step_name: 'GAMCA Slip' },
  { step_number: 4, step_name: 'Visa Processing' },
  { step_number: 5, step_name: 'Visa Stamping' },
  { step_number: 6, step_name: 'Air Ticket / Departure' },
];

@Injectable()
export class ProcessTrackingService {
  constructor(private prisma: PrismaService) {}

  async getOrInitialize(candidateJobId: number, userId: string) {
    const existing = await this.prisma.processTracking.findMany({
      where: { candidate_job_id: candidateJobId },
      orderBy: { step_number: 'asc' },
    });

    if (existing.length > 0) {
      return existing;
    }

    // Verify candidateJob exists
    const candidateJob = await this.prisma.candidateJob.findUnique({
      where: { id: candidateJobId },
    });
    if (!candidateJob) {
      throw new NotFoundException('CandidateJob not found');
    }

    // Initialize all 6 steps
    await this.prisma.processTracking.createMany({
      data: PROCESS_STEPS.map((step) => ({
        candidate_job_id: candidateJobId,
        step_number: step.step_number,
        step_name: step.step_name,
        status: 'not_started' as const,
        updated_by: userId,
      })),
    });

    return this.prisma.processTracking.findMany({
      where: { candidate_job_id: candidateJobId },
      orderBy: { step_number: 'asc' },
    });
  }

  async updateStep(id: number, dto: UpdateStepDto, userId: string) {
    const step = await this.prisma.processTracking.findUnique({
      where: { id },
    });

    if (!step) throw new NotFoundException('Process step not found');

    const data: any = { updated_by: userId };

    if (dto.status !== undefined) {
      data.status = dto.status;

      if (dto.status === 'in_progress' && step.status !== 'in_progress') {
        data.started_at = new Date();
      }

      if (dto.status === 'completed' && step.status !== 'completed') {
        data.completed_at = new Date();
      }
    }

    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.failure_action !== undefined) data.failure_action = dto.failure_action;
    if (dto.failure_reason !== undefined) data.failure_reason = dto.failure_reason;
    if (dto.step_data !== undefined) data.step_data = dto.step_data;

    if (dto.status === 'failed' && dto.failure_action === 'retry') {
      data.retry_count = { increment: 1 };
    }

    return this.prisma.processTracking.update({
      where: { id },
      data,
    });
  }

  async getStepsForJob(candidateJobId: number) {
    return this.prisma.processTracking.findMany({
      where: { candidate_job_id: candidateJobId },
      orderBy: { step_number: 'asc' },
    });
  }
}
