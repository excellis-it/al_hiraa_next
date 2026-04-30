import { useState, useMemo } from 'react';
import { DollarSign, AlertCircle, TrendingUp, Clock, Download, Calendar } from 'lucide-react';
import Select from '../../components/ui/Select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGetFinanceOverviewQuery } from '../../store/api/financeApi';

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
  const map: Record<string, [string, string]> = {
    cash: ['badge-green', 'Cash'],
    bank_transfer: ['badge-blue', 'Bank'],
    upi: ['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700', 'UPI'],
    cheque: ['badge-gray', 'Cheque'],
  };
  const [cls, label] = map[method] || ['badge-gray', method];
  return <span className={cls}>{label}</span>;
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="badge-gray">—</span>;
  const map: Record<string, [string, string]> = { paid: ['badge-green', 'Paid'], pending: ['badge-orange', 'Pending'], overdue: ['badge-red', 'Overdue'] };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={cls}>{label}</span>;
}

// ── Date range presets ────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  // { value: 'this_quarter', label: 'This Quarter' },
  { value: '6_months', label: 'Last 6 Months' },
  { value: '1_year', label: 'Last 1 Year' },
  { value: 'prev_year', label: 'Previous Year' },
  { value: 'custom', label: 'Custom Range' },
];

function getDateRange(preset: string): { from_date?: string; to_date?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  switch (preset) {
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { from_date: fmt(y), to_date: fmt(y) };
    }
    case 'this_week': {
      const d = new Date(today); d.setDate(d.getDate() - d.getDay());
      return { from_date: fmt(d), to_date: fmt(today) };
    }
    case 'this_month':
      return { from_date: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to_date: fmt(today) };
    case 'this_quarter': {
      const qm = Math.floor(now.getMonth() / 3) * 3;
      return { from_date: fmt(new Date(now.getFullYear(), qm, 1)), to_date: fmt(today) };
    }
    case '6_months': {
      const d = new Date(today); d.setMonth(d.getMonth() - 6);
      return { from_date: fmt(d), to_date: fmt(today) };
    }
    case '1_year': {
      const d = new Date(today); d.setFullYear(d.getFullYear() - 1);
      return { from_date: fmt(d), to_date: fmt(today) };
    }
    case 'prev_year':
      return { from_date: `${now.getFullYear() - 1}-01-01`, to_date: `${now.getFullYear() - 1}-12-31` };
    default:
      return {};
  }
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <div className="font-bold">₹{Number(payload[0].value).toLocaleString('en-IN')}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FinanceOverview() {
  const [preset, setPreset] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const dateParams = useMemo(() => {
    if (preset === 'custom') return { from_date: customFrom || undefined, to_date: customTo || undefined };
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading } = useGetFinanceOverviewQuery(dateParams, { refetchOnMountOrArgChange: true });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  const overview = data?.overview || {};
  const recentPayments: any[] = data?.recent_payments || [];

  // Build comparison chart data
  const chartData = [
    { name: 'Last Month', amount: overview.last_month_collected || 0 },
    { name: 'This Month', amount: overview.this_month_collected || 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Header + Date Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Payment collections and outstanding dues</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <Select
            value={preset}
            onChange={e => setPreset(e.target.value)}
          >
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(overview.total_collected)}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center">₹</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Outstanding Dues</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatINR(overview.outstanding_dues)}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center"><AlertCircle size={20} className="text-red-500" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">This Month</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatINR(overview.this_month_collected)}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center"><TrendingUp size={20} className="text-blue-600" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Overdue</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{overview.overdue_count ?? 0}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center"><Clock size={20} className="text-amber-600" /></div>
          </div>
        </div>
      </div>

      {/* Collection Comparison Chart */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Collection Comparison</h2>
        <p className="text-[10px] text-gray-400 mb-4">Last month vs this month</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="#2563EB" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Payments */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Recent Payments</h2>
        </div>
        {recentPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Candidate</th>
                  <th className="table-th">Job</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Discount</th>
                  <th className="table-th">Net Total</th>
                  <th className="table-th">Paid</th>
                  <th className="table-th">Method</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p: any, i: number) => {
                  const waiver = Number(p.fee_waiver_amount ?? 0);
                  const due    = Number(p.amount_due ?? 0);
                  const net    = p.net_amount != null ? Number(p.net_amount) : Math.max(0, due - waiver);
                  return (
                    <tr key={p.id ?? i} className="hover:bg-blue-50/30 transition-colors">
                      <td className="table-td font-medium text-gray-800">{p.candidate_name ?? '—'}</td>
                      <td className="table-td text-gray-500 text-xs">{p.job_title ?? '—'}</td>
                      <td className="table-td font-semibold text-gray-700">{due > 0 ? formatINR(due) : '—'}</td>
                      <td className="table-td font-semibold text-red-500">
                        {waiver > 0 ? `−${formatINR(waiver)}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-td font-bold text-gray-900">{net > 0 ? formatINR(net) : '—'}</td>
                      <td className="table-td font-semibold text-emerald-700">{formatINR(p.amount_paid)}</td>
                      <td className="table-td"><MethodBadge method={p.payment_method} /></td>
                      <td className="table-td text-gray-500 text-xs">{formatDate(p.paid_date)}</td>
                      <td className="table-td"><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-400">No payments in selected period</div>
        )}
      </div>
    </div>
  );
}
