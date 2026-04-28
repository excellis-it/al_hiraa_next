import { useState } from 'react';
import { Plane, Search, Filter, ChevronDown, AlertTriangle, CheckCircle2, XCircle, Clock, Building2, Plus, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetDeploymentsQuery, useGetDeploymentsSummaryQuery, useUpdateDeploymentMutation } from '../../store/api/deploymentsApi';
import { useGetCompaniesQuery } from '../../store/api/companiesApi';
import DeploymentForm from './DeploymentForm';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  terminated: 'bg-red-100 text-red-700',
  extended: 'bg-violet-100 text-violet-700',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <CheckCircle2 size={12} />,
  completed: <CheckCircle2 size={12} />,
  terminated: <XCircle size={12} />,
  extended: <Clock size={12} />,
};

function DaysChip({ days }: { days: number }) {
  if (days < 0) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>;
  if (days <= 30) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days}d left</span>;
  if (days <= 90) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{days}d left</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{days}d left</span>;
}

export default function DeployedCandidates() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [showExpiring, setShowExpiring] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [datePreset, setDatePreset] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const getDateFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fmt = (d: Date) => d.toISOString().substring(0, 10);
    switch (datePreset) {
      case 'this_month': return { from_date: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to_date: fmt(today) };
      case 'last_month': return { from_date: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to_date: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
      case '3_months': { const d = new Date(today); d.setMonth(d.getMonth() - 3); return { from_date: fmt(d), to_date: fmt(today) }; }
      case 'last_year': { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { from_date: fmt(d), to_date: fmt(today) }; }
      case 'custom': return { from_date: customFrom || undefined, to_date: customTo || undefined };
      default: return {};
    }
  };

  const dateFilter = getDateFilter();

  const { data, isLoading, refetch } = useGetDeploymentsQuery({
    page,
    limit: 20,
    search: search || undefined,
    status: filterStatus || undefined,
    company_id: filterCompanyId ? +filterCompanyId : undefined,
    expiring_days: showExpiring ? 30 : undefined,
    ...dateFilter,
  } as any);

  const { data: summary } = useGetDeploymentsSummaryQuery(undefined);
  const { data: companiesData } = useGetCompaniesQuery({ limit: 100 } as any);
  const [updateDeployment] = useUpdateDeploymentMutation();

  const rows: any[] = data?.data || [];
  const meta = data?.meta;

  const handleStatusChange = async (id: number, status: string) => {
    await updateDeployment({ id, status });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Deployed Candidates</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track active deployments and contract terms</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={datePreset} onChange={e => { setDatePreset(e.target.value); setPage(1); }}>
            <option value="">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="3_months">3 Months</option>
            <option value="last_year">Last Year</option>
            <option value="custom">Custom</option>
          </Select>
          {datePreset === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-2 py-2 bg-gray-50" />
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-2 py-2 bg-gray-50" />
            </>
          )}
          <button onClick={() => {
            const exportRows = rows.map(d => ({
              Candidate: d.candidate?.full_name, Passport: d.candidate?.passport_no, Company: d.company?.name,
              Position: d.position?.name, Country: d.country, 'Deployed': d.deployment_date?.substring(0, 10),
              'Contract End': d.contract_end_date?.substring(0, 10), Salary: d.salary_amount, Status: d.status,
            }));
            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Deployed');
            XLSX.writeFile(wb, `deployed-${new Date().toISOString().substring(0, 10)}.xlsx`);
          }} disabled={rows.length === 0} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl hover:bg-emerald-100 disabled:opacity-40">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={() => window.print()} disabled={rows.length === 0} className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-2 rounded-xl hover:bg-blue-100 disabled:opacity-40">
            <FileText size={13} /> PDF
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Add Deployment
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{summary?.active ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Plane size={22} className="text-emerald-600" />
            </div>
          </div>
        </div>
        <div
          className={`stat-card cursor-pointer transition-all ${showExpiring ? 'ring-2 ring-amber-400' : ''}`}
          onClick={() => setShowExpiring(v => !v)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expiring Soon</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{summary?.expiring_soon ?? 0}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">within 30 days</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-amber-500" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{summary?.completed ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Terminated</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{summary?.terminated ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <XCircle size={22} className="text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search candidate name, passport..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
            <option value="extended">Extended</option>
          </Select>
          <Select value={filterCompanyId} onChange={(e) => { setFilterCompanyId(e.target.value); setPage(1); }}>
            <option value="">All Companies</option>
            {companiesData?.data?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          {showExpiring && (
            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg font-medium">
              <AlertTriangle size={11} /> Expiring in 30 days
              <button onClick={() => setShowExpiring(false)} className="ml-1 hover:text-amber-900">×</button>
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Candidate</th>
                  <th className="table-th">Company</th>
                  <th className="table-th">Position</th>
                  <th className="table-th">Country</th>
                  <th className="table-th">Deployed</th>
                  <th className="table-th">Contract End</th>
                  <th className="table-th">Remaining</th>
                  <th className="table-th">Salary</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((dep: any, idx: number) => (
                  <tr key={dep.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="table-td text-gray-400 text-xs">{(page - 1) * 20 + idx + 1}</td>
                    <td className="table-td">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{dep.candidate?.full_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{dep.candidate?.passport_no || dep.visa_number || '—'}</p>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{dep.company?.name}</span>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="badge-blue">{dep.position?.name}</span>
                    </td>
                    <td className="table-td text-sm text-gray-600 capitalize">{dep.country?.replace(/_/g, ' ')}</td>
                    <td className="table-td text-xs text-gray-500">
                      {dep.deployment_date ? new Date(dep.deployment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="table-td text-xs text-gray-500">
                      {dep.contract_end_date ? new Date(dep.contract_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="table-td">
                      {dep.status === 'active' ? <DaysChip days={dep.days_remaining} /> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="table-td font-mono text-sm text-gray-700">
                      {dep.salary_amount} <span className="text-xs text-gray-400">{dep.salary_currency}</span>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${STATUS_COLORS[dep.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_ICONS[dep.status]}
                        {dep.status}
                      </span>
                    </td>
                    <td className="table-td">
                      {dep.status === 'active' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStatusChange(dep.id, 'extended')}
                            className="text-[10px] font-medium px-2 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                          >
                            Extend
                          </button>
                          <button
                            onClick={() => handleStatusChange(dep.id, 'completed')}
                            className="text-[10px] font-medium px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleStatusChange(dep.id, 'terminated')}
                            className="text-[10px] font-medium px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Terminate
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="table-td text-center py-16">
                      <Plane size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
                      <p className="text-sm text-gray-400 font-medium">No deployed candidates</p>
                      <p className="text-xs text-gray-300 mt-1">Candidates will appear here when deployed</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deployment form modal */}
      {showForm && (
        <DeploymentForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}
