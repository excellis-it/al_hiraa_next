import { useState, useMemo } from 'react';
import { FileSpreadsheet, FileText, Calendar, Search } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetFinanceReportQuery } from '../../store/api/financeApi';
import * as XLSX from 'xlsx';

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
  const [preset,     setPreset]     = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [search,     setSearch]     = useState('');

  const dateRange = useMemo(() => {
    if (preset === 'custom') return { from_date: customFrom || undefined, to_date: customTo || undefined };
    if (preset === 'all')    return {};
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  const queryParams = { ...dateRange, ...(search ? { search } : {}) };
  const { data, isLoading } = useGetFinanceReportQuery(queryParams, { refetchOnMountOrArgChange: true });

  const payments: any[] = (data as any)?.payments ?? [];
  const summary:  any   = (data as any)?.summary  ?? {};

  // Monthly breakdown (client-computed from the already-filtered payment list)
  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; count: number; subTotal: number; discount: number; netTotal: number; collected: number; pending: number }>();
    for (const p of payments) {
      const raw = p.paid_date || p.due_date || p.created_at;
      if (!raw) continue;
      const key = new Date(raw).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      if (!map.has(key)) map.set(key, { month: key, count: 0, subTotal: 0, discount: 0, netTotal: 0, collected: 0, pending: 0 });
      const row = map.get(key)!;
      row.count++;
      row.subTotal  += Number(p.amount_due        || 0);
      row.discount  += Number(p.fee_waiver_amount  || 0);
      row.netTotal  += Number(p.net_amount         || 0);
      if (p.status === 'paid') row.collected += Number(p.amount_paid || 0);
      else                     row.pending   += Number(p.balance     || 0);
    }
    return Array.from(map.values());
  }, [payments]);

  // Excel export
  const handleExportExcel = () => {
    const rows = payments.map(p => ({
      Candidate:        p.candidate_name,
      Passport:         p.passport_no  || '',
      Phone:            p.whatsapp_no  || '',
      Job:              p.job_title,
      Company:          p.company_name,
      'Installment #':  p.installment_number,
      'Amount (₹)':     p.amount_due,
      'Discount (₹)':   p.fee_waiver_amount,
      'Net Total (₹)':  p.net_amount,
      'Paid (₹)':       p.amount_paid,
      'Balance (₹)':    p.balance,
      'Paid Date':      formatDate(p.paid_date),
      Method:           p.payment_method  || '',
      Receipt:          p.receipt_number  || '',
      Status:           p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `finance-report-${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // PDF export
  const handleExportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const label = DATE_PRESETS.find(p => p.value === preset)?.label || 'Custom';
    const tableRows = payments.map(p => `
      <tr>
        <td>${p.candidate_name}</td>
        <td>${p.passport_no || '—'}</td>
        <td>${p.job_title} / ${p.company_name}</td>
        <td style="text-align:center">#${p.installment_number}</td>
        <td style="text-align:right">₹${Number(p.amount_due).toLocaleString('en-IN')}</td>
        <td style="text-align:right;color:#ef4444">${p.fee_waiver_amount > 0 ? '−₹' + Number(p.fee_waiver_amount).toLocaleString('en-IN') : '—'}</td>
        <td style="text-align:right;font-weight:700">₹${Number(p.net_amount).toLocaleString('en-IN')}</td>
        <td style="text-align:right;color:#059669">₹${Number(p.amount_paid).toLocaleString('en-IN')}</td>
        <td style="text-align:right;color:${p.balance > 0 ? '#d97706' : '#059669'}">${p.balance > 0 ? '₹' + Number(p.balance).toLocaleString('en-IN') : 'Nil'}</td>
        <td>${formatDate(p.paid_date)}</td>
        <td>${p.payment_method?.replace('_', ' ') || '—'}</td>
        <td style="color:${p.status === 'paid' ? '#059669' : '#d97706'}">${p.status}</td>
      </tr>`).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Finance Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #e5e7eb;padding:5px 8px;text-align:left}
        th{background:#1e40af;color:#fff;font-size:11px}
        .summary{display:flex;gap:20px;margin-bottom:16px;padding:12px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px}
        .s-item{text-align:center;min-width:100px}
        .s-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
        .s-val{font-size:15px;font-weight:700;margin-top:2px}
        h1{font-size:18px;margin-bottom:2px}
        .subtitle{font-size:12px;color:#6b7280;margin-bottom:14px}
        @media print{body{padding:8px}}
      </style></head>
      <body>
        <h1>Al-Hiraa — Finance Report</h1>
        <div class="subtitle">${label}${dateRange.from_date ? ' · ' + formatDate(dateRange.from_date) + ' → ' + formatDate(dateRange.to_date) : ''}</div>
        <div class="summary">
          <div class="s-item"><div class="s-label">Sub Total</div><div class="s-val">₹${Number(summary.sub_total||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Discount</div><div class="s-val" style="color:#ef4444">−₹${Number(summary.total_discount||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Net Payable</div><div class="s-val">₹${Number(summary.net_total||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Collected</div><div class="s-val" style="color:#059669">₹${Number(summary.total_collected||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Pending</div><div class="s-val" style="color:#d97706">₹${Number(summary.total_pending||0).toLocaleString('en-IN')}</div></div>
          <div class="s-item"><div class="s-label">Records</div><div class="s-val">${summary.total_count||0}</div></div>
        </div>
        <table><thead><tr>
          <th>Candidate</th><th>Passport</th><th>Job / Company</th><th>#</th>
          <th>Amount</th><th>Discount</th><th>Net Total</th><th>Paid</th><th>Balance</th>
          <th>Paid Date</th><th>Method</th><th>Status</th>
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

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidate, passport, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9 text-sm"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Records',       value: summary.total_count  || 0, fmt: (v: number) => String(v),  cls: 'text-gray-700' },
          { label: 'Sub Total',     value: summary.sub_total    || 0, fmt: formatINR,                  cls: 'text-gray-800' },
          { label: 'Discount',      value: summary.total_discount||0, fmt: (v: number) => v > 0 ? `−${formatINR(v)}` : '₹0', cls: 'text-red-600' },
          { label: 'Net Payable',   value: summary.net_total    || 0, fmt: formatINR,                  cls: 'text-gray-900 font-extrabold' },
          { label: 'Collected',     value: summary.total_collected||0,fmt: formatINR,                  cls: 'text-emerald-600' },
          { label: 'Pending / Due', value: summary.total_pending|| 0, fmt: formatINR,                  cls: 'text-amber-600' },
        ].map(({ label, value, fmt, cls }) => (
          <div key={label} className="stat-card">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-bold mt-1 ${cls}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

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

      {/* Payment details */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Payment Details</h2>
          <span className="text-xs text-gray-400">{payments.length} records</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {['Candidate', 'Passport', 'Job', 'Inst.', 'Amount', 'Discount', 'Net Total', 'Paid', 'Balance', 'Method', 'Paid Date', 'Status'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any, i: number) => (
                  <tr key={p.id ?? i} className={`hover:bg-blue-50/30 transition-colors ${p.status === 'paid' ? 'bg-emerald-50/20' : ''}`}>
                    <td className="table-td font-medium text-gray-800 whitespace-nowrap">{p.candidate_name}</td>
                    <td className="table-td text-gray-400">{p.passport_no || '—'}</td>
                    <td className="table-td text-gray-500 whitespace-nowrap">{p.job_title}</td>
                    <td className="table-td text-center text-gray-500">#{p.installment_number}</td>
                    <td className="table-td text-gray-700 font-mono">{formatINR(p.amount_due)}</td>
                    <td className="table-td text-red-500 font-semibold">
                      {p.fee_waiver_amount > 0 ? `−${formatINR(p.fee_waiver_amount)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-td font-bold text-gray-900">{formatINR(p.net_amount)}</td>
                    <td className="table-td text-emerald-700 font-semibold">{formatINR(p.amount_paid)}</td>
                    <td className="table-td font-semibold">
                      {p.balance > 0
                        ? <span className="text-amber-600">{formatINR(p.balance)}</span>
                        : <span className="text-emerald-600">Nil</span>}
                    </td>
                    <td className="table-td text-gray-500 capitalize">{p.payment_method?.replace('_', ' ') || '—'}</td>
                    <td className="table-td text-gray-500 whitespace-nowrap">{formatDate(p.paid_date)}</td>
                    <td className="table-td">
                      <span className={p.status === 'paid' ? 'badge-green' : 'badge-orange'}>{p.status}</span>
                    </td>
                  </tr>
                ))}
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
