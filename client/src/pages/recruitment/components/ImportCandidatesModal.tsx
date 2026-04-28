/**
 * CSV import flow for sub-agent / associate-sourced candidates into an
 * interview event. Four steps:
 *   1. Pick trade (from job positions)
 *   2. Upload CSV (templated columns)
 *   3. Preview with status markers (new / existing / already-in-event / invalid)
 *   4. Import — batch API call
 */

import { useMemo, useState } from 'react';
import { Download, Upload, X, CheckCircle2, RotateCcw, AlertTriangle, UserPlus } from 'lucide-react';
import Select from '../../../components/ui/Select';
import { useBatchImportToInterviewMutation, useGetCandidatesQuery } from '../../../store/api/candidatesApi';
import { useGetAssociatesQuery } from '../../../store/api/associatesApi';
import toast from 'react-hot-toast';

interface ParsedRow {
  full_name: string;
  passport_no: string;
  whatsapp_no?: string;
  alternate_contact?: string;
  dob?: string;
  gender?: string;
  ecr_type?: string;
  education?: string;
  indian_experience?: string;
  abroad_experience?: string;
  associate_name?: string;
  referrer_name?: string;
  _rowIndex: number;
  _error?: string;
}

const EXPECTED_COLUMNS = [
  'full_name',
  'passport_no',
  'whatsapp_no',
  'alternate_contact',
  'dob',
  'gender',
  'ecr_type',
  'education',
  'indian_experience',
  'abroad_experience',
  'associate_name',
  'referrer_name',
] as const;

const COLUMN_ALIASES: Record<string, string> = {
  name: 'full_name',
  'full name': 'full_name',
  passport: 'passport_no',
  'passport number': 'passport_no',
  'passport no': 'passport_no',
  phone: 'whatsapp_no',
  whatsapp: 'whatsapp_no',
  'whatsapp number': 'whatsapp_no',
  mobile: 'whatsapp_no',
  alternate: 'alternate_contact',
  'alternate phone': 'alternate_contact',
  'date of birth': 'dob',
  birthdate: 'dob',
  ecr: 'ecr_type',
  experience: 'indian_experience',
  'indian experience': 'indian_experience',
  'abroad experience': 'abroad_experience',
  'gulf experience': 'abroad_experience',
  associate: 'associate_name',
  'sub agent': 'associate_name',
  'sub-agent': 'associate_name',
  referrer: 'referrer_name',
  referred_by: 'referrer_name',
};

