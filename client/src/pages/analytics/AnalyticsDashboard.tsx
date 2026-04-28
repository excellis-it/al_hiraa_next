import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import {
  useGetAnalyticsOverviewQuery,
  useGetPipelineVelocityQuery,
  useGetSourcePerformanceQuery,
  useGetDropoutAnalysisQuery,
  useGetDeploymentSpeedQuery,
} from '../../store/api/analyticsApi';

type Tab = 'overview' | 'pipeline' | 'sources' | 'dropouts' | 'revenue' | 'timelogs';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'sources', label: 'Sources' },
  { key: 'dropouts', label: 'Dropouts' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'timelogs', label: 'Time Logs' },
];

const FUNNEL_STEPS = [
  { key: 'registered', label: 'Registered', color: 'bg-blue-500' },
  { key: 'pipeline', label: 'Pipeline', color: 'bg-violet-500' },
  { key: 'lined_up', label: 'Lined Up', color: 'bg-amber-500' },
  { key: 'selected', label: 'Selected', color: 'bg-emerald-500' },
  { key: 'deployed', label: 'Deployed', color: 'bg-green-600' },
];

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function OverviewTab() {
  const { data: overviewData, isLoading: loadingOverview } = useGetAnalyticsOverviewQuery();
  const { data: speedData, isLoading: loadingSpeed } = useGetDeploymentSpeedQuery();

  if (loadingOverview || loadingSpeed) return <LoadingSpinner />;

  const funnel = overviewData?.funnel || {};
  const stepDurations: any[] = speedData?.step_durations || speedData?.steps || [];
  const maxCount = Math.max(1, ...FUNNEL_STEPS.map((s) => funnel[s.key] ?? 0));

  return (
    <div className="space-y-5">
      {/* Deployment Funnel */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-5">Deployment Funnel</h3>
        {FUNNEL_STEPS.some((s) => funnel[s.key]) ? (
          <div className="space-y-3">
            {FUNNEL_STEPS.map((step) => {
              const count = funnel[step.key] ?? 0;
              const pct = maxCount > 0 ? Math.max(4, Math.round((count / maxCount) * 100)) : 4;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-semibold text-gray-500 text-right flex-shrink-0">
                    {step.label}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className={`${step.color} h-8 rounded-lg transition-all flex items-center px-3`}
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-white text-xs font-bold">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No funnel data available</p>
        )}
      </div>

      {/* Step Durations */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Average Step Durations</h3>
        </div>
        {stepDurations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Step</th>
                  <th className="table-th">Avg Days</th>
                  <th className="table-th">Indicator</th>
                </tr>
              </thead>
              <tbody>
                {stepDurations.map((step: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium text-gray-800">{step.step_name ?? step.name ?? '—'}</td>
                    <td className="table-td font-mono text-sm text-gray-700">
                      {step.avg_days != null ? `${Number(step.avg_days).toFixed(1)} days` : '—'}
                    </td>
                    <td className="table-td">
                      {step.avg_days != null && Number(step.avg_days) > 7 ? (
                        <span className="badge-red">Bottleneck</span>
                      ) : (
                        <span className="badge-green">On Track</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">No duration data available</div>
        )}
      </div>
    </div>
  );
}

function PipelineTab() {
  const { data, isLoading } = useGetPipelineVelocityQuery();

  if (isLoading) return <LoadingSpinner />;

  const weeklyTrend: any[] = data?.weekly_registrations || data?.weekly_trend || [];
  const byTrade: any[] = data?.by_trade || [];

  return (
    <div className="space-y-5">
      {/* 8-Week Registration Trend */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">8-Week Registration Trend</h3>
        {weeklyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
                cursor={{ fill: '#eff6ff' }}
              />
              <Bar dataKey="count" name="Registrations" radius={[6, 6, 0, 0]}>
                {weeklyTrend.map((_: any, index: number) => (
                  <Cell key={index} fill={index === weeklyTrend.length - 1 ? '#2563eb' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No weekly trend data available</p>
        )}
      </div>

      {/* By Trade */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">By Trade</h3>
        </div>
        {byTrade.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Trade</th>
                  <th className="table-th">Candidates</th>
                  <th className="table-th">Avg Days to Selection</th>
                </tr>
              </thead>
              <tbody>
                {byTrade.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <span className="badge-blue">{t.trade_name ?? t.name ?? '—'}</span>
                    </td>
                    <td className="table-td font-mono text-sm text-gray-700">{t.count ?? 0}</td>
                    <td className="table-td font-mono text-sm text-gray-700">
                      {t.avg_days_to_selection != null
                        ? `${Number(t.avg_days_to_selection).toFixed(1)} days`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">No trade data available</div>
        )}
      </div>
    </div>
  );
}

function SourcesTab() {
  const { data, isLoading } = useGetSourcePerformanceQuery();

  if (isLoading) return <LoadingSpinner />;

  const sources: any[] = [...(data?.sources || data || [])].sort(
    (a: any, b: any) => (b.conversion_rate ?? 0) - (a.conversion_rate ?? 0),
  );

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Source Performance</h3>
        <p className="text-xs text-gray-400 mt-0.5">Sorted by conversion rate (highest first)</p>
      </div>
      {sources.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Source Name</th>
                <th className="table-th">Total Candidates</th>
                <th className="table-th">Lined Up</th>
                <th className="table-th">Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s: any, i: number) => {
                const rate = s.conversion_rate ?? 0;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium text-gray-800">{s.source_name ?? s.name ?? '—'}</td>
                    <td className="table-td font-mono text-sm text-gray-700">{s.total_candidates ?? 0}</td>
                    <td className="table-td font-mono text-sm text-gray-700">{s.lined_up ?? 0}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rate >= 50 ? 'bg-emerald-500' : rate >= 25 ? 'bg-blue-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, rate)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 w-10 text-right">
                          {Number(rate).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-gray-400">No source performance data available</div>
      )}
    </div>
  );
}

function DropoutsTab() {
  const { data, isLoading } = useGetDropoutAnalysisQuery();

  if (isLoading) return <LoadingSpinner />;

  const byReason: any[] = data?.by_reason || [];
  const byStage: any[] = data?.by_stage || [];
  const monthlyTrend: any[] = data?.monthly_trend || [];

  return (
    <div className="space-y-5">
      {/* By Reason — horizontal bar chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Dropouts by Reason</h3>
        {byReason.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(160, byReason.length * 40)}>
            <BarChart
              data={byReason}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="reason"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
                cursor={{ fill: '#fff7ed' }}
              />
              <Bar dataKey="count" name="Dropouts" fill="#f97316" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No dropout reason data available</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* By Stage */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Dropouts by Stage</h3>
          </div>
          {byStage.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Stage</th>
                  <th className="table-th">Count</th>
                </tr>
              </thead>
              <tbody>
                {byStage.map((s: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium text-gray-800">{s.stage ?? '—'}</td>
                    <td className="table-td">
                      <span className="badge-red">{s.count ?? 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">No stage data available</div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trend (Last 6 Months)</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Dropouts"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No monthly data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics &amp; Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          as of today &mdash;{' '}
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Tabs */}
      <div className="card p-1 flex gap-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'pipeline' && <PipelineTab />}
      {activeTab === 'sources' && <SourcesTab />}
      {activeTab === 'dropouts' && <DropoutsTab />}
      {activeTab === 'revenue' && <RevenueTab />}
      {activeTab === 'timelogs' && <TimeLogsTab />}
    </div>
  );
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────
function RevenueTab() {
  const { data, isLoading } = useGetAnalyticsOverviewQuery();
  if (isLoading) return <LoadingSpinner />;
  const funnel = data?.funnel || {};
  const deployed = funnel.deployed || 0;
  const processStarted = funnel.process_started || 0;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Overview</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-[10px] uppercase text-emerald-600 font-semibold">Deployed Candidates</p>
            <p className="text-3xl font-bold text-emerald-700 mt-1">{deployed}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-[10px] uppercase text-blue-600 font-semibold">In Process</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{processStarted}</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-4 text-center">
            <p className="text-[10px] uppercase text-violet-600 font-semibold">Conversion Rate</p>
            <p className="text-3xl font-bold text-violet-700 mt-1">
              {processStarted > 0 ? `${Math.round((deployed / processStarted) * 100)}%` : '—'}
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4">
          <p className="font-semibold text-gray-600 mb-2">Revenue Insights</p>
          <ul className="space-y-1 text-gray-500">
            <li>• {deployed} candidates successfully deployed from {processStarted} in process</li>
            <li>• Average deployment conversion: {processStarted > 0 ? `${Math.round((deployed / processStarted) * 100)}%` : 'N/A'}</li>
            <li>• Revenue per deployed candidate is based on service fee collected per job</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Time Logs Tab ─────────────────────────────────────────────────────────────
function TimeLogsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <span className="text-2xl">🕐</span>
      </div>
      <h3 className="text-sm font-bold text-gray-700 mb-1">User Activity Logs — Coming Soon</h3>
      <p className="text-xs text-gray-400 max-w-xs mb-4">
        Per-user action counts, login sessions, and active hours will be surfaced here once aggregated from the audit log.
      </p>
      <a href="/admin/audit-log" className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100">
        View Audit Log →
      </a>
    </div>
  );
}
