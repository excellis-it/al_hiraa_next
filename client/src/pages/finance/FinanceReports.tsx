import { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetAllPaymentsQuery } from '../../store/api/financeApi';
import * as XLSX from 'xlsx';

function formatINR(amount: number | null | undefined): string {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const DATE_PRESETS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: '6_months', label: 'Last 6 Months' },
  { value: '1_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

function getDateRange(preset: string): { from_date?: string; to_date?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => d.toISOString().substring(0, 10);
  switch (preset) {
    case 'this_month': return { from_date: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to_date: fmt(today) };
    case 'last_month': return { from_date: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to_date: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case 'this_quarter': { const qm = Math.floor(now.getMonth() / 3) * 3; return { from_date: fmt(new Date(now.getFullYear(), qm, 1)), to_date: fmt(today) }; }
    case '6_months': { const d = new Date(today); d.setMonth(d.getMonth() - 6); return { from_date: fmt(d), to_date: fmt(today) }; }
    case '1_year': { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { from_date: fmt(d), to_date: fmt(today) }; }
    default: return {};
  }
}

export default function FinanceReports() {
  const [preset, setPreset] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const dateRange = useMemo(() => {
    if (preset === 'custom') return { from_date: customFrom || undefined, to_date: customTo || undefined };
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading } = useGetAllPaymentsQuery({ limit: 500, ...dateRange });
  const payments: any[] = data?.data || [];

  // Group by month
  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; collected: number; pending: number; overdue: number; count: number }>();
    for (const p of payments) {
      const d = p.paid_date || p.due_date || p.created_at;
      if (!d) continue;
      const key = new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      if (!map.has(key)) map.set(key, { month: key, collected: 0, pending: 0, overdue: 0, count: 0 });
      const row = map.get(key)!;
      row.count++;
      if (p.status === 'paid') row.collected += p.amount_paid || 0;
      else if (p.status === 'overdue') row.overdue += (p.amount_due || 0) - (p.amount_paid || 0);
      else row.pending += (p.amount_due || 0) - (p.amount_paid || 0);
    }
    return Array.from(map.values());
  }, [payments]);

  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount_paid || 0), 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + (p.amount_due || 0) - (p.amount_paid || 0), 0);

  const handleExportExcel = () => {
    const rows = payments.map(p => ({
      Candidate: p.candidate_name,
      Job: p.job_title,
      Company: p.company_name,
      'Installment #': p.installment_number,
      'Amount Due': p.amount_due,
      'Amount Paid': p.amount_paid,
      'Due Date': formatDate(p.due_date),
      'Paid Date': formatDate(p.paid_date),
      Method: p.payment_method || '',
      Receipt: p.receipt_number || '',
      Status: p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `finance-report-${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = payments.map(p => `
      <tr>
        <td>${p.candidate_name}</td><td>${p.job_title}</td><td>${p.company_name}</td>
        <td style="text-align:right">₹${Number(p.amount_due).toLocaleString('en-IN')}</td>
        <td style="text-align:right">₹${Number(p.amount_paid).toLocaleString('en-IN')}</td>
        <td>${formatDate(p.paid_date)}</td><td>${p.status}</td>
      </tr>`).join('');
    printWindow.document.write(`
      <html><head><title>Finance Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}
      h1{font-size:18px}h2{font-size:14px;color:#666;margin-top:4px}</style></head>
      <body><h1>Al-Hiraa ATMS — Finance Report</h1>
      <h2>${DATE_PRESETS.find(p => p.value === preset)?.label || 'Custom'} | Collected: ₹${totalCollected.toLocaleString('en-IN')} | Pending: ₹${totalPending.toLocaleString('en-IN')}</h2>
      <table><thead><tr><th>Candidate</th><th>Job</th><th>Company</th><th>Due</th><th>Paid</th><th>Paid Date</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate and export payment reports</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Collected</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalCollected)}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Pending / Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatINR(totalPending)}</p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <button onClick={handleExportExcel} disabled={payments.length === 0} className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-40">
          <FileSpreadsheet size={16} /> Download Excel
        </button>
        <button onClick={handleExportPDF} disabled={payments.length === 0} className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-40">
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
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Month</th>
                <th className="table-th">Payments</th>
                <th className="table-th">Collected</th>
                <th className="table-th">Pending</th>
                <th className="table-th">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {byMonth.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-semibold text-gray-800">{row.month}</td>
                  <td className="table-td text-gray-600">{row.count}</td>
                  <td className="table-td font-semibold text-emerald-700">{formatINR(row.collected)}</td>
                  <td className="table-td text-amber-600">{formatINR(row.pending)}</td>
                  <td className="table-td text-red-600">{formatINR(row.overdue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-10 text-center text-sm text-gray-400">No payment data for this period</div>
        )}
      </div>

      {/* Detailed payments table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Payment Details ({payments.length})</h2>
        </div>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {['Candidate', 'Job', 'Company', 'Due', 'Paid', 'Method', 'Paid Date', 'Status'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 50).map((p: any, i: number) => (
                  <tr key={p.id ?? i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="table-td font-medium text-gray-800">{p.candidate_name}</td>
                    <td className="table-td text-gray-500">{p.job_title}</td>
                    <td className="table-td text-gray-500">{p.company_name}</td>
                    <td className="table-td text-red-600 font-mono">{formatINR(p.amount_due)}</td>
                    <td className="table-td text-emerald-700 font-semibold font-mono">{formatINR(p.amount_paid)}</td>
                    <td className="table-td">{p.payment_method || '—'}</td>
                    <td className="table-td text-gray-500">{formatDate(p.paid_date)}</td>
                    <td className="table-td">
                      <span className={p.status === 'paid' ? 'badge-green' : p.status === 'overdue' ? 'badge-red' : 'badge-orange'}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-400">No payments found</div>
        )}
      </div>
    </div>
  );
}
