import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, CalendarCheck, Plus, X, Search, ChevronRight,
  Users, Download, Trash2, Edit2, Eye,
} from 'lucide-react';
import Select from '../../components/ui/Select';
import { useGetJobsQuery, useCreateJobMutation, useUpdateJobMutation } from '../../store/api/jobsApi';
import { useGetCompaniesQuery } from '../../store/api/companiesApi';
import { useGetTradesQuery, useGetVenuesQuery } from '../../store/api/mastersApi';
import { useGetUsersQuery } from '../../store/api/usersApi';
import { useGetInterviewEventsQuery, useCreateInterviewEventMutation } from '../../store/api/interviewEventsApi';
import { useGetVendorsQuery } from '../../store/api/vendorsApi';
import JobPostingPrint from './JobPostingPrint';
import InterviewEditModal from './components/InterviewEditModal';
import toast from 'react-hot-toast';

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

const COUNTRY_CURRENCY: Record<string, string> = {
  saudi_arabia: 'SAR', uae: 'AED', qatar: 'QAR', kuwait: 'KWD', bahrain: 'BHD', oman: 'OMR',
};

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

function CompanyInitials({ name, color }: { name: string; color: typeof COMPANY_COLORS[0] }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  return (
    <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

// ── Interview Form Modal ───────────────────────────────────────────────────────
// (Imported from JobList conceptually — we define it here now)

interface PositionRow {
  id: number;
  trade_id: string;
  qty: string;
  salary: string;
  accommodation: string;
  accommodation_cost: string;
  transportation: string;
  transportation_cost: string;
  contract_period: string;
  age_min: string;
  age_max: string;
}

function InterviewFormModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [company_id, setCompanyId] = useState('');
  const [country, setCountry] = useState('');
  const [interview_date_start, setDateStart] = useState('');
  const [interview_date_end, setDateEnd] = useState('');
  const [service_fee, setServiceFee] = useState('');
  const [venue_id, setVenueId] = useState('');
  const [coordinator_id, setCoordinatorId] = useState('');
  const [vendor_id, setVendorId] = useState('');
  const [notes, setNotes] = useState('');
  const [flyer_headline, setFlyerHeadline] = useState('');

  const emptyPosition = (): PositionRow => ({
    id: Date.now(), trade_id: '', qty: '', salary: '',
    accommodation: '', accommodation_cost: '',
    transportation: '', transportation_cost: '',
    contract_period: '', age_min: '', age_max: '',
  });
  const [positions, setPositions] = useState<PositionRow[]>([{ ...emptyPosition(), id: 1 }]);

  const [create, { isLoading }] = useCreateJobMutation();
  const [createEvent] = useCreateInterviewEventMutation();
  const { data: companiesData } = useGetCompaniesQuery({ limit: 200 } as any);
  const { data: tradesData } = useGetTradesQuery(true);
  const { data: venuesData } = useGetVenuesQuery(undefined);
  const { data: usersData } = useGetUsersQuery(undefined);
  const { data: vendorsData } = useGetVendorsQuery({ status: 'active', limit: 200 } as any);
  const { data: companyJobsData } = useGetJobsQuery(
    { company_id: company_id ? +company_id : undefined, limit: 200 } as any,
    { skip: !company_id }
  );
  const companies: any[] = companiesData?.data || [];
  const allTrades: any[] = (tradesData as any[]) || [];
  const venues: any[] = (venuesData as any[]) || [];
  const users: any[] = (usersData as any)?.data ?? (Array.isArray(usersData) ? usersData : []);
  const vendors: any[] = (vendorsData as any)?.data || [];
  const currency = COUNTRY_CURRENCY[country] || '';

  const trades: any[] = (() => {
    if (!company_id || !companyJobsData) return allTrades;
    const companyJobs: any[] = companyJobsData?.data || [];
    const usedTradeIds = new Set<number>();
    for (const job of companyJobs) {
      if (job.positions) {
        for (const pos of job.positions) {
          if (pos.trade?.id) usedTradeIds.add(pos.trade.id);
        }
      }
    }
    if (usedTradeIds.size === 0) return allTrades;
    const companyTrades = allTrades.filter(t => usedTradeIds.has(t.id));
    const otherTrades = allTrades.filter(t => !usedTradeIds.has(t.id));
    return [...companyTrades, ...otherTrades];
  })();

  const handleCompanyChange = (cid: string) => {
    setCompanyId(cid);
    if (cid) {
      const comp = companies.find((c: any) => String(c.id) === cid);
      if (comp?.country) setCountry(comp.country);
    } else {
      setCountry('');
    }
  };

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
        contract_period: last?.contract_period || '',
        accommodation: last?.accommodation || '',
        transportation: last?.transportation || '',
        age_min: last?.age_min || '',
        age_max: last?.age_max || '',
      }];
    });
  };

  const removePosition = (id: number) => {
    if (positions.length === 1) return;
    setPositions(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!company_id || !service_fee || positions.some(p => !p.trade_id || !p.qty)) return;
    try {
      const job: any = await create({
        company_id: +company_id,
        country: country || undefined,
        service_fee: +service_fee,
        interview_date_start: interview_date_start || undefined,
        interview_date_end: interview_date_end || undefined,
        venue_id: venue_id ? +venue_id : undefined,
        coordinator_id: coordinator_id || undefined,
        notes: notes || undefined,
        flyer_headline: flyer_headline || undefined,
        positions: positions.map(p => ({
          trade_id: +p.trade_id,
          quantity: +p.qty,
          salary: p.salary ? +p.salary : undefined,
          accommodation: p.accommodation === 'yes',
          transportation: p.transportation === 'yes',
          contract_period: p.contract_period || undefined,
          age: (p.age_min && p.age_max) ? `${p.age_min}-${p.age_max}` : p.age_min || p.age_max || undefined,
        })),
      }).unwrap();

      // Derive event-level accommodation/transportation from positions (use first position with a value)
      const firstAccom = positions.find(p => p.accommodation === 'yes' || p.accommodation === 'no');
      const firstTrans = positions.find(p => p.transportation === 'yes' || p.transportation === 'no');
      const eventDate = interview_date_start
        ? `${interview_date_start}T09:00:00`
        : new Date().toISOString().slice(0, 10);
      await createEvent({
        job_id: job.id,
        event_date: eventDate,
        vendor_id: vendor_id ? +vendor_id : undefined,
        accommodation: firstAccom ? firstAccom.accommodation === 'yes' : undefined,
        accommodation_cost: firstAccom?.accommodation === 'no' && firstAccom.accommodation_cost ? +firstAccom.accommodation_cost : undefined,
        transportation: firstTrans ? firstTrans.transportation === 'yes' : undefined,
        transportation_cost: firstTrans?.transportation === 'no' && firstTrans.transportation_cost ? +firstTrans.transportation_cost : undefined,
      }).unwrap();

      toast.success('Interview created');
      onSuccess();
    } catch (e) { console.error(e); toast.error('Failed to create interview'); }
  };

  const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase mb-1';
  const inp = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all';
  const canSubmit = !!company_id && !!service_fee && positions.every(p => p.trade_id && p.qty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><Calendar size={16} className="text-blue-600" /></div>
            <span className="font-semibold text-gray-800">New Interview</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
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
              <label className={lbl}>Service Fee * (₹ per candidate)</label>
              <input type="number" value={service_fee} onChange={e => setServiceFee(e.target.value)}
                placeholder="Required"
                className={inp + (!service_fee ? ' border-red-300 focus:border-red-400 focus:ring-red-100' : '')} />
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
              <input type="date" value={interview_date_start} onChange={e => setDateStart(e.target.value)} min={new Date().toISOString().substring(0, 10)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Interview Date (Day 2 — optional)</label>
              <input type="date" value={interview_date_end} onChange={e => setDateEnd(e.target.value)} min={interview_date_start || new Date().toISOString().substring(0, 10)} className={inp} />
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
            <div className="col-span-2">
              <label className={lbl}>Vendor (optional)</label>
              <select value={vendor_id} onChange={e => setVendorId(e.target.value)} className={inp}>
                <option value="">No vendor</option>
                {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name} ({v.vendor_id})</option>)}
              </select>
            </div>
          </div>

          {/* Trade Positions */}
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
                      {company_id && companyJobsData ? (() => {
                        const companyJobs: any[] = (companyJobsData as any)?.data || [];
                        const usedIds = new Set(companyJobs.flatMap((j: any) => (j.positions || []).map((p: any) => p.trade?.id).filter(Boolean)));
                        const cTrades = allTrades.filter(t => usedIds.has(t.id));
                        const oTrades = allTrades.filter(t => !usedIds.has(t.id));
                        return <>
                          {cTrades.length > 0 && <optgroup label="— Previously used for this company —">{cTrades.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                          {oTrades.length > 0 && <optgroup label="— All other trades —">{oTrades.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                        </>;
                      })() : trades.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                    <div>
                      <label className={lbl}>Quantity *</label>
                      <input type="number" value={pos.qty} onChange={e => updatePosition(pos.id, 'qty', e.target.value)} placeholder="e.g. 100" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Salary {currency ? `(${currency})` : ''}</label>
                      <input type="number" value={pos.salary} onChange={e => updatePosition(pos.id, 'salary', e.target.value)} placeholder="e.g. 1800" className={inp} />
                    </div>

                    {/* Accommodation */}
                    <Select label="Accommodation" value={pos.accommodation} onChange={e => updatePosition(pos.id, 'accommodation', e.target.value)}>
                      <option value="">--</option>
                      <option value="yes">Yes (provided)</option>
                      <option value="no">No (candidate pays)</option>
                    </Select>
                    {pos.accommodation === 'no' && (
                      <div>
                        <label className={lbl}>Accom. Cost (SAR)</label>
                        <input type="number" value={pos.accommodation_cost} onChange={e => updatePosition(pos.id, 'accommodation_cost', e.target.value)} placeholder="0" min={0} className={inp} />
                      </div>
                    )}

                    {/* Transportation */}
                    <Select label="Transportation" value={pos.transportation} onChange={e => updatePosition(pos.id, 'transportation', e.target.value)}>
                      <option value="">--</option>
                      <option value="yes">Yes (provided)</option>
                      <option value="no">No (candidate pays)</option>
                    </Select>
                    {pos.transportation === 'no' && (
                      <div>
                        <label className={lbl}>Transport Cost (SAR)</label>
                        <input type="number" value={pos.transportation_cost} onChange={e => updatePosition(pos.id, 'transportation_cost', e.target.value)} placeholder="0" min={0} className={inp} />
                      </div>
                    )}

                    <Select label="Contract Period" value={pos.contract_period} onChange={e => updatePosition(pos.id, 'contract_period', e.target.value)}>
                      <option value="">--</option>
                      <option value="1">1 Year</option>
                      <option value="2">2 Years</option>
                      <option value="3">3 Years</option>
                      <option value="4">4 Years</option>
                      <option value="5">5 Years</option>
                    </Select>
                    <Select label="Age Min" value={pos.age_min} onChange={e => updatePosition(pos.id, 'age_min', e.target.value)}>
                      <option value="">Min</option>
                      {Array.from({ length: 31 }, (_, i) => 18 + i).map(a => <option key={a} value={String(a)}>{a}</option>)}
                    </Select>
                    <Select label="Age Max" value={pos.age_max} onChange={e => updatePosition(pos.id, 'age_max', e.target.value)}>
                      <option value="">Max</option>
                      {Array.from({ length: 31 }, (_, i) => 18 + i).map(a => <option key={a} value={String(a)}>{a}</option>)}
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Flyer Headline (optional)</label>
            <input type="text" value={flyer_headline} onChange={e => setFlyerHeadline(e.target.value)} placeholder="Defaults to: URGENT REQUIREMENT FOR A LEADING COMPANY IN {COUNTRY}" className={inp} />
          </div>

          <div>
            <label className={lbl}>Notes / Conditions</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="e.g. Food provided, overtime available" className={inp + ' resize-none'} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400">{positions.length} position{positions.length > 1 ? 's' : ''} · {positions.reduce((s, p) => s + (+p.qty || 0), 0)} total vacancies</p>
            {!service_fee && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Service fee is required</p>}
          </div>
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

// ── Company Interview Card ─────────────────────────────────────────────────────

function JobRow({ job, events, color, onPrintFlyer, onEdit, onDelete }: {
  job: any;
  events: any[];
  color: typeof COMPANY_COLORS[0];
  onPrintFlyer: (jobs: any[]) => void;
  onEdit: (job: any) => void;
  onDelete: (jobId: number) => void;
}) {
  const navigate = useNavigate();
  const [createEvent, { isLoading: creatingEvent }] = useCreateInterviewEventMutation();
  const [expanded, setExpanded] = useState(true);
  const positions: any[] = job.positions || [];
  const eventId = events.find((e: any) => e.job_id === job.id)?.id;

  async function handleView() {
    if (eventId) { navigate(`/recruitment/interviews/${eventId}`); return; }
    try {
      const eventDate = job.interview_date_start
        ? new Date(job.interview_date_start).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const ev: any = await createEvent({ job_id: job.id, event_date: eventDate }).unwrap();
      navigate(`/recruitment/interviews/${ev.id}`);
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to create interview event');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {job.title && (
          <span className={`text-xs font-semibold ${color.text} truncate max-w-xs`}>{job.title}</span>
        )}
        <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
          {job.positions_required || 0} vacancies
        </span>
        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onPrintFlyer([job])} title="View Flyer" className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-lg hover:shadow-sm hover:border-gray-300 transition-all">
            <Download size={11} /> Flyer
          </button>
          <button onClick={handleView} disabled={creatingEvent} className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg hover:shadow-sm transition-all disabled:opacity-50">
            <Eye size={11} /> View
          </button>
          <button onClick={() => onEdit(job)} title="Edit" className="p-1 text-gray-400 hover:text-blue-600 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all">
            <Edit2 size={12} />
          </button>
          <button onClick={() => { if (confirm('Delete this interview?')) onDelete(job.id); }} title="Delete" className="p-1 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all">
            <Trash2 size={12} />
          </button>
          {positions.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-400 hover:text-gray-600">
              <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
      </div>
      {expanded && positions.length > 0 && (
        <div className="space-y-1">
          {positions.map((pos: any, i: number) => (
            <div key={pos.id || i} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-gray-100 text-xs">
              <span className="font-semibold text-gray-700 w-40 truncate">{pos.trade?.name || 'Trade'}</span>
              <span className="text-gray-500"><Users size={11} className="inline mr-1" />{pos.quantity} qty</span>
              {pos.salary && <span className="text-gray-500">{COUNTRY_CURRENCY[job.country] || ''} {Number(pos.salary).toLocaleString()}</span>}
              {pos.accommodation && <span className="text-emerald-600">Accom</span>}
              {pos.transportation && <span className="text-emerald-600">Transport</span>}
              {pos.contract_period && <span className="text-gray-400">{pos.contract_period}yr</span>}
              {pos.age && <span className="text-gray-400">Age: {pos.age}</span>}
            </div>
          ))}
        </div>
      )}
      {positions.length === 0 && (
        <div className="text-xs text-gray-400">{job.title} — {job.positions_required} vacancies</div>
      )}
    </div>
  );
}

function CompanyCard({ cg, events, onPrintFlyer, onEdit, onDelete }: {
  cg: { companyId: number; companyName: string; color: typeof COMPANY_COLORS[0]; jobs: any[] };
  events: any[];
  onPrintFlyer: (jobs: any[]) => void;
  onEdit: (job: any) => void;
  onDelete: (jobId: number) => void;
}) {
  const totalPositions = cg.jobs.reduce((s: number, j: any) => s + (j.positions_required || 0), 0);
  const multiJob = cg.jobs.length > 1;

  return (
    <div className={`px-5 py-4 ${cg.color.light} border-l-4 ${cg.color.border}`}>
      {/* Company header */}
      <div className="flex items-center gap-3 mb-3">
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
            {multiJob && (
              <span className="text-[10px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                {cg.jobs.length} interviews
              </span>
            )}
          </div>
        </div>
        {/* Company-level flyer (all jobs) only when single job — multi-job has per-job flyers */}
        {!multiJob && (
          <button onClick={() => onPrintFlyer(cg.jobs)} title="View Flyer" className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-lg hover:shadow-sm hover:border-gray-300 transition-all flex-shrink-0">
            <Download size={12} /> View Flyer
          </button>
        )}
      </div>

      {/* Per-job rows — each with its own Edit/Delete/View */}
      <div className={multiJob ? 'space-y-3' : ''}>
        {cg.jobs.map((job, idx) => (
          <div key={job.id} className={multiJob ? 'bg-white/60 rounded-xl p-3 border border-white' : ''}>
            {multiJob && (
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Interview {idx + 1}
              </div>
            )}
            <JobRow
              job={job}
              events={events}
              color={cg.color}
              onPrintFlyer={onPrintFlyer}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function InterviewEvents() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['no-date']));
  const [printJobs, setPrintJobs] = useState<any[] | null>(null);
  const [editJob, setEditJob] = useState<any | null>(null);

  // Primary data: jobs with positions
  const { data, refetch } = useGetJobsQuery({ limit: 200, status: 'open,interviews_scheduled,in_process' });
  const jobs: any[] = data?.data || [];

  // Also fetch interview events to map job → event IDs for "View" links
  const { data: eventsData } = useGetInterviewEventsQuery({ limit: 500 });
  const allEvents: any[] = Array.isArray(eventsData) ? eventsData : (eventsData as any)?.data ?? [];

  // Venues and users for flyer resolution
  const { data: venuesData } = useGetVenuesQuery(undefined);
  const { data: usersData } = useGetUsersQuery(undefined);
  const venues: any[] = (venuesData as any[]) || [];
  const users: any[] = (usersData as any)?.data ?? (Array.isArray(usersData) ? usersData : []);

  const resolveFlyerMeta = (jobsForFlyer: any[]) => {
    const j = jobsForFlyer[0] || {};
    const venue = j.venue_id ? venues.find((v) => v.id === j.venue_id) : undefined;
    const user = j.coordinator_id ? users.find((u) => u.id === j.coordinator_id) : undefined;
    return {
      venue: venue
        ? {
            name: venue.name,
            address: venue.address,
            google_maps_url: venue.google_maps_url,
            phone: venue.phone,
          }
        : undefined,
      contactPerson: user?.full_name,
      contactPhone: user?.phone,
    };
  };

  // Delete job mutation
  const [updateJob] = useUpdateJobMutation();

  // Filter by upcoming (based on interview_date_start)
  const now = new Date().toISOString().substring(0, 10);
  const filtered = jobs.filter(j => {
    if (search) {
      const q = search.toLowerCase();
      if (!j.title?.toLowerCase().includes(q) && !j.company?.name?.toLowerCase().includes(q)) return false;
    }
    if (showUpcoming && j.interview_date_start) {
      const dateKey = j.interview_date_start.substring(0, 10);
      if (dateKey < now) return false;
    }
    return true;
  });

  // Company color mapping
  const allCompanyIds = [...new Set(jobs.map((j: any) => j.company_id as number))];
  const companyColorMap: Record<number, typeof COMPANY_COLORS[0]> = {};
  allCompanyIds.forEach((id, i) => { companyColorMap[id] = COMPANY_COLORS[i % COMPANY_COLORS.length]; });

  // Group by interview date → company
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

  const handleDelete = async (jobId: number) => {
    try {
      await updateJob({ id: jobId, status: 'closed' }).unwrap();
      toast.success('Interview archived');
      refetch();
    } catch { toast.error('Failed to delete'); }
  };

  const totalPositions = filtered.reduce((s, j) => s + (j.positions_required || 0), 0);
  const openJobsCount = jobs.filter((j: any) => j.status === 'open').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Interviews</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="font-semibold text-blue-600">{openJobsCount} open jobs</span>
            {' · '}{filtered.length} interviews · {totalPositions} positions · grouped by date
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm"><Plus size={14} /> New Interview</button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex flex-wrap items-center gap-3 flex-shrink-0 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or trade..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <button
          onClick={() => setShowUpcoming(prev => !prev)}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-all ${showUpcoming ? 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50' : 'text-blue-700 bg-blue-50 border-blue-200'}`}
        >
          <Calendar size={13} />
          {showUpcoming ? 'Show Earlier Interviews' : 'Showing All Interviews'}
        </button>
        {search && (
          <button onClick={() => setSearch('')} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Date-grouped interview cards */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {dateGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
            <CalendarCheck size={40} className="text-gray-200 mx-auto mb-3" strokeWidth={1} />
            <p className="text-gray-400 font-semibold">No interviews found</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 font-medium hover:underline">Create first interview →</button>
          </div>
        ) : dateGroups.map(dg => {
          const isOpen = expandedGroups.has(dg.dateKey);
          const totalComp = dg.companies.length;
          const totalJobs = dg.companies.reduce((s, c) => s + c.jobs.length, 0);
          const totalPos = dg.companies.reduce((s, c) => s + c.jobs.reduce((s2: number, j: any) => s2 + (j.positions_required || 0), 0), 0);
          const dl = dg.daysLeft;
          const isUrgent = dl !== null && dl >= 0 && dl <= 7;
          const isPast = dl !== null && dl < 0;

          return (
            <div key={dg.dateKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Date group header */}
              <button onClick={() => toggleGroup(dg.dateKey)} className={`w-full flex items-center gap-3 px-5 py-3 ${isUrgent ? 'bg-red-50' : isPast ? 'bg-gray-50' : 'bg-blue-50'} transition-colors`}>
                <div className={`w-9 h-9 rounded-xl ${isUrgent ? 'bg-red-500' : isPast ? 'bg-gray-400' : 'bg-blue-600'} flex items-center justify-center flex-shrink-0`}>
                  <Calendar size={15} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${isUrgent ? 'text-red-700' : isPast ? 'text-gray-500' : 'text-blue-800'}`}>{dg.dateLabel}</span>
                    {dg.dateEnd && dg.dateEnd !== dg.dateStart && <span className="text-xs text-gray-400">→ {fmtDate(dg.dateEnd)}</span>}
                    {isUrgent && dl !== null && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{dl === 0 ? 'TODAY' : `${dl}d left`}</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{totalComp} {totalComp === 1 ? 'company' : 'companies'} · {totalPos} positions</div>
                </div>
                <ChevronRight size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Company cards */}
              {isOpen && (
                <div className="divide-y divide-gray-100">
                  {dg.companies.map(cg => (
                    <CompanyCard
                      key={cg.companyId}
                      cg={cg}
                      events={allEvents}
                      onPrintFlyer={(jobs) => setPrintJobs(jobs)}
                      onEdit={(job) => setEditJob(job)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && <InterviewFormModal onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refetch(); }} />}
      {editJob && (
        <InterviewEditModal
          job={editJob}
          event={allEvents.find((e: any) => e.job_id === editJob.id)}
          onClose={() => setEditJob(null)}
          onSuccess={() => { setEditJob(null); refetch(); }}
        />
      )}
      {printJobs && (
        <JobPostingPrint
          jobs={printJobs}
          {...resolveFlyerMeta(printJobs)}
          onClose={() => setPrintJobs(null)}
        />
      )}
    </div>
  );
}
