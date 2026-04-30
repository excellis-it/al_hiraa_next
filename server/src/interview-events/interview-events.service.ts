import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class InterviewEventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    job_id?: number;
    status?: string;
    upcoming?: boolean;
  }) {
    const { page = 1, limit = 20, job_id, status, upcoming } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (job_id) where.job_id = job_id;
    if (status) where.status = status;
    if (upcoming) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.event_date = { gte: today };
    }

    const [records, total] = await Promise.all([
      this.prisma.interviewEvent.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: { checkins: true },
          },
        },
        skip,
        take: limit,
        orderBy: { event_date: 'asc' },
      }),
      this.prisma.interviewEvent.count({ where }),
    ]);

    return {
      data: records,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const event = await this.prisma.interviewEvent.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true } },
            positions: {
              include: { trade: { select: { id: true, name: true } } },
            },
          },
        },
        vendor: { select: { id: true, name: true, service_charge: true } },
        checkins: {
          include: {
            candidate_job: {
              include: {
                trade: { select: { id: true, name: true } },
                candidate: {
                  select: {
                    id: true,
                    full_name: true,
                    whatsapp_no: true,
                    passport_no: true,
                    registration_mode: true,
                    associate_id: true,
                    external_only: true,
                    position_1: { select: { id: true, name: true } },
                    associate: { select: { id: true, full_name: true } },
                    state: { select: { name: true } },
                    city: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: { slot_number: 'asc' },
        },
      },
    });

    if (!event) throw new NotFoundException('Interview event not found');
    return event;
  }

  async create(dto: CreateEventDto, userId: string) {
    const data: any = {
      job_id: dto.job_id,
      event_date: new Date(dto.event_date),
      created_by: userId,
    };

    if (dto.venue_name !== undefined) data.venue_name = dto.venue_name;
    if (dto.venue_address !== undefined) data.venue_address = dto.venue_address;
    if (dto.venue_phone !== undefined) data.venue_phone = dto.venue_phone;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.interviewer_name !== undefined) data.interviewer_name = dto.interviewer_name;
    if (dto.interview_type !== undefined) data.interview_type = dto.interview_type;
    if (dto.results_timing !== undefined) data.results_timing = dto.results_timing;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.vendor_id !== undefined) data.vendor_id = dto.vendor_id || null;
    if (dto.accommodation !== undefined) data.accommodation = dto.accommodation;
    if (dto.accommodation_cost !== undefined) data.accommodation_cost = dto.accommodation_cost;
    if (dto.transportation !== undefined) data.transportation = dto.transportation;
    if (dto.transportation_cost !== undefined) data.transportation_cost = dto.transportation_cost;

    return this.prisma.interviewEvent.create({
      data,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: { select: { name: true } },
          },
        },
      },
    });
  }

  async update(id: number, dto: UpdateEventDto) {
    const event = await this.prisma.interviewEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Interview event not found');

    const data: any = {};
    if (dto.job_id !== undefined) data.job_id = dto.job_id;
    if (dto.event_date !== undefined) data.event_date = new Date(dto.event_date);
    if (dto.venue_name !== undefined) data.venue_name = dto.venue_name;
    if (dto.venue_address !== undefined) data.venue_address = dto.venue_address;
    if (dto.venue_phone !== undefined) data.venue_phone = dto.venue_phone;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.interviewer_name !== undefined) data.interviewer_name = dto.interviewer_name;
    if (dto.interview_type !== undefined) data.interview_type = dto.interview_type;
    if (dto.results_timing !== undefined) data.results_timing = dto.results_timing;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.vendor_id !== undefined) data.vendor_id = dto.vendor_id || null;
    if (dto.accommodation !== undefined) data.accommodation = dto.accommodation;
    if (dto.accommodation_cost !== undefined) data.accommodation_cost = dto.accommodation_cost;
    if (dto.transportation !== undefined) data.transportation = dto.transportation;
    if (dto.transportation_cost !== undefined) data.transportation_cost = dto.transportation_cost;

    return this.prisma.interviewEvent.update({
      where: { id },
      data,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: { select: { name: true } },
          },
        },
        _count: {
          select: { checkins: true },
        },
      },
    });
  }

  async bulkAddCandidates(eventId: number, candidateJobIds: number[]) {
    const event = await this.prisma.interviewEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Interview event not found');

    let createdCount = 0;

    for (const candidateJobId of candidateJobIds) {
      const existing = await this.prisma.interviewCheckin.findFirst({
        where: {
          interview_event_id: eventId,
          candidate_job_id: candidateJobId,
        },
      });

      if (!existing) {
        await this.prisma.interviewCheckin.create({
          data: {
            interview_event_id: eventId,
            candidate_job_id: candidateJobId,
            checkin_status: 'expected',
          },
        });
        createdCount++;
      }
    }

    return { created: createdCount, total: candidateJobIds.length };
  }

  async getStatusCounts(eventId: number) {
    const event = await this.prisma.interviewEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Interview event not found');

    const checkins = await this.prisma.interviewCheckin.findMany({
      where: { interview_event_id: eventId },
      select: { checkin_status: true, result: true },
    });

    return {
      lined_up: checkins.length,
      appeared: checkins.filter(
        (c) => c.checkin_status === 'arrived' || c.checkin_status === 'late',
      ).length,
      selected: checkins.filter((c) => c.result === 'selected').length,
      rejected: checkins.filter((c) => c.result === 'rejected').length,
      on_hold: checkins.filter((c) => c.result === 'on_hold').length,
    };
  }

  async addMasterCandidate(
    eventId: number,
    candidateId: number,
    tradeId: number,
  ) {
    const event = await this.prisma.interviewEvent.findUnique({
      where: { id: eventId },
      select: { id: true, job_id: true },
    });
    if (!event) throw new NotFoundException('Interview event not found');

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    return this.prisma.$transaction(async (tx) => {
      const candidateJob = await tx.candidateJob.upsert({
        where: {
          candidate_id_job_id: {
            candidate_id: candidateId,
            job_id: event.job_id,
          },
        },
        create: {
          candidate_id: candidateId,
          job_id: event.job_id,
          trade_id: tradeId,
          status: 'lined_up',
        },
        update: {
          trade_id: tradeId,
          status: 'lined_up',
        },
      });

      const existingCheckin = await tx.interviewCheckin.findFirst({
        where: {
          interview_event_id: eventId,
          candidate_job_id: candidateJob.id,
        },
      });

      if (existingCheckin) {
        return { candidate_job_id: candidateJob.id, checkin_id: existingCheckin.id, created: false };
      }

      const checkin = await tx.interviewCheckin.create({
        data: {
          interview_event_id: eventId,
          candidate_job_id: candidateJob.id,
          checkin_status: 'expected',
        },
      });

      return { candidate_job_id: candidateJob.id, checkin_id: checkin.id, created: true };
    });
  }

  async addSubAgentCandidates(
    eventId: number,
    associateId: number,
    tradeId: number,
    rows: Array<{
      full_name: string;
      whatsapp_no: string;
      passport_no?: string;
      dob?: string;
      remarks?: string;
    }>,
    userId: string,
  ) {
    const event = await this.prisma.interviewEvent.findUnique({
      where: { id: eventId },
      select: { id: true, job_id: true },
    });
    if (!event) throw new NotFoundException('Interview event not found');

    const created: number[] = [];
    const errors: Array<{ row: any; error: string }> = [];

    for (const row of rows) {
      if (!row.full_name?.trim() || !row.whatsapp_no?.trim()) {
        errors.push({ row, error: 'Missing full_name or whatsapp_no' });
        continue;
      }

      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const phone = row.whatsapp_no.trim();
          const existing = await tx.candidate.findUnique({
            where: { whatsapp_no: phone },
          });

          const candidateId = existing
            ? existing.id
            : (
                await tx.candidate.create({
                  data: {
                    full_name: row.full_name.trim(),
                    whatsapp_no: phone,
                    passport_no: row.passport_no?.trim() || null,
                    dob: row.dob ? new Date(row.dob) : null,
                    remarks: row.remarks || null,
                    registration_mode: 'associate',
                    associate_id: associateId,
                    external_only: true,
                    registered_by: userId,
                  },
                })
              ).id;

          const candidateJob = await tx.candidateJob.upsert({
            where: {
              candidate_id_job_id: {
                candidate_id: candidateId,
                job_id: event.job_id,
              },
            },
            create: {
              candidate_id: candidateId,
              job_id: event.job_id,
              trade_id: tradeId,
              status: 'lined_up',
            },
            update: { trade_id: tradeId, status: 'lined_up' },
          });

          const existingCheckin = await tx.interviewCheckin.findFirst({
            where: {
              interview_event_id: eventId,
              candidate_job_id: candidateJob.id,
            },
          });

          if (!existingCheckin) {
            await tx.interviewCheckin.create({
              data: {
                interview_event_id: eventId,
                candidate_job_id: candidateJob.id,
                checkin_status: 'expected',
              },
            });
          }

          return candidateId;
        });

        created.push(result);
      } catch (e: any) {
        errors.push({ row, error: e.message || 'Unknown error' });
      }
    }

    return { created: created.length, errors };
  }
}
