import { Link } from 'react-router';
import { Briefcase, Users, Phone, CalendarCheck } from 'lucide-react';
import { useGetRecruiterDashboardQuery } from '../../store/api/jobsApi';

const PIPELINE_STATUSES = [
  { key: 'not_contacted', label: 'Not Contacted', color: 'bg-gray-300' },
  { key: 'contacted_interested', label: 'Interested', color: 'bg-blue-400' },
  { key: 'contacted_not_interested', label: 'Not Interested', color: 'bg-red-400' },
  { key: 'contacted_not_reachable', label: 'Not Reachable', color: 'bg-gray-400' },
  { key: 'contacted_maybe_later', label: 'Maybe Later', color: 'bg-amber-400' },
  { key: 'lined_up', label: 'Lined Up', color: 'bg-violet-500' },
  { key: 'interview_selected', label: 'Selected', color: 'bg-emerald-500' },
  { key: 'interview_rejected', label: 'Rejected', color: 'bg-red-500' },
  { key: 'interview_on_hold', label: 'On Hold', color: 'bg-amber-500' },
];

const PRIORITY_BADGE: Record<string, string> = {
  high: 'badge-red',
  medium: 'badge-orange',
  low: 'badge-gray',
};

export default function RecruiterDashboard() {
  const { data, isLoading } = useGetRecruiterDashboardQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data || {};
  const pipelineBreakdown = data?.pipeline_by_status || {};
  const topJobs = data?.top_open_jobs || [];

  const totalPipeline = PIPELINE_STATUSES.reduce((sum, s) => sum + (pipelineBreakdown[s.key] || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recruitment Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Overview of jobs, pipeline, and activity</p>
        </div>
        <Link to="/recruitment/jobs?new=1" className="btn-primary">
          <Briefcase size={16} />
          Create Job Order
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Open Jobs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.open_jobs ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Briefcase size={22} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lined Up Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.lined_up_total ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Users size={22} className="text-violet-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Follow-ups Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.follow_ups_today ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Phone size={22} className="text-amber-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Interviews This Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.interviews_this_week ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CalendarCheck size={22} className="text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Breakdown */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Status Breakdown</h2>
        {totalPipeline > 0 ? (
          <>
            {/* Bar */}
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-4">
              {PIPELINE_STATUSES.map((s) => {
                const count = pipelineBreakdown[s.key] || 0;
                const pct = totalPipeline > 0 ? (count / totalPipeline) * 100 : 0;
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
            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {PIPELINE_STATUSES.map((s) => {
                const count = pipelineBreakdown[s.key] || 0;
                if (count === 0) return null;
                return (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className="text-xs font-bold text-gray-700">{count}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No pipeline data yet</p>
        )}
      </div>

      {/* Top Open Jobs */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Top Open Job Orders</h2>
        </div>
        {topJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Job Title</th>
                  <th className="table-th">Company</th>
                  <th className="table-th">Trade</th>
                  <th className="table-th">Priority</th>
                  <th className="table-th">Required</th>
                  <th className="table-th">Lined Up</th>
                  <th className="table-th">Progress</th>
                </tr>
              </thead>
              <tbody>
                {topJobs.map((job: any) => {
                  const lined = job.lined_up_count ?? 0;
                  const required = job.positions_required ?? 1;
                  const pct = Math.min(100, Math.round((lined / required) * 100));
                  return (
                    <tr key={job.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="table-td font-semibold text-gray-800">{job.title}</td>
                      <td className="table-td text-gray-500">{job.company_name ?? '—'}</td>
                      <td className="table-td">
                        {job.trade_name
                          ? <span className="badge-blue">{job.trade_name}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                      </td>
                      <td className="table-td">
                        <span className={PRIORITY_BADGE[job.priority] ?? 'badge-gray'}>
                          {job.priority ? job.priority.charAt(0).toUpperCase() + job.priority.slice(1) : '—'}
                        </span>
                      </td>
                      <td className="table-td font-mono text-sm text-gray-700">{required}</td>
                      <td className="table-td font-mono text-sm text-gray-700">{lined}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Briefcase size={36} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
            <p className="text-sm text-gray-400">No open job orders</p>
          </div>
        )}
      </div>
    </div>
  );
}
