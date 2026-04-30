import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCheckinDto } from './dto/update-checkin.dto';

@Injectable()
export class InterviewCheckinsService {
  constructor(private prisma: PrismaService) {}

  async findByEvent(eventId: number) {
    return this.prisma.interviewCheckin.findMany({
      where: { interview_event_id: eventId },
      include: {
        candidate_job: {
          include: {
            trade: { select: { id: true, name: true } },
            candidate: {
              select: {
                id: true,
                candidate_code: true,
                full_name: true,
                passport_no: true,
                whatsapp_no: true,
                alternate_contact: true,
                gender: true,
                dob: true,
                ecr_type: true,
                education: true,
                education_other: true,
                indian_experience: true,
                abroad_experience: true,
                registration_mode: true,
                associate_id: true,
                associate: { select: { id: true, full_name: true } },
                referrer: { select: { id: true, name: true } },
                position_1: { select: { id: true, name: true } },
                state: { select: { id: true, name: true } },
                city: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { slot_number: 'asc' },
    });
  }

  async update(id: number, dto: UpdateCheckinDto, userId: string) {
    const checkin = await this.prisma.interviewCheckin.findUnique({
      where: { id },
      include: {
        interview_event: { select: { event_date: true, job_id: true } },
      },
    });
    if (!checkin) throw new NotFoundException('Checkin not found');

    const data: any = { checked_in_by: userId };

    if (dto.checkin_status !== undefined) {
      data.checkin_status = dto.checkin_status;
      if (dto.checkin_status === 'arrived' && checkin.checkin_status !== 'arrived') {
        data.checkin_time = dto.checkin_time ? new Date(dto.checkin_time) : new Date();
      }
    } else if (dto.checkin_time !== undefined) {
      data.checkin_time = new Date(dto.checkin_time);
    }

    if (dto.interview_status !== undefined) data.interview_status = dto.interview_status;
    if (dto.result !== undefined) data.result = dto.result;
    if (dto.result_notes !== undefined) data.result_notes = dto.result_notes;
    if (dto.slot_number !== undefined) data.slot_number = dto.slot_number;

    const prevResult = checkin.result;
    const newResult = dto.result;
    const resultChanged = newResult !== undefined && newResult !== prevResult;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.interviewCheckin.update({
        where: { id },
        data,
        include: {
          candidate_job: {
            include: {
              trade: { select: { id: true, name: true } },
              candidate: {
                select: {
                  id: true,
                  candidate_code: true,
                  full_name: true,
                  passport_no: true,
                  whatsapp_no: true,
                  alternate_contact: true,
                  gender: true,
                  dob: true,
                  ecr_type: true,
                  education: true,
                  education_other: true,
                  indian_experience: true,
                  abroad_experience: true,
                  registration_mode: true,
                  associate_id: true,
                  associate: { select: { id: true, full_name: true } },
                  referrer: { select: { id: true, name: true } },
                  position_1: { select: { id: true, name: true } },
                  state: { select: { id: true, name: true } },
                  city: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      if (resultChanged && checkin.candidate_job_id) {
        const eventDate = checkin.interview_event?.event_date;
        const jobId = checkin.interview_event?.job_id;

        if (newResult === 'selected') {
          // Sync CandidateJob status
          await tx.candidateJob.update({
            where: { id: checkin.candidate_job_id },
            data: { status: 'interview_selected' },
          });

          // Auto-create / update ProcessDetails with selection info
          await tx.processDetails.upsert({
            where: { candidate_job_id: checkin.candidate_job_id },
            create: {
              candidate_job_id: checkin.candidate_job_id,
              date_of_interview: eventDate ?? undefined,
              date_of_selection: new Date(),
              candidate_status: 'selected',
            },
            update: {
              date_of_interview: eventDate ?? undefined,
              date_of_selection: new Date(),
              candidate_status: 'selected',
            },
          });

          // Increment job.positions_filled
          if (jobId) {
            await tx.job.update({
              where: { id: jobId },
              data: { positions_filled: { increment: 1 } },
            });
          }

          // Notify process managers and admins
          const candidateName = updated.candidate_job?.candidate?.full_name || 'A candidate';
          const managers = await tx.user.findMany({
            where: { role: { in: ['process_manager', 'manager', 'admin'] as any }, is_active: true },
            select: { id: true },
          });
          for (const mgr of managers) {
            await tx.notification.create({
              data: {
                user_id: mgr.id,
                message: `${candidateName} has been selected — process record auto-created`,
                type: 'candidate_selected',
              },
            });
          }
        } else if (newResult === 'rejected' || newResult === 'on_hold') {
          await tx.candidateJob.update({
            where: { id: checkin.candidate_job_id },
            data: { status: newResult === 'rejected' ? 'interview_rejected' : 'interview_on_hold' },
          });

          // If previously selected, decrement positions_filled
          if (prevResult === 'selected' && jobId) {
            await tx.job.update({
              where: { id: jobId },
              data: { positions_filled: { decrement: 1 } },
            });
          }
        }
      }

      return updated;
    });
  }

  async bulkUpdateResult(
    eventId: number,
    result: string,
    dto: Partial<UpdateCheckinDto>,
  ) {
    const data: any = { result };
    if (dto.result_notes !== undefined) data.result_notes = dto.result_notes;

    return this.prisma.interviewCheckin.updateMany({
      where: { interview_event_id: eventId },
      data,
    });
  }
}
