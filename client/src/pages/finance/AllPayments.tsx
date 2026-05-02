import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Search, Filter, FileSpreadsheet, FileText, X, CheckCircle2, Plus, UserSearch } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetAllPaymentsQuery } from '../../store/api/financeApi';
import { useRecordPaymentMutation, useCreatePaymentMutation } from '../../store/api/paymentsApi';
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

function MethodBadge({ method }: { method: string | null | undefined }) {
  if (!method) return <span className="badge-gray">—</span>;
  switch (method) {
    case 'cash':          return <span className="badge-green">Cash</span>;
    case 'bank_transfer': return <span className="badge-blue">Bank Transfer</span>;
    case 'upi':           return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">UPI</span>;
    case 'cheque':        return <span className="badge-gray">Cheque</span>;
    default:              return <span className="badge-gray">{method}</span>;
  }
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="badge-gray">—</span>;
  switch (status) {
    case 'paid':    return <span className="badge-green">Paid</span>;
    case 'pending': return <span className="badge-orange">Unpaid</span>;
    case 'waived':  return <span className="badge-gray">Waived</span>;
    default:        return <span className="badge-gray">{status}</span>;
  }
}

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi',           label: 'UPI' },
  { value: 'cheque',        label: 'Cheque' },
];

const INST_COLORS = [
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
];

// ── GroupPayModal ─────────────────────────────────────────────────────────────

type InstRow = { id: number | null; amount: string; date: string; method: string; status: 'paid' | 'unpaid' };