function normalizeHeader(h: string): string {
  const lower = h.trim().toLowerCase().replace(/["']/g, '');
  return COLUMN_ALIASES[lower] || lower.replace(/\s+/g, '_');
}

// Basic CSV parser that respects quotes. Kept simple — we don't need full RFC 4180.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export default function ImportCandidatesModal({
  eventId,
  positions,
  existingCheckins,
  onClose,
  onImported,
}: {
  eventId: number;
  positions: Array<{ id: number; trade?: { id: number; name: string } }>;
  existingCheckins: any[];
  onClose: () => void;
  onImported: () => void;
}) {
  type Step = 'trade' | 'upload' | 'preview' | 'done';
  const [step, setStep] = useState<Step>('trade');
  const [tradeId, setTradeId] = useState<string>(
    positions.length === 1 && positions[0].trade ? String(positions[0].trade.id) : '',
  );
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{
    created: number;
    reused: number;
    already_in_event: number;
    errors: { passport: string; error: string }[];
  } | null>(null);

  const [batchImport, { isLoading: importing }] = useBatchImportToInterviewMutation();
  const { data: associatesData } = useGetAssociatesQuery({ limit: 500 } as any);
  const associates: any[] =
    (associatesData as any)?.data ?? (Array.isArray(associatesData) ? associatesData : []);

  // Fetch candidates by passport to resolve "new vs existing". We pull a batch of
  // candidates — this is a rough check so we just query by search across the
  // passports. Actual resolution is enforced server-side.
  const passportKey = useMemo(() => rows.map((r) => r.passport_no).filter(Boolean).join(','), [rows]);
  const { data: matchData } = useGetCandidatesQuery(
    step === 'preview' && passportKey
      ? ({ search: passportKey.split(',')[0], limit: 100 } as any)
      : undefined,
    { skip: step !== 'preview' || !passportKey },
  );
  const matchList: any[] = (matchData as any)?.data ?? [];
  const existingPassports = useMemo(() => {
    const set = new Set<string>();
    matchList.forEach((c) => c.passport_no && set.add(String(c.passport_no).toLowerCase()));
    return set;
  }, [matchList]);

  const addedPassports = useMemo(() => {
    const s = new Set<string>();
    existingCheckins.forEach((c) => {
      const p = c.candidate_job?.candidate?.passport_no;
      if (p) s.add(String(p).toLowerCase());
    });
    return s;
  }, [existingCheckins]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      toast.error('CSV has no data rows');
      return;
    }
    const headers = parseCsvLine(lines[0]).map(normalizeHeader);
    const parsed: ParsedRow[] = lines.slice(1).map((line, idx) => {
      const cols = parseCsvLine(line);
      const row: Record<string, any> = { _rowIndex: idx + 2 };
      headers.forEach((h, i) => {
        row[h] = (cols[i] ?? '').trim();
      });
      // Validate required fields
      if (!row.full_name?.trim()) row._error = 'missing full_name';
      else if (!row.passport_no?.trim()) row._error = 'missing passport_no';
      return row as ParsedRow;
    });
    setRows(parsed);
    setStep('preview');
  };

  const downloadTemplate = () => {
    const header = EXPECTED_COLUMNS.join(',');
    const sample =
      'John Doe,L1234567,9876543210,,1995-05-20,male,ecr,ITI,3 years,,Rafi Khan,';
    const csv = `${header}\n${sample}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview-candidates-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const rowStatus = (r: ParsedRow): 'invalid' | 'in_event' | 'existing' | 'new' => {
    if (r._error) return 'invalid';
    const pk = r.passport_no.toLowerCase();
    if (addedPassports.has(pk)) return 'in_event';
    if (existingPassports.has(pk)) return 'existing';
    return 'new';
  };

  const validRows = rows.filter((r) => rowStatus(r) !== 'invalid' && rowStatus(r) !== 'in_event');
  const invalidCount = rows.filter((r) => rowStatus(r) === 'invalid').length;
  const inEventCount = rows.filter((r) => rowStatus(r) === 'in_event').length;
  const existingCount = rows.filter((r) => rowStatus(r) === 'existing').length;
  const newCount = rows.filter((r) => rowStatus(r) === 'new').length;

  const resolveAssociateId = (name?: string): number | undefined => {
    if (!name?.trim()) return undefined;
    const n = name.trim().toLowerCase();
    return associates.find((a) => a.full_name?.toLowerCase() === n)?.id;
  };

  const handleImport = async () => {
    if (!tradeId) {
      toast.error('Select a trade first');
      return;
    }
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    try {
      const result = await batchImport({
        event_id: eventId,
        trade_id: +tradeId,
        rows: validRows.map((r) => ({
          full_name: r.full_name,
          passport_no: r.passport_no,
          whatsapp_no: r.whatsapp_no || undefined,
          alternate_contact: r.alternate_contact || undefined,
          dob: r.dob || undefined,
          gender: (r.gender as any) || undefined,
          ecr_type: (r.ecr_type as any) || undefined,
          education: r.education || undefined,
          indian_experience: r.indian_experience || undefined,
          abroad_experience: r.abroad_experience || undefined,
          associate_id: resolveAssociateId(r.associate_name),
          registration_mode: r.associate_name ? 'associate' : 'walk_in',
        })),
      }).unwrap();
      setImportResult(result);
      setStep('done');
      onImported();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Import failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Upload size={16} className="text-blue-600" />
            <div>
              <span className="font-semibold text-gray-800">Import Candidates from CSV</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Step {step === 'trade' ? 1 : step === 'upload' ? 2 : step === 'preview' ? 3 : 4} of 4
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {/* Step 1: Trade */}
          {step === 'trade' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Which trade are you importing for? All rows in the CSV will be assigned to this trade.
              </p>
              <Select label="Trade *" value={tradeId} onChange={(e) => setTradeId(e.target.value)}>
                <option value="">Select trade</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.trade?.id}>
                    {p.trade?.name || `Position ${p.id}`}
                  </option>
                ))}
              </Select>
              <div className="flex justify-end">
                <button
                  onClick={() => setStep('upload')}
                  disabled={!tradeId}
                  className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Expected columns</p>
                <p className="text-[11px] text-blue-600 font-mono break-all">
                  {EXPECTED_COLUMNS.join(', ')}
                </p>
                <p className="text-[10px] text-blue-500 mt-1.5">
                  <strong>full_name</strong> and <strong>passport_no</strong> are required · passport is the primary key · associate_name is matched against master list
                </p>
                <button
                  onClick={downloadTemplate}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Download size={11} /> Download template
                </button>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                id="batch-csv-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <label
                htmlFor="batch-csv-input"
                className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-2 border-dashed border-gray-200 hover:border-blue-300 px-4 py-8 rounded-xl transition-colors cursor-pointer"
              >
                <Upload size={18} />
                {fileName || 'Click to choose a CSV file…'}
              </label>
              <div className="flex justify-between">
                <button onClick={() => setStep('trade')} className="btn-secondary text-sm">
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-center">
                  <UserPlus size={14} className="text-emerald-700 mx-auto mb-1" />
                  <div className="text-lg font-bold text-emerald-700">{newCount}</div>
                  <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">New</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-center">
                  <RotateCcw size={14} className="text-blue-700 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-700">{existingCount}</div>
                  <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Reused</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-center">
                  <AlertTriangle size={14} className="text-amber-700 mx-auto mb-1" />
                  <div className="text-lg font-bold text-amber-700">{inEventCount}</div>
                  <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">In Event</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-center">
                  <X size={14} className="text-red-700 mx-auto mb-1" />
                  <div className="text-lg font-bold text-red-700">{invalidCount}</div>
                  <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Invalid</div>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-gray-500">
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
                        <th className="px-3 py-2 text-left font-semibold">Name</th>
                        <th className="px-3 py-2 text-left font-semibold">Passport</th>
                        <th className="px-3 py-2 text-left font-semibold">Phone</th>
                        <th className="px-3 py-2 text-left font-semibold">Associate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const st = rowStatus(r);
                        const badge = {
                          new: 'bg-emerald-50 text-emerald-700',
                          existing: 'bg-blue-50 text-blue-700',
                          in_event: 'bg-amber-50 text-amber-700',
                          invalid: 'bg-red-50 text-red-700',
                        }[st];
                        const label = { new: 'New', existing: 'Reused', in_event: 'In Event', invalid: 'Invalid' }[st];
                        return (
                          <tr key={r._rowIndex} className="border-t border-gray-50">
                            <td className="px-3 py-2">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${badge}`}>
                                {label}
                              </span>
                              {r._error && <div className="text-[10px] text-red-500 mt-0.5">{r._error}</div>}
                            </td>
                            <td className="px-3 py-2 text-gray-800">{r.full_name || '—'}</td>
                            <td className="px-3 py-2 font-mono text-gray-600">{r.passport_no || '—'}</td>
                            <td className="px-3 py-2 font-mono text-gray-500">{r.whatsapp_no || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{r.associate_name || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setRows([]);
                    setFileName('');
                    setStep('upload');
                  }}
                  className="btn-secondary text-sm"
                >
                  ← Re-upload
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || validRows.length === 0}
                  className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={13} /> Import {validRows.length} row{validRows.length === 1 ? '' : 's'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">Import complete</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {importResult.created + importResult.reused} candidate
                  {importResult.created + importResult.reused === 1 ? '' : 's'} added to this event
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-center">
                  <div className="text-lg font-bold text-emerald-700">{importResult.created}</div>
                  <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Created</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-center">
                  <div className="text-lg font-bold text-blue-700">{importResult.reused}</div>
                  <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Reused</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-center">
                  <div className="text-lg font-bold text-amber-700">{importResult.already_in_event}</div>
                  <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Skipped</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-center">
                  <div className="text-lg font-bold text-red-700">{importResult.errors.length}</div>
                  <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Errors</div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Errors</p>
                  <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono">{e.passport}</span>: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={onClose} className="btn-primary text-sm">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
