import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getOverview(dateRange?: { from_date?: string; to_date?: string }) {
    const now = new Date();
    // Calendar month boundaries — strict upper bounds so we never bleed into next month or future dates
    const startOfMonth     = new Date(now.getFullYear(), now.getMonth(),     1, 0, 0, 0);
    const endOfMonth       = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(),     0, 23, 59, 59, 999);

    // Date filter for collected payments (uses paid_date)
    const dateFilter: any = {};
    if (dateRange?.from_date) dateFilter.gte = new Date(dateRange.from_date);
    if (dateRange?.to_date) {
      const toDate = new Date(dateRange.to_date);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    const hasDates = Object.keys(dateFilter).length > 0;

    // Where-clauses respect the date range: paid records by paid_date, unpaid by created_at
    // This way the card totals always match the drawer counts.
    const paidWhere   = hasDates
      ? { status: 'paid' as const, paid_date: dateFilter }
      : { status: 'paid' as const };
    const unpaidWhere = hasDates
      ? { status: { notIn: ['paid', 'waived'] as any[] }, created_at: dateFilter }
      : { status: { notIn: ['paid', 'waived'] as any[] } };
    const allInRangeWhere: any = hasDates
      ? { OR: [
          { status: 'paid',    paid_date:  dateFilter },
          { status: 'pending', created_at: dateFilter },
        ]}
      : {};

    const paymentInclude = {
      candidate_job: {
        include: {
          candidate: { select: { full_name: true, passport_no: true, whatsapp_no: true } },
          job:       { select: { title: true, company: { select: { name: true } } } },
        },
      },
    };

    const [
      totalPayableAggPaid,
      totalPayableAggUnpaid,
      totalPaidAgg,
      totalUnpaidAgg,
      thisMonthAgg,
      lastMonthAgg,
      thisMonthUnpaidAgg,
      lastMonthUnpaidAgg,
      recentPayments,
      thisMonthPayments,
      lastMonthPayments,
    ] = await Promise.all([
      // Total payable = sum across BOTH paid + unpaid in the date range
      // (paid contribution: net of any waivers on those records)
      this.prisma.payment.aggregate({
        _sum: { amount_due: true, fee_waiver_amount: true },
        where: paidWhere,
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_due: true, fee_waiver_amount: true },
        where: unpaidWhere,
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_paid: true },
        where: paidWhere,
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_due: true, fee_waiver_amount: true },
        where: unpaidWhere,
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_paid: true },
        where: { status: 'paid', paid_date: { gte: startOfMonth, lte: endOfMonth } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_paid: true },
        where: { status: 'paid', paid_date: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      // Unpaid amounts whose installment was created in this/last month
      this.prisma.payment.aggregate({
        _sum: { amount_due: true, fee_waiver_amount: true },
        where: { status: { notIn: ['paid', 'waived'] }, created_at: { gte: startOfMonth, lte: endOfMonth } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount_due: true, fee_waiver_amount: true },
        where: { status: { notIn: ['paid', 'waived'] }, created_at: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      this.prisma.payment.findMany({
        take: 500,
        orderBy: [{ paid_date: 'desc' }, { created_at: 'desc' }],
        where: allInRangeWhere,
        include: paymentInclude,
      }),
      // Always-fresh lists for the This Month / Last Month cards' drawers
      // (independent of the page's date filter — they show the full calendar month)
      // Includes BOTH paid + unpaid for that month so cards can show full breakdown
      this.prisma.payment.findMany({
        take: 500,
        orderBy: [{ paid_date: 'desc' }, { created_at: 'desc' }],
        where: {
          OR: [
            { status: 'paid',    paid_date:  { gte: startOfMonth, lte: endOfMonth } },
            { status: 'pending', created_at: { gte: startOfMonth, lte: endOfMonth } },
          ],
        },
        include: paymentInclude,
      }),
      this.prisma.payment.findMany({
        take: 500,
        orderBy: [{ paid_date: 'desc' }, { created_at: 'desc' }],
        where: {
          OR: [
            { status: 'paid',    paid_date:  { gte: startOfLastMonth, lte: endOfLastMonth } },
            { status: 'pending', created_at: { gte: startOfLastMonth, lte: endOfLastMonth } },
          ],
        },
        include: paymentInclude,
      }),
    ]);

    // Total Payable = sum of net amounts (due − waiver) for ALL records in range
    const paidPayable = Math.max(0,
      Number(totalPayableAggPaid._sum.amount_due ?? 0) -
      Number(totalPayableAggPaid._sum.fee_waiver_amount ?? 0));
    const unpaidPayable = Math.max(0,
      Number(totalPayableAggUnpaid._sum.amount_due ?? 0) -
      Number(totalPayableAggUnpaid._sum.fee_waiver_amount ?? 0));
    const total_payable      = paidPayable + unpaidPayable;
    const total_collected    = Number(totalPaidAgg._sum.amount_paid ?? 0);
    const total_unpaid       = Math.max(0,
      Number(totalUnpaidAgg._sum.amount_due ?? 0) -
      Number(totalUnpaidAgg._sum.fee_waiver_amount ?? 0));
    const this_month_collected = Number(thisMonthAgg._sum.amount_paid ?? 0);
    const last_month_collected = Number(lastMonthAgg._sum.amount_paid ?? 0);
    const this_month_unpaid    = Math.max(0,
      Number(thisMonthUnpaidAgg._sum.amount_due ?? 0) -
      Number(thisMonthUnpaidAgg._sum.fee_waiver_amount ?? 0));
    const last_month_unpaid    = Math.max(0,
      Number(lastMonthUnpaidAgg._sum.amount_due ?? 0) -
      Number(lastMonthUnpaidAgg._sum.fee_waiver_amount ?? 0));

    const mapPayment = (p: any) => {
      const due    = Number(p.amount_due ?? 0);
      const waiver = Number(p.fee_waiver_amount ?? 0);
      const net    = Math.max(0, due - waiver);
      const paid   = Number(p.amount_paid ?? 0);
      return {
        id:                 p.id,
        candidate_name:     p.candidate_job.candidate.full_name,
        passport_no:        p.candidate_job.candidate.passport_no,
        whatsapp_no:        p.candidate_job.candidate.whatsapp_no,
        job_title:          p.candidate_job.job.title,
        company_name:       p.candidate_job.job.company?.name,
        installment_number: p.installment_number,
        amount_due:         due,
        fee_waiver_amount:  waiver,
        net_amount:         net,
        amount_paid:        paid,
        balance:            Math.max(0, net - paid),
        payment_method:     p.payment_method,
        paid_date:          p.paid_date,
        due_date:           p.due_date,
        receipt_number:     p.receipt_number,
        status:             p.status,
        created_at:         p.created_at,
      };
    };

    return {
      overview: {
        total_payable,
        total_collected,
        total_unpaid,
        this_month_collected,
        last_month_collected,
        this_month_unpaid,
        last_month_unpaid,
      },
      recent_payments:     recentPayments.map(mapPayment),
      this_month_payments: thisMonthPayments.map(mapPayment),
      last_month_payments: lastMonthPayments.map(mapPayment),
    };
  }

  async getAllPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
  }) {
    const { page = 1, limit = 20, status, search, from_date, to_date } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Status filter — pure status field, no date-based overdue logic
    if (status === 'paid') {
      where.status = 'paid';
    } else if (status === 'unpaid') {
      where.status = { in: ['pending'] };
    }

    // Optional date range filter: paid records by paid_date, unpaid by created_at
    if (from_date || to_date) {
      const from = from_date ? new Date(from_date) : null;
      const to   = to_date
        ? (() => { const d = new Date(to_date); d.setHours(23, 59, 59, 999); return d; })()
        : null;
      const paidDateFilter: any   = {};
      const createdAtFilter: any  = {};
      if (from) { paidDateFilter.gte = from; createdAtFilter.gte = from; }
      if (to)   { paidDateFilter.lte = to;   createdAtFilter.lte = to;   }

      const dateConditions = [
        { status: 'paid',    paid_date:  paidDateFilter },
        { status: 'pending', created_at: createdAtFilter },
        { status: 'waived',  created_at: createdAtFilter },
      ];

      // Merge with existing status filter if any
      if (where.status) {
        const existingStatus = where.status;
        delete where.status;
        const matchingCondition = dateConditions.find(c => {
          if (typeof existingStatus === 'string') return c.status === existingStatus;
          return (existingStatus.in as string[]).includes(c.status);
        });
        where.AND = [
          { status: existingStatus },
          matchingCondition ? { OR: [matchingCondition] } : { OR: dateConditions },
        ];
      } else {
        where.OR = dateConditions;
      }
    }

    if (search) {
      const q = search.trim();
      const candidateFilter = {
        candidate: {
          OR: [
            { full_name:   { contains: q, mode: 'insensitive' } },
            { passport_no: { contains: q, mode: 'insensitive' } },
            { whatsapp_no: { contains: q } },
          ],
        },
      };
      if (where.AND || where.OR) {
        where.AND = [...(where.AND ?? [{ OR: where.OR }]), { candidate_job: candidateFilter }];
        if (!where.AND.some((c: any) => c.OR)) delete where.OR;
      } else {
        where.candidate_job = candidateFilter;
      }
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
                  id: true, title: true, service_fee: true,
                  company: { select: { id: true, name: true } },
                },
              },
              process_details: { select: { disc_allot: true, vendor_service_charge: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const data = payments.map((p) => ({
      id:                    p.id,
      candidate_job_id:      p.candidate_job_id,
      candidate_name:        p.candidate_job.candidate.full_name,
      passport_no:           (p.candidate_job.candidate as any).passport_no,
      whatsapp_no:           (p.candidate_job.candidate as any).whatsapp_no,
      job_title:             p.candidate_job.job.title,
      company_name:          p.candidate_job.job.company.name,
      vendor_service_charge: Number((p.candidate_job as any).process_details?.vendor_service_charge ?? 0)
                             || Number((p.candidate_job as any).job?.service_fee ?? 0),
      disc_allot:            Number((p.candidate_job as any).process_details?.disc_allot ?? 0),
      total_fee:             Number(p.total_fee),
      installment_number:    p.installment_number,
      amount_due:            Number(p.amount_due),
      amount_paid:           Number(p.amount_paid),
      fee_waiver_amount:     Number(p.fee_waiver_amount),
      due_date:              p.due_date,
      paid_date:             p.paid_date,
      payment_method:        p.payment_method,
      receipt_number:        p.receipt_number,
      status:                p.status,
      notes:                 p.notes,
      created_at:            p.created_at,
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

    // Date filter: for paid records use paid_date; for unpaid use created_at
    if (from_date || to_date) {
      const from = from_date ? new Date(from_date) : null;
      const to   = to_date
        ? (() => { const d = new Date(to_date); d.setUTCHours(23, 59, 59, 999); return d; })()
        : null;

      const dateConditions: any[] = [];
      const paidDateFilter: any = {};
      const createdAtFilter: any = {};
      if (from) { paidDateFilter.gte = from; createdAtFilter.gte = from; }
      if (to)   { paidDateFilter.lte = to;   createdAtFilter.lte = to; }

      dateConditions.push(
        { status: 'paid',    paid_date:  paidDateFilter },
        { status: 'pending', created_at: createdAtFilter },
        { status: 'waived',  created_at: createdAtFilter },
      );

      if (where.candidate_job) {
        // Combine search + date filter
        where.AND = [
          { candidate_job: where.candidate_job },
          { OR: dateConditions },
        ];
        delete where.candidate_job;
      } else {
        where.OR = dateConditions;
      }
    }

    const allRows = await this.prisma.payment.findMany({
      where,
      orderBy: [{ candidate_job_id: 'desc' }, { installment_number: 'asc' }],
      include: {
        candidate_job: {
          include: {
            candidate: { select: { id: true, full_name: true, passport_no: true, whatsapp_no: true } },
            job: {
              select: { id: true, title: true, company: { select: { id: true, name: true } } },
            },
            process_details: { select: { disc_allot: true } },
          },
        },
      },
    });

    const payments = allRows.map((p) => {
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
        disc_allot:         Number((p.candidate_job as any).process_details?.disc_allot ?? 0),
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
    const legacy_waiver   = payments.reduce((s, p) => s + p.fee_waiver_amount, 0);
    const seenCandidateJobs = new Set<number>();
    const disc_allot_total = allRows.reduce((s, p) => {
      if (seenCandidateJobs.has(p.candidate_job_id)) return s;
      seenCandidateJobs.add(p.candidate_job_id);
      return s + Number((p.candidate_job as any).process_details?.disc_allot ?? 0);
    }, 0);
    const total_discount  = legacy_waiver + disc_allot_total;
    const net_total       = Math.max(0, sub_total - total_discount);
    // Status-based aggregation — no date dependency
    const total_collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0);
    const total_pending   = payments.filter(p => p.status !== 'paid' && p.status !== 'waived').reduce((s, p) => s + p.balance, 0);
    const collection_rate = net_total > 0 ? Math.round((total_collected / net_total) * 100) : 0;

    return {
      payments,
      summary: {
        sub_total, total_discount, net_total,
        total_collected, total_pending,
        collection_rate,
        total_count: payments.length,
      },
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
                id: true, title: true,
                company: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const data = payments.map((p) => ({
      id:                 p.id,
      candidate_job_id:   p.candidate_job_id,
      candidate_name:     p.candidate_job.candidate.full_name,
      job_title:          p.candidate_job.job.title,
      company_name:       p.candidate_job.job.company.name,
      total_fee:          Number(p.total_fee),
      installment_number: p.installment_number,
      amount_due:         Number(p.amount_due),
      amount_paid:        Number(p.amount_paid),
      fee_waiver_amount:  Number(p.fee_waiver_amount),
      due_date:           p.due_date,
      paid_date:          p.paid_date,
      payment_method:     p.payment_method,
      receipt_number:     p.receipt_number,
      status:             p.status,
      notes:              p.notes,
      created_at:         p.created_at,
    }));

    return { data };
  }
}
