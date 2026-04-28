import { useState, useCallback } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Edit2, Plus, X, Search, Phone, CalendarClock, CheckSquare, Square, MapPin, DollarSign, Banknote } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetJobQuery, useUpdateJobMutation } from '../../store/api/jobsApi';
import { useGetPipelineQuery, useAddToPipelineMutation, useUpdatePipelineStatusMutation } from '../../store/api/pipelineApi';
import { useCreateCallLogMutation } from '../../store/api/callLogsApi';
import { useGetCandidatesQuery } from '../../store/api/candidatesApi';
import toast from 'react-hot-toast';
import { useGetCompaniesQuery } from '../../store/api/companiesApi';
import { useGetTradesQuery } from '../../store/api/mastersApi';

const COUNTRY_LABELS: Record<string, string> = {
  saudi_arabia: 'Saudi Arabia', uae: 'UAE', qatar: 'Qatar',
  kuwait: 'Kuwait', bahrain: 'Bahrain', oman: 'Oman',
};
const COUNTRY_CURRENCY: Record<string, string> = {
  saudi_arabia: 'SAR', uae: 'AED', qatar: 'QAR',
  kuwait: 'KWD', bahrain: 'BHD', oman: 'OMR',
};

const INTEREST_STATUSES = [
  { value: 'not_contacted', label: 'Not Contacted', badge: 'badge-gray' },
  { value: 'contacted_interested', label: 'Interested', badge: 'badge-blue' },
  { value: 'contacted_not_interested', label: 'Not Interested', badge: 'badge-red' },
  { value: 'contacted_not_reachable', label: 'Not Reachable', badge: 'badge-gray' },
  { value: 'contacted_maybe_later', label: 'Maybe Later', badge: 'badge-orange' },
  { value: 'lined_up', label: 'Lined Up', badge: 'bg-violet-100 text-violet-700 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold' },
  { value: 'interview_selected', label: 'Selected', badge: 'badge-green' },
  { value: 'interview_rejected', label: 'Rejected', badge: 'badge-red' },
  { value: 'interview_on_hold', label: 'On Hold', badge: 'badge-orange' },
];

const CALL_OUTCOMES = [
  { value: 'reached_interested', label: 'Reached — Interested' },
  { value: 'reached_not_interested', label: 'Reached — Not Interested' },
  { value: 'reached_maybe_later', label: 'Reached — Maybe Later' },
  { value: 'not_reachable', label: 'Not Reachable' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'wrong_number', label: 'Wrong Number' },
];

