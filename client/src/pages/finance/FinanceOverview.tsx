import { useState, useMemo } from 'react';
import { Calendar, Wallet, CheckCircle2, AlertCircle, X, Search, TrendingUp, ChevronRight } from 'lucide-react';
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
  if (!method) return <span className="text-gray-300 text-xs">—</span>;
  const map: Record<string, [string, string]> = {
    cash:          ['bg-emerald-100 text-emerald-700', 'Cash'],
    bank_transfer: ['bg-blue-100 text-blue-700',       'Bank'],
    upi:           ['bg-violet-100 text-violet-700',   'UPI'],
    cheque:        ['bg-gray-100 text-gray-700',       'Cheque'],
  };
  const [cls, label] = map[method] || ['bg-gray-100 text-gray-700', method];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>;
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="badge-gray">—</span>;
  const map: Record<string, [string, string]> = {
    paid:    ['bg-emerald-100 text-emerald-700', '✓ Paid'],
    pending: ['bg-amber-100 text-amber-700',     'Unpaid'],
    waived:  ['bg-gray-100 text-gray-600',       'Waived'],
  };
  const [cls, label] = map[status] || ['bg-gray-100 text-gray-700', status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{label}</span>;
}

// ── Date range presets ────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { value: 'all',       label: 'All Time' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month',label: 'This Month' },
  { value: '6_months',  label: 'Last 6 Months' },
  { value: '1_year',    label: 'Last 1 Year' },
  { value: 'prev_year', label: 'Previous Year' },
  { value: 'custom',    label: 'Custom Range' },
];

function getDateRange(preset: string): { from_date?: string; to_date?: string } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt   = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  switch (preset) {
    case 'yesterday': { const y = new Date(today); y.setDate(y.getDate() - 1); return { from_date: fmt(y), to_date: fmt(y) }; }
    case 'this_week': { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); return { from_date: fmt(d), to_date: fmt(today) }; }
    case 'this_month': return { from_date: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to_date: fmt(today) };
    case '6_months':  { const d = new Date(today); d.setMonth(d.getMonth() - 6); return { from_date: fmt(d), to_date: fmt(today) }; }
    case '1_year':    { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { from_date: fmt(d), to_date: fmt(today) }; }
    case 'prev_year': return { from_date: `${now.getFullYear() - 1}-01-01`, to_date: `${now.getFullYear() - 1}-12-31` };
    default: return {};
  }
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <div className="font-bold">₹{Number(payload[0].value).toLocaleString('en-IN')}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

// ── Payment Detail Drawer ─────────────────────────────────────────────────────

type DrawerCategory = 'all' | 'paid' | 'unpaid' | 'this_month' | 'last_month';

const CATEGORY_META: Record<DrawerCategory, { title: string; subtitle: string; accent: string; icon: any }> = {
  all:        { title: 'All Payable Installments', subtitle: 'Every installment in the selected range',  accent: 'gray',    icon: Wallet },
  paid:       { title: 'Collected Payments',       subtitle: 'Installments marked as paid',              accent: 'emerald', icon: CheckCircle2 },
  unpaid:     { title: 'Outstanding Payments',     subtitle: 'Pending installments still to be collected', accent: 'red',   icon: AlertCircle },
  this_month: { title: 'This Month Collections',   subtitle: 'Payments collected in the current calendar month', accent: 'blue',   icon: TrendingUp },
  last_month: { title: 'Last Month Collections',   subtitle: 'Payments collected during the previous calendar month', accent: 'indigo', icon: TrendingUp },
};

