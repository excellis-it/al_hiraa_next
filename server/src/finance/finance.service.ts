import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getOverview(dateRange?: { from_date?: string; to_date?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Date range filter
    const dateFilter: any = {};
    if (dateRange?.from_date) dateFilter.gte = new Date(dateRange.from_date);
    if (dateRange?.to_date) {
      const toDate = new Date(dateRange.to_date);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    const hasDates = Object.keys(dateFilter).length > 0;
    const paidDateWhere = hasDates ? { paid_date: dateFilter } : { paid_date: { not: null } };

    const [
      totalCollectedAgg,
      totalOutstandingRaw,
      overdueCount,
      thisMonthAgg,
      lastMonthAgg,
      recentPayments,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount_paid: true },
        where: hasDates ? { paid_date: dateFilter } : undefined,
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_due: true, amount_paid: true },
        where: { status: { not: 'paid' } },
      }),
      this.prisma.payment.count({
        where: { status: 'pending', due_date: { lt: today } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_paid: true },
        where: { paid_date: { gte: startOfMonth } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_paid: true },
        where: { paid_date: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      this.prisma.payment.findMany({
        take: 10,
        orderBy: { paid_date: 'desc' },
        where: paidDateWhere,
        include: {
          candidate_job: {
            include: {
              candidate: { select: { full_name: true } },
              job: { select: { title: true } },
            },
          },
        },
      }),
    ]);

    const totalCollected = Number(totalCollectedAgg._sum.amount_paid ?? 0);
    const outstandingDue = Number(totalOutstandingRaw._sum.amount_due ?? 0);
    const outstandingPaid = Number(totalOutstandingRaw._sum.amount_paid ?? 0);
    const totalOutstanding = Math.max(0, outstandingDue - outstandingPaid);
    const thisMonthCollected = Number(thisMonthAgg._sum.amount_paid ?? 0);
    const lastMonthCollected = Number(lastMonthAgg._sum.amount_paid ?? 0);

    const recentPaymentsMapped = recentPayments.map((p) => {
      const waiver = Number(p.fee_waiver_amount ?? 0);
      const due    = Number(p.amount_due ?? 0);
      return {
        id:                p.id,
        candidate_name:    p.candidate_job.candidate.full_name,
        job_title:         p.candidate_job.job.title,
        amount_due:        due,
        fee_waiver_amount: waiver,
        net_amount:        Math.max(0, due - waiver),
        amount_paid:       Number(p.amount_paid),
        payment_method:    p.payment_method,
        paid_date:         p.paid_date,
        status:            p.status,
      };
    });

    return {
      overview: {
        total_collected: totalCollected,
        outstanding_dues: totalOutstanding,
        overdue_count: overdueCount,
        this_month_collected: thisMonthCollected,
        last_month_collected: lastMonthCollected,
      },
      recent_payments: recentPaymentsMapped,
    };
  }

  async getAllPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    overdue_only?: boolean;
    from_date?: string;
    to_date?: string;
  }) {
    const { page = 1, limit = 20, status, search, overdue_only } = params;
    const skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {};

    if (overdue_only) {
      where.status = 'pending';
      where.due_date = { lt: today };
    } else if (status) {
      where.status = status;
    }

    if (search) {
      const q = search.trim();
      where.candidate_job = {
        candidate: {
          OR: [
            { full_name:   { contains: q, mode: 'insensitive' } },
            { passport_no: { contains: q, mode: 'insensitive' } },
            { whatsapp_no: { contains: q } },
          ],
        },
      };
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          candidate_job: {
            include: {
              candidate: { select: { id: true, full_name: true, passport_no: true, whatsapp_no: true } },
              job: {
                select: {
                  id: true,
                  title: true,
                  company: { select: { id: true, name: true } },
                },
              },
              process_details: { select: { disc_allot: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const data = payments.map((p) => ({
      id: p.id,
      candidate_job_id: p.candidate_job_id,
      candidate_name: p.candidate_job.candidate.full_name,
      passport_no: (p.candidate_job.candidate as any).passport_no,
      whatsapp_no: (p.candidate_job.candidate as any).whatsapp_no,
      job_title: p.candidate_job.job.title,
      company_name: p.candidate_job.job.company.name,
      disc_allot: Number((p.candidate_job as any).process_details?.disc_allot ?? 0),
      total_fee: Number(p.total_fee),
      installment_number: p.installment_number,
      amount_due: Number(p.amount_due),
      amount_paid: Number(p.amount_paid),
      fee_waiver_amount: Number(p.fee_waiver_amount),
      due_date: p.due_date,
      paid_date: p.paid_date,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      status: p.status,
      notes: p.notes,
      created_at: p.created_at,
    }));

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getReport(params: {
    from_date?: string;
    to_date?: string;
    search?: string;
  }) {
    const { from_date, to_date, search } = params;

    // Only apply search in Prisma — date filtering done in JS to avoid Prisma OR conflicts
    const where: any = {};
    if (search) {
      const q = search.trim();
      where.candidate_job = {
        candidate: {
          OR: [
            { full_name:   { contains: q, mode: 'insensitive' } },
            { passport_no: { contains: q, mode: 'insensitive' } },
            { whatsapp_no: { contains: q } },
          ],
        },
      };
    }

    const allRows = await this.prisma.payment.findMany({
      where,
      orderBy: [{ candidate_job_id: 'asc' }, { installment_number: 'asc' }],
      include: {
        candidate_job: {
          include: {
            candidate: { select: { id: true, full_name: true, passport_no: true, whatsapp_no: true } },
            job: {
              select: { id: true, title: true, company: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    // JS date filtering: paid → paid_date, pending → due_date
    const from = from_date ? new Date(from_date) : null;
    const to   = to_date   ? (() => { const d = new Date(to_date); d.setUTCHours(23, 59, 59, 999); return d; })() : null;

    const filtered = (from || to) ? allRows.filter(p => {
      // Use paid_date for paid records, due_date for pending records
      const anchor = p.status === 'paid' ? p.paid_date : (p.due_date ?? p.created_at);
      if (!anchor) return false;
      if (from && new Date(anchor) < from) return false;
      if (to   && new Date(anchor) > to)   return false;
      return true;
    }) : allRows;

    const payments = filtered.map((p) => {
      const due    = Number(p.amount_due        ?? 0);
      const waiver = Number(p.fee_waiver_amount ?? 0);
      const net    = Math.max(0, due - waiver);
      const paid   = Number(p.amount_paid       ?? 0);
      return {
        id:                 p.id,
        candidate_job_id:   p.candidate_job_id,
        candidate_name:     p.candidate_job.candidate.full_name,
        passport_no:        p.candidate_job.candidate.passport_no,
        whatsapp_no:        p.candidate_job.candidate.whatsapp_no,
        job_title:          p.candidate_job.job.title,
        company_name:       p.candidate_job.job.company.name,
        installment_number: p.installment_number,
        amount_due:         due,
        fee_waiver_amount:  waiver,
        net_amount:         net,
        amount_paid:        paid,
        balance:            Math.max(0, net - paid),
        paid_date:          p.paid_date,
        due_date:           p.due_date,
        payment_method:     p.payment_method,
        receipt_number:     p.receipt_number,
        status:             p.status,
        notes:              p.notes,
        created_at:         p.created_at,
      };
    });

    const sub_total       = payments.reduce((s, p) => s + p.amount_due,        0);
    const total_discount  = payments.reduce((s, p) => s + p.fee_waiver_amount, 0);
    const net_total       = Math.max(0, sub_total - total_discount);
    const total_collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0);
    const total_pending   = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.balance,    0);

    return {
      payments,
      summary: { sub_total, total_discount, net_total, total_collected, total_pending, total_count: payments.length },
    };
  }

  async getPaymentsByCandidate(candidateJobId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { candidate_job_id: candidateJobId },
      orderBy: { installment_number: 'asc' },
      include: {
        candidate_job: {
          include: {
            candidate: { select: { id: true, full_name: true } },
            job: {
              select: {
                id: true,
                title: true,
                company: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const data = payments.map((p) => ({
      id: p.id,
      candidate_job_id: p.candidate_job_id,
      candidate_name: p.candidate_job.candidate.full_name,
      job_title: p.candidate_job.job.title,
      company_name: p.candidate_job.job.company.name,
      total_fee: Number(p.total_fee),
      installment_number: p.installment_number,
      amount_due: Number(p.amount_due),
      amount_paid: Number(p.amount_paid),
      fee_waiver_amount: Number(p.fee_waiver_amount),
      due_date: p.due_date,
      paid_date: p.paid_date,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      status: p.status,
      notes: p.notes,
      created_at: p.created_at,
    }));

    return { data };
  }
}
