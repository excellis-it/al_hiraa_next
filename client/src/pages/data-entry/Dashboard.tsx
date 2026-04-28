import { Link } from 'react-router';
import {
  Users, UserPlus, CalendarDays, AlertCircle, TrendingUp,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, ExternalLink,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useGetDashboardStatsQuery, useGetCandidatesQuery } from '../../store/api/candidatesApi';

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, iconBg, change, changePositive,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  change?: string;
  changePositive?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 ${iconBg} rounded-2xl flex items-center justify-center`}>
          {icon}
        </div>
        <button className="text-gray-300 hover:text-gray-500 transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-400 font-medium">{label}</div>
      {change && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${changePositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {changePositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {change}
          <span className="text-gray-400 font-normal ml-1">{sub || 'from last month'}</span>
        </div>
      )}
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-blue-600 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <div className="font-bold text-sm">{payload[0].value}</div>
      <div className="text-blue-200">{label}</div>
    </div>
  );
}

// ── Gauge Chart (semi-circle) ─────────────────────────────────────────────
function GaugeChart({ value }: { value: number }) {
  const radius = 80;
  const stroke = 16;
  const normalizedRadius = radius - stroke / 2;
  const circumference = Math.PI * normalizedRadius; // half circle
  const pct = Math.min(value / 100, 1);
  const offset = circumference - pct * circumference;

  // Segment colors for the decorative bars
  const segments = 12;
  const filled = Math.round(pct * segments);

  return (
    <div className="flex flex-col items-center">
      <svg width={radius * 2 + stroke} height={radius + stroke / 2 + 8} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${stroke / 2} ${radius + stroke / 2} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + stroke / 2} ${radius + stroke / 2}`}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        <path
          d={`M ${stroke / 2} ${radius + stroke / 2} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + stroke / 2} ${radius + stroke / 2}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        {/* Decorative tick marks */}
        {Array.from({ length: segments }).map((_, i) => {
          const angle = Math.PI * (i / (segments - 1));
          const cx = stroke / 2 + normalizedRadius - normalizedRadius * Math.cos(angle);
          const cy = radius + stroke / 2 - normalizedRadius * Math.sin(angle);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={3}
              fill={i < filled ? 'white' : 'transparent'}
              opacity={0.6}
            />
          );
        })}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        {/* Center text */}
        <text
          x={radius + stroke / 2}
          y={radius + stroke / 2 - 8}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill="#1E293B"
          fontSize={22}
          fontWeight={700}
        >
          {value.toFixed(1)}%
        </text>
        <text
          x={radius + stroke / 2}
          y={radius + stroke / 2 + 10}
          textAnchor="middle"
          fill="#94A3B8"
          fontSize={10}
        >
          Completion Rate
        </text>
      </svg>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DataEntryDashboard() {
  const { data: stats, isLoading } = useGetDashboardStatsQuery(undefined);
  const { data: recentData } = useGetCandidatesQuery({ page: 1, limit: 8 });

  const completionRate = stats
    ? Math.round(((stats.total - stats.incomplete) / Math.max(stats.total, 1)) * 100)
    : 0;

  const trendData = (stats?.trend || []).map((d: any) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const maxCount = Math.max(...trendData.map((d: any) => d.count), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Entry Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track and manage candidate registrations</p>
        </div>
        <Link to="/data-entry/register" className="btn-primary">
          <UserPlus size={16} />
          Register Candidate
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Candidates"
          value={stats?.total ?? 0}
          icon={<Users size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
          change="4.9%"
          changePositive={true}
        />
        <StatCard
          label="Registered Today"
          value={stats?.today ?? 0}
          icon={<CalendarDays size={20} className="text-violet-600" />}
          iconBg="bg-violet-50"
          change="2.7%"
          changePositive={true}
        />
        <StatCard
          label="This Week"
          value={stats?.this_week ?? 0}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          change="1.2%"
          changePositive={true}
        />
        <StatCard
          label="This Month"
          value={stats?.this_month ?? 0}
          icon={<UserPlus size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
          change="3.4%"
          changePositive={true}
        />
        <StatCard
          label="Incomplete Records"
          value={stats?.incomplete ?? 0}
          icon={<AlertCircle size={20} className="text-rose-500" />}
          iconBg="bg-rose-50"
          change="0.8%"
          changePositive={false}
          sub="needs follow-up"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Registration Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Daily registrations over the last 30 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                Registrations
              </span>
            </div>
          </div>

          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', radius: 6 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {trendData.map((entry: any, index: number) => (
                    <Cell
                      key={index}
                      fill={entry.count === maxCount ? '#2563EB' : '#DBEAFE'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-300">
              <TrendingUp size={32} strokeWidth={1} />
              <p className="text-sm mt-2">No data yet — register your first candidate</p>
            </div>
          )}
        </div>

        {/* Completion gauge */}
        <div className="card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Record Quality</h2>
              <p className="text-xs text-gray-400 mt-0.5">Complete vs incomplete</p>
            </div>
            <button className="text-gray-300 hover:text-gray-500">
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <GaugeChart value={completionRate} />
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500 font-medium">Complete</span>
                <span className="font-bold text-gray-900">{(stats?.total ?? 0) - (stats?.incomplete ?? 0)}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full">
                <div
                  className="h-1.5 bg-blue-600 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                <span className="text-gray-400">Incomplete</span>
              </div>
              <span className="font-bold text-gray-700">{stats?.incomplete ?? 0}</span>
            </div>

            {(stats?.incomplete ?? 0) > 0 && (
              <Link
                to="/data-entry/incomplete"
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <AlertCircle size={13} />
                View incomplete queue
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent candidates table */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Candidates</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest registrations</p>
          </div>
          <Link to="/data-entry/candidates" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all <ExternalLink size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Code</th>
                <th className="table-th">Candidate</th>
                <th className="table-th">WhatsApp</th>
                <th className="table-th">Trade</th>
                <th className="table-th">State</th>
                <th className="table-th">Status</th>
                <th className="table-th">Completion</th>
              </tr>
            </thead>
            <tbody>
              {recentData?.data?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="table-td">
                    <span className="text-blue-600 font-mono font-semibold text-xs">{c.candidate_code}</span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                        {c.full_name[0]}
                      </div>
                      <span className="font-medium text-gray-800">{c.full_name}</span>
                    </div>
                  </td>
                  <td className="table-td font-mono text-gray-500">{c.whatsapp_no}</td>
                  <td className="table-td text-gray-600">{c.position_1?.name || '—'}</td>
                  <td className="table-td text-gray-500">{c.state?.name || '—'}</td>
                  <td className="table-td">
                    <span className={
                      c.status === 'active' ? 'badge-green'
                      : c.status === 'deployed' ? 'badge-blue'
                      : c.status === 'blacklisted' ? 'badge-red'
                      : 'badge-gray'
                    }>
                      {c.status}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={c.completion_status === 'complete' ? 'badge-green' : 'badge-orange'}>
                      {c.completion_status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!recentData?.data || recentData.data.length === 0) && (
                <tr>
                  <td colSpan={7} className="table-td text-center py-12 text-gray-300">
                    <Users size={32} className="mx-auto mb-2" strokeWidth={1} />
                    <p className="text-sm">No candidates yet. Register your first one!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
