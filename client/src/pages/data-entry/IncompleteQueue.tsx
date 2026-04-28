import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle, ChevronLeft, ChevronRight, Edit2, CheckCircle2,
  CheckSquare, Square, Trash2, ChevronDown, ChevronUp, Calendar,
  Filter, X, ArrowUpDown,
} from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetIncompleteQueueQuery, useBulkDeleteIncompleteMutation } from '../../store/api/candidatesApi';
import { useGetUsersQuery } from '../../store/api/usersApi';
import toast from 'react-hot-toast';

// ── Date preset helpers ────────────────────────────────────────────────────────

type DatePreset = 'yesterday' | 'last7' | 'last14' | 'last30' | 'last90' | 'custom' | '';

function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const sub = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d;
  };
  switch (preset) {
    case 'yesterday': return { from: fmt(sub(1)), to: fmt(sub(1)) };
    case 'last7':     return { from: fmt(sub(7)),  to: fmt(today) };
    case 'last14':    return { from: fmt(sub(14)), to: fmt(today) };
    case 'last30':    return { from: fmt(sub(30)), to: fmt(today) };
    case 'last90':    return { from: fmt(sub(90)), to: fmt(today) };
    default:          return { from: '', to: '' };
  }
}

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7',     label: 'Last 7 days' },
  { key: 'last14',    label: 'Last 14 days' },
  { key: 'last30',    label: '1 month' },
  { key: 'last90',    label: '3 months' },
  { key: 'custom',    label: 'Custom' },
];

// ── Confirm delete modal ───────────────────────────────────────────────────────