function PaymentDetailDrawer({
  category, payments, totalAmount, onClose,
}: {
  category: DrawerCategory;
  payments: any[];
  totalAmount: number;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter((p: any) =>
      p.candidate_name?.toLowerCase().includes(q) ||
      p.passport_no?.toLowerCase().includes(q) ||
      p.whatsapp_no?.includes(search.trim()) ||
      p.job_title?.toLowerCase().includes(q) ||
      p.company_name?.toLowerCase().includes(q)
    );
  }, [search, payments]);

  const accentMap: Record<string, { bg: string; text: string; border: string; icon: string; iconBg: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-100',     icon: 'text-red-600',     iconBg: 'bg-red-100' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',    icon: 'text-blue-600',    iconBg: 'bg-blue-100' },
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-100',  icon: 'text-indigo-600',  iconBg: 'bg-indigo-100' },
    gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    icon: 'text-gray-600',    iconBg: 'bg-gray-100' },
  };
  const a = accentMap[meta.accent];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-3xl bg-white shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${a.border} ${a.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${a.iconBg} flex items-center justify-center`}>
              <Icon size={20} className={a.icon} />
            </div>
            <div>
              <h2 className={`font-bold text-base ${a.text}`}>{meta.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{meta.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white text-gray-500"><X size={16} /></button>
        </div>

        {/* Summary strip */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Records</p>
              <p className="text-lg font-bold text-gray-800">{filtered.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Amount</p>
              <p className={`text-lg font-bold ${a.text}`}>{formatINR(totalAmount)}</p>
            </div>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate, passport, job…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input pl-9 text-sm w-72"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 px-4 py-4">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No payments to show</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p: any) => {
                const isPaid = p.status === 'paid';
                const displayDate = isPaid ? p.paid_date : (p.due_date ?? p.paid_date);
                const initial = (p.candidate_name ?? '?')[0]?.toUpperCase();
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border ${isPaid ? 'border-emerald-100' : 'border-amber-100'} p-4 hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {initial}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{p.candidate_name ?? '—'}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {p.job_title}{p.company_name && <span className="text-gray-300"> · {p.company_name}</span>}
                            </p>
                            {(p.passport_no || p.whatsapp_no) && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {[p.passport_no, p.whatsapp_no].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={p.status} />
                        </div>

                        {/* Detail grid */}
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Installment</p>
                            <p className="font-semibold text-gray-800 mt-0.5">#{p.installment_number ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Amount Due</p>
                            <p className="font-semibold text-gray-800 mt-0.5">{formatINR(p.amount_due)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Amount Paid</p>
                            <p className={`font-semibold mt-0.5 ${isPaid ? 'text-emerald-700' : 'text-gray-400'}`}>
                              {formatINR(p.amount_paid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                              {isPaid ? 'Balance' : 'Outstanding'}
                            </p>
                            <p className={`font-semibold mt-0.5 ${p.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {p.balance > 0 ? formatINR(p.balance) : '₹0'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                              {isPaid ? 'Paid Date' : 'Due Date'}
                            </p>
                            <p className="font-medium text-gray-700 mt-0.5">{formatDate(displayDate)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Method</p>
                            <div className="mt-0.5"><MethodBadge method={p.payment_method} /></div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Discount</p>
                            <p className="font-medium text-red-500 mt-0.5">
                              {p.fee_waiver_amount > 0 ? `−${formatINR(p.fee_waiver_amount)}` : <span className="text-gray-300">—</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Receipt</p>
                            <p className="font-medium text-gray-700 mt-0.5 truncate">{p.receipt_number || <span className="text-gray-300">—</span>}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FinanceOverview() {
  const [preset,     setPreset]     = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [drawer,     setDrawer]     = useState<DrawerCategory | null>(null);

  const dateParams = useMemo(() => {
    if (preset === 'custom') return { from_date: customFrom || undefined, to_date: customTo || undefined };
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading } = useGetFinanceOverviewQuery(dateParams, { refetchOnMountOrArgChange: true });

  const overview        = data?.overview || {};
  const recentPayments:    any[] = data?.recent_payments     || [];
  const thisMonthPayments: any[] = data?.this_month_payments || [];
  const lastMonthPayments: any[] = data?.last_month_payments || [];

  const totalPayable  = Number(overview.total_payable  ?? 0);
  const totalCollected= Number(overview.total_collected ?? 0);
  const totalUnpaid   = Number(overview.total_unpaid    ?? 0);
  const collectionPct = totalPayable > 0 ? Math.round((totalCollected / totalPayable) * 100) : 0;

  const chartData = [
    { name: 'Last Month', amount: overview.last_month_collected || 0 },
    { name: 'This Month', amount: overview.this_month_collected || 0 },
  ];

  // Filter payments by drawer category
  // this_month / last_month show ONLY paid records (matching the card's collected amount)
  const drawerPayments = useMemo(() => {
    if (!drawer) return [];
    if (drawer === 'paid')       return recentPayments.filter(p => p.status === 'paid');
    if (drawer === 'unpaid')     return recentPayments.filter(p => p.status !== 'paid' && p.status !== 'waived');
    if (drawer === 'this_month') return thisMonthPayments.filter(p => p.status === 'paid');
    if (drawer === 'last_month') return lastMonthPayments.filter(p => p.status === 'paid');
    return recentPayments;
  }, [drawer, recentPayments, thisMonthPayments, lastMonthPayments]);

  const drawerTotal = useMemo(() => {
    if (!drawer) return 0;
    if (drawer === 'paid' || drawer === 'this_month' || drawer === 'last_month')
      return drawerPayments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
    if (drawer === 'unpaid') return drawerPayments.reduce((s, p) => s + Number(p.balance || 0), 0);
    return drawerPayments.reduce((s, p) => s + Number(p.net_amount || 0), 0);
  }, [drawer, drawerPayments]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header + Date Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Click any card below to see the underlying payments</p>
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

      {/* Stat Cards — clickable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Total Payable */}
       <button
        type="button"
        onClick={() => setDrawer('all')}
        className="stat-card text-left hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5 transition-all cursor-pointer group w-full"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Collection</p>
          <span className="text-[10px] text-blue-500 font-bold group-hover:underline flex items-center gap-0.5">
            View installments <ChevronRight size={9} />
          </span>
        </div>
        <p className="text-2xl font-bold text-blue-600">{formatINR(totalCollected + totalUnpaid)}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Total Collected ({formatINR(totalCollected)}) + Total Unpaid ({formatINR(totalUnpaid)}) · changes with the filter above
        </p>
      </button>

        {/* Total Collected */}
        <button
          type="button"
          onClick={() => setDrawer('paid')}
          className="stat-card text-left hover:shadow-lg hover:border-emerald-300 hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalCollected)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                <span className="text-emerald-600 font-bold">{collectionPct}%</span> rate · <span className="text-blue-500 font-bold group-hover:underline">See paid <ChevronRight size={9} className="inline" /></span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${collectionPct}%` }} />
          </div>
        </button>

        {/* Total Unpaid */}
        <button
          type="button"
          onClick={() => setDrawer('unpaid')}
          className="stat-card text-left hover:shadow-lg hover:border-red-300 hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Unpaid</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatINR(totalUnpaid)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                Pending · <span className="text-blue-500 font-bold group-hover:underline">See unpaid <ChevronRight size={9} className="inline" /></span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
              <AlertCircle size={20} className="text-red-500" />
            </div>
          </div>
        </button>
      </div>

      {/* This Month vs Last Month — clickable */}
      {/* Total Collection — filter-driven (Total Collected + Total Unpaid) */}
      

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

      {/* Compact recent payments preview — first 8 records, encourages clicking cards */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Latest 8 payments · Click cards above to see full lists</p>
          </div>
          {recentPayments.length > 8 && (
            <button onClick={() => setDrawer('all')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View All ({recentPayments.length}) <ChevronRight size={11} />
            </button>
          )}
        </div>
        {recentPayments.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No payments in selected period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Candidate</th>
                  <th className="table-th">Job</th>
                  <th className="table-th">Inst.</th>
                  <th className="table-th">Amount Due</th>
                  <th className="table-th">Amount Paid</th>
                  <th className="table-th">Method</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.slice(0, 8).map((p: any, i: number) => {
                  const isPaid = p.status === 'paid';
                  const displayDate = isPaid ? p.paid_date : (p.due_date ?? p.paid_date);
                  return (
                    <tr key={p.id ?? i} className="hover:bg-blue-50/30 transition-colors">
                      <td className="table-td">
                        <div className="font-medium text-gray-800 text-sm">{p.candidate_name ?? '—'}</div>
                        {p.passport_no && <div className="text-[10px] text-gray-400">{p.passport_no}</div>}
                      </td>
                      <td className="table-td text-gray-500 text-xs">
                        <div>{p.job_title ?? '—'}</div>
                        {p.company_name && <div className="text-[10px] text-gray-300">{p.company_name}</div>}
                      </td>
                      <td className="table-td text-xs font-bold text-gray-500">#{p.installment_number ?? '—'}</td>
                      <td className="table-td font-semibold text-gray-700">{formatINR(p.amount_due)}</td>
                      <td className={`table-td font-semibold ${isPaid ? 'text-emerald-700' : 'text-gray-300'}`}>{formatINR(p.amount_paid)}</td>
                      <td className="table-td"><MethodBadge method={p.payment_method} /></td>
                      <td className="table-td text-gray-500 text-xs">{formatDate(displayDate)}</td>
                      <td className="table-td"><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {drawer && (
        <PaymentDetailDrawer
          category={drawer}
          payments={drawerPayments}
          totalAmount={drawerTotal}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
