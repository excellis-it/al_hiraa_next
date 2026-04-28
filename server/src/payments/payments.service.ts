import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findByCandidateJob(candidateJobId: number) {
    return this.prisma.payment.findMany({
      where: { candidate_job_id: candidateJobId },
      include: {
        collector: {
          select: { id: true, full_name: true },
        },
      },
      orderBy: { installment_number: 'asc' },
    });
  }

  async create(dto: CreatePaymentDto, userId: string) {
    return this.prisma.payment.create({
      data: {
        candidate_job_id: dto.candidate_job_id,
        total_fee: dto.total_fee,
        installment_number: dto.installment_number,
        amount_due: dto.amount_due,
        due_date: new Date(dto.due_date),
        notes: dto.notes,
        status: 'pending',
      },
    });
  }

  async recordPayment(id: number, dto: RecordPaymentDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id } });
      if (!payment) throw new NotFoundException('Payment not found');

      const paidDate = dto.paid_date ? new Date(dto.paid_date) : new Date();

      const data: any = {
        amount_paid: dto.amount_paid,
        paid_date: paidDate,
        collected_by: userId,
      };

      if (dto.payment_method !== undefined) data.payment_method = dto.payment_method;
      if (dto.receipt_number !== undefined) data.receipt_number = dto.receipt_number;
      if (dto.notes !== undefined) data.notes = dto.notes;

      // Determine status based on amount paid vs amount due
      const amountDue = Number(payment.amount_due);
      if (dto.amount_paid >= amountDue) {
        data.status = 'paid';
      } else {
        data.status = 'pending';
      }

      return tx.payment.update({
        where: { id },
        data,
        include: {
          collector: {
            select: { id: true, full_name: true },
          },
        },
      });
    });
  }

  async waivePayment(id: number, dto: { waiver_amount: number; reason?: string }, userId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    const newWaiver = Number(dto.waiver_amount);
    const amountDue = Number(payment.amount_due);
    const amountPaid = Number(payment.amount_paid);
    const remainingAfterWaiver = amountDue - amountPaid - newWaiver;

    return this.prisma.payment.update({
      where: { id },
      data: {
        fee_waiver_amount: newWaiver,
        fee_waiver_approved_by: userId,
        status: remainingAfterWaiver <= 0 ? 'waived' : payment.status,
        notes: dto.reason ? `Waiver: ${dto.reason}` : payment.notes,
      },
    });
  }

  async getSummary(candidateJobId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { candidate_job_id: candidateJobId },
    });

    if (payments.length === 0) {
      return {
        total_fee: 0,
        total_paid: 0,
        total_due: 0,
        total_waived: 0,
        is_complete: false,
      };
    }

    const total_fee = Number(payments[0].total_fee);
    const total_paid = payments.reduce(
      (sum, p) => sum + Number(p.amount_paid),
      0,
    );
    const total_waived = payments.reduce(
      (sum, p) => sum + Number(p.fee_waiver_amount),
      0,
    );
    const total_due = payments
      .filter((p) => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, p) => sum + Number(p.amount_due) - Number(p.amount_paid), 0);

    const is_complete = payments.every(
      (p) => p.status === 'paid' || p.status === 'waived',
    );

    return { total_fee, total_paid, total_due, total_waived, is_complete };
  }
}