function ConfirmModal({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Delete {count} record{count !== 1 ? 's' : ''}?</h3>
            <p className="text-xs text-gray-400 mt-0.5">This will permanently remove the selected incomplete candidates.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IncompleteQueue() {
  const [page, setPage] = useState(1);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  // Resolve date range
  const { from: presetFrom, to: presetTo } = useMemo(
    () => getPresetDates(datePreset),
    [datePreset],
  );
  const dateFrom = datePreset === 'custom' ? customFrom : presetFrom;
  const dateTo   = datePreset === 'custom' ? customTo   : presetTo;

  const presetLabel = DATE_PRESETS.find((p) => p.key === datePreset)?.label;

  const queryParams = {
    page,
    limit: 50,
    registered_by:  filterOperator || undefined,
    date_from:      dateFrom || undefined,
    date_to:        dateTo   || undefined,
    sort_order:     sortOrder,
  };

  const { data, isLoading, refetch } = useGetIncompleteQueueQuery(queryParams);
  const { data: usersData } = useGetUsersQuery(undefined);
  const [bulkDelete, { isLoading: deleting }] = useBulkDeleteIncompleteMutation();

  const rows: any[] = data?.data || [];
  const meta = data?.meta;

  // Only show data_entry users in operator filter
  const operators = useMemo(() => {
    const allUsers: any[] = Array.isArray(usersData) ? usersData : (usersData as any)?.data ?? [];
    return allUsers.filter((u: any) => ['data_entry', 'admin', 'manager'].includes(u.role));
  }, [usersData]);

  // Selection helpers
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) { rows.forEach((r) => next.delete(r.id)); }
      else { rows.forEach((r) => next.add(r.id)); }
      return next;
    });
  }, [allSelected, rows]);

  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selected);
      const result: any = await bulkDelete(ids).unwrap();
      toast.success(`${result.deleted} record${result.deleted !== 1 ? 's' : ''} deleted`);
      setSelected(new Set());
      setShowConfirm(false);
      refetch();
    } catch {
      toast.error('Failed to delete records');
    }
  };

  const clearFilters = () => {
    setDatePreset('');
    setCustomFrom('');
    setCustomTo('');
    setFilterOperator('');
    setPage(1);
  };

  const hasFilters = datePreset !== '' || filterOperator !== '';

  const fmtDate = (val: string) =>
    new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Incomplete Queue</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {meta?.total != null
              ? `${meta.total} candidate${meta.total !== 1 ? 's' : ''} need follow-up`
              : 'Candidates with missing required fields'}
          </p>
        </div>
        {meta?.total ? (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-2">
            <AlertCircle size={15} className="text-rose-500" />
            <span className="text-sm font-semibold text-rose-600">{meta.total} incomplete</span>
          </div>
        ) : null}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-3 flex flex-wrap items-center gap-3 flex-shrink-0 shadow-sm">

        {/* Date preset dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDateDropdown((v) => !v)}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
              datePreset ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Calendar size={14} />
            {datePreset ? (datePreset === 'custom' ? `${customFrom || '…'} → ${customTo || '…'}` : presetLabel) : 'All dates'}
            <ChevronDown size={12} className={`transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg w-52 py-1">
              <button
                onClick={() => { setDatePreset(''); setShowDateDropdown(false); setPage(1); }}
                className={`w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 transition-colors ${!datePreset ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}
              >
                All dates
              </button>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setDatePreset(p.key);
                    if (p.key !== 'custom') setShowDateDropdown(false);
                    setPage(1);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 transition-colors ${datePreset === p.key ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}
                >
                  {p.label}
                </button>
              ))}
              {datePreset === 'custom' && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 mt-1 space-y-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase">From</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-0.5 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase">To</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-0.5 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Operator filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-gray-400" />
          <Select
            value={filterOperator}
            onChange={(e) => { setFilterOperator(e.target.value); setPage(1); }}
          >
            <option value="">All operators</option>
            {operators.map((u: any) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </Select>
        </div>

        {/* Sort toggle */}
        <button
          onClick={() => { setSortOrder((o) => o === 'asc' ? 'desc' : 'asc'); setPage(1); }}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
          title={sortOrder === 'asc' ? 'Oldest first (click for newest first)' : 'Newest first (click for oldest first)'}
        >
          <ArrowUpDown size={13} />
          {sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}
          {sortOrder === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {/* Clear filters */}
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-1">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="bg-rose-600 text-white rounded-2xl px-5 py-3 mb-3 flex items-center gap-4 shadow-lg flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <CheckSquare size={16} />
            <span className="font-semibold text-sm">{selected.size} selected</span>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Delete selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/30 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-700 text-white text-[11px] font-semibold">
                    {/* Checkbox */}
                    <th className="sticky left-0 z-20 bg-slate-700 px-3 py-2.5 border-r border-slate-600" style={{ width: 40, minWidth: 40 }}>
                      <button onClick={toggleAll} className="flex items-center justify-center text-white/80 hover:text-white">
                        {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                    </th>
                    {/* # */}
                    <th className="px-3 py-2.5 border-r border-slate-600 text-center whitespace-nowrap" style={{ width: 50 }}>#</th>
                    {/* Reg Date */}
                    <th className="px-3 py-2.5 border-r border-slate-600 whitespace-nowrap" style={{ width: 120 }}>
                      <button
                        onClick={() => { setSortOrder((o) => o === 'asc' ? 'desc' : 'asc'); setPage(1); }}
                        className="flex items-center gap-1 hover:text-blue-200 transition-colors"
                      >
                        Reg. Date
                        {sortOrder === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </th>
                    {/* Registered By */}
                    <th className="px-3 py-2.5 border-r border-slate-600 whitespace-nowrap" style={{ width: 130 }}>Registered By</th>
                    {/* Candidate */}
                    <th className="px-3 py-2.5 border-r border-slate-600 whitespace-nowrap" style={{ width: 180 }}>Candidate</th>
                    {/* Phone */}
                    <th className="px-3 py-2.5 border-r border-slate-600 whitespace-nowrap" style={{ width: 150 }}>Phone</th>
                    {/* Trade */}
                    <th className="px-3 py-2.5 border-r border-slate-600 whitespace-nowrap" style={{ width: 160 }}>Trade / Position</th>
                    {/* State */}
                    <th className="px-3 py-2.5 border-r border-slate-600 whitespace-nowrap" style={{ width: 120 }}>State</th>
                    {/* City */}
                    <th className="px-3 py-2.5 border-r border-slate-600 whitespace-nowrap" style={{ width: 120 }}>City</th>
                    {/* Action */}
                    <th className="px-3 py-2.5 text-center whitespace-nowrap" style={{ width: 110 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isSelected = selected.has(row.id);
                    const rowNum = (page - 1) * 50 + idx + 1;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-50 text-xs transition-colors ${
                          isSelected ? 'bg-rose-50' : idx % 2 === 0 ? 'bg-white hover:bg-rose-50/30' : 'bg-gray-50 hover:bg-rose-50/30'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className={`sticky left-0 z-10 px-3 py-2.5 border-r border-gray-100 ${isSelected ? 'bg-rose-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          style={{ width: 40 }}
                        >
                          <button onClick={() => toggleOne(row.id)} className="flex items-center justify-center text-gray-400 hover:text-rose-600">
                            {isSelected ? <CheckSquare size={14} className="text-rose-600" /> : <Square size={14} />}
                          </button>
                        </td>
                        {/* # */}
                        <td className="px-3 py-2.5 border-r border-gray-100 text-center text-gray-400 font-mono text-[11px]" style={{ width: 50 }}>
                          {rowNum}
                        </td>
                        {/* Reg Date */}
                        <td className="px-3 py-2.5 border-r border-gray-100 whitespace-nowrap">
                          <span className="text-xs text-gray-600">{fmtDate(row.created_at)}</span>
                        </td>
                        {/* Registered By */}
                        <td className="px-3 py-2.5 border-r border-gray-100">
                          <span className="text-xs text-gray-800 font-semibold">{row.registered_by_name || '—'}</span>
                        </td>
                        {/* Candidate */}
                        <td className="px-3 py-2.5 border-r border-gray-100">
                          <div>
                            <div className="font-semibold text-gray-800 text-xs whitespace-nowrap">{row.full_name}</div>
                            <div className="font-mono text-[10px] text-blue-600 mt-0.5">{row.candidate_code}</div>
                          </div>
                        </td>
                        {/* Phone */}
                        <td className="px-3 py-2.5 border-r border-gray-100">
                          <span className="font-mono text-xs text-gray-600">{row.whatsapp_no || '—'}</span>
                        </td>
                        {/* Trade */}
                        <td className="px-3 py-2.5 border-r border-gray-100">
                          {row.position_1?.name
                            ? <span className="inline-block text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md whitespace-nowrap">{row.position_1.name}</span>
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        {/* State */}
                        <td className="px-3 py-2.5 border-r border-gray-100">
                          <span className="text-xs text-gray-600">{row.state?.name || '—'}</span>
                        </td>
                        {/* City */}
                        <td className="px-3 py-2.5 border-r border-gray-100">
                          <span className="text-xs text-gray-600">{row.city?.name || '—'}</span>
                        </td>
                        {/* Action */}
                        <td className="px-3 py-2.5 text-center">
                          <Link
                            to={`/data-entry/candidates/${row.id}/edit`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Edit2 size={11} />
                            Complete
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-20 text-center">
                        <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-200" strokeWidth={1} />
                        <p className="text-sm text-gray-400 font-medium">All caught up!</p>
                        <p className="text-xs text-gray-300 mt-1">
                          {hasFilters ? 'No records match your filters' : 'No incomplete registrations at this time'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-shrink-0">
                <span className="text-xs text-gray-400">
                  Showing <span className="font-semibold text-gray-700">{(page - 1) * 50 + 1}–{Math.min(page * 50, meta.total)}</span> of{' '}
                  <span className="font-semibold text-gray-700">{meta.total.toLocaleString()}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(meta.pages, 7) }, (_, i) => {
                    const p = Math.max(1, Math.min(meta.pages - 6, page - 3)) + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                          page === p ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                    disabled={page >= meta.pages}
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

      {/* Confirm delete modal */}
      {showConfirm && (
        <ConfirmModal
          count={selected.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
