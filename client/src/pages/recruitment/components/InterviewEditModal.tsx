import { useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import Select from '../../../components/ui/Select';
import { useUpdateJobMutation } from '../../../store/api/jobsApi';
import { useUpdateInterviewEventMutation } from '../../../store/api/interviewEventsApi';
import { useGetVenuesQuery, useGetTradesQuery } from '../../../store/api/mastersApi';
import { useGetUsersQuery } from '../../../store/api/usersApi';
import toast from 'react-hot-toast';

const INTERVIEW_TYPES = [
  { value: 'in_person', label: 'In Person' },
  { value: 'video', label: 'Video' },
  { value: 'trade_test', label: 'Trade Test' },
  { value: 'combined', label: 'Combined' },
];

const EVENT_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
];

interface EditPos {
  id: number;
  trade_id: string;
  qty: string;
  salary: string;
  accommodation: string;
  transportation: string;
  contract_period: string;
  age_min: string;
  age_max: string;
}

function parseAge(age: string | null | undefined) {
  if (!age) return { min: '', max: '' };
  const parts = age.split('-');
  return { min: parts[0] || '', max: parts[1] || '' };
}

export default function InterviewEditModal({
  job,
  event,
  onClose,
  onSuccess,
}: {
  job: any;
  event?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [update, { isLoading: savingJob }] = useUpdateJobMutation();
  const [updateEvent, { isLoading: savingEvent }] = useUpdateInterviewEventMutation();
  const { data: venuesData } = useGetVenuesQuery(undefined);
  const { data: usersData } = useGetUsersQuery(undefined);
  const { data: tradesData } = useGetTradesQuery(true);
  const venues: any[] = (venuesData as any[]) || [];
  const users: any[] =
    (usersData as any)?.data ?? (Array.isArray(usersData) ? usersData : []);
  const trades: any[] = (tradesData as any[]) || [];

  const [interview_date_start, setDateStart] = useState(
    job.interview_date_start?.substring(0, 10) || '',
  );
  const [interview_date_end, setDateEnd] = useState(
    job.interview_date_end?.substring(0, 10) || '',
  );
  const [venue_id, setVenueId] = useState(job.venue_id ? String(job.venue_id) : '');
  const [coordinator_id, setCoordinatorId] = useState(job.coordinator_id || '');
  const [service_fee, setServiceFee] = useState(
    job.service_fee ? String(job.service_fee) : '',
  );
  const [notes, setNotes] = useState(job.notes || '');
  const [flyer_headline, setFlyerHeadline] = useState(job.flyer_headline || '');

  const [positions, setPositions] = useState<EditPos[]>(() =>
    (job.positions || []).map((p: any) => {
      const { min, max } = parseAge(p.age);
      return {
        id: p.id,
        trade_id: p.trade_id ? String(p.trade_id) : p.trade?.id ? String(p.trade.id) : '',
        qty: String(p.quantity || ''),
        salary: p.salary ? String(p.salary) : '',
        accommodation: p.accommodation ? 'yes' : 'no',
        transportation: p.transportation ? 'yes' : 'no',
        contract_period: p.contract_period || '',
        age_min: min,
        age_max: max,
      };
    }),
  );

  const [event_date, setEventDate] = useState(
    event?.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
  );
  const [event_status, setEventStatus] = useState(event?.status || 'scheduled');
  const [interview_type, setInterviewType] = useState(event?.interview_type || 'in_person');
  const [capacity, setCapacity] = useState(event?.capacity ? String(event.capacity) : '');

  const selectedVenue = venues.find((v: any) => String(v.id) === venue_id);
  const selectedCoordinator = users.find((u: any) => u.id === coordinator_id);

  const updatePos = (id: number, field: keyof EditPos, value: string) => {
    setPositions((prev) =>
      prev.map((p) => (p.id !== id ? p : { ...p, [field]: value })),
    );
  };

  const addPosition = () => {
    setPositions((prev) => [
      ...prev,
      {
        id: Date.now(),
        trade_id: '',
        qty: '',
        salary: '',
        accommodation: 'no',
        transportation: 'no',
        contract_period: prev[prev.length - 1]?.contract_period || '',
        age_min: prev[prev.length - 1]?.age_min || '',
        age_max: prev[prev.length - 1]?.age_max || '',
      },
    ]);
  };

  const removePosition = (id: number) => {
    if (positions.length === 1) return;
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = async () => {
    if (positions.some((p) => !p.trade_id || !p.qty)) {
      toast.error('Each position needs a trade and quantity');
      return;
    }
    try {
      await update({
        id: job.id,
        interview_date_start: interview_date_start || undefined,
        interview_date_end: interview_date_end || undefined,
        venue_id: venue_id ? +venue_id : undefined,
        coordinator_id: coordinator_id || undefined,
        service_fee: service_fee ? +service_fee : undefined,
        notes: notes || undefined,
        flyer_headline: flyer_headline || undefined,
        positions: positions.map((p) => ({
          trade_id: +p.trade_id,
          quantity: +p.qty,
          salary: p.salary ? +p.salary : undefined,
          accommodation: p.accommodation === 'yes',
          transportation: p.transportation === 'yes',
          contract_period: p.contract_period || undefined,
          age:
            p.age_min && p.age_max
              ? `${p.age_min}-${p.age_max}`
              : p.age_min || p.age_max || undefined,
        })),
      }).unwrap();

      if (event?.id) {
        await updateEvent({
          id: event.id,
          event_date: event_date || undefined,
          status: event_status || undefined,
          interview_type: interview_type || undefined,
          capacity: capacity ? +capacity : undefined,
        }).unwrap();
      }

      toast.success('Interview updated');
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update interview');
    }
  };

  const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase mb-1';
  const inp =
    'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all';

  const saving = savingJob || savingEvent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Edit2 size={16} className="text-violet-600" />
            </div>
            <div>
              <span className="font-semibold text-gray-800">Edit Interview</span>
              <p className="text-xs text-gray-400">
                {job.company?.name} · {job.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Interview Date (Day 1)</label>
              <input
                type="date"
                value={interview_date_start}
                onChange={(e) => setDateStart(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Interview Date (Day 2 — optional)</label>
              <input
                type="date"
                value={interview_date_end}
                onChange={(e) => setDateEnd(e.target.value)}
                min={interview_date_start}
                className={inp}
              />
            </div>
            <Select
              label="Interview Venue"
              value={venue_id}
              onChange={(e) => setVenueId(e.target.value)}
            >
              <option value="">Select venue</option>
              {venues.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.city ? ` — ${v.city}` : ''}
                </option>
              ))}
            </Select>
            {selectedVenue?.address && (
              <div>
                <label className={lbl}>Venue Address</label>
                <div className="px-3 py-2 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-500">
                  {selectedVenue.address}
                </div>
              </div>
            )}
            <Select
              label="Coordinator / Contact Person"
              value={coordinator_id}
              onChange={(e) => setCoordinatorId(e.target.value)}
            >
              <option value="">Select coordinator</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </Select>
            {selectedCoordinator?.phone && (
              <div>
                <label className={lbl}>Coordinator Phone</label>
                <div className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-500">
                  {selectedCoordinator.phone}
                </div>
              </div>
            )}
            <div>
              <label className={lbl}>Service Fee (₹ per candidate)</label>
              <input
                type="number"
                value={service_fee}
                onChange={(e) => setServiceFee(e.target.value)}
                placeholder="Optional"
                className={inp}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Trade Positions
              </span>
              <button
                onClick={addPosition}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus size={12} /> Add Position
              </button>
            </div>
            <div className="space-y-3">
              {positions.map((pos, idx) => (
                <div
                  key={pos.id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500">
                      Position {idx + 1}
                    </span>
                    {positions.length > 1 && (
                      <button
                        onClick={() => removePosition(pos.id)}
                        className="text-red-400 hover:text-red-600 p-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Select
                      label="Trade *"
                      value={pos.trade_id}
                      onChange={(e) => updatePos(pos.id, 'trade_id', e.target.value)}
                      className="col-span-2"
                    >
                      <option value="">Select trade</option>
                      {trades.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                    <div>
                      <label className={lbl}>Quantity *</label>
                      <input
                        type="number"
                        value={pos.qty}
                        onChange={(e) => updatePos(pos.id, 'qty', e.target.value)}
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Salary</label>
                      <input
                        type="number"
                        value={pos.salary}
                        onChange={(e) => updatePos(pos.id, 'salary', e.target.value)}
                        className={inp}
                      />
                    </div>
                    <Select
                      label="Accommodation"
                      value={pos.accommodation}
                      onChange={(e) => updatePos(pos.id, 'accommodation', e.target.value)}
                    >
                      <option value="">--</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </Select>
                    <Select
                      label="Transportation"
                      value={pos.transportation}
                      onChange={(e) => updatePos(pos.id, 'transportation', e.target.value)}
                    >
                      <option value="">--</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </Select>
                    <Select
                      label="Contract Period"
                      value={pos.contract_period}
                      onChange={(e) =>
                        updatePos(pos.id, 'contract_period', e.target.value)
                      }
                    >
                      <option value="">--</option>
                      {['1', '2', '3', '4', '5'].map((y) => (
                        <option key={y} value={y}>
                          {y} Year{+y > 1 ? 's' : ''}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Age Min"
                      value={pos.age_min}
                      onChange={(e) => updatePos(pos.id, 'age_min', e.target.value)}
                    >
                      <option value="">Min</option>
                      {Array.from({ length: 31 }, (_, i) => 18 + i).map((a) => (
                        <option key={a} value={String(a)}>
                          {a}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Age Max"
                      value={pos.age_max}
                      onChange={(e) => updatePos(pos.id, 'age_max', e.target.value)}
                    >
                      <option value="">Max</option>
                      {Array.from({ length: 31 }, (_, i) => 18 + i).map((a) => (
                        <option key={a} value={String(a)}>
                          {a}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Flyer Headline (optional)</label>
            <input
              type="text"
              value={flyer_headline}
              onChange={(e) => setFlyerHeadline(e.target.value)}
              placeholder="Defaults to: URGENT REQUIREMENT FOR A LEADING COMPANY IN {COUNTRY}"
              className={inp}
            />
          </div>

          <div>
            <label className={lbl}>Notes / Conditions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inp + ' resize-none'}
            />
          </div>

          {event && (
            <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Event Details
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Event Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={event_date}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Capacity</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    min={1}
                    className={inp}
                  />
                </div>
                <Select
                  label="Interview Type"
                  value={interview_type}
                  onChange={(e) => setInterviewType(e.target.value)}
                >
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Event Status"
                  value={event_status}
                  onChange={(e) => setEventStatus(e.target.value)}
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
