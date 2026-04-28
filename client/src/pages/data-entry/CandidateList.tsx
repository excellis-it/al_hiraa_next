import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router';
import {
  UserPlus, Search, ChevronLeft, ChevronRight, Eye, ChevronDown,
  MessageSquare, Mail, Phone, Download, Upload, Filter, X, CheckSquare, Square,
  Users, ChevronsLeft, ChevronsRight, Briefcase, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import Select from '../../components/ui/Select';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { useGetCandidatesQuery, useCheckPhonesBulkMutation, useBulkImportAllMutation } from '../../store/api/candidatesApi';
import { useGetTradesQuery, useGetSourcesQuery, useGetStatesQuery, useGetCitiesQuery } from '../../store/api/mastersApi';
import { useGetCompaniesQuery } from '../../store/api/companiesApi';
import { useGetJobsQuery } from '../../store/api/jobsApi';
import { useAddToPipelineMutation } from '../../store/api/pipelineApi';
import CandidateDetailDrawer from './CandidateDetailDrawer';
import FloatingScrollbar from '../../components/ui/FloatingScrollbar';

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'candidate_code',       label: 'Code',            width: 110, sticky: false },
  { key: 'status',               label: 'Status',          width: 100, sticky: false },
  { key: 'last_call_status',     label: 'Last Call',       width: 90,  sticky: false },
  { key: 'created_at',           label: 'Date Registered', width: 130, sticky: false },
  { key: 'updated_at',           label: 'Last Updated',    width: 120, sticky: false },
  { key: 'registered_by_name',   label: 'Entered By',      width: 120, sticky: false },
  { key: 'full_name',            label: 'Full Name',       width: 180, sticky: false },
  { key: 'gender',               label: 'Gender',          width: 80,  sticky: false },
  { key: 'dob',                  label: 'DOB',             width: 110, sticky: false },
  { key: 'age',                  label: 'Age',             width: 55,  sticky: false },
  { key: 'education',            label: 'Education',       width: 120, sticky: false },
  { key: 'education_other',      label: 'Other Education', width: 150, sticky: false },
  { key: 'email',                label: 'Email',           width: 180, sticky: false },
  { key: 'religion',             label: 'Religion',        width: 100, sticky: false },
  { key: 'state',                label: 'State',           width: 120, sticky: false },
  { key: 'city',                 label: 'City',            width: 120, sticky: false },
  { key: 'ecr_type',             label: 'ECR Type',        width: 90,  sticky: false },
  { key: 'passport_no',          label: 'Passport No',     width: 130, sticky: false },
  { key: 'position_1',           label: 'Position 1',      width: 160, sticky: false },
  { key: 'position_2',           label: 'Position 2',      width: 160, sticky: false },
  { key: 'position_3',           label: 'Position 3',      width: 160, sticky: false },
  { key: 'registration_mode',    label: 'Reg. Mode',       width: 110, sticky: false },
  { key: 'source',               label: 'Source',          width: 130, sticky: false },
  { key: 'referred_by',          label: 'Referred By',     width: 130, sticky: false },
  { key: 'associate',            label: 'Associate',       width: 130, sticky: false },
  { key: 'indian_driving_license', label: 'Indian DL',     width: 100, sticky: false },
  { key: 'gulf_driving_license', label: 'Gulf DL',         width: 100, sticky: false },
  { key: 'english_speaking',     label: 'English',         width: 100, sticky: false },
  { key: 'arabic_speaking',      label: 'Arabic',          width: 75,  sticky: false },
  { key: 'gulf_return',          label: 'Gulf Return',     width: 90,  sticky: false },
  { key: 'indian_experience',    label: 'Indian Exp.',     width: 150, sticky: false },
  { key: 'abroad_experience',    label: 'Abroad Exp.',     width: 150, sticky: false },
  { key: 'remarks',              label: 'Remarks',         width: 200, sticky: false },
];

