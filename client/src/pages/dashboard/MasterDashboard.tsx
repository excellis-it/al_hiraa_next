import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import {
  Users, Briefcase, AlertCircle, CalendarCheck,
  ArrowUpRight, ArrowDownRight, TrendingUp, ExternalLink,
  MoreHorizontal, FileCheck, Stethoscope, CreditCard, Plane,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useGetDashboardStatsQuery, useGetCandidatesQuery } from '../../store/api/candidatesApi';
import { useGetRecruiterDashboardQuery } from '../../store/api/jobsApi';
import { useGetStageSummaryQuery } from '../../store/api/processDetailsApi';
import { useGetInterviewEventsQuery } from '../../store/api/interviewEventsApi';
import type { RootState } from '../../store/store';

// ── Interview Calendar ──────────────────────────────────────────────────────
function InterviewCalendar({ events }: { events: any[] }) {
  const navigate = useNavigate();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map event dates to their events for this month
  const eventsByDate: Record<string, any[]> = {};
  for (const evt of events) {
    if (!evt.event_date) continue;
    const d = new Date(evt.event_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      if (!eventsByDate[key]) eventsByDate[key] = [];
      eventsByDate[key].push(evt);
    }
  }

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const hoverEvents = hoverDay ? eventsByDate[hoverDay] : null;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-bold text-gray-900">Interview Calendar</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100"><ChevronLeft size={14} /></button>
          <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
            {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100"><ChevronRight size={14} /></button>
        </div>
      </div>
      <div className="px-4 py-3">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-[10px] font-semibold text-gray-400 text-center py-1">{d}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateObj = new Date(year, month, day);
            const isToday = dateObj.getTime() === today.getTime();
            const dayEvents = eventsByDate[day];
            const hasEvents = dayEvents && dayEvents.length > 0;
            return (
              <div
                key={day}
                className={`relative text-center py-1.5 text-xs rounded-lg cursor-pointer transition-all ${
                  isToday ? 'bg-blue-600 text-white font-bold' :
                  hasEvents ? 'bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100' :
                  'text-gray-600 hover:bg-gray-50'
                }`}
                onMouseEnter={() => hasEvents && setHoverDay(day)}
                onMouseLeave={() => setHoverDay(null)}
                onClick={() => {
                  if (hasEvents) navigate(`/recruitment/interviews/${dayEvents[0].id}`);
                }}
              >
                {day}
                {hasEvents && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
              </div>
            );
          })}
        </div>
        {/* Hover tooltip */}
        {hoverDay && hoverEvents && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            {hoverEvents.map((evt: any) => (
              <Link key={evt.id} to={`/recruitment/interviews/${evt.id}`} className="flex items-center gap-2 text-xs hover:bg-gray-50 px-2 py-1.5 rounded-lg">
                <CalendarCheck size={12} className="text-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-gray-800">{evt.job?.company?.name || evt.job?.title}</span>
                <span className="text-gray-400 ml-auto">{evt.candidate_count || 0} candidates</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, iconBg, change, changePositive, sub, to,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  change?: string;
  changePositive?: boolean;
  sub?: string;
  to?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-2xl flex items-center justify-center`}>
          {icon}
        </div>
        {to ? (
          <span className="text-gray-300 group-hover:text-blue-600 transition-colors">
            <ArrowUpRight size={14} />
          </span>
        ) : (
          <span className="text-gray-300">
            <MoreHorizontal size={14} />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      {change && (
        <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${changePositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {changePositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {change}
          <span className="text-gray-400 font-normal ml-0.5">{sub || 'from last month'}</span>
        </div>
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="stat-card group block hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-blue-100 transition-all cursor-pointer"
      >
        {inner}
      </Link>
    );
  }

  return <div className="stat-card">{inner}</div>;
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

// ── Process Pipeline Visual ───────────────────────────────────────────────
const PROCESS_STAGES = [
  { key: 'selection',   label: 'Selection',   color: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700',   icon: FileCheck },
  { key: 'medical',     label: 'Medical',     color: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',  icon: Stethoscope },
  { key: 'visa',        label: 'Visa',        color: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700', icon: CreditCard },
  { key: 'collection',  label: 'Collection',  color: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', icon: CreditCard },
  { key: 'deployment',  label: 'Deployment',  color: 'bg-blue-900',    light: 'bg-slate-50',   text: 'text-slate-700',  icon: Plane },
];

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function MasterDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const role = user?.role ?? '';

  // Role visibility flags
  const canSeeDataEntry   = ['data_entry', 'manager', 'admin'].includes(role);
  const canSeeRecruitment = ['recruiter', 'manager', 'admin'].includes(role);
  const canSeeProcess     = ['process_manager', 'manager', 'admin'].includes(role);

  const { data: deStats, isLoading: deLoading } = useGetDashboardStatsQuery(undefined, { skip: !canSeeDataEntry });
  const { data: recStats, isLoading: recLoading } = useGetRecruiterDashboardQuery(undefined, { skip: !canSeeRecruitment });
  const { data: stageSummary, isLoading: stageLoading } = useGetStageSummaryQuery(undefined, { skip: !canSeeProcess });
  const { data: recentCandidates } = useGetCandidatesQuery({ page: 1, limit: 6 }, { skip: !canSeeDataEntry });
  const { data: upcomingEvents } = useGetInterviewEventsQuery({ limit: 100 }, { skip: !canSeeRecruitment });

  const isLoading = (canSeeDataEntry && deLoading) || (canSeeRecruitment && recLoading) || (canSeeProcess && stageLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const trendData = (deStats?.trend || []).map((d: any) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));
  const maxCount = Math.max(...trendData.map((d: any) => d.count), 1);

  const stageTotal = stageSummary?.total || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Overview of candidates, recruitment, and process pipeline</p>
      </div>

      {/* Top stat cards — role-filtered */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {canSeeDataEntry && (
          <>
            <StatCard
              label="Total Candidates"
              value={deStats?.total ?? 0}
              icon={<Users size={18} className="text-blue-600" />}
              iconBg="bg-blue-50"
              to="/data-entry/candidates"
            />
            <StatCard
              label="Incomplete Records"
              value={deStats?.incomplete ?? 0}
              icon={<AlertCircle size={18} className="text-rose-500" />}
              iconBg="bg-rose-50"
              sub="needs follow-up"
              to="/data-entry/incomplete"
            />
          </>
        )}
        {canSeeRecruitment && (
          <>
            <StatCard
              label="Open Jobs"
              value={recStats?.open_jobs ?? 0}
              icon={<Briefcase size={18} className="text-blue-600" />}
              iconBg="bg-blue-50"
              to="/recruitment/interviews"
            />
            <StatCard
              label="Lined Up"
              value={recStats?.lined_up_total ?? 0}
              icon={<Users size={18} className="text-violet-600" />}
              iconBg="bg-violet-50"
              to="/recruitment/pipeline"
            />
            <StatCard
              label="Interviews This Week"
              value={recStats?.interviews_this_week ?? 0}
              icon={<CalendarCheck size={18} className="text-emerald-600" />}
              iconBg="bg-emerald-50"
              to="/recruitment/interviews"
            />
          </>
        )}
        {canSeeProcess && (
          <StatCard
            label="In Process"
            value={stageTotal}
            icon={<FileCheck size={18} className="text-amber-600" />}
            iconBg="bg-amber-50"
            to="/process-module"
          />
        )}
      </div>

      {/* Middle row: Registration Trend + Process Pipeline */}
      {(canSeeDataEntry || canSeeProcess) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Registration trend */}
          {canSeeDataEntry && (
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Registration Trend</h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">Daily registrations — last 30 days</p>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className="w-2 h-2 rounded-sm bg-blue-600 inline-block" />
                  Registrations
                </span>
              </div>

              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', radius: 6 }} />
                    <Bar
                      dataKey="count"
                      radius={[5, 5, 0, 0]}
                      cursor="pointer"
                      onClick={(payload: any) => {
                        if (payload?.date) {
                          const day = new Date(payload.date).toISOString().slice(0, 10);
                          navigate(`/data-entry/candidates?date_from=${day}&date_to=${day}`);
                        }
                      }}
                    >
                      {trendData.map((entry: any, index: number) => (
                        <Cell key={index} fill={entry.count === maxCount ? '#2563EB' : '#DBEAFE'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-gray-300">
                  <TrendingUp size={28} strokeWidth={1} />
                  <p className="text-xs mt-2">No data yet</p>
                </div>
              )}
            </div>
          )}

          {/* Process pipeline summary */}
          {canSeeProcess && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Process Pipeline</h2>
                <Link to="/process-module" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                  View all <ExternalLink size={10} />
                </Link>
              </div>

              {stageTotal > 0 ? (
                <div className="space-y-3">
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {PROCESS_STAGES.map((s) => {
                      const count = (stageSummary as any)?.[s.key] || 0;
                      const pct = stageTotal > 0 ? (count / stageTotal) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={s.key}
                          className={`${s.color} transition-all`}
                          style={{ width: `${pct}%` }}
                          title={`${s.label}: ${count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="space-y-1">
                    {PROCESS_STAGES.map((s) => {
                      const count = (stageSummary as any)?.[s.key] || 0;
                      return (
                        <Link
                          key={s.key}
                          to={`/process-module?stage=${s.key}`}
                          className="flex items-center justify-between px-2 py-1.5 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${s.color}`} />
                            <span className="text-xs text-gray-500 group-hover:text-gray-900">{s.label}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-700 group-hover:text-blue-600">{count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-300">
                  <FileCheck size={28} strokeWidth={1} className="mx-auto mb-2" />
                  <p className="text-xs">No process records yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom row: Upcoming Interviews + Recent Candidates */}
      {(canSeeRecruitment || canSeeDataEntry) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Interview Calendar */}
          {canSeeRecruitment && (
            <InterviewCalendar events={upcomingEvents?.data ?? []} />
          )}

          {/* Recent Candidates */}
          {canSeeDataEntry && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-bold text-gray-900">Recent Candidates</h2>
                <Link to="/data-entry/candidates" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                  View all <ExternalLink size={10} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Code</th>
                      <th className="table-th">Candidate</th>
                      <th className="table-th">Trade</th>
                      <th className="table-th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCandidates?.data?.map((c: any) => (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/data-entry/candidates/${c.id}/edit`)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="table-td">
                          <span className="text-blue-600 font-mono font-semibold text-[10px]">{c.candidate_code}</span>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold flex-shrink-0">
                              {c.full_name[0]}
                            </div>
                            <span className="font-medium text-gray-800 text-xs hover:text-blue-700">{c.full_name}</span>
                          </div>
                        </td>
                        <td className="table-td text-xs text-gray-600">{c.position_1?.name || '—'}</td>
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
                      </tr>
                    ))}
                    {(!recentCandidates?.data || recentCandidates.data.length === 0) && (
                      <tr>
                        <td colSpan={4} className="table-td text-center py-12 text-gray-300">
                          <Users size={28} className="mx-auto mb-2" strokeWidth={1} />
                          <p className="text-xs">No candidates yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
