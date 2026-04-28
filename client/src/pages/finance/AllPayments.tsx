import { useState } from 'react';
import { Link } from 'react-router';
import { Search, Filter, FileSpreadsheet, FileText, X, DollarSign, CheckCircle2 } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetAllPaymentsQuery } from '../../store/api/financeApi';
import { useRecordPaymentMutation } from '../../store/api/paymentsApi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

function formatINR(amount: number | null | undefined): string {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function MethodBadge({ method }: { method: string | null | undefined }) {
  if (!method) return <span className="badge-gray">—</span>;
  switch (method) {
    case 'cash': return <span className="badge-green">Cash</span>;
    case 'bank_transfer': return <span className="badge-blue">Bank Transfer</span>;
    case 'upi': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">UPI</span>;
    case 'cheque': return <span className="badge-gray">Cheque</span>;
    default: return <span className="badge-gray">{method}</span>;
  }
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="badge-gray">—</span>;
  switch (status) {
    case 'paid': return <span className="badge-green">Paid</span>;
    case 'pending': return <span className="badge-orange">Pending</span>;
    case 'overdue': return <span className="badge-red">Overdue</span>;
    default: return <span className="badge-gray">{status}</span>;
  }
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
];

interface QuickPayForm {
  amount_paid: string;
  payment_method: string;
  receipt_number: string;
  paid_date: string;
  notes: string;
}

function QuickPayModal({ payment, onClose, onSuccess }: { payment: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<QuickPayForm>({
    amount_paid: String(Number(payment.amount_due) - Number(payment.amount_paid || 0)),
    payment_method: 'cash',
    receipt_number: '',
    paid_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [recordPayment, { isLoading }] = useRecordPaymentMutation();

  const remaining = Number(payment.amount_due) - Number(payment.amount_paid || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(form.amount_paid);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      await recordPayment({
        id: payment.id,
        amount_paid: amt,
        payment_method: form.payment_method || undefined,
        receipt_number: form.receipt_number || undefined,
        paid_date: form.paid_date || undefined,
        notes: form.notes || undefined,
      }).unwrap();
      toast.success(`Payment of ₹${amt.toLocaleString('en-IN')} recorded`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" /> Record Payment
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {payment.candidate_name} · Instalment #{payment.installment_number}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Summary bar */}
        <div className="mx-6 mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4 text-xs">
          <div>
            <p className="text-gray-400">Total Due</p>
            <p className="font-bold text-gray-800">{formatINR(payment.amount_due)}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-gray-400">Already Paid</p>
            <p className="font-bold text-emerald-700">{formatINR(payment.amount_paid)}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-gray-400">Remaining</p>
            <p className={`font-bold ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatINR(remaining)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Amount to Record (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.amount_paid}
              onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
              className="form-input"
              placeholder="Enter amount"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Payment Method</label>
              <Select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="">Select</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="form-label">Paid Date</label>
              <input
                type="date"
                value={form.paid_date}
                onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Receipt / Reference No.</label>
            <input
              type="text"
              value={form.receipt_number}
              onChange={e => setForm(f => ({ ...f, receipt_number: e.target.value }))}
              className="form-input"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="form-input resize-none"
              rows={2}
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1 justify-center">
              {isLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><CheckCircle2 size={14} /> Record</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function AllPayments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [quickPay, setQuickPay] = useState<any | null>(null);

  const params: Record<string, any> = { page, limit: PAGE_SIZE };
  if (search) params.search = search;
  if (statusFilter !== 'all') params.status = statusFilter;
  if (overdueOnly) params.overdue_only = true;

  const { data, isLoading, refetch } = useGetAllPaymentsQuery(params);

  const payments: any[] = (data as any)?.data || (data as any)?.payments || [];
  const total: number = (data as any)?.meta?.total || (data as any)?.total || payments.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Payments</h1>
          <p className="text-sm text-gray-400 mt-0.5">Search by name, passport, phone · click Pay to record</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = payments.map(p => ({
                Candidate: p.candidate_name, Passport: p.passport_no || '', Phone: p.whatsapp_no || '',
                Job: p.job_title, Company: p.company_name,
                'Installment': p.installment_number, 'Due': p.amount_due, 'Paid': p.amount_paid,
                'Due Date': formatDate(p.due_date), 'Paid Date': formatDate(p.paid_date),
                Method: p.payment_method || '', Status: p.status,
              }));
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Payments');
              XLSX.writeFile(wb, `payments-${new Date().toISOString().substring(0, 10)}.xlsx`);
            }}
            disabled={payments.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => window.print()}
            disabled={payments.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-40"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, passport, phone…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </Select>
        </div>
        <button
          onClick={() => { setOverdueOnly(v => !v); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            overdueOnly ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          Overdue Only
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Candidate</th>
                  <th className="table-th">Job</th>
                  <th className="table-th">Inst #</th>
                  <th className="table-th">Amount Due</th>
                  <th className="table-th">Paid</th>
                  <th className="table-th">Due Date</th>
                  <th className="table-th">Method</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any, i: number) => (
                  <tr key={p.id ?? i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {(p.candidate_name ?? '?')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{p.candidate_name ?? '—'}</p>
                          <p className="text-xs text-gray-400">
                            {[p.passport_no, p.whatsapp_no].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-gray-500 text-xs">
                      <div>{p.job_title ?? '—'}</div>
                      <div className="text-gray-300 text-[10px]">{p.company_name ?? ''}</div>
                    </td>
                    <td className="table-td text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {p.installment_number ?? '—'}
                      </span>
                    </td>
                    <td className="table-td font-semibold text-gray-800">{formatINR(p.amount_due)}</td>
                    <td className="table-td font-semibold text-emerald-700">{formatINR(p.amount_paid)}</td>
                    <td className={`table-td font-medium ${isOverdue(p.due_date) && p.status !== 'paid' ? 'text-red-600' : 'text-gray-600'}`}>
                      {formatDate(p.due_date)}
                    </td>
                    <td className="table-td"><MethodBadge method={p.payment_method} /></td>
                    <td className="table-td"><StatusBadge status={p.status} /></td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => setQuickPay(p)}
                            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <DollarSign size={11} /> Pay
                          </button>
                        )}
                        {p.candidate_job_id && (
                          <Link
                            to={`/process/${p.candidate_job_id}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">No payments found</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-400">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Quick-Pay Modal */}
      {quickPay && (
        <QuickPayModal
          payment={quickPay}
          onClose={() => setQuickPay(null)}
          onSuccess={() => { setQuickPay(null); refetch(); }}
        />
      )}
    </div>
  );
}
