import { useState, useMemo } from 'react';
import { FileSpreadsheet, FileText, Calendar, Search, ChevronDown, ChevronRight, CheckCircle2, Filter } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetFinanceReportQuery } from '../../store/api/financeApi';
import * as XLSX from 'xlsx';

const INST_COLORS = [
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
];

function formatINR(n: number | null | undefined): string {
  if (!n) return '₹0';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const DATE_PRESETS = [
  { value: 'all',          label: 'All Time' },
  { value: 'this_month',   label: 'This Month' },
  { value: 'last_month',   label: 'Last Month' },
  // { value: 'this_quarter', label: 'This Quarter' },
  { value: '6_months',     label: 'Last 6 Months' },
  { value: '1_year',       label: 'Last Year' },
  { value: 'custom',       label: 'Custom Range' },
];

function getDateRange(preset: string): { from_date?: string; to_date?: string } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt   = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  switch (preset) {
    case 'this_month':   return { from_date: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to_date: fmt(today) };
    case 'last_month':   return { from_date: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to_date: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case 'this_quarter': { const qm = Math.floor(now.getMonth() / 3) * 3; return { from_date: fmt(new Date(now.getFullYear(), qm, 1)), to_date: fmt(today) }; }
    case '6_months':     { const d = new Date(today); d.setMonth(d.getMonth() - 6); return { from_date: fmt(d), to_date: fmt(today) }; }
    case '1_year':       { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { from_date: fmt(d), to_date: fmt(today) }; }
    default:             return {};
  }
}

export default function FinanceReports() {
  const [preset,       setPreset]       = useState('this_month');
  const [customFrom,   setCustomFrom]   = useState('');
  const [customTo,     setCustomTo]     = useState('');
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [expanded,     setExpanded]     = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const dateRange = useMemo(() => {
    if (preset === 'custom') return { from_date: customFrom || undefined, to_date: customTo || undefined };
    if (preset === 'all')    return {};
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  const queryParams = { ...dateRange, ...(search ? { search } : {}) };
  const { data, isLoading } = useGetFinanceReportQuery(queryParams, { refetchOnMountOrArgChange: true });

  const allPayments: any[] = (data as any)?.payments ?? [];
  const summary:    any   = (data as any)?.summary  ?? {};

  // Client-side status filter applied on top of date-range results
  const payments = useMemo(() => {
    if (statusFilter === 'all') return allPayments;
    if (statusFilter === 'paid')   return allPayments.filter((p: any) => p.status === 'paid');
    return allPayments.filter((p: any) => p.status !== 'paid' && p.status !== 'waived');
  }, [allPayments, statusFilter]);

  // Group payments by candidate_job for the Payment Details table
  const groupedPayments = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of payments) {
      const key = p.candidate_job_id;
      if (!map.has(key)) {
        map.set(key, {
          candidate_job_id: p.candidate_job_id,
          candidate_name:   p.candidate_name,
          passport_no:      p.passport_no,
          whatsapp_no:      p.whatsapp_no,
          job_title:        p.job_title,
          company_name:     p.company_name,
          discount:         Number(p.disc_allot) || Number(p.fee_waiver_amount) || 0,
          installments:     [],
        });
      }
      map.get(key).installments.push(p);
    }
    return Array.from(map.values()).map(g => {
      const netTotal   = g.installments.reduce((s: number, p: any) => s + Number(p.amount_due || 0), 0);
      const subTotal   = netTotal + g.discount;
      const totalPaid  = g.installments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount_paid || 0), 0);
      const balance    = Math.max(0, netTotal - totalPaid);
      const allPaid    = g.installments.every((p: any) => p.status === 'paid');
      const anyPaid    = g.installments.some((p: any) => Number(p.amount_paid) > 0);
      const status     = allPaid ? 'paid' : anyPaid ? 'partial' : 'pending';
      return { ...g, subTotal, netTotal, totalPaid, balance, status };
    });
  }, [payments]);

  // Monthly breakdown (client-computed from the already-filtered payment list)
  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; count: number; subTotal: number; discount: number; netTotal: number; collected: number; pending: number }>();
    // Track seen candidate_jobs per month to avoid double-counting disc_allot
    const seenByMonth = new Map<string, Set<number>>();
    for (const p of payments) {
      // Use paid_date for paid records, created_at for pending — no due_date dependency
      const raw = p.status === 'paid' ? p.paid_date : p.created_at;
      if (!raw) continue;
      const key = new Date(raw).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      if (!map.has(key)) { map.set(key, { month: key, count: 0, subTotal: 0, discount: 0, netTotal: 0, collected: 0, pending: 0 }); seenByMonth.set(key, new Set()); }
      const row = map.get(key)!;
      const seen = seenByMonth.get(key)!;
      row.count++;
      row.subTotal += Number(p.amount_due || 0);
      if (!seen.has(p.candidate_job_id)) {
        seen.add(p.candidate_job_id);
        row.discount += Number(p.disc_allot) || Number(p.fee_waiver_amount) || 0;
      }
      row.netTotal  += Number(p.net_amount || 0);
      if (p.status === 'paid') row.collected += Number(p.amount_paid || 0);
      else                     row.pending   += Number(p.balance     || 0);
    }
    return Array.from(map.values());
  }, [payments]);

  // Excel export — identical structure to All Payments
  const handleExportExcel = () => {
    const rows: any[] = [];
    groupedPayments.forEach(g => {
      rows.push({
        Candidate: g.candidate_name, Passport: g.passport_no || '', Phone: g.whatsapp_no || '',
        Job: g.job_title, Company: g.company_name,
        Installment: '', 'Sub Total': g.subTotal, Discount: g.discount,
        'Net Total': g.netTotal, Paid: g.totalPaid, Balance: g.balance, Status: g.status,
        'Paid Date': '', Method: '',
      });
      g.installments.forEach((p: any) => {
        rows.push({
          Candidate: '', Passport: '', Phone: '', Job: '', Company: '',
          Installment: `#${p.installment_number}`,
          'Sub Total': p.amount_due, Discount: 0,
          'Net Total': p.net_amount,
          Paid: p.amount_paid,
          Balance: p.balance,
          Status: p.status,
          'Paid Date': p.paid_date ? formatDate(p.paid_date) : '',
          Method: p.payment_method || '',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `finance-report-${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // PDF export — identical structure to All Payments printPayments
  const handleExportPDF = () => {
    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
    const label = DATE_PRESETS.find(p => p.value === preset)?.label || 'Custom';
    const tableRows = groupedPayments.map(g => `
      <tr style="background:#f8fafc;font-weight:600">
        <td>${g.candidate_name}</td>
        <td>${g.passport_no || '—'}</td>
        <td>${g.job_title} / ${g.company_name}</td>
        <td>${g.installments.length}</td>
        <td>${fmt(g.subTotal)}</td>
        <td style="color:#ef4444">${g.discount > 0 ? '−' + fmt(g.discount) : '—'}</td>
        <td style="font-weight:700">${fmt(g.netTotal)}</td>
        <td style="color:#059669">${fmt(g.totalPaid)}</td>
        <td style="color:${g.balance > 0 ? '#d97706' : '#059669'}">${g.balance > 0 ? fmt(g.balance) : '₹0'}</td>
        <td>${g.status.toUpperCase()}</td>
      </tr>
      ${g.installments.map((p: any, i: number) => `
        <tr style="font-size:11px;color:#6b7280">
          <td colspan="3" style="padding-left:24px;font-style:italic">Installment #${i + 1}</td>
          <td>#${p.installment_number}</td>
          <td>${fmt(p.amount_due)}</td>
          <td style="color:#ef4444">—</td>
          <td>${fmt(p.net_amount)}</td>
          <td style="color:#059669">${fmt(p.amount_paid)}</td>
          <td>${p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-IN') : '—'}</td>
          <td>${p.payment_method?.replace('_', ' ') || '—'}</td>
        </tr>`).join('')}
    `).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Finance Report</title>
      <style>body{font-family:sans-serif;padding:24px;font-size:13px}
      table{width:100%;border-collapse:collapse}
      th{background:#1e40af;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
      td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
      h2{margin-bottom:4px;color:#1e293b}
      .sub{font-size:12px;color:#6b7280;margin-bottom:12px}
      .summary{display:flex;gap:16px;margin-bottom:16px;padding:10px 14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px}
      .s-item{text-align:center;min-width:90px}
      .s-label{font-size:10px;color:#6b7280;text-transform:uppercase}
      .s-val{font-size:14px;font-weight:700;margin-top:2px}
      @media print{body{padding:8px}}</style></head>
      <body>
        <h2>Al-Hiraa — Finance Report</h2>
        <div class="sub">${label}${dateRange.from_date ? ' · ' + formatDate(dateRange.from_date) + ' → ' + formatDate(dateRange.to_date || '') : ''}</div>
        <div class="summary">
          <div class="s-item"><div class="s-label">Sub Total</div><div class="s-val">₹${Number(summary.sub_total||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Discount</div><div class="s-val" style="color:#ef4444">−₹${Number(summary.total_discount||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Net Payable</div><div class="s-val">₹${Number(summary.net_total||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Collected</div><div class="s-val" style="color:#059669">₹${Number(summary.total_collected||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Pending</div><div class="s-val" style="color:#d97706">₹${Number(summary.total_pending||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Records</div><div class="s-val">${groupedPayments.length}</div></div>
        </div>
        <table><thead><tr>
          <th>Candidate</th><th>Passport</th><th>Job / Company</th><th>Insts</th>
          <th>Sub Total</th><th>Discount</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
        </tr></thead><tbody>${tableRows}</tbody></table>
        <script>window.onload=()=>window.print()</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate and export payment reports by date range</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-gray-400" />
          <Select value={preset} onChange={e => setPreset(e.target.value)}>
            {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          {preset === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-2 py-2 bg-gray-50" />
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-2 py-2 bg-gray-50" />
            </>
          )}
        </div>
      </div>

      {/* Search + Status filter */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidate, passport, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
            <option value="all">All Statuses</option>
            <option value="paid">Paid Only</option>
            <option value="unpaid">Unpaid Only</option>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Records',          value: summary.total_count     || 0, fmt: (v: number) => String(v),  cls: 'text-gray-700' },
          { label: 'Sub Total',        value: summary.sub_total       || 0, fmt: formatINR,                  cls: 'text-gray-800' },
          { label: 'Discount',         value: summary.total_discount  || 0, fmt: (v: number) => v > 0 ? `−${formatINR(v)}` : '₹0', cls: 'text-red-600' },
          { label: 'Net Payable',      value: summary.net_total       || 0, fmt: formatINR,                  cls: 'text-gray-900 font-extrabold' },
          { label: 'Collected (Paid)', value: summary.total_collected || 0, fmt: formatINR,                  cls: 'text-emerald-600' },
          { label: 'Pending (Unpaid)', value: summary.total_pending   || 0, fmt: formatINR,                  cls: 'text-amber-600' },
        ].map(({ label, value, fmt, cls }) => (
          <div key={label} className="stat-card">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-bold mt-1 ${cls}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>
      {/* Collection rate strip */}
      {(summary.net_total ?? 0) > 0 && (
        <div className="card px-5 py-3 flex items-center gap-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">Collection Rate</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${summary.collection_rate ?? 0}%` }} />
          </div>
          <span className="text-sm font-bold text-emerald-600 shrink-0">{summary.collection_rate ?? 0}%</span>
        </div>
      )}

      {/* Export buttons */}
      <div className="flex gap-3">
        <button onClick={handleExportExcel} disabled={!payments.length}
          className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-40">
          <FileSpreadsheet size={16} /> Download Excel
        </button>
        <button onClick={handleExportPDF} disabled={!payments.length}
          className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-40">
          <FileText size={16} /> Download PDF
        </button>
      </div>

      {/* Monthly breakdown */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Monthly Breakdown</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : byMonth.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Month', 'Payments', 'Sub Total', 'Discount', 'Net Total', 'Collected', 'Pending'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byMonth.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-semibold text-gray-800">{row.month}</td>
                    <td className="table-td text-gray-600">{row.count}</td>
                    <td className="table-td text-gray-600 font-mono">{formatINR(row.subTotal)}</td>
                    <td className="table-td text-red-500 font-semibold">
                      {row.discount > 0 ? `−${formatINR(row.discount)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-td font-bold text-gray-900">{formatINR(row.netTotal)}</td>
                    <td className="table-td font-semibold text-emerald-700">{formatINR(row.collected)}</td>
                    <td className="table-td text-amber-600">{formatINR(row.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-400">No payment data for this period</div>
        )}
      </div>

      {/* Payment details — grouped by candidate-job */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Payment Details</h2>
          <span className="text-xs text-gray-400">{groupedPayments.length} records</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : groupedPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {['Candidate', 'Passport', 'Job', 'Installments', 'Sub Total', 'Discount', 'Net Total', 'Paid', 'Balance', 'Status'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedPayments.map((g: any) => {
                  const isOpen = expanded.has(g.candidate_job_id);
                  return (
                    <>
                      <tr
                        key={`g-${g.candidate_job_id}`}
                        onClick={() => toggleExpand(g.candidate_job_id)}
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${g.status === 'paid' ? 'bg-emerald-50/20' : ''}`}
                      >
                        <td className="table-td">
                          <div className="flex items-center gap-1.5">
                            {isOpen ? <ChevronDown size={13} className="text-gray-400 shrink-0" /> : <ChevronRight size={13} className="text-gray-400 shrink-0" />}
                            <div>
                              <div className="font-semibold text-gray-800">{g.candidate_name}</div>
                              {g.whatsapp_no && <div className="text-[10px] text-gray-400">{g.whatsapp_no}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="table-td text-gray-400">{g.passport_no || '—'}</td>
                        <td className="table-td text-gray-500 whitespace-nowrap">
                          <div>{g.job_title}</div>
                          <div className="text-[10px] text-gray-300">{g.company_name}</div>
                        </td>
                        <td className="table-td">
                          <div className="flex flex-wrap gap-1">
                            {g.installments.map((p: any, i: number) => (
                              <span key={p.id} className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${INST_COLORS[i % INST_COLORS.length]}`}>
                                #{p.installment_number} {formatINR(p.amount_due)}
                                {p.status === 'paid' && <CheckCircle2 size={9} />}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="table-td text-gray-700 font-semibold">{formatINR(g.subTotal)}</td>
                        <td className="table-td text-red-500 font-semibold">
                          {g.discount > 0 ? `-${formatINR(g.discount)}` : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="table-td font-bold text-gray-900">{formatINR(g.netTotal)}</td>
                        <td className="table-td text-emerald-700 font-semibold">{formatINR(g.totalPaid)}</td>
                        <td className="table-td font-semibold">
                          {g.balance > 0 ? <span className="text-amber-600">{formatINR(g.balance)}</span> : <span className="text-emerald-600">0</span>}
                        </td>
                        <td className="table-td">
                          <span className={g.status === 'paid' ? 'badge-green' : g.status === 'partial' ? 'badge-blue' : 'badge-orange'}>
                            {g.status === 'paid' ? 'Paid' : g.status === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                      {isOpen && g.installments.map((p: any, i: number) => (
                        <tr key={`i-${p.id}`} className="bg-gray-50/60 border-t border-gray-100">
                          <td colSpan={2} className="px-4 py-2 pl-12 text-xs text-gray-400 italic">Installment #{p.installment_number}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{p.job_title}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${INST_COLORS[i % INST_COLORS.length]}`}>#{p.installment_number}</span>
                          </td>
                          <td className="px-4 py-2 text-xs font-semibold text-gray-700">{formatINR(p.amount_due)}</td>
                          <td className="px-4 py-2 text-xs text-gray-300">-</td>
                          <td className="px-4 py-2 text-xs font-semibold text-gray-700">{formatINR(p.net_amount)}</td>
                          <td className="px-4 py-2 text-xs font-semibold text-emerald-700">
                            {formatINR(p.amount_paid)}
                            {p.paid_date && <div className="text-[10px] text-gray-400 font-normal">{formatDate(p.paid_date)}</div>}
                          </td>
                          <td className="px-4 py-2 text-xs font-semibold">
                            {p.balance > 0 ? <span className="text-amber-600">{formatINR(p.balance)}</span> : <span className="text-emerald-600">0</span>}
                          </td>
                          <td className="px-4 py-2"><span className={p.status === 'paid' ? 'badge-green' : p.status === 'waived' ? 'badge-gray' : 'badge-orange'}>{p.status === 'paid' ? 'Paid' : p.status === 'waived' ? 'Waived' : 'Unpaid'}</span></td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-400">No payments found for this period</div>
        )}
      </div>
    </div>
  );
}