const JOB_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'interviews_scheduled', label: 'Interviews Scheduled' },
  { value: 'in_process', label: 'In Process' },
  { value: 'closed', label: 'Closed' },
  { value: 'on_hold', label: 'On Hold' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function getStatusInfo(value: string) {
  return INTEREST_STATUSES.find((s) => s.value === value) || { label: value, badge: 'badge-gray' };
}

function jobStatusBadge(status: string) {
  switch (status) {
    case 'open': return 'badge-green';
    case 'interviews_scheduled': return 'badge-blue';
    case 'in_process': return 'bg-violet-100 text-violet-700 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';
    case 'closed': return 'badge-gray';
    case 'on_hold': return 'badge-orange';
    default: return 'badge-gray';
  }
}

function priorityBadge(p: string) {
  switch (p) {
    case 'high': return 'badge-red';
    case 'medium': return 'badge-orange';
    default: return 'badge-gray';
  }
}

const EMPTY_JOB_FORM = {
  company_id: '',
  trade_id: '',
  title: '',
  positions_required: '',
  salary_min: '',
  salary_max: '',
  service_fee: '',
  country: '',
  city: '',
  priority: 'medium',
  status: 'open',
  interview_date_start: '',
  interview_date_end: '',
  description: '',
  requirements: '',
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);

  const { data: job, isLoading: jobLoading } = useGetJobQuery(jobId);
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState('');
  const [pipelineSearch, setPipelineSearch] = useState('');

  const { data: pipelineData, isLoading: pipelineLoading } = useGetPipelineQuery({
    job_id: jobId,
    status: pipelineStatusFilter || undefined,
    limit: 100,
  });

  const [updateJob, { isLoading: updatingJob }] = useUpdateJobMutation();
  const [addToPipeline, { isLoading: addingToPipeline }] = useAddToPipelineMutation();
  const [updatePipelineStatus, { isLoading: updatingStatus }] = useUpdatePipelineStatusMutation();
  const [createCallLog, { isLoading: loggingCall }] = useCreateCallLogMutation();

  const { data: companiesData } = useGetCompaniesQuery({ limit: 200 });
  const { data: tradesData } = useGetTradesQuery(true);

  // Edit job modal
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [jobForm, setJobForm] = useState<any>(EMPTY_JOB_FORM);
  const [jobFormError, setJobFormError] = useState('');

  // Add candidate modal
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const { data: candidatesData, isFetching: candidatesFetching } = useGetCandidatesQuery(
    { search: candidateSearch || undefined, limit: 20 },
    { skip: !addCandidateOpen }
  );

  // Pipeline selection
  const [selectedPipeline, setSelectedPipeline] = useState<Set<number>>(new Set());

  // Update pipeline modal
  const [updateEntry, setUpdateEntry] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '', follow_up_date: '' });
  const [callForm, setCallForm] = useState({ outcome: '', notes: '', follow_up_date: '' });
  const [updateError, setUpdateError] = useState('');

  function openEditJob() {
    if (!job) return;
    setJobForm({
      company_id: job.company_id || '',
      trade_id: job.trade_id || '',
      title: job.title || '',
      positions_required: job.positions_required || '',
      salary_min: job.salary_min || '',
      salary_max: job.salary_max || '',
      service_fee: job.service_fee || '',
      country: job.country || '',
      city: job.city || '',
      priority: job.priority || 'medium',
      status: job.status || 'open',
      interview_date_start: job.interview_date_start ? job.interview_date_start.split('T')[0] : '',
      interview_date_end: job.interview_date_end ? job.interview_date_end.split('T')[0] : '',
      description: job.description || '',
      requirements: job.requirements || '',
    });
    setJobFormError('');
    setEditJobOpen(true);
  }

  async function handleJobSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobForm.title.trim()) { setJobFormError('Title is required.'); return; }
    try {
      await updateJob({
        id: jobId,
        ...jobForm,
        company_id: jobForm.company_id ? Number(jobForm.company_id) : undefined,
        trade_id: jobForm.trade_id ? Number(jobForm.trade_id) : undefined,
        positions_required: Number(jobForm.positions_required),
        salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : undefined,
        salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : undefined,
        service_fee: jobForm.service_fee ? Number(jobForm.service_fee) : undefined,
        interview_date_start: jobForm.interview_date_start || undefined,
        interview_date_end: jobForm.interview_date_end || undefined,
      }).unwrap();
      toast.success('Job updated successfully');
      setEditJobOpen(false);
    } catch (err: any) {
      setJobFormError(err?.data?.message || 'Something went wrong.');
    }
  }

  async function handleAddCandidate(candidateId: number) {
    try {
      await addToPipeline({ candidate_id: candidateId, job_id: jobId }).unwrap();
      toast.success('Candidate added to pipeline');
    } catch {
      toast.error('Candidate is already in this pipeline');
    }
  }

  function openUpdateEntry(entry: any) {
    setUpdateEntry(entry);
    setUpdateForm({ status: entry.status || '', notes: '', follow_up_date: entry.follow_up_date ? entry.follow_up_date.split('T')[0] : '' });
    setCallForm({ outcome: '', notes: '', follow_up_date: '' });
    setUpdateError('');
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!updateForm.status) { setUpdateError('Select a status.'); return; }
    try {
      await updatePipelineStatus({ id: updateEntry.id, ...updateForm }).unwrap();
      setUpdateEntry(null);
    } catch (err: any) {
      setUpdateError(err?.data?.message || 'Something went wrong.');
    }
  }

  async function handleLogCall(e: React.FormEvent) {
    e.preventDefault();
    if (!callForm.outcome) { setUpdateError('Select a call outcome.'); return; }
    try {
      await createCallLog({
        candidate_job_id: updateEntry.id,
        outcome: callForm.outcome,
        notes: callForm.notes || undefined,
        follow_up_date: callForm.follow_up_date || undefined,
      }).unwrap();
      setUpdateEntry(null);
    } catch (err: any) {
      setUpdateError(err?.data?.message || 'Something went wrong.');
    }
  }

  const filteredPipeline = (pipelineData?.data || []).filter((entry: any) => {
    if (!pipelineSearch) return true;
    const name = entry.candidate?.full_name?.toLowerCase() || '';
    const code = entry.candidate?.candidate_code?.toLowerCase() || '';
    const q = pipelineSearch.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const today = new Date().toISOString().split('T')[0];

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Job not found.</p>
        <Link to="/recruitment/interviews" className="text-blue-600 text-sm mt-2 inline-block">← Back to Job Orders</Link>
      </div>
    );
  }

  const filled = job.positions_filled ?? 0;
  const required = job.positions_required ?? 1;
  const progressPct = Math.min(100, Math.round((filled / required) * 100));

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link to="/recruitment/interviews" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">
        <ArrowLeft size={15} />
        Job Orders
      </Link>

      {/* Job Header Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-blue-600 font-mono font-semibold text-xs bg-blue-50 px-2 py-0.5 rounded-lg">
                JOB-{String(job.id).padStart(5, '0')}
              </span>
              {(() => {
                const positions: any[] = Array.isArray(job.positions) ? job.positions : [];
                const chips = positions
                  .map((p) => p?.trade?.name)
                  .filter((n): n is string => !!n);
                if (chips.length > 0) {
                  return chips.map((name, i) => (
                    <span key={i} className="badge-blue">{name}</span>
                  ));
                }
                return job.trade?.name ? <span className="badge-blue">{job.trade.name}</span> : null;
              })()}
              <span className={priorityBadge(job.priority)}>
                {job.priority ? job.priority.charAt(0).toUpperCase() + job.priority.slice(1) : '—'}
              </span>
              <span className={jobStatusBadge(job.status)}>
                {JOB_STATUS_OPTIONS.find((s) => s.value === job.status)?.label || job.status}
              </span>
              {job.country && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-medium flex items-center gap-1">
                  <MapPin size={10} />{COUNTRY_LABELS[job.country] || job.country}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
            {job.company?.name && (
              <p className="text-sm text-gray-500 mt-1">{job.company.name}</p>
            )}
          </div>
          <button onClick={openEditJob} className="btn-ghost flex-shrink-0">
            <Edit2 size={14} />
            Edit Job
          </button>
        </div>

        {/* Key info row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {/* Vacancies progress */}
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Vacancies</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-blue-700 whitespace-nowrap">{filled}/{required}</span>
            </div>
            <p className="text-[10px] text-blue-400 mt-1">{progressPct}% filled</p>
          </div>

          {/* Salary */}
          {(job.salary_min || job.salary_max) && (
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Banknote size={10} /> Salary
              </p>
              <p className="text-sm font-bold text-emerald-700">
                {job.salary_min || '—'}{job.salary_min && job.salary_max ? '–' : ''}{job.salary_max || ''}
                {job.country && COUNTRY_CURRENCY[job.country] ? (
                  <span className="text-xs font-semibold text-emerald-500 ml-1">{COUNTRY_CURRENCY[job.country]}/mo</span>
                ) : null}
              </p>
            </div>
          )}

          {/* Service Fee */}
          {job.service_fee && (
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign size={10} /> Service Fee
              </p>
              <p className="text-sm font-bold text-amber-700">₹{Number(job.service_fee).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-amber-400 mt-0.5">per candidate</p>
            </div>
          )}

          {/* Interview Date 1 */}
          {job.interview_date_start && (
            <div className="bg-violet-50 rounded-xl p-3">
              <p className="text-[10px] text-violet-500 font-bold uppercase tracking-wider mb-1">Interview Day 1</p>
              <p className="text-sm font-bold text-violet-700">
                {new Date(job.interview_date_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Interview Date 2 */}
          {job.interview_date_end && (
            <div className="bg-violet-50 rounded-xl p-3">
              <p className="text-[10px] text-violet-500 font-bold uppercase tracking-wider mb-1">Interview Day 2</p>
              <p className="text-sm font-bold text-violet-700">
                {new Date(job.interview_date_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {job.notes && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Conditions / Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{job.notes}</p>
          </div>
        )}
        {job.description && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{job.description}</p>
          </div>
        )}
      </div>

      {/* Pipeline Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Candidates in Pipeline</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {pipelineData?.meta?.total ?? 0} candidates
            </p>
          </div>
          <button onClick={() => setAddCandidateOpen(true)} className="btn-primary">
            <Plus size={16} />
            Add Candidate
          </button>
        </div>

        {/* Pipeline Filters */}
        <div className="card px-4 py-3.5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={pipelineSearch}
              onChange={(e) => setPipelineSearch(e.target.value)}
              placeholder="Search candidate..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <Select
            value={pipelineStatusFilter}
            onChange={(e) => setPipelineStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {INTEREST_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>

        {/* Pipeline Table */}
        <div className="card overflow-hidden">
          {pipelineLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th w-10">
                      <button
                        onClick={() => {
                          const allSel = filteredPipeline.length > 0 && filteredPipeline.every((e: any) => selectedPipeline.has(e.id));
                          setSelectedPipeline(prev => {
                            const next = new Set(prev);
                            if (allSel) { filteredPipeline.forEach((e: any) => next.delete(e.id)); }
                            else { filteredPipeline.forEach((e: any) => next.add(e.id)); }
                            return next;
                          });
                        }}
                        className="flex items-center justify-center text-gray-500 hover:text-gray-800"
                      >
                        {filteredPipeline.length > 0 && filteredPipeline.every((e: any) => selectedPipeline.has(e.id))
                          ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                    </th>
                    <th className="table-th w-10 text-center">#</th>
                    <th className="table-th">Candidate</th>
                    <th className="table-th">Trade</th>
                    <th className="table-th">Phone</th>
                    <th className="table-th">State</th>
                    <th className="table-th">ECR</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Follow-up</th>
                    <th className="table-th">Last Call</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPipeline.map((entry: any, idx: number) => {
                    const statusInfo = getStatusInfo(entry.status);
                    const followUpDate = entry.follow_up_date ? entry.follow_up_date.split('T')[0] : null;
                    const isPast = followUpDate && followUpDate < today;
                    const lastCall = entry.call_logs?.[0];
                    const isSel = selectedPipeline.has(entry.id);
                    return (
                      <tr key={entry.id} className={`hover:bg-blue-50/30 transition-colors ${isSel ? 'bg-blue-50' : ''}`}>
                        <td className="table-td">
                          <button
                            onClick={() => setSelectedPipeline(prev => { const n = new Set(prev); n.has(entry.id) ? n.delete(entry.id) : n.add(entry.id); return n; })}
                            className="flex items-center justify-center text-gray-400 hover:text-blue-600"
                          >
                            {isSel ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                          </button>
                        </td>
                        <td className="table-td text-center text-xs text-gray-400 font-mono">{idx + 1}</td>
                        <td className="table-td">
                          <div className="font-semibold text-gray-800 text-sm">{entry.candidate?.full_name || '—'}</div>
                          <div className="text-xs text-blue-600 font-mono">{entry.candidate?.candidate_code || ''}</div>
                          {entry.candidate?.state?.name && <div className="text-xs text-gray-400">{entry.candidate.state.name}</div>}
                        </td>
                        <td className="table-td">
                          {entry.trade?.name
                            ? <span className="badge-blue">{entry.trade.name}</span>
                            : entry.candidate?.position_1?.name
                              ? <span className="badge-gray text-xs">{entry.candidate.position_1.name}</span>
                              : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        <td className="table-td font-mono text-sm text-gray-600">
                          {entry.candidate?.whatsapp_no || '—'}
                        </td>
                        <td className="table-td text-xs text-gray-600">
                          {entry.candidate?.state?.name || '—'}
                        </td>
                        <td className="table-td text-xs text-gray-500 uppercase">
                          {entry.candidate?.ecr_type || '—'}
                        </td>
                        <td className="table-td">
                          <span className={statusInfo.badge}>{statusInfo.label}</span>
                        </td>
                        <td className="table-td">
                          {followUpDate ? (
                            <span className={`text-xs font-medium ${isPast ? 'text-red-600' : 'text-gray-600'}`}>
                              {isPast && <span className="mr-1">⚠</span>}
                              {new Date(followUpDate + 'T00:00:00').toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="table-td">
                          {lastCall ? (
                            <span className="badge-gray text-xs">
                              {CALL_OUTCOMES.find((o) => o.value === lastCall.outcome)?.label || lastCall.outcome}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="table-td">
                          <button
                            onClick={() => openUpdateEntry(entry)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Edit2 size={12} />
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPipeline.length === 0 && (
                    <tr>
                      <td colSpan={11} className="table-td text-center py-12">
                        <p className="text-sm text-gray-400">No candidates in pipeline yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Job Modal */}
      {editJobOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Edit Job Order</h2>
              <button onClick={() => setEditJobOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleJobSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="form-label">Job Title <span className="text-red-500">*</span></label>
                <input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} className="form-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Company</label>
                  <Select value={jobForm.company_id} onChange={(e) => setJobForm({ ...jobForm, company_id: e.target.value })}>
                    <option value="">Select company</option>
                    {companiesData?.data?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="form-label">Trade</label>
                  <Select value={jobForm.trade_id} onChange={(e) => setJobForm({ ...jobForm, trade_id: e.target.value })}>
                    <option value="">Select trade</option>
                    {(Array.isArray(tradesData) ? tradesData : tradesData?.data)?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Positions Required</label>
                  <input type="number" min="1" value={jobForm.positions_required} onChange={(e) => setJobForm({ ...jobForm, positions_required: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <Select value={jobForm.priority} onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value })}>
                    {PRIORITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <Select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}>
                    {JOB_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Salary Min</label>
                  <input type="number" value={jobForm.salary_min} onChange={(e) => setJobForm({ ...jobForm, salary_min: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Salary Max</label>
                  <input type="number" value={jobForm.salary_max} onChange={(e) => setJobForm({ ...jobForm, salary_max: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Service Fee</label>
                  <input type="number" value={jobForm.service_fee} onChange={(e) => setJobForm({ ...jobForm, service_fee: e.target.value })} className="form-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Interview Date 1</label>
                  <input type="date" value={jobForm.interview_date_start} onChange={(e) => setJobForm({ ...jobForm, interview_date_start: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Interview Date 2</label>
                  <input type="date" value={jobForm.interview_date_end} onChange={(e) => setJobForm({ ...jobForm, interview_date_end: e.target.value })} className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} className="form-input resize-none" rows={3} />
              </div>
              {jobFormError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{jobFormError}</p>
              )}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setEditJobOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={updatingJob} className="btn-primary">
                  {updatingJob && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {addCandidateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Candidate to Pipeline</h2>
              <button onClick={() => { setAddCandidateOpen(false); setCandidateSearch(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 border-b border-gray-50">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder="Search by name, code, phone..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {candidatesFetching ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Candidate</th>
                      <th className="table-th">Code</th>
                      <th className="table-th">Trade</th>
                      <th className="table-th">Phone</th>
                      <th className="table-th">Add</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatesData?.data?.map((c: any) => (
                      <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {c.full_name?.[0]}
                            </div>
                            <span className="font-semibold text-gray-800 text-sm">{c.full_name}</span>
                          </div>
                        </td>
                        <td className="table-td font-mono text-xs text-blue-600">{c.candidate_code}</td>
                        <td className="table-td">
                          {c.position_1?.name
                            ? <span className="badge-blue">{c.position_1.name}</span>
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        <td className="table-td font-mono text-sm text-gray-600">{c.whatsapp_no}</td>
                        <td className="table-td">
                          <button
                            onClick={() => handleAddCandidate(c.id)}
                            disabled={addingToPipeline}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Plus size={12} />
                            Add
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!candidatesData?.data || candidatesData.data.length === 0) && (
                      <tr>
                        <td colSpan={5} className="table-td text-center py-8 text-gray-400 text-sm">
                          No candidates found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Pipeline Entry Modal */}
      {updateEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">{updateEntry.candidate?.full_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{updateEntry.candidate?.candidate_code}</p>
              </div>
              <button onClick={() => setUpdateEntry(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Current status */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-semibold">Current:</span>
                <span className={getStatusInfo(updateEntry.status).badge}>
                  {getStatusInfo(updateEntry.status).label}
                </span>
              </div>

              {/* Update Status Form */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Update Status</h3>
                <div>
                  <label className="form-label">New Status</label>
                  <Select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  >
                    <option value="">Select status</option>
                    {INTEREST_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    value={updateForm.notes}
                    onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                    className="form-input resize-none"
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>
                <div>
                  <label className="form-label">Follow-up Date</label>
                  <input
                    type="date"
                    value={updateForm.follow_up_date}
                    onChange={(e) => setUpdateForm({ ...updateForm, follow_up_date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus}
                  className="btn-primary w-full justify-center"
                >
                  {updatingStatus && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Update Status
                </button>
              </div>

              {/* Log Call Form */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone size={14} className="text-amber-500" />
                  Log Call
                </h3>
                <div>
                  <label className="form-label">Outcome <span className="text-red-500">*</span></label>
                  <Select
                    value={callForm.outcome}
                    onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })}
                  >
                    <option value="">Select outcome</option>
                    {CALL_OUTCOMES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    value={callForm.notes}
                    onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                    className="form-input resize-none"
                    rows={2}
                    placeholder="Call notes..."
                  />
                </div>
                <div>
                  <label className="form-label">Follow-up Date</label>
                  <input
                    type="date"
                    value={callForm.follow_up_date}
                    onChange={(e) => setCallForm({ ...callForm, follow_up_date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <button
                  onClick={handleLogCall}
                  disabled={loggingCall}
                  className="w-full justify-center inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  {loggingCall && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <Phone size={14} />
                  Log Call
                </button>
              </div>

              {updateError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{updateError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