function GroupPayModal({ group, onClose, onSuccess }: { group: any; onClose: () => void; onSuccess: () => void }) {
  const [rows, setRows] = useState<InstRow[]>(() =>
    group.installments.map((p: any) => ({
      id:     p.id,
      amount: String(Number(p.amount_due) || ''),
      // Show paid_date if paid, otherwise fall back to due_date — the UI's single "Date" field
      date:   p.paid_date ? p.paid_date.substring(0, 10) : (p.due_date ? p.due_date.substring(0, 10) : ''),
      method: p.payment_method || '',
      status: (p.status === 'paid' ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
    }))
  );
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [recordPayment]  = useRecordPaymentMutation();
  const [createPayment]  = useCreatePaymentMutation();

  const subTotal      = group.subTotal      || 0;
  const totalDiscount = group.totalDiscount || 0;
  const totalPayable  = group.netTotal      || 0;
  // Total paid uses explicit status, not date — status is the source of truth
  const totalPaid     = rows.reduce((s, r) => s + (r.status === 'paid' ? (parseFloat(r.amount) || 0) : 0), 0);
  const balance       = Math.max(0, totalPayable - totalPaid);

  const setRow = (i: number, patch: Partial<InstRow>) => {
    setSaveError('');
    setRows(rs => {
      const updated = rs.map((r, idx) => idx === i ? { ...r, ...patch } : r);
      if ('amount' in patch && rs[i].id === null) {
        // Re-balance amounts among unpaid existing rows when a new row's amount changes
        const paidExistingTotal = updated.filter(r => r.id !== null && r.status === 'paid').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const newTotal = updated.filter(r => r.id === null).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const unpaidIdxs = updated.map((r, idx) => (r.id !== null && r.status !== 'paid' ? idx : -1)).filter(x => x !== -1);
        if (unpaidIdxs.length > 0) {
          const lastIdx = unpaidIdxs[unpaidIdxs.length - 1];
          const otherUnpaidTotal = unpaidIdxs.filter(idx => idx !== lastIdx).reduce((s, idx) => s + (parseFloat(updated[idx].amount) || 0), 0);
          const adjusted = Math.max(0, totalPayable - paidExistingTotal - newTotal - otherUnpaidTotal);
          return updated.map((r, idx) => idx === lastIdx ? { ...r, amount: String(adjusted) } : r);
        }
      }
      return updated;
    });
  };

  // Toggle paid/unpaid status — preserves the date as the installment reference date
  const toggleStatus = (i: number) => {
    setSaveError('');
    setRows(rs => rs.map((r, idx) => {
      if (idx !== i) return r;
      const next: 'paid' | 'unpaid' = r.status === 'paid' ? 'unpaid' : 'paid';
      return {
        ...r,
        status: next,
        // Auto-fill today's date only if empty; preserve existing date when toggling either way
        date:   r.date || (next === 'paid' ? new Date().toISOString().substring(0, 10) : ''),
        method: next === 'paid' ? (r.method || 'cash') : r.method,
      };
    }));
  };

  const handleSave = async () => {
    setSaveError('');
    // Validate amounts on rows that are still editable (new rows or unpaid existing rows)
    const editableRows = rows.filter(r => r.id === null || r.status !== 'paid');
    for (const row of editableRows) {
      if ((parseFloat(row.amount) || 0) <= 0) {
        setSaveError('All installment amounts must be greater than ₹0.');
        return;
      }
    }
    const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    if (grandTotal > totalPayable) {
      setSaveError(`Total (₹${grandTotal.toLocaleString('en-IN')}) exceeds payable amount (₹${totalPayable.toLocaleString('en-IN')}).`);
      return;
    }
    setSaving(true);
    try {
      const maxNum = Math.max(0, ...group.installments.map((p: any) => p.installment_number || 0));
      let nextNum = maxNum;
      await Promise.all(rows.map(async (row) => {
        const amt = parseFloat(row.amount) || 0;
        // Send explicit status to backend — date is informational only
        const explicitStatus: 'paid' | 'pending' = row.status === 'paid' ? 'paid' : 'pending';
        if (row.id === null) {
          nextNum += 1;
          await createPayment({
            candidate_job_id:   group.candidate_job_id,
            installment_number: nextNum,
            total_fee:          amt,
            amount_due:         amt,
            fee_waiver_amount:  0,
            status:             explicitStatus,
            ...(row.date   ? { paid_date: row.date }     : {}),
            ...(row.method ? { payment_method: row.method } : {}),
          }).unwrap();
        } else {
          await recordPayment({
            id:                row.id,
            amount_due:        amt,
            fee_waiver_amount: 0,
            status:            explicitStatus,
            ...(row.date   ? { paid_date:      row.date   } : {}),
            ...(row.method ? { payment_method: row.method } : {}),
          }).unwrap();
        }
      }));
      toast.success('Payments saved');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save payments');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">₹ Record Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">{group.candidate_name} · {group.job_title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Column headers */}
          <div className="grid grid-cols-[32px_1fr_1fr_1fr_90px_20px] gap-2 px-1">
            <div />
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Amount (₹)</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date Paid</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Method</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</p>
            <div />
          </div>

          {rows.map((row, i) => {
            const isPaid = row.status === 'paid';
            const isNew  = row.id === null;
            return (
              <div key={row.id ?? `new-${i}`} className={`grid grid-cols-[32px_1fr_1fr_1fr_90px_20px] gap-2 items-center rounded-xl px-2 py-1.5 transition-colors ${isPaid ? 'bg-emerald-50/60' : ''}`}>
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold ${INST_COLORS[i % INST_COLORS.length]}`}>#{i + 1}</span>
                <input type="number" min="0" step="1" value={row.amount} onChange={e => setRow(i, { amount: e.target.value })} className="form-input text-sm" placeholder="0" />
                <input type="date" value={row.date} onChange={e => setRow(i, { date: e.target.value })} className="form-input text-sm" />
                <select value={row.method} onChange={e => setRow(i, { method: e.target.value })} className="form-input text-sm">
                  <option value="">—</option>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {/* Explicit Paid / Unpaid toggle — single source of truth for status */}
                <button
                  type="button"
                  onClick={() => toggleStatus(i)}
                  className={`text-[10px] font-bold rounded-lg px-2 py-1.5 transition-all border whitespace-nowrap ${
                    isPaid
                      ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-amber-400 hover:text-amber-700'
                  }`}
                  title={isPaid ? 'Click to mark as Unpaid' : 'Click to mark as Paid'}
                >
                  {isPaid ? '✓ PAID' : 'UNPAID'}
                </button>
                {isNew ? (
                  <button type="button" onClick={() => { setSaveError(''); setRows(rs => rs.filter((_, idx) => idx !== i)); }} className="flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={12} /></button>
                ) : <div />}
              </div>
            );
          })}

          {/* Allow up to 4 installments */}
          {rows.length < 4 && (
            <button type="button" onClick={() => { setSaveError(''); setRows(rs => [...rs, { id: null, amount: '', date: '', method: '', status: 'unpaid' }]); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1">
              <Plus size={13} /> Add Installment
            </button>
          )}

          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-3 mt-2 pt-3 border-t border-gray-100">
            {[
              { label: 'Sub Total',      value: subTotal,      cls: 'text-gray-700' },
              { label: 'Discount',       value: totalDiscount, cls: 'text-red-500' },
              { label: 'Total Payable',  value: totalPayable,  cls: 'text-gray-900 font-bold' },
              { label: 'Total Paid',     value: totalPaid,     cls: 'text-emerald-600' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${cls}`}>₹{value.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>

          <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold ${balance === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
            <span>Balance Due</span>
            <span>{balance === 0 ? '0 — Fully Paid' : `₹${balance.toLocaleString('en-IN')}`}</span>
          </div>

          {saveError && <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 size={14} /> Save All</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FindAndPayModal — search all loaded groups, open GroupPayModal ─────────────

function FindAndPayModal({ allGroups, onClose, onSuccess }: { allGroups: any[]; onClose: () => void; onSuccess: () => void }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const results = useMemo(() => {
    if (!q.trim()) return allGroups.slice(0, 10);
    const lower = q.toLowerCase();
    return allGroups.filter(g =>
      g.candidate_name?.toLowerCase().includes(lower) ||
      g.passport_no?.toLowerCase().includes(lower) ||
      g.whatsapp_no?.includes(q.trim())
    ).slice(0, 10);
  }, [q, allGroups]);

  if (selected) {
    return <GroupPayModal group={selected} onClose={onClose} onSuccess={onSuccess} />;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><UserSearch size={16} /> Add Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">Search for a candidate to record payment</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name, passport, phone…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="form-input pl-9 w-full"
            />
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No candidates found</p>
            ) : results.map((g: any) => {
              const allPaid = g.installments.every((p: any) => p.status === 'paid');
              return (
                <button
                  key={g.candidate_job_id}
                  onClick={() => setSelected(g)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 text-left transition-colors border border-transparent hover:border-blue-100"
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{g.candidate_name}</p>
                    <p className="text-xs text-gray-400">{[g.passport_no, g.whatsapp_no].filter(Boolean).join(' · ')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{g.job_title} · {g.company_name}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-gray-800">₹{(g.netTotal || 0).toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {allPaid ? 'Fully Paid' : `₹${(g.balance || 0).toLocaleString('en-IN')} due`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Grouping helpers ──────────────────────────────────────────────────────────

function groupByProcess(payments: any[]): any[] {
  const map = new Map<number, any>();
  for (const p of payments) {
    const key = p.candidate_job_id ?? p.id;
    if (!map.has(key)) {
      map.set(key, {
        candidate_job_id: p.candidate_job_id,
        candidate_name:   p.candidate_name,
        passport_no:      p.passport_no,
        whatsapp_no:      p.whatsapp_no,
        job_title:        p.job_title,
        company_name:     p.company_name,
        installments:     [],
      });
    }
    map.get(key).installments.push(p);
  }
  return Array.from(map.values()).map(g => {
    const insts        = g.installments.sort((a: any, b: any) => (a.installment_number ?? 0) - (b.installment_number ?? 0));
    const subTotal     = Number(insts[0]?.vendor_service_charge || 0);
    const totalDiscount= Number(insts[0]?.disc_allot            || 0);
    const netTotal     = Math.max(0, subTotal - totalDiscount);
    // Paid = sum of amount_paid for status='paid' installments
    const totalPaid    = insts.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount_paid || 0), 0);
    const balance      = Math.max(0, netTotal - totalPaid);
    const allPaid      = insts.every((p: any) => p.status === 'paid' || p.status === 'waived');
    const anyPaid      = insts.some((p: any)  => p.status === 'paid');
    // Status: purely based on payment_status field — no date logic
    const groupStatus  = allPaid ? 'paid' : anyPaid ? 'partial' : 'pending';
    return { ...g, installments: insts, subTotal, totalDiscount, totalPaid, netTotal, balance, groupStatus };
  });
}

function GroupStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'paid':    return <span className="badge-green">Fully Paid</span>;
    case 'partial': return <span className="badge-blue">Partial</span>;
    default:        return <span className="badge-orange">Unpaid</span>;
  }
}

const PAGE_SIZE = 20;

function printPayments(groups: any[]) {
  const fmt  = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
  const rows = groups.map(g => `
    <tr style="background:#f8fafc;font-weight:600">
      <td>${g.candidate_name}</td><td>${g.passport_no || '—'}</td>
      <td>${g.job_title} / ${g.company_name}</td><td>${g.installments.length}</td>
      <td>${fmt(g.subTotal)}</td><td style="color:#ef4444">${g.totalDiscount > 0 ? '−' + fmt(g.totalDiscount) : '—'}</td>
      <td style="font-weight:700">${fmt(g.netTotal)}</td><td style="color:#059669">${fmt(g.totalPaid)}</td>
      <td style="color:${g.balance > 0 ? '#d97706' : '#059669'}">${g.balance > 0 ? fmt(g.balance) : '0'}</td>
      <td>${g.groupStatus.toUpperCase()}</td>
    </tr>
    ${g.installments.map((p: any, i: number) => {
      const w   = Number(p.fee_waiver_amount || 0);
      const net = Math.max(0, Number(p.amount_due || 0) - w);
      return `<tr style="font-size:11px;color:#6b7280">
        <td colspan="3" style="padding-left:24px;font-style:italic">Installment #${i + 1}</td>
        <td>#${p.installment_number}</td><td>${fmt(p.amount_due)}</td>
        <td style="color:#ef4444">${w > 0 ? '−' + fmt(w) : '—'}</td>
        <td>${fmt(net)}</td><td style="color:#059669">${fmt(p.amount_paid)}</td>
        <td>${p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-IN') : '—'}</td>
        <td>${p.payment_method || '—'}</td>
      </tr>`;
    }).join('')}
  `).join('');

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Payment Report</title>
    <style>body{font-family:sans-serif;padding:24px;font-size:13px}
    table{width:100%;border-collapse:collapse}
    th{background:#1e40af;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
    td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
    h2{margin-bottom:16px;color:#1e293b}
    @media print{body{padding:8px}}</style></head>
  <body><h2>All Payments — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</h2>
  <table><thead><tr>
    <th>Candidate</th><th>Passport</th><th>Job / Company</th><th>Insts</th>
    <th>Sub Total</th><th>Discount</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AllPayments() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate]       = useState('');
  const [toDate, setToDate]           = useState('');
  const [page, setPage]               = useState(1);
  const [quickPay, setQuickPay]       = useState<any | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [expanded, setExpanded]       = useState<Set<number>>(new Set());

  const params: Record<string, any> = { page: 1, limit: 500 };
  if (search)   params.search    = search;
  if (fromDate) params.from_date = fromDate;
  if (toDate)   params.to_date   = toDate;

  const { data, isLoading, refetch } = useGetAllPaymentsQuery(params);

  const rawPayments: any[] = (data as any)?.data || (data as any)?.payments || [];
  const allGroups  = groupByProcess(rawPayments);

  // Status-only filter — no overdue date logic
  const filteredGroups = allGroups.filter(g => {
    if (statusFilter === 'all')    return true;
    if (statusFilter === 'paid')   return g.groupStatus === 'paid';
    if (statusFilter === 'unpaid') return g.groupStatus === 'pending' || g.groupStatus === 'partial';
    return true;
  });

  const totalGroups = filteredGroups.length;
  const totalPages  = Math.max(1, Math.ceil(totalGroups / PAGE_SIZE));
  const groups      = filteredGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleExpand = (cjId: number) =>
    setExpanded(s => { const n = new Set(s); n.has(cjId) ? n.delete(cjId) : n.add(cjId); return n; });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Payments</h1>
          <p className="text-sm text-gray-400 mt-0.5">One row per candidate process · click to expand installments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddPayment(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Add Payment
          </button>
          <button
            onClick={() => {
              const rows: any[] = [];
              filteredGroups.forEach(g => {
                rows.push({
                  Candidate: g.candidate_name, Passport: g.passport_no || '', Phone: g.whatsapp_no || '',
                  Job: g.job_title, Company: g.company_name, Installment: '',
                  'Sub Total': g.subTotal, Discount: g.totalDiscount,
                  'Net Total': g.netTotal, Paid: g.totalPaid, Balance: g.balance, Status: g.groupStatus,
                  'Paid Date': '', Method: '',
                });
                g.installments.forEach((p: any) => {
                  const w   = Number(p.fee_waiver_amount || 0);
                  rows.push({
                    Candidate: '', Passport: '', Phone: '', Job: '', Company: '',
                    Installment: `#${p.installment_number}`,
                    'Sub Total': p.amount_due, Discount: w,
                    'Net Total': Math.max(0, Number(p.amount_due) - w),
                    Paid: p.amount_paid,
                    Balance: Math.max(0, Math.max(0, Number(p.amount_due) - w) - Number(p.amount_paid || 0)),
                    Status: p.status === 'pending' ? 'Unpaid' : p.status,
                    'Paid Date': p.paid_date ? formatDate(p.paid_date) : '',
                    Method: p.payment_method || '',
                  });
                });
              });
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Payments');
              XLSX.writeFile(wb, `payments-${new Date().toISOString().substring(0, 10)}.xlsx`);
            }}
            disabled={filteredGroups.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => printPayments(filteredGroups)}
            disabled={filteredGroups.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-40"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
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
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </Select>
        </div>
        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl px-2 py-2 bg-gray-50"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl px-2 py-2 bg-gray-50"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); setPage(1); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
              title="Clear date filter"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : groups.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Candidate</th>
                  <th className="table-th">Job</th>
                  <th className="table-th">Installments</th>
                  <th className="table-th">Sub Total</th>
                  <th className="table-th">Discount</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Paid</th>
                  <th className="table-th">Balance</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g: any) => {
                  const isOpen       = expanded.has(g.candidate_job_id);
                  const unpaidInsts  = g.installments.filter((p: any) => p.status !== 'paid' && p.status !== 'waived');
                  return (
                    <>
                      <tr key={`g-${g.candidate_job_id}`} onClick={() => toggleExpand(g.candidate_job_id)} className="hover:bg-blue-50/30 transition-colors cursor-pointer">
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                              {(g.candidate_name ?? '?')[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{g.candidate_name ?? '—'}</p>
                              <p className="text-xs text-gray-400">{[g.passport_no, g.whatsapp_no].filter(Boolean).join(' · ') || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-td text-gray-500 text-xs">
                          <div>{g.job_title ?? '—'}</div>
                          <div className="text-gray-300 text-[10px]">{g.company_name ?? ''}</div>
                        </td>
                        <td className="table-td">
                          <div className="flex flex-wrap gap-1">
                            {g.installments.map((p: any, i: number) => (
                              <span key={p.id} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${INST_COLORS[i % INST_COLORS.length]}`}>
                                #{p.installment_number} {formatINR(p.amount_due)}
                                {p.status === 'paid' && <CheckCircle2 size={9} />}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="table-td font-semibold text-gray-700">{formatINR(g.subTotal)}</td>
                        <td className="table-td font-semibold text-red-500">
                          {g.totalDiscount > 0 ? `−${formatINR(g.totalDiscount)}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="table-td font-bold text-gray-900">{formatINR(g.netTotal)}</td>
                        <td className="table-td font-semibold text-emerald-700">{formatINR(g.totalPaid)}</td>
                        <td className="table-td font-semibold text-amber-700">
                          {g.balance > 0 ? formatINR(g.balance) : <span className="text-emerald-600">&#8377;0</span>}
                        </td>
                        <td className="table-td"><GroupStatusBadge status={g.groupStatus} /></td>
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            {unpaidInsts.length > 0 && (
                              <button onClick={e => { e.stopPropagation(); setQuickPay(g); }}
                                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                                ₹ Pay
                              </button>
                            )}
                            {g.candidate_job_id && (
                              <Link to={`/process/${g.candidate_job_id}`} onClick={e => e.stopPropagation()}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap">
                                View →
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded installment sub-rows */}
                      {isOpen && g.installments.map((p: any, i: number) => {
                        const instWaiver  = Number(p.fee_waiver_amount || 0);
                        const instNet     = Math.max(0, Number(p.amount_due || 0) - instWaiver);
                        const instBalance = Math.max(0, instNet - Number(p.amount_paid || 0));
                        return (
                          <tr key={`i-${p.id}`} className="bg-gray-50/60 border-t border-gray-100">
                            <td colSpan={2} className="px-4 py-2 pl-16 text-xs text-gray-400 italic">Installment #{p.installment_number}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${INST_COLORS[i % INST_COLORS.length]}`}>#{p.installment_number}</span>
                            </td>
                            <td className="px-4 py-2 text-xs font-semibold text-gray-700">{formatINR(p.amount_due)}</td>
                            <td className="px-4 py-2 text-xs font-semibold text-red-400">
                              {instWaiver > 0 ? `−${formatINR(instWaiver)}` : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2 text-xs font-semibold text-gray-700">{formatINR(instNet)}</td>
                            <td className="px-4 py-2 text-xs font-semibold text-emerald-700">
                              {formatINR(p.amount_paid)}
                              {p.paid_date && <div className="text-[10px] text-gray-400 font-normal">{formatDate(p.paid_date)}</div>}
                            </td>
                            <td className="px-4 py-2 text-xs font-semibold text-amber-700">
                              {instBalance > 0 ? formatINR(instBalance) : <span className="text-emerald-600 text-[10px]">&#8377;0</span>}
                            </td>
                            <td className="px-4 py-2"><MethodBadge method={p.payment_method} /></td>
                            <td className="px-4 py-2">
                              <StatusBadge status={p.status} />
                              {p.status !== 'paid' && p.status !== 'waived' && (
                                <button onClick={() => setQuickPay(g)}
                                  className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-colors">
                                  ₹ Pay
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
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
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalGroups)} of {totalGroups} groups
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-40 transition-colors">← Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === pageNum ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-40 transition-colors">Next →</button>
          </div>
        </div>
      )}

      {/* Group Pay Modal */}
      {quickPay && (
        <GroupPayModal group={quickPay} onClose={() => setQuickPay(null)} onSuccess={() => { setQuickPay(null); refetch(); }} />
      )}

      {/* Find & Pay Modal (direct payment entry) */}
      {showAddPayment && (
        <FindAndPayModal
          allGroups={allGroups}
          onClose={() => setShowAddPayment(false)}
          onSuccess={() => { setShowAddPayment(false); refetch(); }}
        />
      )}
    </div>
  );
}