// ── Badge helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-500',
    deployed: 'bg-blue-100 text-blue-700',
    blacklisted: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${colors[value] || 'bg-gray-100 text-gray-500'}`}>
      {value}
    </span>
  );
}

function CallStatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  const colors: Record<string, string> = {
    reached: 'bg-emerald-100 text-emerald-700',
    not_reachable: 'bg-gray-100 text-gray-500',
    follow_up: 'bg-amber-100 text-amber-700',
    not_interested: 'bg-red-100 text-red-700',
    interested: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${colors[value] || 'bg-gray-100 text-gray-500'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

function InterviewBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  const colors: Record<string, string> = {
    selected: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    on_hold: 'bg-amber-100 text-amber-700',
    arrived: 'bg-blue-100 text-blue-700',
    expected: 'bg-gray-100 text-gray-500',
    no_show: 'bg-rose-100 text-rose-700',
  };
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${colors[value] || 'bg-gray-100 text-gray-500'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

// ── Cell renderer ─────────────────────────────────────────────────────────────

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function fmtDate(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function CellValue({ col, row }: { col: string; row: any }) {
  switch (col) {
    case 'status': return <StatusBadge value={row.status} />;
    case 'completion_status':
      return (
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${row.completion_status === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {row.completion_status}
        </span>
      );
    case 'last_call_status': return <CallStatusBadge value={row.last_call_status} />;
    case 'interview_status': return <InterviewBadge value={row.interview_status} />;
    case 'created_at': return <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.created_at)}</span>;
    case 'updated_at': return <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.updated_at)}</span>;
    case 'dob': return <span className="text-xs text-gray-600 whitespace-nowrap">{fmtDate(row.dob)}</span>;
    case 'age': return <span className="text-xs text-gray-600">{calcAge(row.dob) ?? '—'}</span>;
    case 'full_name':
      return <span className="font-semibold text-gray-800 text-xs whitespace-nowrap">{row.full_name}</span>;
    case 'gender':
      return <span className="text-xs text-gray-600 capitalize">{row.gender || '—'}</span>;
    case 'whatsapp_no': case 'alternate_contact':
      return <span className="font-mono text-xs text-gray-600">{row[col] || '—'}</span>;
    case 'email':
      return <span className="text-xs text-gray-600 truncate max-w-[170px] block">{row.email || '—'}</span>;
    case 'state': return <span className="text-xs text-gray-600">{row.state?.name || '—'}</span>;
    case 'city': return <span className="text-xs text-gray-600">{row.city?.name || '—'}</span>;
    case 'position_1': return <span className="text-xs text-blue-700 font-medium">{row.position_1?.name || '—'}</span>;
    case 'position_2': return <span className="text-xs text-gray-600">{row.position_2?.name || '—'}</span>;
    case 'position_3': return <span className="text-xs text-gray-600">{row.position_3?.name || '—'}</span>;
    case 'source': return <span className="text-xs text-gray-600">{row.source?.name || '—'}</span>;
    case 'associate': return <span className="text-xs text-gray-600">{row.associate?.full_name || '—'}</span>;
    case 'passport_no':
      return row.passport_no
        ? <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{row.passport_no}</span>
        : <span className="text-gray-300 text-xs">—</span>;
    case 'candidate_code':
      return <span className="font-mono text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">{row.candidate_code}</span>;
    case 'indian_driving_license':
      return <span className="text-xs text-gray-600">{(row.indian_driving_license || []).join(', ') || '—'}</span>;
    case 'gulf_driving_license':
      return <span className="text-xs text-gray-600">{(row.gulf_driving_license || []).join(', ') || '—'}</span>;
    case 'arabic_speaking':
      return <span className="text-xs text-gray-600">{row.arabic_speaking ? 'Yes' : 'No'}</span>;
    case 'gulf_return':
      return <span className="text-xs text-gray-600">{row.gulf_return ? 'Yes' : 'No'}</span>;
    case 'english_speaking':
      return <span className="text-xs text-gray-600 capitalize">{row.english_speaking?.replace(/_/g, ' ') || '—'}</span>;
    case 'ecr_type':
      return <span className="text-xs text-gray-600 uppercase">{row.ecr_type || '—'}</span>;
    case 'registration_mode':
      return <span className="text-xs text-gray-600 capitalize">{row.registration_mode?.replace(/_/g, ' ') || '—'}</span>;
    case 'remarks':
      return <span className="text-xs text-gray-500 line-clamp-1">{row.remarks || '—'}</span>;
    case 'registered_by_name':
      return <span className="text-xs text-gray-600">{row.registered_by_name || '—'}</span>;
    case 'referred_by':
      return <span className="text-xs text-gray-600">{row.referrer?.name || '—'}</span>;
    default:
      return <span className="text-xs text-gray-600">{row[col] ?? '—'}</span>;
  }
}

// ── Column header filter dropdown ─────────────────────────────────────────────

const COLUMN_FILTER_OPTIONS: Record<string, string[]> = {
  status: ['active', 'inactive', 'deployed', 'blacklisted'],
  completion_status: ['complete', 'incomplete'],
  gender: ['male', 'female'],
  ecr_type: ['ecr', 'ecnr'],
  gulf_return: ['true', 'false'],
  arabic_speaking: ['true', 'false'],
};

function ColFilter({
  col,
  value,
  onChange,
}: {
  col: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = COLUMN_FILTER_OPTIONS[col];
  if (!opts) return null;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        className={`ml-1 p-0.5 rounded hover:bg-white/30 transition-colors ${value ? 'text-white' : 'text-white/50'}`}
        onClick={(e) => {
          e.stopPropagation();
          const next = document.getElementById(`col-filter-${col}`);
          if (next) next.focus();
        }}
      >
        <ChevronDown size={10} />
      </button>
      <select
        id={`col-filter-${col}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer"
        style={{ fontSize: '1px' }}
      >
        <option value="">All</option>
        {opts.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Bulk message modal ────────────────────────────────────────────────────────

type MsgChannel = 'sms' | 'email' | 'whatsapp';

function BulkMessageModal({
  channel,
  count,
  onClose,
}: {
  channel: MsgChannel;
  count: number;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const icons: Record<MsgChannel, React.ReactNode> = {
    sms: <Phone size={18} className="text-blue-600" />,
    email: <Mail size={18} className="text-blue-600" />,
    whatsapp: <MessageSquare size={18} className="text-green-600" />,
  };

  const titles: Record<MsgChannel, string> = {
    sms: 'Send SMS',
    email: 'Send Email',
    whatsapp: 'Send WhatsApp',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {icons[channel]}
            <span className="font-semibold text-gray-800">{titles[channel]}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count} recipients</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {channel === 'email' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Type your ${channel === 'email' ? 'email body' : 'message'} here...`}
              rows={5}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
          {(channel === 'whatsapp' || channel === 'email') && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Attach Image <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              {imageFile ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                  <span className="flex-1 truncate">{imageFile.name}</span>
                  <button onClick={() => setImageFile(null)} className="text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors"
                >
                  <Download size={13} />
                  Choose Image
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            disabled={!message.trim()}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {icons[channel]}
            Send to {count} {count === 1 ? 'candidate' : 'candidates'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Import CSV Modal (All Candidates) ────────────────────────────────────────

const IMPORT_COLS = [
  'full_name', 'whatsapp_no', 'alternate_contact', 'dob', 'gender', 'email',
  'passport_no', 'ecr_type', 'state', 'city', 'religion', 'education', 'education_other',
  'position_1', 'position_2', 'position_3', 'registration_mode', 'source', 'referred_by',
  'associate_name', 'indian_driving_license', 'gulf_driving_license', 'english_speaking',
  'arabic_speaking', 'gulf_return', 'gulf_return_details', 'indian_experience', 'abroad_experience',
  'remarks',
] as const;

const IMPORT_SAMPLE = [
  'John Doe', '9876543210', '9876543211', '1995-05-20', 'male', 'john@example.com',
  'A1234567', 'ecr', 'Maharashtra', 'Mumbai', 'Islam', 'iti', '',
  'Welder', '', '', 'walk_in', 'Walk-in', '', '',
  'LMV', '', 'basic', 'no', 'no', '', '2 years', '', 'Sample remark',
];

function parseCsvImportLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

type ImportRow = Record<string, string> & { _rowIndex: number; _error?: string };

function ImportModal({ onClose }: { onClose: () => void }) {
  type Step = 'upload' | 'preview' | 'done';
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; duplicates: any[]; errors: { row: any; error: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [checkPhones] = useCheckPhonesBulkMutation();
  const [bulkImport] = useBulkImportAllMutation();

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) { toast.error('CSV has no data rows'); return; }

    const rawHeaders = parseCsvImportLine(lines[0]);
    const headers = rawHeaders.map((h) =>
      h.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    );

    const parsed: ImportRow[] = lines.slice(1).map((line, idx) => {
      const cols = parseCsvImportLine(line);
      const row: ImportRow = { _rowIndex: idx + 2 };
      headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });
      if (!row.full_name?.trim()) row._error = 'missing full_name';
      else if (!row.whatsapp_no?.trim()) row._error = 'missing whatsapp_no (phone)';
      return row;
    });

    setRows(parsed);

    const phones = parsed.filter((r) => !r._error && r.whatsapp_no).map((r) => r.whatsapp_no);
    if (phones.length) {
      setChecking(true);
      try {
        const res = await checkPhones(phones).unwrap();
        setExistingPhones(new Set(res.existing));
      } catch { /* proceed without check */ }
      setChecking(false);
    }

    setStep('preview');
  };

  const rowStatus = (r: ImportRow): 'invalid' | 'duplicate' | 'new' => {
    if (r._error) return 'invalid';
    if (existingPhones.has(r.whatsapp_no?.trim())) return 'duplicate';
    return 'new';
  };

  const newRows = rows.filter((r) => rowStatus(r) === 'new');
  const dupRows = rows.filter((r) => rowStatus(r) === 'duplicate');
  const invalidRows = rows.filter((r) => rowStatus(r) === 'invalid');

  const handleImport = async () => {
    if (!newRows.length) { toast.error('No new rows to import'); return; }
    setImporting(true);
    try {
      const res = await bulkImport(newRows).unwrap();
      setResult(res);
      setStep('done');
    } catch (e: any) {
      toast.error(e?.data?.message || 'Import failed');
    }
    setImporting(false);
  };

  const downloadRowsAsCsv = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = IMPORT_COLS.join(',');
    const csvRows = data.map((r) =>
      IMPORT_COLS.map((col) => `"${String(r[col] ?? '').replace(/"/g, '""')}"`).join(','),
    );
    const blob = new Blob([headers + '\n' + csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csv = IMPORT_COLS.join(',') + '\n' + IMPORT_SAMPLE.join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidates-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setRows([]);
    setFileName('');
    setExistingPhones(new Set());
    setStep('upload');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Upload size={16} className="text-blue-600" />
            <div>
              <span className="font-semibold text-gray-800">Import Candidates from CSV</span>
              <p className="text-xs text-gray-400 mt-0.5">
                <strong>whatsapp_no</strong> is the duplicate key — mandatory along with <strong>full_name</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 space-y-4">

          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-1.5">
                  CSV columns ({IMPORT_COLS.length} fields — matches all candidate data columns)
                </p>
                <p className="text-[11px] text-blue-600 font-mono leading-relaxed break-all">
                  {IMPORT_COLS.join(', ')}
                </p>
                <p className="text-[10px] text-blue-500 mt-2">
                  Values: gender → male/female · ecr_type → ecr/ecnr · arabic_speaking/gulf_return → yes/no ·
                  english_speaking → none/basic/intermediate/fluent · registration_mode → walk_in/online/associate/camp ·
                  indian_driving_license → comma-separated (LMV,HMV)
                </p>
                <button onClick={downloadTemplate} className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                  <Download size={11} /> Download template with sample row
                </button>
              </div>

              <input
                ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-blue-300 px-4 py-10 rounded-xl transition-colors cursor-pointer"
              >
                <Upload size={28} className="text-gray-300" />
                <span className="text-sm font-medium text-gray-500">Click to choose a CSV file</span>
                <span className="text-xs text-gray-400">Supports files with up to 5,000 rows</span>
              </div>
            </>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && (
            <>
              {checking && (
                <div className="flex items-center gap-2 text-sm text-blue-600 py-1">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Checking for duplicates…
                </div>
              )}

              {/* Summary chips */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
                  <div className="text-xl font-bold text-gray-700">{rows.length}</div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-center">
                  <UserPlus size={14} className="text-emerald-700 mx-auto mb-1" />
                  <div className="text-xl font-bold text-emerald-700">{newRows.length}</div>
                  <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">New</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-center">
                  <AlertTriangle size={14} className="text-amber-700 mx-auto mb-1" />
                  <div className="text-xl font-bold text-amber-700">{dupRows.length}</div>
                  <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Duplicate</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-center">
                  <X size={14} className="text-red-700 mx-auto mb-1" />
                  <div className="text-xl font-bold text-red-700">{invalidRows.length}</div>
                  <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Invalid</div>
                </div>
              </div>

              <p className="text-xs text-gray-400">{fileName} · {rows.length} rows parsed</p>

              {/* Preview table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-gray-500">
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
                        <th className="px-3 py-2 text-left font-semibold">#</th>
                        <th className="px-3 py-2 text-left font-semibold">Full Name</th>
                        <th className="px-3 py-2 text-left font-semibold">Phone</th>
                        <th className="px-3 py-2 text-left font-semibold">Passport</th>
                        <th className="px-3 py-2 text-left font-semibold">Gender</th>
                        <th className="px-3 py-2 text-left font-semibold">Position 1</th>
                        <th className="px-3 py-2 text-left font-semibold">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const st = rowStatus(r);
                        const badge = {
                          new: 'bg-emerald-50 text-emerald-700',
                          duplicate: 'bg-amber-50 text-amber-700',
                          invalid: 'bg-red-50 text-red-700',
                        }[st];
                        const label = { new: 'New', duplicate: 'Duplicate', invalid: 'Invalid' }[st];
                        return (
                          <tr key={r._rowIndex} className="border-t border-gray-50">
                            <td className="px-3 py-1.5">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${badge}`}>{label}</span>
                              {r._error && <div className="text-[10px] text-red-500 mt-0.5">{r._error}</div>}
                            </td>
                            <td className="px-3 py-1.5 text-gray-400 font-mono">{r._rowIndex}</td>
                            <td className="px-3 py-1.5 text-gray-800 font-medium whitespace-nowrap">{r.full_name || '—'}</td>
                            <td className="px-3 py-1.5 font-mono text-gray-600">{r.whatsapp_no || '—'}</td>
                            <td className="px-3 py-1.5 font-mono text-gray-500">{r.passport_no || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500 capitalize">{r.gender || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{r.position_1 || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{r.state || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button onClick={reset} className="btn-secondary text-sm">← Re-upload</button>
                <div className="flex items-center gap-2">
                  {dupRows.length > 0 && (
                    <button
                      onClick={() => downloadRowsAsCsv(dupRows, `duplicates-${new Date().toISOString().slice(0, 10)}.csv`)}
                      className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-300 px-3 py-2 rounded-xl transition-colors"
                    >
                      <Download size={12} /> Download {dupRows.length} duplicates
                    </button>
                  )}
                  <button
                    onClick={handleImport}
                    disabled={importing || newRows.length === 0}
                    className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</>
                    ) : (
                      <><Upload size={13} /> Import {newRows.length} new row{newRows.length === 1 ? '' : 's'}</>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && result && (
            <>
              <div className="flex items-center justify-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">Import complete</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {result.added} added · {result.duplicates.length} duplicates · {result.errors.length} errors
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{result.added}</div>
                  <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mt-0.5">Added</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{result.duplicates.length}</div>
                  <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mt-0.5">Duplicates</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                  <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mt-0.5">Errors</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Import errors</p>
                  <ul className="text-xs text-red-600 space-y-0.5 max-h-28 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono">{e.row?.full_name || `Row ${i + 1}`}</span>: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                {result.duplicates.length > 0 ? (
                  <button
                    onClick={() => downloadRowsAsCsv(result.duplicates, `duplicates-${new Date().toISOString().slice(0, 10)}.csv`)}
                    className="flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-300 px-4 py-2 rounded-xl transition-colors"
                  >
                    <Download size={14} /> Download {result.duplicates.length} duplicates CSV
                  </button>
                ) : <div />}
                <button onClick={onClose} className="btn-primary text-sm">Done</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Assign to Job Modal ───────────────────────────────────────────────────────

function AssignToJobModal({
  candidateIds,
  onClose,
}: {
  candidateIds: number[];
  onClose: () => void;
}) {
  const [companyId, setCompanyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

  const { data: companiesData } = useGetCompaniesQuery({ limit: 200 } as any);
  const { data: jobsData } = useGetJobsQuery(
    { company_id: Number(companyId), status: 'open,interviews_scheduled,in_process', limit: 100 },
    { skip: !companyId }
  );
  const [addToPipeline] = useAddToPipelineMutation();

  const companies: any[] = companiesData?.data || [];
  const jobs: any[] = jobsData?.data || [];

  const selectedJob = jobs.find(j => j.id === Number(jobId));

  const handleAssign = async () => {
    if (!jobId || !candidateIds.length) return;
    setAssigning(true);
    let success = 0, errors = 0;
    for (const cid of candidateIds) {
      try {
        await addToPipeline({ candidate_id: cid, job_id: Number(jobId) }).unwrap();
        success++;
      } catch { errors++; }
    }
    setAssigning(false);
    setResult({ success, errors });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Briefcase size={18} className="text-blue-600" />
            <span className="font-semibold text-gray-800">Assign to Job</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{candidateIds.length} candidate{candidateIds.length > 1 ? 's' : ''}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {result ? (
            <div className={`rounded-xl px-4 py-4 border text-center ${result.errors === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <p className="text-sm font-bold text-gray-800 mb-1">
                {result.success} assigned successfully{result.errors > 0 ? `, ${result.errors} already in pipeline` : ''}
              </p>
              <button onClick={onClose} className="mt-2 text-sm font-medium text-blue-600 hover:underline">Close</button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Step 1 — Select Company</label>
                <Select value={companyId} onChange={e => { setCompanyId(e.target.value); setJobId(''); }}>
                  <option value="">Choose a company...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              {companyId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Step 2 — Select Job</label>
                  {jobs.length === 0 ? (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">No open jobs for this company</p>
                  ) : (
                    <Select value={jobId} onChange={e => setJobId(e.target.value)}>
                      <option value="">Choose a job...</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.title} ({j.positions_required} vacancies
                          {j.salary_min ? `, ${j.salary_min}${j.salary_max ? '–' + j.salary_max : ''}` : ''})
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              )}
              {selectedJob && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                  <p className="font-semibold">{selectedJob.title}</p>
                  <p className="mt-0.5 text-blue-500">{selectedJob.company?.name} · {selectedJob.positions_required} vacancies</p>
                  {selectedJob.service_fee && <p className="text-blue-500">Service fee: ₹{Number(selectedJob.service_fee).toLocaleString('en-IN')}</p>}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={onClose} className="flex-1 btn-secondary text-sm">Cancel</button>
                <button
                  onClick={handleAssign}
                  disabled={!jobId || assigning}
                  className="flex-1 btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {assigning ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Assigning...</>
                  ) : (
                    <><Briefcase size={14} />Assign {candidateIds.length} to Job</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CandidateList() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced filter state
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompletion, setFilterCompletion] = useState('');
  const [filterSourceId, setFilterSourceId] = useState('');
  const [filterStateId, setFilterStateId] = useState('');
  const [filterCityId, setFilterCityId] = useState('');
  const [filterPositionIds, setFilterPositionIds] = useState<number[]>([]);
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterGulfReturn, setFilterGulfReturn] = useState('');
  const [filterEcrType, setFilterEcrType] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Column header filters
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [msgChannel, setMsgChannel] = useState<MsgChannel | null>(null);

  // Detail drawer
  const [drawerCandidateId, setDrawerCandidateId] = useState<number | null>(null);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Assign to job modal
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Table scroll
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const shadowScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    const table = tableScrollRef.current;
    const shadow = shadowScrollRef.current;
    if (!table || !shadow) return;
    const onTable = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      shadow.scrollLeft = table.scrollLeft;
      syncingRef.current = false;
    };
    const onShadow = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      table.scrollLeft = shadow.scrollLeft;
      syncingRef.current = false;
    };
    table.addEventListener('scroll', onTable);
    shadow.addEventListener('scroll', onShadow);
    return () => {
      table.removeEventListener('scroll', onTable);
      shadow.removeEventListener('scroll', onShadow);
    };
  }, []);

  const scrollTable = (direction: 'left' | 'right' | 'far-left' | 'far-right') => {
    const el = tableScrollRef.current;
    if (!el) return;
    if (direction === 'far-left') { el.scrollLeft = 0; return; }
    if (direction === 'far-right') { el.scrollLeft = el.scrollWidth; return; }
    el.scrollBy({ left: direction === 'right' ? 400 : -400, behavior: 'smooth' });
  };

  const { data: tradesData } = useGetTradesQuery(true);
  const { data: sourcesData } = useGetSourcesQuery(true);
  const { data: statesData } = useGetStatesQuery(undefined);
  const { data: citiesData } = useGetCitiesQuery(
    filterStateId ? { state_id: Number(filterStateId) } : undefined,
    { skip: !filterStateId }
  );

  const queryParams: any = {
    page,
    limit: 50,
    search: search || undefined,
    status: filterStatus || colFilters.status || undefined,
    completion_status: filterCompletion || colFilters.completion_status || undefined,
    position_ids: filterPositionIds.length > 0 ? filterPositionIds.join(',') : undefined,
    source_id: filterSourceId ? +filterSourceId : undefined,
    state_id: filterStateId ? +filterStateId : undefined,
    city_id: filterCityId ? +filterCityId : undefined,
    date_from: filterDateFrom || undefined,
    date_to: filterDateTo || undefined,
    gulf_return: filterGulfReturn || undefined,
    ecr_type: filterEcrType || undefined,
  };

  const { data, isLoading } = useGetCandidatesQuery(queryParams);

  const rows: any[] = data?.data || [];
  const meta = data?.meta;

  const activeFiltersCount = [
    filterStatus, filterCompletion, filterSourceId, filterStateId, filterCityId,
    filterDateFrom, filterDateTo, filterGulfReturn, filterEcrType,
  ].filter(Boolean).length + (filterPositionIds.length > 0 ? 1 : 0);

  // Selection helpers
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        rows.forEach((r) => next.delete(r.id));
      } else {
        rows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [allOnPageSelected, rows]);

  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearFilters = () => {
    setFilterStatus('');
    setFilterCompletion('');
    setFilterSourceId('');
    setFilterStateId('');
    setFilterCityId('');
    setFilterPositionIds([]);
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterGulfReturn('');
    setFilterEcrType('');
    setColFilters({});
    setPage(1);
  };

  // CSV export
  const handleExportCSV = () => {
    const exportRows = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
    if (!exportRows.length) return;
    const headers = COLUMNS.map((c) => c.label).join(',');
    const csvRows = exportRows.map((row) =>
      COLUMNS.map((col) => {
        let val = row[col.key];
        if (col.key === 'state') val = row.state?.name;
        else if (col.key === 'city') val = row.city?.name;
        else if (col.key === 'position_1') val = row.position_1?.name;
        else if (col.key === 'position_2') val = row.position_2?.name;
        else if (col.key === 'position_3') val = row.position_3?.name;
        else if (col.key === 'source') val = row.source?.name;
        else if (col.key === 'associate') val = row.associate?.full_name;
        else if (col.key === 'age') val = calcAge(row.dob);
        else if (col.key === 'created_at' || col.key === 'updated_at' || col.key === 'dob') val = val ? new Date(val).toLocaleDateString('en-IN') : '';
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const blob = new Blob([headers + '\n' + csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Candidates</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {meta?.total != null ? `${meta.total.toLocaleString()} candidates` : 'Manage candidate records'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-xl transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-xl transition-colors">
              <Upload size={14} />
              Import CSV
            </button>
          )}
          <Link to="/data-entry/register" className="btn-primary">
            <UserPlus size={16} />
            Register
          </Link>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-3 flex flex-wrap items-center gap-3 flex-shrink-0 shadow-sm">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, passport, phone, trade..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${showAdvanced || activeFiltersCount > 0 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
        >
          <Filter size={14} />
          Filters
          {activeFiltersCount > 0 && (
            <span className="ml-0.5 w-4 h-4 flex items-center justify-center bg-blue-600 text-white text-[9px] font-bold rounded-full">{activeFiltersCount}</span>
          )}
          <ChevronDown size={12} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        {activeFiltersCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-3 shadow-sm flex-shrink-0">
          {/* Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {/* Status */}
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deployed">Deployed</option>
              <option value="blacklisted">Blacklisted</option>
            </Select>
            {/* Position multi-select */}
            <div className="relative">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Position / Trade</label>
              <button
                type="button"
                onClick={() => setShowPositionDropdown(v => !v)}
                className={`w-full text-xs border rounded-lg px-2 py-1.5 text-left flex items-center justify-between transition-colors ${filterPositionIds.length > 0 ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
              >
                <span>{filterPositionIds.length > 0 ? `${filterPositionIds.length} selected` : 'All positions'}</span>
                <ChevronDown size={10} className={`transition-transform ${showPositionDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showPositionDropdown && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg w-52 max-h-52 overflow-y-auto py-1">
                  {filterPositionIds.length > 0 && (
                    <button
                      onClick={() => { setFilterPositionIds([]); setPage(1); }}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-red-500 hover:bg-red-50 font-semibold"
                    >
                      Clear selection
                    </button>
                  )}
                  {(tradesData as any[])?.map((t: any) => {
                    const checked = filterPositionIds.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setFilterPositionIds(prev =>
                              checked ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            );
                            setPage(1);
                          }}
                          className="accent-blue-600"
                        />
                        <span className="text-xs text-gray-700">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            {/* State */}
            <Select
              label="State"
              value={filterStateId}
              onChange={(e) => { setFilterStateId(e.target.value); setFilterCityId(''); setPage(1); }}
            >
              <option value="">All</option>
              {(statesData as any[])?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {/* City */}
            <Select
              label="City"
              value={filterCityId}
              onChange={(e) => { setFilterCityId(e.target.value); setPage(1); }}
              disabled={!filterStateId}
            >
              <option value="">All</option>
              {(citiesData as any[])?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {/* Registered From */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Registered From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-blue-400"
              />
            </div>
            {/* Registered To */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Registered To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-blue-400"
              />
            </div>
            {/* Gulf Return */}
            <Select
              label="Gulf Return"
              value={filterGulfReturn}
              onChange={(e) => { setFilterGulfReturn(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
            {/* ECR Type */}
            <Select
              label="ECR Type"
              value={filterEcrType}
              onChange={(e) => { setFilterEcrType(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="ecr">ECR</option>
              <option value="ecnr">ECNR</option>
            </Select>
          </div>
          {/* More filters toggle */}
          <button onClick={() => setShowMoreFilters(v => !v)} className="text-xs text-blue-600 hover:underline mb-3">
            {showMoreFilters ? '− Less filters' : '+ More filters (Source, Completion)'}
          </button>
          {showMoreFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {/* Source */}
              <Select
                label="Source"
                value={filterSourceId}
                onChange={(e) => { setFilterSourceId(e.target.value); setPage(1); }}
              >
                <option value="">All</option>
                {(sourcesData as any[])?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              {/* Completion */}
              <Select
                label="Completion"
                value={filterCompletion}
                onChange={(e) => { setFilterCompletion(e.target.value); setPage(1); }}
              >
                <option value="">All</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </Select>
            </div>
          )}
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={clearFilters} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
              Clear all
            </button>
            <button onClick={() => setShowAdvanced(false)} className="btn-primary">
              Apply filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="bg-blue-600 text-white rounded-2xl px-5 py-3 mb-3 flex items-center gap-4 shadow-lg flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <CheckSquare size={16} />
            <span className="font-semibold text-sm">{selected.size} selected</span>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Briefcase size={14} /> Assign to Job
          </button>
          <button
            onClick={() => setMsgChannel('sms')}
            className="flex items-center gap-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Phone size={14} /> SMS
          </button>
          <button
            onClick={() => setMsgChannel('email')}
            className="flex items-center gap-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Mail size={14} /> Email
          </button>
          <button
            onClick={() => setMsgChannel('whatsapp')}
            className="flex items-center gap-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <MessageSquare size={14} /> WhatsApp
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/30 transition-colors"
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
            <FloatingScrollbar targetRef={tableScrollRef} contentWidth={4100} />
            <div className="overflow-auto flex-1" ref={tableScrollRef}>
              <table className="border-collapse" style={{ minWidth: '4100px' }}>
                <thead>
                  <tr className="bg-slate-700 text-white text-[11px] font-semibold">
                    {/* Sticky: checkbox */}
                    <th
                      className="sticky left-0 z-20 bg-slate-700 px-3 py-2.5 border-r border-slate-600"
                      style={{ width: 40, minWidth: 40 }}
                    >
                      <button onClick={toggleAll} className="flex items-center justify-center text-white/80 hover:text-white">
                        {allOnPageSelected
                          ? <CheckSquare size={14} />
                          : <Square size={14} />
                        }
                      </button>
                    </th>
                    {/* Sticky: # */}
                    <th
                      className="sticky left-[40px] z-20 bg-slate-700 px-2 py-2.5 border-r border-slate-600 text-center"
                      style={{ width: 44, minWidth: 44 }}
                    >
                      #
                    </th>
                    {/* Sticky: view */}
                    <th
                      className="sticky left-[84px] z-20 bg-slate-700 px-2 py-2.5 border-r border-slate-600 text-center"
                      style={{ width: 44, minWidth: 44 }}
                    >
                      View
                    </th>
                    {/* Data columns */}
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-2.5 text-left border-r border-slate-600 last:border-r-0 whitespace-nowrap"
                        style={{ width: col.width, minWidth: col.width }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          <ColFilter
                            col={col.key}
                            value={colFilters[col.key] || ''}
                            onChange={(v) => {
                              setColFilters((prev) => ({ ...prev, [col.key]: v }));
                              setPage(1);
                            }}
                          />
                        </div>
                      </th>
                    ))}
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
                          isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-gray-50 hover:bg-slate-50'
                        }`}
                      >
                        {/* Sticky: checkbox */}
                        <td
                          className={`sticky left-0 z-10 px-3 py-2 border-r border-gray-100 ${isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          style={{ width: 40, minWidth: 40 }}
                        >
                          <button onClick={() => toggleOne(row.id)} className="flex items-center justify-center text-gray-400 hover:text-blue-600">
                            {isSelected ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                          </button>
                        </td>
                        {/* Sticky: # */}
                        <td
                          className={`sticky left-[40px] z-10 px-2 py-2 border-r border-gray-100 text-center text-gray-400 font-mono ${isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          style={{ width: 44, minWidth: 44 }}
                        >
                          {rowNum}
                        </td>
                        {/* Sticky: view */}
                        <td
                          className={`sticky left-[84px] z-10 px-2 py-2 border-r border-gray-100 text-center ${isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          style={{ width: 44, minWidth: 44 }}
                        >
                          <button
                            onClick={() => setDrawerCandidateId(row.id)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View details"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                        {/* Data cells */}
                        {COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className="px-3 py-2 border-r border-gray-100 last:border-r-0"
                            style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                          >
                            <CellValue col={col.key} row={row} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length + 3} className="py-20 text-center">
                        <Users size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
                        <p className="text-sm text-gray-400 font-medium">No candidates found</p>
                        <p className="text-xs text-gray-300 mt-1">Try adjusting search or filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Horizontal scroll controls */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
              <span className="text-[10px] text-gray-400 font-medium mr-1">SCROLL</span>
              <button onClick={() => scrollTable('far-left')} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors" title="Jump to start">
                <ChevronsLeft size={13} />
              </button>
              <button onClick={() => scrollTable('left')} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors" title="Scroll left">
                <ChevronLeft size={13} />
              </button>
              <div className="flex-1 mx-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full w-1/4 opacity-60" />
              </div>
              <button onClick={() => scrollTable('right')} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors" title="Scroll right">
                <ChevronRight size={13} />
              </button>
              <button onClick={() => scrollTable('far-right')} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors" title="Jump to end">
                <ChevronsRight size={13} />
              </button>
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

      {/* Sticky shadow horizontal scrollbar — always visible at bottom */}
      <div
        ref={shadowScrollRef}
        className="overflow-x-scroll flex-shrink-0"
        style={{ height: '14px' }}
      >
        <div style={{ width: '4100px', height: '1px' }} />
      </div>

      {/* Bulk message modal */}
      {msgChannel && (
        <BulkMessageModal
          channel={msgChannel}
          count={selected.size}
          onClose={() => setMsgChannel(null)}
        />
      )}

      {/* Import modal */}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}

      {/* Assign to Job modal */}
      {showAssignModal && (
        <AssignToJobModal
          candidateIds={Array.from(selected)}
          onClose={() => setShowAssignModal(false)}
        />
      )}

      {/* Detail drawer */}
      {drawerCandidateId !== null && (
        <CandidateDetailDrawer
          candidateId={drawerCandidateId}
          onClose={() => setDrawerCandidateId(null)}
        />
      )}
    </div>
  );
}
