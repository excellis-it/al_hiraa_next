import { useState, useCallback } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Edit2, Phone, X, CheckSquare, Square, ClipboardList } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetPipelineQuery, useUpdatePipelineStatusMutation } from '../../store/api/pipelineApi';
import { useCreateCallLogMutation } from '../../store/api/callLogsApi';

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
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'call_back', label: 'Call Back' },
  { value: 'not_reachable', label: 'Not Reachable' },
  { value: 'reached', label: 'Reached' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'line_busy', label: 'Line Busy' },
  { value: 'switched_off', label: 'Switched Off' },
];

function getStatusInfo(value: string) {
  return INTEREST_STATUSES.find((s) => s.value === value) || { label: value, badge: 'badge-gray' };
}

const LIMIT = 20;

export default function Pipeline() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [followUpToday, setFollowUpToday] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Debounce search to avoid firing on every keystroke
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as any)._timer);
    (handleSearchChange as any)._timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  const { data, isLoading } = useGetPipelineQuery({
    page,
    limit: LIMIT,
    status: statusFilter || undefined,
    follow_up_today: followUpToday || undefined,
    search: debouncedSearch || undefined,
  });

  const [updatePipelineStatus, { isLoading: updatingStatus }] = useUpdatePipelineStatusMutation();
  const [createCallLog, { isLoading: loggingCall }] = useCreateCallLogMutation();

  const [updateEntry, setUpdateEntry] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '', follow_up_date: '' });
  const [callForm, setCallForm] = useState({ outcome: '', notes: '', follow_up_date: '' });
  const [updateError, setUpdateError] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const today = new Date().toISOString().split('T')[0];

  const filteredData = data?.data || [];

  const allSelected = filteredData.length > 0 && filteredData.every((e: any) => selected.has(e.id));
  const toggleAll = useCallback(() => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) { filteredData.forEach((e: any) => next.delete(e.id)); }
      else { filteredData.forEach((e: any) => next.add(e.id)); }
      return next;
    });
  }, [allSelected, filteredData]);
  const toggleOne = useCallback((id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data?.meta?.total != null ? `${data.meta.total.toLocaleString()} entries` : 'All candidate-job pipeline entries'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card px-4 py-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search candidate..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {INTEREST_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>

          <button
            onClick={() => { setFollowUpToday((v) => !v); setPage(1); }}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
              followUpToday
                ? 'bg-amber-500 text-white border-amber-500'
                : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-amber-300 hover:text-amber-600'
            }`}
          >
            <Phone size={13} />
            Due Today
            {followUpToday && (
              <span className="ml-1 bg-white/30 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th w-10">
                      <button onClick={toggleAll} className="flex items-center justify-center text-gray-500 hover:text-gray-800">
                        {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                    </th>
                    <th className="table-th w-10 text-center">#</th>
                    <th className="table-th">Candidate</th>
                    <th className="table-th">Job</th>
                    <th className="table-th">Trade</th>
                    <th className="table-th">Phone</th>
                    <th className="table-th">State</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Follow-up</th>
                    <th className="table-th">Last Call</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((entry: any, idx: number) => {
                    const statusInfo = getStatusInfo(entry.status);
                    const followUpDate = entry.follow_up_date ? entry.follow_up_date.split('T')[0] : null;
                    const isPast = followUpDate && followUpDate < today;
                    const lastCall = entry.call_logs?.[0];
                    const isSelected = selected.has(entry.id);
                    return (
                      <tr key={entry.id} className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="table-td">
                          <button onClick={() => toggleOne(entry.id)} className="flex items-center justify-center text-gray-400 hover:text-blue-600">
                            {isSelected ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                          </button>
                        </td>
                        <td className="table-td text-center text-xs text-gray-400 font-mono">
                          {(page - 1) * LIMIT + idx + 1}
                        </td>
                        <td className="table-td">
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{entry.candidate?.full_name || '—'}</div>
                            <div className="text-xs text-blue-600 font-mono">{entry.candidate?.candidate_code || ''}</div>
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="text-sm font-medium text-gray-700">{entry.job?.title || '—'}</div>
                          {entry.job?.company?.name && (
                            <div className="text-xs text-gray-400">{entry.job.company.name}</div>
                          )}
                        </td>
                        <td className="table-td">
                          {entry.candidate?.position_1?.name
                            ? <span className="badge-blue">{entry.candidate.position_1.name}</span>
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        <td className="table-td font-mono text-sm text-gray-600">
                          {entry.candidate?.whatsapp_no || '—'}
                        </td>
                        <td className="table-td text-xs text-gray-600">
                          {entry.candidate?.state?.name || '—'}
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
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={11} className="table-td text-center py-16">
                        <ClipboardList size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
                        <p className="text-sm text-gray-400 font-medium">No pipeline entries found</p>
                        <p className="text-xs text-gray-300 mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.meta && data.meta.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50">
                <span className="text-xs text-gray-400">
                  Showing <span className="font-semibold text-gray-700">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.meta.total)}</span> of <span className="font-semibold text-gray-700">{data.meta.total.toLocaleString()}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(data.meta.pages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                        page === p
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))}
                    disabled={page >= data.meta.pages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Update Pipeline Entry Modal */}
      {updateEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">{updateEntry.candidate?.full_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {updateEntry.candidate?.candidate_code} · {updateEntry.job?.title}
                </p>
              </div>
              <button onClick={() => setUpdateEntry(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
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
