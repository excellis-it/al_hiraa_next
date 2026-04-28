import { useState } from 'react';
import { Link } from 'react-router';
import {
  Briefcase, Plus, Calendar, ChevronRight, Users, Search, X, Trash2, Download, UserPlus,
} from 'lucide-react';
import { useGetJobsQuery, useCreateJobMutation } from '../../store/api/jobsApi';
import { useGetCompaniesQuery } from '../../store/api/companiesApi';
import { useGetTradesQuery, useGetVenuesQuery } from '../../store/api/mastersApi';
import { useGetCandidatesQuery } from '../../store/api/candidatesApi';
import { useAddToPipelineMutation } from '../../store/api/pipelineApi';
import { useGetUsersQuery } from '../../store/api/usersApi';
import Select from '../../components/ui/Select';
import JobPostingPrint from './JobPostingPrint';

// ── Constants ──────────────────────────────────────────────────────────────────

const COMPANY_COLORS = [
  { bg: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-600',  light: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500' },
];

const GULF_COUNTRIES = [
  { value: 'saudi_arabia', label: 'Saudi Arabia' },
  { value: 'uae', label: 'UAE' },
  { value: 'qatar', label: 'Qatar' },
  { value: 'kuwait', label: 'Kuwait' },
  { value: 'bahrain', label: 'Bahrain' },
  { value: 'oman', label: 'Oman' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const COUNTRY_CURRENCY: Record<string, string> = {
  saudi_arabia: 'SAR',
  uae: 'AED',
  qatar: 'QAR',
  kuwait: 'KWD',
  bahrain: 'BHD',
  oman: 'OMR',
};

interface PositionRow {
  id: number;
  trade_id: string;
  qty: string;
  salary: string;
  accommodation: string;
  transportation: string;
  contract_period: string;
  age: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateKey(d: string | null | undefined): string {
  if (!d) return 'no-date';
  return d.substring(0, 10);
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function priorityDot(priority: string) {
  const c = priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-amber-500' : 'bg-gray-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${c} flex-shrink-0`} />;
}

function CompanyInitials({ name, color }: { name: string; color: typeof COMPANY_COLORS[0] }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  return (
    <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

// ── Job Create Form Modal (multi-position) ────────────────────────────────────

function JobFormModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [company_id, setCompanyId] = useState('');
  const [country, setCountry] = useState('');
  const [interview_date_start, setDateStart] = useState('');
  const [interview_date_end, setDateEnd] = useState('');
  const [service_fee, setServiceFee] = useState('');
  const [venue_id, setVenueId] = useState('');
  const [coordinator_id, setCoordinatorId] = useState('');
  const [notes, setNotes] = useState('');
  const emptyPosition = (): PositionRow => ({ id: Date.now(), trade_id: '', qty: '', salary: '', accommodation: '', transportation: '', contract_period: '', age: '' });
  const [positions, setPositions] = useState<PositionRow[]>([{ ...emptyPosition(), id: 1 }]);

  const [create, { isLoading }] = useCreateJobMutation();
  const { data: companiesData } = useGetCompaniesQuery({ limit: 200 } as any);
  const { data: tradesData } = useGetTradesQuery(true);
  const { data: venuesData } = useGetVenuesQuery(undefined);
  const { data: usersData } = useGetUsersQuery(undefined);
  const companies: any[] = companiesData?.data || [];
  const trades: any[] = (tradesData as any[]) || [];
  const venues: any[] = (venuesData as any[]) || [];
  const users: any[] = (usersData as any)?.data ?? (Array.isArray(usersData) ? usersData : []);
  const currency = COUNTRY_CURRENCY[country] || '';

  // Auto-populate country from selected company
  const handleCompanyChange = (cid: string) => {
    setCompanyId(cid);
    if (cid) {
      const comp = companies.find((c: any) => String(c.id) === cid);
      if (comp?.country) setCountry(comp.country);
    } else {
      setCountry('');
    }
  };

  // Selected venue and coordinator info
  const selectedVenue = venues.find((v: any) => String(v.id) === venue_id);
  const selectedCoordinator = users.find((u: any) => u.id === coordinator_id);

  const updatePosition = (id: number, field: keyof PositionRow, value: string) => {
    setPositions(prev => prev.map(p => p.id !== id ? p : { ...p, [field]: value }));
  };

  const addPosition = () => {
    setPositions(prev => {
      const last = prev[prev.length - 1];
      return [...prev, {
        ...emptyPosition(),
        // Auto-fill contract_period, accommodation, and age from last position
        contract_period: last?.contract_period || '',
        accommodation: last?.accommodation || '',
        age: last?.age || '',
      }];
    });
  };

  const removePosition = (id: number) => {
    if (positions.length === 1) return;
    setPositions(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!company_id || positions.some(p => !p.trade_id || !p.qty)) return;
    try {
      await create({
        company_id: +company_id,
        country: country || undefined,
        service_fee: service_fee ? +service_fee : undefined,
        interview_date_start: interview_date_start || undefined,
        interview_date_end: interview_date_end || undefined,
        venue_id: venue_id ? +venue_id : undefined,
        coordinator_id: coordinator_id || undefined,
        notes: notes || undefined,
        positions: positions.map(p => ({
          trade_id: +p.trade_id,
          quantity: +p.qty,
          salary: p.salary ? +p.salary : undefined,
          accommodation: p.accommodation === 'yes',
          transportation: p.transportation === 'yes',
          contract_period: p.contract_period || undefined,
          age: p.age || undefined,
        })),
      }).unwrap();
      onSuccess();
    } catch (e) { console.error(e); }
  };

  const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase mb-1';
  const inp = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all';
  const canSubmit = !!company_id && positions.every(p => p.trade_id && p.qty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><Calendar size={16} className="text-blue-600" /></div>
            <span className="font-semibold text-gray-800">New Interview</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Base info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Select label="Company *" value={company_id} onChange={e => handleCompanyChange(e.target.value)}>
                <option value="">Select company</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            {country && (
              <div>
                <label className={lbl}>Country (from company)</label>
                <div className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-600">
                  {GULF_COUNTRIES.find(c => c.value === country)?.label || country}
                </div>
              </div>
            )}
            <div>
              <label className={lbl}>Service Fee (₹ per candidate)</label>
              <input type="number" value={service_fee} onChange={e => setServiceFee(e.target.value)} placeholder="Optional" className={inp} />
            </div>
            <Select label="Interview Venue" value={venue_id} onChange={e => setVenueId(e.target.value)}>
              <option value="">Select venue</option>
              {venues.map((v: any) => <option key={v.id} value={v.id}>{v.name}{v.city ? ` — ${v.city}` : ''}</option>)}
            </Select>
            {selectedVenue?.address && (
              <div>
                <label className={lbl}>Venue Address</label>
                <div className="px-3 py-2 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-500">{selectedVenue.address}</div>
              </div>
            )}
            <div>
              <label className={lbl}>Interview Date (Day 1)</label>
              <input type="date" value={interview_date_start} onChange={e => setDateStart(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Interview Date (Day 2 — optional)</label>
              <input type="date" value={interview_date_end} onChange={e => setDateEnd(e.target.value)} className={inp} />
            </div>
            <Select label="Coordinator / Contact Person" value={coordinator_id} onChange={e => setCoordinatorId(e.target.value)}>
              <option value="">Select coordinator</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </Select>
            {selectedCoordinator?.phone && (
              <div>
                <label className={lbl}>Coordinator Phone</label>
                <div className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-500">{selectedCoordinator.phone}</div>
              </div>
            )}
          </div>

          {/* Positions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Trade Positions</span>
              <button onClick={addPosition} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                <Plus size={12} /> Add Position
              </button>
            </div>

            <div className="space-y-3">
              {positions.map((pos, idx) => (
                <div key={pos.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500">Position {idx + 1}</span>
                    {positions.length > 1 && (
                      <button onClick={() => removePosition(pos.id)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={13} /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Select label="Trade *" value={pos.trade_id} onChange={e => updatePosition(pos.id, 'trade_id', e.target.value)} className="col-span-2">
                      <option value="">Select trade</option>
                      {trades.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                    <div>
                      <label className={lbl}>Quantity *</label>
                      <input type="number" value={pos.qty} onChange={e => updatePosition(pos.id, 'qty', e.target.value)} placeholder="e.g. 100" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Salary {currency ? `(${currency})` : ''}</label>
                      <input type="number" value={pos.salary} onChange={e => updatePosition(pos.id, 'salary', e.target.value)} placeholder="e.g. 1800" className={inp} />
                    </div>
                    <Select label="Accommodation" value={pos.accommodation} onChange={e => updatePosition(pos.id, 'accommodation', e.target.value)}>
                      <option value="">--</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </Select>
                    <Select label="Transportation" value={pos.transportation} onChange={e => updatePosition(pos.id, 'transportation', e.target.value)}>
                      <option value="">--</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </Select>
                    <Select label="Contract Period" value={pos.contract_period} onChange={e => updatePosition(pos.id, 'contract_period', e.target.value)}>
                      <option value="">--</option>
                      <option value="1">1 Year</option>
                      <option value="2">2 Years</option>
                      <option value="3">3 Years</option>
                      <option value="4">4 Years</option>
                      <option value="5">5 Years</option>
                    </Select>
                    <div>
                      <label className={lbl}>Age</label>
                      <input value={pos.age} onChange={e => updatePosition(pos.id, 'age', e.target.value)} placeholder="e.g. 22-35" className={inp} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes / Conditions</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder={`e.g.\n1. Food provided\n2. Overtime available`}
              className={inp + ' resize-none'} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-gray-400">{positions.length} position{positions.length > 1 ? 's' : ''} · {positions.reduce((s, p) => s + (+p.qty || 0), 0)} total vacancies</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={isLoading || !canSubmit} className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus size={14} />{isLoading ? 'Creating...' : 'Create Interview'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assign Candidate to Job Modal ─────────────────────────────────────────────

function AssignCandidateModal({ job, onClose }: { job: any; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [addToPipeline, { isLoading: adding }] = useAddToPipelineMutation();
  const { data: candidatesData, isFetching } = useGetCandidatesQuery({ search: search || undefined, limit: 20 });
  const [added, setAdded] = useState<Set<number>>(new Set());

  const handleAdd = async (candidateId: number) => {
    try {
      await addToPipeline({ candidate_id: candidateId, job_id: job.id }).unwrap();
      setAdded(prev => new Set([...prev, candidateId]));
    } catch { /* already in pipeline */ }
  };

  const currency = COUNTRY_CURRENCY[job.country] || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Assign Candidate</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {job.title} · {job.company?.name || ''}
              {job.positions_required ? ` · ${job.positions_required} vacancies` : ''}
              {job.salary_min ? ` · ${job.salary_min}${job.salary_max ? '–' + job.salary_max : ''} ${currency}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-3 border-b border-gray-50 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, code, phone..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isFetching ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Candidate</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Trade</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Phone</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">State</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Assign</th>
                </tr>
              </thead>
              <tbody>
                {(candidatesData?.data || []).map((c: any) => {
                  const isAdded = added.has(c.id);
                  return (
                    <tr key={c.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${isAdded ? 'bg-emerald-50' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-800 text-sm">{c.full_name}</div>
                        <div className="text-xs text-blue-600 font-mono">{c.candidate_code}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        {c.position_1?.name ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c.position_1.name}</span> : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{c.whatsapp_no || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{c.state?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        {isAdded ? (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-lg">✓ Added</span>
                        ) : (
                          <button
                            onClick={() => handleAdd(c.id)}
                            disabled={adding}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <UserPlus size={12} className="inline mr-1" />Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {candidatesData?.data?.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No candidates found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Company Job Card ───────────────────────────────────────────────────────────

function CompanyJobCard({ cg, onPrintFlyer, onAssign }: { cg: { companyId: number; companyName: string; color: typeof COMPANY_COLORS[0]; jobs: any[] }; onPrintFlyer: (jobs: any[]) => void; onAssign: (job: any) => void }) {
  const [expanded, setExpanded] = useState(true);
  const totalPositions = cg.jobs.reduce((s, j) => s + (j.positions_required || 0), 0);

  // Collect all positions across all jobs for this company
  const allPositions: any[] = cg.jobs.flatMap(j => (j.positions || []).map((p: any) => ({ ...p, _job: j })));

  return (
    <div className={`px-5 py-4 ${cg.color.light} border-l-4 ${cg.color.border}`}>
      <div className="flex items-center gap-3">
        <CompanyInitials name={cg.companyName} color={cg.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-sm ${cg.color.text}`}>{cg.companyName}</span>
            <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
              {totalPositions} vacancies
            </span>
            {cg.jobs[0]?.country && (
              <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                {GULF_COUNTRIES.find(g => g.value === cg.jobs[0].country)?.label || cg.jobs[0].country}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onPrintFlyer(cg.jobs)} title="Download interview flyer" className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-lg hover:shadow-sm hover:border-gray-300 transition-all">
            <Download size={12} /> Flyer
          </button>
          <button onClick={() => onAssign(cg.jobs[0])} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:shadow-sm hover:bg-emerald-100 transition-all">
            <UserPlus size={12} /> Assign
          </button>
          <Link to={`/recruitment/jobs/${cg.jobs[0].id}`} className={`flex items-center gap-1 text-xs font-semibold ${cg.color.text} bg-white border ${cg.color.border} px-2.5 py-1 rounded-lg hover:shadow-sm transition-all`}>
            View <ChevronRight size={12} />
          </Link>
          {allPositions.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-400 hover:text-gray-600">
              <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Position-wise list */}
      {expanded && allPositions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {allPositions.map((pos, i) => (
            <div key={pos.id || i} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-gray-100 text-xs">
              <span className="font-semibold text-gray-700 w-40 truncate">{pos.trade?.name || 'Trade'}</span>
              <span className="text-gray-500"><Users size={11} className="inline mr-1" />{pos.quantity} qty</span>
              {pos.salary && <span className="text-gray-500">{cg.jobs[0]?.salary_currency || COUNTRY_CURRENCY[cg.jobs[0]?.country] || ''} {Number(pos.salary).toLocaleString()}</span>}
              {pos.accommodation && <span className="text-emerald-600">Accom</span>}
              {pos.transportation && <span className="text-emerald-600">Transport</span>}
              {pos.contract_period && <span className="text-gray-400">{pos.contract_period}yr</span>}
              {pos.age && <span className="text-gray-400">Age: {pos.age}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Fallback: show job title if no positions */}
      {allPositions.length === 0 && cg.jobs.map(job => (
        <div key={job.id} className="mt-2 text-xs text-gray-500">{job.title} — {job.positions_required} vacancies</div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function JobList() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['no-date']));
  const [printJobs, setPrintJobs] = useState<any[] | null>(null);
  const [assignJob, setAssignJob] = useState<any | null>(null);

  const { data, refetch } = useGetJobsQuery({ limit: 200, status: 'open,interviews_scheduled,in_process' });
  const jobs: any[] = data?.data || [];

  const filtered = jobs.filter(j =>
    !search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company?.name.toLowerCase().includes(search.toLowerCase())
  );

  // Company → color mapping (stable by company id order)
  const allCompanyIds = [...new Set(jobs.map((j: any) => j.company_id as number))];
  const companyColorMap: Record<number, typeof COMPANY_COLORS[0]> = {};
  allCompanyIds.forEach((id, i) => { companyColorMap[id] = COMPANY_COLORS[i % COMPANY_COLORS.length]; });

  // Group by interview_date_start → company
  interface DateGroup { dateKey: string; dateLabel: string; dateStart: string | null; dateEnd: string | null; daysLeft: number | null; companies: CompanyGroup[] }
  interface CompanyGroup { companyId: number; companyName: string; color: typeof COMPANY_COLORS[0]; jobs: any[] }
  const dateMap: Record<string, DateGroup> = {};
  const dateGroups: DateGroup[] = [];

  for (const job of filtered) {
    const dk = fmtDateKey(job.interview_date_start);
    if (!dateMap[dk]) {
      const dg: DateGroup = { dateKey: dk, dateLabel: job.interview_date_start ? fmtDate(job.interview_date_start) : 'No Interview Date Set', dateStart: job.interview_date_start, dateEnd: job.interview_date_end, daysLeft: daysUntil(job.interview_date_start), companies: [] };
      dateMap[dk] = dg; dateGroups.push(dg);
    }
    const dg = dateMap[dk];
    let cg = dg.companies.find(c => c.companyId === job.company_id);
    if (!cg) { cg = { companyId: job.company_id, companyName: job.company?.name || 'Unknown', color: companyColorMap[job.company_id], jobs: [] }; dg.companies.push(cg); }
    cg.jobs.push(job);
  }

  dateGroups.sort((a, b) => {
    if (!a.dateStart) return 1;
    if (!b.dateStart) return -1;
    return new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const totalPositions = filtered.reduce((s, j) => s + (j.positions_required || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Active Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} open jobs · {totalPositions} positions · grouped by interview date</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm"><Plus size={14} />New Interview</button>
      </div>

      {/* Search */}
      <div className="relative mb-5 flex-shrink-0">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs or companies..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
      </div>

      {/* Date Groups */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {dateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Briefcase size={40} className="mb-3 opacity-30" />
            <p className="font-semibold">No active jobs found</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 font-medium hover:underline">Create first job order →</button>
          </div>
        ) : dateGroups.map(dg => {
          const isExpanded = expandedGroups.has(dg.dateKey);
          const isUrgent = dg.daysLeft !== null && dg.daysLeft >= 0 && dg.daysLeft <= 7;
          const isPast = dg.daysLeft !== null && dg.daysLeft < 0;
          const totalJobs = dg.companies.reduce((s, c) => s + c.jobs.length, 0);
          const totalPos = dg.companies.reduce((s, c) => s + c.jobs.reduce((ps, j) => ps + (j.positions_required || 0), 0), 0);

          return (
            <div key={dg.dateKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => toggleGroup(dg.dateKey)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-100' : isPast ? 'bg-gray-100' : dg.dateStart ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Calendar size={15} className={isUrgent ? 'text-red-600' : isPast ? 'text-gray-400' : dg.dateStart ? 'text-blue-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-900">{dg.dateLabel}</span>
                    {dg.dateEnd && dg.dateEnd !== dg.dateStart && <span className="text-xs text-gray-400">→ {fmtDate(dg.dateEnd)}</span>}
                    {isUrgent && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">{dg.daysLeft === 0 ? 'TODAY' : `${dg.daysLeft}d away`}</span>}
                    {isPast && <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">Past</span>}
                    {!isUrgent && !isPast && dg.daysLeft !== null && dg.daysLeft > 7 && <span className="text-[10px] text-gray-400">{dg.daysLeft}d away</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{dg.companies.length} {dg.companies.length === 1 ? 'company' : 'companies'}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{totalJobs} jobs · {totalPos} positions</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 mr-2">
                  {dg.companies.slice(0, 6).map(cg => (
                    <div key={cg.companyId} className={`w-2.5 h-2.5 rounded-full ${cg.color.dot}`} title={cg.companyName} />
                  ))}
                  {dg.companies.length > 6 && <span className="text-[10px] text-gray-400 ml-0.5">+{dg.companies.length - 6}</span>}
                </div>
                <ChevronRight size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {dg.companies.map(cg => <CompanyJobCard key={cg.companyId} cg={cg} onPrintFlyer={setPrintJobs} onAssign={setAssignJob} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && <JobFormModal onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refetch(); }} />}
      {printJobs && <JobPostingPrint jobs={printJobs} onClose={() => setPrintJobs(null)} />}
      {assignJob && <AssignCandidateModal job={assignJob} onClose={() => setAssignJob(null)} />}
    </div>
  );
}
