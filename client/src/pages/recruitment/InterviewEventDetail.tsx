import { useState, useMemo, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Edit2, UserPlus, X, Search, Download, Upload,
  CheckSquare, Square, CalendarCheck, MapPin, Users, Briefcase,
  Phone, ChevronDown, ClipboardList, Info, Handshake, UserCheck,
} from 'lucide-react';
import {
  useGetInterviewEventQuery,
  useGetCheckinsQuery,
  useUpdateCheckinMutation,
  useAddCandidatesToEventMutation,
  useAddMasterCandidateMutation,
  useAddSubAgentCandidatesMutation,
} from '../../store/api/interviewEventsApi';
import { useGetPipelineQuery, useAddToPipelineMutation } from '../../store/api/pipelineApi';
import { useGetCandidatesQuery, useCreateCandidateMutation } from '../../store/api/candidatesApi';
import { useGetAssociatesQuery } from '../../store/api/associatesApi';
import { useGetTradesQuery } from '../../store/api/mastersApi';
import { useBatchFromInterviewMutation } from '../../store/api/processDetailsApi';
import Select from '../../components/ui/Select';
import ImportCandidatesModal from './components/ImportCandidatesModal';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────────────

const COUNTRY_LABELS: Record<string, string> = {
  saudi_arabia: 'Saudi Arabia', uae: 'UAE', qatar: 'Qatar',
  kuwait: 'Kuwait', bahrain: 'Bahrain', oman: 'Oman',
};

const CHECKIN_STATUSES = [
  { value: 'expected', label: 'Expected' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'no_show', label: 'No Show' },
  { value: 'late', label: 'Late' },
];

const INTERVIEW_STATUSES = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_interview', label: 'In Interview' },
  { value: 'completed', label: 'Completed' },
];

const RESULT_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On Hold' },
];

const SOURCE_MODES = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'associate', label: 'Associate' },
  { value: 'website', label: 'Website' },
  { value: 'camp', label: 'Camp' },
  { value: 'other', label: 'Other' },
];

// ── Badge helpers ──────────────────────────────────────────────────────────────

function resultBadge(result: string) {
  switch (result) {
    case 'selected': return <span className="badge-green">Selected</span>;
    case 'rejected': return <span className="badge-red">Rejected</span>;
    case 'on_hold': return <span className="badge-orange">On Hold</span>;
    default: return <span className="badge-gray">Pending</span>;
  }
}

function checkinBadge(status: string) {
  switch (status) {
    case 'arrived': return <span className="badge-blue">Arrived</span>;
    case 'no_show': return <span className="badge-red">No Show</span>;
    case 'late': return <span className="badge-orange">Late</span>;
    default: return <span className="badge-gray">Expected</span>;
  }
}

function interviewStatusBadge(status: string) {
  switch (status) {
    case 'in_progress': return <span className="badge-blue">In Progress</span>;
    case 'completed': return <span className="badge-green">Completed</span>;
    case 'skipped': return <span className="badge-gray">Skipped</span>;
    default: return <span className="badge-gray">Pending</span>;
  }
}

