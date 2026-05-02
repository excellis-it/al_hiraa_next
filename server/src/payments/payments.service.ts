import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findByCandidateJob(candidateJobId: number) {
    const [payments, processDetails] = await Promise.all([
      this.prisma.payment.findMany({
        where: { candidate_job_id: candidateJobId },
        include: { collector: { select: { id: true, full_name: true } } },
        orderBy: { installment_number: 'asc' },
      }),
      this.prisma.processDetails.findUnique({
        where: { candidate_job_id: candidateJobId },
        select: { disc_allot: true },
      }),
    ]);

    const subTotal      = payments.reduce((s, p) => s + Number(p.amount_due), 0);
    const totalDiscount = payments.reduce((s, p) => s + Number(p.fee_waiver_amount ?? 0), 0);
    const netTotal      = Math.max(0, subTotal - totalDiscount);
    const totalPaid     = payments
      .filter(p => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount_due) - Number(p.fee_waiver_amount ?? 0), 0);
    const balance       = Math.max(0, netTotal - totalPaid);

    return {
      payments,
      summary: {
        sub_total:      subTotal,
        total_discount: totalDiscount,
        net_total:      netTotal,
        total_paid:     totalPaid,
        balance_due:    balance,
        disc_allot:     Number(processDetails?.disc_allot ?? 0),
      },
    };
  }

  async create(dto: CreatePaymentDto, _userId: string) {
    const waiver    = dto.fee_waiver_amount ?? 0;
    const netAmount = Math.max(0, dto.amount_due - waiver);

    // Explicit status takes priority — fall back to date-based inference for backward compat
    const status: 'paid' | 'pending' = (dto as any).status
      ? (dto as any).status
      : (dto.paid_date ? 'paid' : 'pending');

    // The single date input from UI: if paid → it's the paid_date; if unpaid → it's the due/installment date
    const userDate = dto.paid_date ? new Date(dto.paid_date) : null;
    const paidDate = status === 'paid' ? (userDate ?? new Date()) : null;
    const dueDate  = userDate ?? (dto.due_date ? new Date(dto.due_date) : new Date());

    return this.prisma.payment.create({
      data: {
        candidate_job_id:   dto.candidate_job_id,
        total_fee:          dto.total_fee ?? dto.amount_due,
        installment_number: dto.installment_number,
        amount_due:         dto.amount_due,
        amount_paid:        status === 'paid' ? netAmount : 0,
        fee_waiver_amount:  waiver,
        due_date:           dueDate,
        paid_date:          paidDate,
        payment_method:     dto.payment_method,
        status,
        notes:              dto.notes,
      },
    });
  }

  async recordPayment(id: number, dto: RecordPaymentDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id } });
      if (!payment) throw new NotFoundException('Payment not found');

      const waiver    = dto.fee_waiver_amount !== undefined
        ? dto.fee_waiver_amount
        : Number(payment.fee_waiver_amount ?? 0);
      const amountDue = dto.amount_due !== undefined ? dto.amount_due : Number(payment.amount_due);
      const netAmount = Math.max(0, amountDue - waiver);

      // Explicit status from DTO takes priority — fall back to date-based inference for backward compat
      const status: 'paid' | 'pending' = (dto as any).status
        ? (dto as any).status
        : (dto.paid_date
            ? 'paid'
            : (payment.paid_date ? 'paid' : 'pending'));

      // The single date input from UI represents either paid_date (if paid) or installment due_date (if unpaid)
      // Persist it on the appropriate column so the user always sees their date back on reload.
      const userDate = dto.paid_date ? new Date(dto.paid_date) : null;
      const paidDate = status === 'paid'
        ? (userDate ?? payment.paid_date ?? new Date())
        : null;
      const dueDate  = userDate ?? payment.due_date ?? new Date();

      const data: any = {
        amount_due:        amountDue,
        amount_paid:       status === 'paid' ? netAmount : 0,
        fee_waiver_amount: waiver,
        paid_date:         paidDate,
        due_date:          dueDate,
        status,
        collected_by:      userId,
      };

      if (dto.payment_method !== undefined) data.payment_method = dto.payment_method;
      if (dto.receipt_number !== undefined) data.receipt_number = dto.receipt_number;
      if (dto.notes         !== undefined) data.notes           = dto.notes;

      return tx.payment.update({
        where: { id },
        data,
        include: { collector: { select: { id: true, full_name: true } } },
      });
    });
  }

  async waivePayment(id: number, dto: { waiver_amount: number; reason?: string }, userId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    const newWaiver   = Number(dto.waiver_amount);
    const amountDue   = Number(payment.amount_due);
    const amountPaid  = Number(payment.amount_paid);
    const remaining   = amountDue - amountPaid - newWaiver;

    return this.prisma.payment.update({
      where: { id },
      data: {
        fee_waiver_amount:     newWaiver,
        fee_waiver_approved_by: userId,
        status:                remaining <= 0 ? 'waived' : payment.status,
        notes:                 dto.reason ? `Waiver: ${dto.reason}` : payment.notes,
      },
    });
  }

  async getSummary(candidateJobId: number) {
    const [payments, processDetails] = await Promise.all([
      this.prisma.payment.findMany({ where: { candidate_job_id: candidateJobId } }),
      this.prisma.processDetails.findUnique({
        where: { candidate_job_id: candidateJobId },
        select: { disc_allot: true },
      }),
    ]);

    if (payments.length === 0) {
      return { sub_total: 0, total_discount: 0, net_total: 0, total_paid: 0, balance_due: 0, is_complete: false };
    }

    const sub_total      = payments.reduce((s, p) => s + Number(p.amount_due), 0);
    const total_discount = payments.reduce((s, p) => s + Number(p.fee_waiver_amount ?? 0), 0);
    const net_total      = Math.max(0, sub_total - total_discount);
    const total_paid     = payments
      .filter(p => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount_due) - Number(p.fee_waiver_amount ?? 0), 0);
    const balance_due    = Math.max(0, net_total - total_paid);
    const is_complete    = payments.every(p => p.status === 'paid' || p.status === 'waived');

    return { sub_total, total_discount, net_total, total_paid, balance_due, is_complete,
             disc_allot: Number(processDetails?.disc_allot ?? 0) };
  }
}