function typeBadge(type: string) {
  switch (type) {
    case 'in_person': return <span className="badge-blue">In Person</span>;
    case 'video': return <span className="badge-gray">Video</span>;
    case 'trade_test': return <span className="badge-orange">Trade Test</span>;
    case 'combined': return <span className="badge-green">Combined</span>;
    default: return <span className="badge-gray">{type}</span>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'scheduled': return <span className="badge-blue">Scheduled</span>;
    case 'completed': return <span className="badge-green">Completed</span>;
    case 'cancelled': return <span className="badge-red">Cancelled</span>;
    case 'postponed': return <span className="badge-orange">Postponed</span>;
    default: return <span className="badge-gray">{status}</span>;
  }
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function modeBadge(mode: string | null | undefined) {
  if (!mode) return <span className="text-gray-300 text-xs">—</span>;
  const colors: Record<string, string> = {
    walk_in: 'bg-gray-100 text-gray-600',
    referral: 'bg-violet-100 text-violet-700',
    associate: 'bg-amber-100 text-amber-700',
    website: 'bg-blue-100 text-blue-700',
    camp: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize ${colors[mode] || 'bg-gray-100 text-gray-600'}`}>
      {mode.replace(/_/g, ' ')}
    </span>
  );
}

// ── CSV Export helper ─────────────────────────────────────────────────────────

function ageFromDob(dob: string | null | undefined): string {
  if (!dob) return '';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

function exportCheckinsCsv(checkins: any[], eventLabel: string) {
  const headers = [
    '#', 'Candidate Code', 'Full Name', 'Passport', 'Phone', 'WhatsApp',
    'Age', 'Gender', 'DOB', 'Trade', 'State', 'City', 'ECR Type',
    'Education', 'Indian Experience', 'Abroad Experience',
    'Reg. Mode', 'Associate', 'Source', 'Check-in', 'Interview', 'Result', 'Notes',
  ];
  const rows = checkins.map((c, i) => {
    const cand = c.candidate_job?.candidate ?? c.candidate ?? {};
    return [
      i + 1,
      cand.candidate_code ?? '',
      cand.full_name ?? '',
      cand.passport_no ?? '',
      cand.whatsapp_no ?? cand.mobile_no ?? '',
      cand.alternate_contact ?? '',
      ageFromDob(cand.dob),
      cand.gender ?? '',
      cand.dob ? new Date(cand.dob).toISOString().slice(0, 10) : '',
      c.candidate_job?.trade?.name ?? cand.position_1?.name ?? '',
      cand.state?.name ?? '',
      cand.city?.name ?? '',
      cand.ecr_type ?? '',
      cand.education ?? '',
      cand.indian_experience ?? '',
      cand.abroad_experience ?? '',
      cand.registration_mode ?? '',
      cand.associate?.full_name ?? '',
      cand.source?.name ?? '',
      c.checkin_status ?? '',
      c.interview_status ?? '',
      c.result ?? '',
      c.result_notes ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-${eventLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-Agent CSV Modal ───────────────────────────────────────────────────────

interface SubAgentCsvModalProps {
  eventId: number;
  trades: any[];
  positions: any[];
  associates: any[];
  initialTrade?: string;
  adding: boolean;
  onClose: () => void;
  onSubmit: (args: {
    associate_id: number;
    trade_id: number;
    rows: Array<{ full_name: string; whatsapp_no: string; passport_no?: string; dob?: string; remarks?: string }>;
  }) => Promise<void>;
}

const SUB_AGENT_CSV_COLS = ['full_name', 'whatsapp_no', 'passport_no', 'dob', 'remarks'];

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const splitLine = (ln: string): string[] => {
    const out: string[] = [];
    let cur = ''; let inQ = false;
    for (let i = 0; i < ln.length; i++) {
      const ch = ln[i];
      if (inQ) {
        if (ch === '"' && ln[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === ',') { out.push(cur); cur = ''; }
        else if (ch === '"') inQ = true;
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = splitLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

function SubAgentCsvModal({
  eventId: _eventId,
  trades,
  positions,
  associates,
  initialTrade,
  adding,
  onClose,
  onSubmit,
}: SubAgentCsvModalProps) {
  const [step, setStep] = useState<'config' | 'preview'>('config');
  const [associateId, setAssociateId] = useState<string>('');
  const [tradeName, setTradeName] = useState<string>(initialTrade || (positions[0]?.trade?.name ?? ''));
  const [rows, setRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');

  const matchedTrade = useMemo(() => trades.find((t: any) => t.name === tradeName), [trades, tradeName]);

  function downloadTemplate() {
    const csv = SUB_AGENT_CSV_COLS.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sub-agent-candidates-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(f: File) {
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCsv(String(ev.target?.result ?? ''));
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(f);
  }

  const validRows = rows.filter(r => r.full_name?.trim() && r.whatsapp_no?.trim());
  const invalidCount = rows.length - validRows.length;

  async function handleConfirm() {
    if (!associateId || !matchedTrade) { toast.error('Associate and trade required'); return; }
    if (validRows.length === 0) { toast.error('No valid rows'); return; }
    try {
      await onSubmit({
        associate_id: +associateId,
        trade_id: matchedTrade.id,
        rows: validRows.map(r => ({
          full_name: r.full_name,
          whatsapp_no: r.whatsapp_no,
          passport_no: r.passport_no || undefined,
          dob: r.dob || undefined,
          remarks: r.remarks || undefined,
        })),
      });
    } catch (e: any) {
      toast.error(e?.data?.message || 'Import failed');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">Add Sub-Agent / Associate Candidates (CSV)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              These candidates are added only to this interview, not the master list.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        {step === 'config' ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Associate / Sub-Agent *</label>
              <select
                value={associateId}
                onChange={e => setAssociateId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="">Select associate</option>
                {associates.map((a: any) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Trade *</label>
              <select
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="">Select trade</option>
                {positions.map((p: any) => (
                  <option key={p.id} value={p.trade?.name}>{p.trade?.name} ({p.quantity} qty)</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
              CSV columns expected: <code className="font-mono">{SUB_AGENT_CSV_COLS.join(', ')}</code>.
              <button onClick={downloadTemplate} className="ml-2 text-blue-600 hover:underline font-semibold">
                Download template
              </button>
            </div>
            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
              <Upload size={28} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-semibold text-gray-600">Upload CSV file</p>
              <p className="text-xs text-gray-400 mt-1">Click to browse</p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                disabled={!associateId || !matchedTrade}
              />
            </label>
            {(!associateId || !matchedTrade) && (
              <p className="text-xs text-red-500 text-center">Select associate & trade to enable upload.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold text-gray-800">{fileName}</span>
                <span className="text-gray-400 ml-2">· {rows.length} rows</span>
              </div>
              <button onClick={() => { setStep('config'); setRows([]); }} className="text-xs text-blue-600 hover:underline">
                ← Upload different file
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    {SUB_AGENT_CSV_COLS.map(c => <th key={c} className="px-2 py-2 text-left font-semibold">{c}</th>)}
                    <th className="px-2 py-2 text-left font-semibold">status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r, i) => {
                    const valid = r.full_name?.trim() && r.whatsapp_no?.trim();
                    return (
                      <tr key={i} className={valid ? '' : 'bg-red-50'}>
                        {SUB_AGENT_CSV_COLS.map(c => <td key={c} className="px-2 py-1.5 border-t border-gray-100">{r[c] || '—'}</td>)}
                        <td className="px-2 py-1.5 border-t border-gray-100">
                          {valid ? <span className="text-emerald-600">OK</span> : <span className="text-red-600">missing name/phone</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > 30 && <p className="text-[10px] text-gray-400 text-center py-1">…{rows.length - 30} more</p>}
            </div>
            {invalidCount > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">
                {invalidCount} row(s) will be skipped (missing name or phone).
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-gray-500">
              {validRows.length} valid · {invalidCount} invalid
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={adding || validRows.length === 0}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {adding ? 'Adding…' : `Add ${validRows.length} Candidates`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface CheckinUpdateForm {
  checkin_status: string;
  interview_status: string;
  result: string;
  result_notes: string;
}

export default function InterviewEventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);

  const { data: eventData, isLoading: eventLoading, refetch: refetchEvent } = useGetInterviewEventQuery(eventId);
  const { data: checkinsData, isLoading: checkinsLoading } = useGetCheckinsQuery(eventId);
  const [updateCheckin, { isLoading: updatingCheckin }] = useUpdateCheckinMutation();
  const [addCandidatesToEvent, { isLoading: addingCandidates }] = useAddCandidatesToEventMutation();

  const event: any = eventData ?? {};

  // Filters
  const [filterAttended, setFilterAttended] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [activeTradeTab, setActiveTradeTab] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Modals
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const [editCheckinId, setEditCheckinId] = useState<number | null>(null);
  const [editCheckinEntry, setEditCheckinEntry] = useState<any>(null);
  const [checkinForm, setCheckinForm] = useState<CheckinUpdateForm>({
    checkin_status: 'expected',
    interview_status: 'pending',
    result: 'pending',
    result_notes: '',
  });
  const [checkinError, setCheckinError] = useState('');

  const [showAddCandidates, setShowAddCandidates] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidateJobIds, setSelectedCandidateJobIds] = useState<number[]>([]);
  const [addCandError, setAddCandError] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [showAddFromAssociate, setShowAddFromAssociate] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuStep, setAddMenuStep] = useState<'trade' | 'source'>('trade');
  const [selectedAddTrade, setSelectedAddTrade] = useState<string>('');
  const [existingSearch, setExistingSearch] = useState('');

  // Additional API hooks
  const [batchFromInterview, { isLoading: assigningProcess }] = useBatchFromInterviewMutation();
  const [addToPipeline] = useAddToPipelineMutation();
  const [createCandidate] = useCreateCandidateMutation();
  const [addMasterCandidate, { isLoading: addingMaster }] = useAddMasterCandidateMutation();
  const [addSubAgentCandidates, { isLoading: addingSubAgent }] = useAddSubAgentCandidatesMutation();
  const { data: tradesData } = useGetTradesQuery(true);
  const trades: any[] = (tradesData as any[]) || [];
  const { data: associatesData } = useGetAssociatesQuery({ limit: 200 } as any);
  const associates: any[] = (associatesData as any)?.data ?? (Array.isArray(associatesData) ? associatesData : []);

  // Candidate search for "Add Existing" modal
  const { data: existingCandData } = useGetCandidatesQuery(
    showAddExisting && existingSearch.length >= 2 ? { search: existingSearch, limit: 20 } : undefined,
    { skip: !showAddExisting || existingSearch.length < 2 },
  );
  const existingCandidates: any[] = (existingCandData as any)?.data ?? [];

  // Pipeline candidates for add modal
  const { data: pipelineData } = useGetPipelineQuery(
    showAddCandidates && event.job_id
      ? { job_id: event.job_id, status: 'lined_up', limit: 200 } as any
      : undefined,
    { skip: !showAddCandidates || !event.job_id }
  );
  const pipelineCandidates: any[] = (pipelineData as any)?.data ?? [];

  const checkins: any[] = Array.isArray(checkinsData)
    ? checkinsData
    : (checkinsData as any)?.checkins ?? (checkinsData as any)?.data ?? [];

  // Available trades from job positions
  const availableTrades = useMemo(() => {
    const positions = event?.job?.positions ?? [];
    const tradeSet = new Map<number, string>();
    for (const pos of positions) {
      if (pos.trade) tradeSet.set(pos.trade.id, pos.trade.name);
    }
    // Also collect from checkin candidates
    for (const c of checkins) {
      const cand = c.candidate_job?.candidate ?? c.candidate ?? {};
      const tradeName = c.candidate_job?.trade?.name ?? cand.position_1?.name;
      const tradeId = c.candidate_job?.trade?.id ?? cand.position_1?.id;
      if (tradeId && tradeName) tradeSet.set(tradeId, tradeName);
    }
    return Array.from(tradeSet.entries()).map(([id, name]) => ({ id, name }));
  }, [event, checkins]);

  const isSubAgentSourced = (cand: any) =>
    cand?.registration_mode === 'associate' || !!cand?.associate_id;

  // Filter checkins
  const filteredCheckins = useMemo(() => {
    return checkins.filter(c => {
      const cand = c.candidate_job?.candidate ?? c.candidate ?? {};
      // Attended filter
      if (filterAttended === 'appeared' && c.checkin_status !== 'arrived' && c.checkin_status !== 'late') return false;
      if (filterAttended === 'not_appeared' && c.checkin_status !== 'expected' && c.checkin_status !== 'no_show') return false;
      // Result/status filter
      if (filterResult && c.result !== filterResult) return false;
      // Trade tab filter
      if (activeTradeTab !== 'all') {
        const tradeName = c.candidate_job?.trade?.name ?? cand.position_1?.name ?? '';
        if (tradeName !== activeTradeTab) return false;
      }
      // Source filter: internal / sub_agent / associate:<id>
      if (filterSource) {
        if (filterSource === 'internal' && isSubAgentSourced(cand)) return false;
        if (filterSource === 'sub_agent' && !isSubAgentSourced(cand)) return false;
        if (filterSource.startsWith('associate:')) {
          const id = Number(filterSource.slice('associate:'.length));
          if (cand.associate_id !== id) return false;
        }
      }
      // Search
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const name = (cand.full_name ?? '').toLowerCase();
        const code = (cand.candidate_code ?? '').toLowerCase();
        const phone = (cand.whatsapp_no ?? cand.mobile_no ?? '').toLowerCase();
        const passport = (cand.passport_no ?? '').toLowerCase();
        if (!name.includes(q) && !code.includes(q) && !phone.includes(q) && !passport.includes(q)) return false;
      }
      return true;
    });
  }, [checkins, filterAttended, filterResult, activeTradeTab, filterSearch, filterSource]);

  const sourceCounts = useMemo(() => {
    let internal = 0;
    let subAgent = 0;
    for (const c of checkins) {
      const cand = c.candidate_job?.candidate ?? c.candidate ?? {};
      if (isSubAgentSourced(cand)) subAgent++;
      else internal++;
    }
    return { internal, subAgent };
  }, [checkins]);

  // Stats
  const stats = useMemo(() => ({
    total: checkins.length,
    arrived: checkins.filter(c => c.checkin_status === 'arrived' || c.checkin_status === 'late').length,
    no_show: checkins.filter(c => c.checkin_status === 'no_show').length,
    selected: checkins.filter(c => c.result === 'selected').length,
    rejected: checkins.filter(c => c.result === 'rejected').length,
    pending: checkins.filter(c => !c.result || c.result === 'pending').length,
  }), [checkins]);

  // Selection
  const allSel = filteredCheckins.length > 0 && filteredCheckins.every(c => selected.has(c.id));
  const toggleAll = () => {
    setSelected(prev => {
      const n = new Set(prev);
      if (allSel) filteredCheckins.forEach(c => n.delete(c.id));
      else filteredCheckins.forEach(c => n.add(c.id));
      return n;
    });
  };
  const toggleOne = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Add candidates
  const addedCandJobIds = new Set(checkins.map(c => c.candidate_job_id));
  const availableCandidates = pipelineCandidates.filter(p => !addedCandJobIds.has(p.id));
  const filteredCandidates = candidateSearch
    ? availableCandidates.filter(p =>
        `${p.candidate?.full_name ?? ''} ${p.candidate?.candidate_code ?? ''}`.toLowerCase().includes(candidateSearch.toLowerCase())
      )
    : availableCandidates;

  function openCheckinEdit(checkin: any) {
    setEditCheckinId(checkin.id);
    setEditCheckinEntry(checkin);
    setCheckinForm({
      checkin_status: checkin.checkin_status ?? 'expected',
      interview_status: checkin.interview_status ?? 'pending',
      result: checkin.result ?? 'pending',
      result_notes: checkin.result_notes ?? '',
    });
    setCheckinError('');
  }

  async function handleCheckinSave() {
    if (!editCheckinId) return;
    setCheckinError('');
    try {
      await updateCheckin({
        id: editCheckinId,
        event_id: eventId,
        checkin_status: checkinForm.checkin_status,
        interview_status: checkinForm.interview_status,
        result: checkinForm.result,
        result_notes: checkinForm.result_notes || undefined,
      }).unwrap();
      setEditCheckinId(null);
      setEditCheckinEntry(null);
    } catch (err: any) {
      setCheckinError(err?.data?.message ?? 'Update failed.');
    }
  }

  async function handleAddSelected() {
    if (selectedCandidateJobIds.length === 0) return;
    setAddCandError('');
    try {
      await addCandidatesToEvent({ id: eventId, candidate_job_ids: selectedCandidateJobIds }).unwrap();
      setShowAddCandidates(false);
      setSelectedCandidateJobIds([]);
      setCandidateSearch('');
    } catch (err: any) {
      setAddCandError(err?.data?.message ?? 'Failed to add candidates.');
    }
  }

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const inp = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all';
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1';

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <button
        onClick={() => navigate('/recruitment/interviews')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
      >
        <ArrowLeft size={15} />
        Interview Events
      </button>

      {/* Event header — prominent company identity + 5 status cards */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          {/* Company logo / initials avatar */}
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md">
            {(event.job?.company?.name || '?')
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((s: string) => s.charAt(0).toUpperCase())
              .join('')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {event.job?.company?.name || '—'}
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {(event.job?.positions ?? []).length > 0 ? (
                    (event.job?.positions ?? []).map((pos: any) => (
                      <span key={pos.id} className="badge-blue">
                        {pos.trade?.name || 'Trade'}
                        {pos.quantity ? ` · ${pos.quantity}` : ''}
                      </span>
                    ))
                  ) : event.job?.trade?.name ? (
                    <span className="badge-blue">{event.job.trade.name}</span>
                  ) : null}
                  {event.status && statusBadge(event.status)}
                  {event.interview_type && typeBadge(event.interview_type)}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600 mt-3">
                  {event.job?.country && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-400" />
                      <span className="font-medium">{COUNTRY_LABELS[event.job.country] || event.job.country}</span>
                    </span>
                  )}
                  {event.event_date && (
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck size={13} className="text-gray-400" />
                      <span className="font-semibold text-gray-700">
                        {new Date(event.event_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </span>
                  )}
                  {event.venue_name && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-400" /> {event.venue_name}
                      {event.venue_address ? <span className="text-gray-400">· {event.venue_address}</span> : null}
                    </span>
                  )}
                  {event.interviewer_name && (
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-gray-400" /> {event.interviewer_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="text-blue-600 font-mono font-semibold text-xs bg-blue-50 px-2.5 py-1 rounded-lg">
                  JOB-{String(event.job?.id || 0).padStart(5, '0')}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowMoreDetails(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Info size={12} /> More
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowAddMenu(prev => !prev);
                        setAddMenuStep('trade');
                        setSelectedAddTrade('');
                      }}
                      className="btn-primary text-sm"
                    >
                      <UserPlus size={14} /> Add Candidates <ChevronDown size={12} />
                    </button>
                    {showAddMenu && (
                      <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1">
                        {addMenuStep === 'trade' ? (
                          <>
                            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Select Trade</div>
                            {(event.job?.positions ?? []).length === 0 ? (
                              <div className="px-4 py-3 text-xs text-gray-400">No trades on this job.</div>
                            ) : (
                              (event.job?.positions ?? []).map((pos: any) => (
                                <button
                                  key={pos.id}
                                  onClick={() => {
                                    setSelectedAddTrade(pos.trade?.name || '');
                                    setAddMenuStep('source');
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Briefcase size={14} className="text-blue-600" />
                                  <span className="flex-1">{pos.trade?.name || 'Trade'}</span>
                                  <span className="text-xs text-gray-400">{pos.quantity} qty</span>
                                </button>
                              ))
                            )}
                          </>
                        ) : (
                          <>
                            <div className="px-4 py-2 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-blue-600 uppercase">
                                Trade: {selectedAddTrade}
                              </span>
                              <button
                                onClick={() => setAddMenuStep('trade')}
                                className="text-blue-500 text-[10px] font-medium hover:text-blue-700"
                              >
                                ← Change
                              </button>
                            </div>
                            <button
                              onClick={() => { setShowAddExisting(true); setShowAddMenu(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Search size={14} className="text-emerald-600" /> Quick Add by Search
                            </button>
                            <button
                              onClick={() => { setShowAddFromAssociate(true); setShowAddMenu(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Handshake size={14} className="text-violet-600" /> Sub-Agent / Associate (CSV)
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Status count cards */}
        {(() => {
          const resetFilters = () => {
            setFilterAttended('');
            setFilterResult('');
            setFilterSource('');
            setFilterSearch('');
            setActiveTradeTab('all');
          };
          const activeCard =
            filterResult === 'selected' ? 'selected'
              : filterResult === 'rejected' ? 'rejected'
                : filterResult === 'on_hold' ? 'on_hold'
                  : filterAttended === 'appeared' ? 'appeared'
                    : (!filterResult && !filterAttended && !filterSource) ? 'lined_up' : '';
          const cards = [
            { key: 'lined_up', label: 'Lined Up', value: stats.total, color: 'violet', onClick: resetFilters },
            { key: 'appeared', label: 'Appeared', value: stats.arrived, color: 'blue', onClick: () => { resetFilters(); setFilterAttended('appeared'); } },
            { key: 'selected', label: 'Selected', value: stats.selected, color: 'emerald', onClick: () => { resetFilters(); setFilterResult('selected'); } },
            { key: 'rejected', label: 'Rejected', value: stats.rejected, color: 'red', onClick: () => { resetFilters(); setFilterResult('rejected'); } },
            { key: 'on_hold', label: 'On Hold', value: checkins.filter(c => c.result === 'on_hold').length, color: 'amber', onClick: () => { resetFilters(); setFilterResult('on_hold'); } },
          ];
          const colorMap: Record<string, { bg: string; text: string; ring: string; border: string }> = {
            violet: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200', border: 'border-violet-200' },
            blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', border: 'border-blue-200' },
            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', border: 'border-emerald-200' },
            red: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', border: 'border-red-200' },
            amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', border: 'border-amber-200' },
          };
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
              {cards.map(c => {
                const m = colorMap[c.color];
                const active = activeCard === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={c.onClick}
                    className={`text-left rounded-2xl border p-3 transition-all ${active ? `${m.bg} ${m.border} ring-2 ${m.ring}` : `bg-white border-gray-100 hover:${m.border}`}`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${m.text}`}>{c.label}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-2xl font-bold ${m.text}`}>{c.value}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {event.notes && (
        <div className="card p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Notes</p>
          <p className="text-sm text-gray-600 whitespace-pre-line">{event.notes}</p>
        </div>
      )}

      {/* Candidates section */}
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold text-gray-900">Candidates in Event</h2>
            <span className="text-xs text-gray-400">
              · <span className="text-slate-600 font-semibold">{sourceCounts.internal}</span> internal
              · <span className="text-violet-600 font-semibold">{sourceCounts.subAgent}</span> sub-agent
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Upload size={13} /> Import CSV
            </button>
            <button
              onClick={() => exportCheckinsCsv(
                selected.size > 0 ? checkins.filter(c => selected.has(c.id)) : filteredCheckins,
                event.job?.company?.name ?? 'event'
              )}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Download size={13} /> Export CSV{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>

        {/* Trade tabs */}
        {availableTrades.length > 0 && (
          <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm overflow-x-auto">
            <button
              onClick={() => setActiveTradeTab('all')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${activeTradeTab === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              All ({checkins.length})
            </button>
            {availableTrades.map(t => {
              const count = checkins.filter((c: any) => {
                const cand = c.candidate_job?.candidate ?? c.candidate ?? {};
                return (c.candidate_job?.trade?.name ?? cand.position_1?.name) === t.name;
              }).length;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTradeTab(t.name)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${activeTradeTab === t.name ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {t.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Search name, code, phone, passport..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <select value={filterAttended} onChange={e => setFilterAttended(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:border-blue-400 text-gray-600">
            <option value="">All Attendance</option>
            <option value="appeared">Appeared</option>
            <option value="not_appeared">Not Appeared</option>
          </select>
          <select value={filterResult} onChange={e => setFilterResult(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:border-blue-400 text-gray-600">
            <option value="">All Status</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Interview Pending</option>
            <option value="on_hold">On Hold</option>
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:border-blue-400 text-gray-600">
            <option value="">All Sources</option>
            <option value="internal">Internal lineup</option>
            <option value="sub_agent">Sub-agent / Associate</option>
            {associates.length > 0 && (
              <optgroup label="Specific associate">
                {associates.map((a: any) => (
                  <option key={a.id} value={`associate:${a.id}`}>{a.full_name}</option>
                ))}
              </optgroup>
            )}
          </select>
          {(filterAttended || filterResult || filterSearch || filterSource) && (
            <button
              onClick={() => { setFilterAttended(''); setFilterResult(''); setFilterSearch(''); setFilterSource(''); }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <X size={11} /> Clear
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filteredCheckins.length} of {checkins.length}</span>
        </div>

        {/* Selection action bar */}
        {selected.size > 0 && (
          <div className="bg-violet-600 text-white rounded-2xl px-5 py-2.5 flex items-center gap-4 shadow-lg">
            <div className="flex items-center gap-2 flex-1">
              <CheckSquare size={14} />
              <span className="font-semibold text-sm">{selected.size} selected</span>
            </div>
            <button
              onClick={() => exportCheckinsCsv(checkins.filter(c => selected.has(c.id)), event.job?.company?.name ?? 'event')}
              className="flex items-center gap-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} /> Export Selected
            </button>
            <button
              onClick={async () => {
                const selectedCheckins = checkins.filter((c: any) => selected.has(c.id) && c.result === 'selected');
                const candidateJobIds = selectedCheckins.map((c: any) => c.candidate_job_id).filter(Boolean);
                if (candidateJobIds.length === 0) {
                  toast.error('No selected candidates with "Selected" result to assign');
                  return;
                }
                try {
                  await batchFromInterview({ candidate_job_ids: candidateJobIds }).unwrap();
                  toast.success(`${candidateJobIds.length} candidate(s) assigned to process management`);
                  setSelected(new Set());
                } catch (e) {
                  toast.error('Failed to assign to process management');
                }
              }}
              disabled={assigningProcess}
              className="flex items-center gap-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ClipboardList size={13} /> Assign to Process
            </button>
            <button onClick={() => setSelected(new Set())} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/30 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Candidates table */}
        <div className="card overflow-hidden">
          {checkinsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : checkins.length === 0 ? (
            <div className="py-14 text-center">
              <Users size={36} className="text-gray-200 mx-auto mb-3" strokeWidth={1} />
              <p className="text-gray-400 font-medium">No candidates added yet</p>
              <p className="text-xs text-gray-300 mt-1">Use "Add Candidates" or import a CSV</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700 text-white text-[11px] font-semibold">
                    <th className="px-3 py-2.5 w-10">
                      <button onClick={toggleAll} className="flex items-center justify-center text-white/80 hover:text-white">
                        {allSel ? <CheckSquare size={13} /> : <Square size={13} />}
                      </button>
                    </th>
                    <th className="px-3 py-2.5 w-8"></th>
                    <th className="px-3 py-2.5 text-left">CL#</th>
                    <th className="px-3 py-2.5 text-left">Candidate</th>
                    <th className="px-3 py-2.5 text-left">Passport</th>
                    <th className="px-3 py-2.5 text-left">Trade</th>
                    <th className="px-3 py-2.5 text-left">Phone</th>
                    <th className="px-3 py-2.5 text-left">ECR</th>
                    <th className="px-3 py-2.5 text-left">Sub-agent / Associate</th>
                    <th className="px-3 py-2.5 text-left">Check-in</th>
                    <th className="px-3 py-2.5 text-left">Result</th>
                    <th className="px-3 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCheckins.map((checkin: any, idx: number) => {
                    const cand = checkin.candidate_job?.candidate ?? checkin.candidate ?? {};
                    const name = cand.full_name ?? `Candidate ${checkin.candidate_job_id}`;
                    const code = cand.candidate_code ?? '';
                    const phone = cand.whatsapp_no ?? cand.mobile_no ?? '';
                    const passport = cand.passport_no ?? '';
                    const trade = checkin.candidate_job?.trade?.name ?? cand.position_1?.name ?? '—';
                    const ecr = cand.ecr_type ?? '';
                    const state = cand.state?.name ?? '';
                    const city = cand.city?.name ?? '';
                    const isSel = selected.has(checkin.id);
                    const isExpanded = expandedRow === checkin.id;
                    const age = ageFromDob(cand.dob);
                    const isSubAgent = isSubAgentSourced(cand);
                    const associateName = cand.associate?.full_name ?? '';

                    return (
                      <Fragment key={checkin.id}>
                        <tr
                          className={`border-b border-gray-50 text-xs transition-colors ${isSel ? 'bg-violet-50' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/30 hover:bg-gray-50/60'}`}
                        >
                          <td className="px-3 py-2.5">
                            <button onClick={() => toggleOne(checkin.id)} className="flex items-center justify-center text-gray-400 hover:text-violet-600">
                              {isSel ? <CheckSquare size={13} className="text-violet-600" /> : <Square size={13} />}
                            </button>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : checkin.id)}
                              className="text-gray-400 hover:text-gray-700 inline-flex items-center"
                              title={isExpanded ? 'Collapse' : 'Expand details'}
                            >
                              <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-blue-600 font-semibold">{code || '—'}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-gray-800">{name}</div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-gray-600">{passport || '—'}</td>
                          <td className="px-3 py-2.5 text-gray-600">{trade}</td>
                          <td className="px-3 py-2.5 font-mono text-gray-600">
                            {phone ? <a href={`tel:${phone}`} className="hover:text-blue-600 flex items-center gap-1"><Phone size={10} className="text-gray-400" />{phone}</a> : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {ecr ? (
                              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase ${ecr === 'ecr' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {ecr}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {isSubAgent && associateName ? (
                              <div className="text-amber-700 font-semibold">{associateName}</div>
                            ) : isSubAgent ? (
                              <span className="text-amber-600 text-[11px] font-medium">Sub-agent</span>
                            ) : (
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">In-House</span>
                            )}
                            {cand.referrer?.name && !associateName && <div className="text-violet-600 text-[10px] mt-0.5">ref: {cand.referrer.name}</div>}
                          </td>
                          <td className="px-3 py-2.5">{checkinBadge(checkin.checkin_status)}</td>
                          <td className="px-3 py-2.5">{resultBadge(checkin.result)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => openCheckinEdit(checkin)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Edit2 size={10} /> Update
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-blue-50/20 border-b border-gray-100 text-xs">
                            <td colSpan={12} className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-xs">
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Age / DOB</div>
                                  <div className="text-gray-700">
                                    {age ? `${age} yrs` : '—'}
                                    {cand.dob && <span className="text-gray-400 ml-1">· {new Date(cand.dob).toLocaleDateString('en-IN')}</span>}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Gender</div>
                                  <div className="text-gray-700 capitalize">{cand.gender || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Interview Status</div>
                                  <div>{interviewStatusBadge(checkin.interview_status)}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Education</div>
                                  <div className="text-gray-700">{cand.education || cand.education_other || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Indian Experience</div>
                                  <div className="text-gray-700">{cand.indian_experience || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Abroad Experience</div>
                                  <div className="text-gray-700">{cand.abroad_experience || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Location</div>
                                  <div className="text-gray-700">{state || city ? `${state}${state && city ? ' / ' : ''}${city}` : '—'}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Result Notes</div>
                                  <div className="text-gray-700 whitespace-pre-line">{checkin.result_notes || '—'}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {filteredCheckins.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-sm text-gray-400">No candidates match filters</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── More Details Modal (read-only company / job info) ────────── */}
      {showMoreDetails && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-900">Interview Details</h2>
              <button onClick={() => setShowMoreDetails(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Company */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm">
                  {(() => {
                    const name = event.job?.company?.name || '??';
                    const parts = name.trim().split(/\s+/);
                    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
                  })()}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</div>
                  <div className="text-lg font-bold text-gray-900">{event.job?.company?.name ?? '—'}</div>
                  {event.job?.job_code && <div className="text-xs text-blue-600 font-mono mt-0.5">{event.job.job_code}</div>}
                </div>
              </div>

              {/* Positions — vacancies + salary per trade */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Briefcase size={11} /> Trade Positions
                </div>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Trade</th>
                        <th className="px-3 py-2 text-right font-semibold">Vacancies</th>
                        <th className="px-3 py-2 text-right font-semibold">Salary</th>
                        <th className="px-3 py-2 text-center font-semibold">Acc.</th>
                        <th className="px-3 py-2 text-center font-semibold">Trans.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(event.job?.positions ?? []).length === 0 ? (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-400">No positions</td></tr>
                      ) : (event.job?.positions ?? []).map((pos: any) => (
                        <tr key={pos.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-semibold text-gray-800">{pos.trade?.name || 'Trade'}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700">{pos.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700">
                            {pos.salary ? `${event.job?.salary_currency ?? ''} ${Number(pos.salary).toLocaleString()}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500">{pos.accommodation ? '✓' : '—'}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{pos.transportation ? '✓' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Job-level totals */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Vacancies</div>
                  <div className="text-sm font-semibold text-gray-800">{event.job?.positions_required ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Service Fee</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {event.job?.service_fee ? `${event.job?.salary_currency ?? ''} ${Number(event.job.service_fee).toLocaleString()}` : '—'}
                  </div>
                </div>
              </div>

              {/* Interview meta */}
              <div className="pt-4 border-t border-gray-100">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CalendarCheck size={11} /> Interview
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Date</div>
                    <div className="text-gray-700">{fmtDate(event.event_date)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Type</div>
                    <div>{event.interview_type ? typeBadge(event.interview_type) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Venue</div>
                    <div className="text-gray-700">{event.venue_name || '—'}</div>
                    {event.venue_address && <div className="text-gray-500 text-[11px] mt-0.5">{event.venue_address}</div>}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Interviewer</div>
                    <div className="text-gray-700">{event.interviewer_name || '—'}</div>
                  </div>
                </div>
                {event.notes && (
                  <div className="mt-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Notes</div>
                    <div className="text-xs text-gray-600 whitespace-pre-line bg-gray-50 rounded-xl px-3 py-2">{event.notes}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
              <button onClick={() => setShowMoreDetails(false)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update Checkin Modal ─────────────────────────────────────── */}
      {editCheckinId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Update Candidate</h2>
                {editCheckinEntry && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {editCheckinEntry.candidate_job?.candidate?.full_name ?? '—'} · {editCheckinEntry.candidate_job?.candidate?.candidate_code ?? ''}
                  </p>
                )}
              </div>
              <button onClick={() => { setEditCheckinId(null); setEditCheckinEntry(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {checkinError && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-2.5">{checkinError}</div>}
              <div>
                <label className={lbl}>Check-in Status</label>
                <select value={checkinForm.checkin_status} onChange={e => setCheckinForm(f => ({ ...f, checkin_status: e.target.value }))} className={inp}>
                  {CHECKIN_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Interview Status</label>
                <select value={checkinForm.interview_status} onChange={e => setCheckinForm(f => ({ ...f, interview_status: e.target.value }))} className={inp}>
                  {INTERVIEW_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Result</label>
                <select value={checkinForm.result} onChange={e => setCheckinForm(f => ({ ...f, result: e.target.value }))} className={inp}>
                  {RESULT_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Result Notes</label>
                <textarea value={checkinForm.result_notes} onChange={e => setCheckinForm(f => ({ ...f, result_notes: e.target.value }))} rows={2} placeholder="Optional notes..." className={inp + ' resize-none'} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setEditCheckinId(null); setEditCheckinEntry(null); }} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleCheckinSave} disabled={updatingCheckin} className="btn-primary text-sm">
                {updatingCheckin ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Candidates Modal ─────────────────────────────────────── */}
      {showAddCandidates && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">Add Candidates</h2>
                <p className="text-xs text-gray-400 mt-0.5">Lined-up candidates for this job</p>
              </div>
              <button onClick={() => { setShowAddCandidates(false); setSelectedCandidateJobIds([]); setCandidateSearch(''); setAddCandError(''); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-3 border-b border-gray-50 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} placeholder="Search by name or code..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white" />
              </div>
            </div>
            {addCandError && (
              <div className="mx-6 mt-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-2.5 flex-shrink-0">{addCandError}</div>
            )}
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5 min-h-0">
              {filteredCandidates.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  {pipelineCandidates.length === 0 ? 'No lined-up candidates for this job.' : 'No candidates match search.'}
                </p>
              ) : filteredCandidates.map((entry: any) => {
                const cand = entry.candidate ?? {};
                const isSelected = selectedCandidateJobIds.includes(entry.id);
                return (
                  <label key={entry.id} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => setSelectedCandidateJobIds(prev => isSelected ? prev.filter(x => x !== entry.id) : [...prev, entry.id])} className="accent-blue-600 w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800">{cand.full_name ?? `Candidate ${entry.id}`}</div>
                      <div className="text-xs text-gray-400">
                        {cand.candidate_code}
                        {(entry.trade?.name ?? cand.position_1?.name) ? ` · ${entry.trade?.name ?? cand.position_1?.name}` : ''}
                        {cand.state?.name ? ` · ${cand.state.name}` : ''}
                      </div>
                    </div>
                    {cand.registration_mode && modeBadge(cand.registration_mode)}
                  </label>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
              <span className="text-xs text-gray-400">{selectedCandidateJobIds.length} selected</span>
              <div className="flex gap-2">
                <button onClick={() => { setShowAddCandidates(false); setSelectedCandidateJobIds([]); setCandidateSearch(''); setAddCandError(''); }} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleAddSelected} disabled={selectedCandidateJobIds.length === 0 || addingCandidates} className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  {addingCandidates ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : `Add (${selectedCandidateJobIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Existing Candidate Modal ──────────────────────────────── */}
      {showAddExisting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">Add Existing Candidate</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedAddTrade ? <>Trade: <span className="text-blue-600 font-semibold">{selectedAddTrade}</span> · </> : null}
                  Search by name, phone, passport, or code
                </p>
              </div>
              <button onClick={() => { setShowAddExisting(false); setExistingSearch(''); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-3 border-b border-gray-50 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={existingSearch} onChange={e => setExistingSearch(e.target.value)} placeholder="Type at least 2 characters..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5 min-h-0">
              {existingSearch.length < 2 ? (
                <p className="text-sm text-gray-400 text-center py-8">Type to search candidates...</p>
              ) : existingCandidates.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No candidates found.</p>
              ) : existingCandidates.map((cand: any) => (
                <button
                  key={cand.id}
                  disabled={addingMaster}
                  onClick={async () => {
                    if (!event.job_id) { toast.error('This event is not linked to a job'); return; }
                    const tradeName = selectedAddTrade || event.job?.positions?.[0]?.trade?.name;
                    let matchedTrade = trades.find((t: any) => t.name === tradeName);
                    if (!matchedTrade) {
                      matchedTrade = trades.find((t: any) => (t.name || '').toLowerCase() === String(tradeName || '').toLowerCase());
                    }
                    if (!matchedTrade) {
                      const jobTradeId = event.job?.positions?.[0]?.trade?.id;
                      if (jobTradeId) matchedTrade = { id: jobTradeId, name: tradeName };
                    }
                    if (!matchedTrade) { toast.error(`Trade "${tradeName || 'Unknown'}" not found on job`); return; }
                    try {
                      await addMasterCandidate({
                        event_id: eventId,
                        candidate_id: cand.id,
                        trade_id: matchedTrade.id,
                      }).unwrap();
                      toast.success(`${cand.full_name} added to interview`);
                      setShowAddExisting(false);
                      setExistingSearch('');
                    } catch (e: any) {
                      toast.error(e?.data?.message || 'Failed to add candidate');
                    }
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-800">{cand.full_name}</div>
                    <div className="text-xs text-gray-400">
                      {cand.candidate_code}
                      {cand.whatsapp_no ? ` · ${cand.whatsapp_no}` : ''}
                      {cand.passport_no ? ` · ${cand.passport_no}` : ''}
                    </div>
                  </div>
                  <UserPlus size={14} className="text-blue-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Agent / Associate CSV Modal ─────────────────────────── */}
      {showAddFromAssociate && (
        <SubAgentCsvModal
          eventId={eventId}
          trades={trades}
          positions={event.job?.positions ?? []}
          associates={associates}
          initialTrade={selectedAddTrade}
          adding={addingSubAgent}
          onClose={() => setShowAddFromAssociate(false)}
          onSubmit={async ({ associate_id, trade_id, rows }) => {
            const res = await addSubAgentCandidates({
              event_id: eventId,
              associate_id,
              trade_id,
              rows,
            }).unwrap();
            toast.success(`${res.created} candidate(s) added${res.errors.length ? ` · ${res.errors.length} errors` : ''}`);
            setShowAddFromAssociate(false);
          }}
        />
      )}

      {/* ── Import CSV Modal ─────────────────────────────────────────── */}
      {showImportModal && (
        <ImportCandidatesModal
          eventId={eventId}
          positions={event.job?.positions ?? []}
          existingCheckins={checkins}
          onClose={() => setShowImportModal(false)}
          onImported={() => refetchEvent()}
        />
      )}
    </div>
  );
}
