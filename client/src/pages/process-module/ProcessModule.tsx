import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Upload, Download, X, ChevronDown,
  CheckCircle2, Clock, Zap, FileSpreadsheet,
  UserPlus, DollarSign, Plane, FileText, Stethoscope,
  Globe, BadgeCheck, Info, Plus, Users, CalendarDays,
  ArrowRight, Loader2, Eye, Lock, User,
} from 'lucide-react';
import Select from '../../components/ui/Select';
import {
  useGetAllProcessDetailsQuery,
  useUpdateProcessDetailsMutation,
  useBatchFromInterviewMutation,
  useQuickAddProcessMutation,
  useImportProcessCsvMutation,
  useLazyExportProcessDetailsQuery,
} from '../../store/api/processDetailsApi';
import { useGetInterviewEventsQuery, useGetInterviewEventQuery } from '../../store/api/interviewEventsApi';
import { useGetVendorsQuery } from '../../store/api/vendorsApi';
import { useGetPipelineQuery } from '../../store/api/pipelineApi';
import { useCreatePaymentMutation, useRecordPaymentMutation } from '../../store/api/paymentsApi';
import { useUpdateCandidateMutation } from '../../store/api/candidatesApi';
import { useGetSourcesQuery } from '../../store/api/mastersApi';
import * as XLSX from 'xlsx';

// ── Constants ──────────────────────────────────────────────────────────────────

const ONBOARDING_CITIES = ['Kolkata', 'Delhi', 'Mumbai', 'Chennai', 'Hyderabad', 'Bangalore', 'Ranchi', 'Patna'];
const MEDICAL_STATUS_OPTIONS = ['pending', 'applied', 'fit', 'unfit', 'awaited'];
const CANDIDATE_STATUS_OPTIONS = ['selected', 'documents_pending', 'medical_done', 'visa_applied', 'visa_received', 'ticket_booked', 'deployed', 'on_hold', 'cancelled'];
const MODE_OPTIONS = [
  { value: 'in_person', label: 'Face to Face' },
  { value: 'video', label: 'Video Call' },
  { value: 'trade_test', label: 'Trade Test' },
  { value: 'combined', label: 'Combined' },
  { value: 'direct', label: 'Direct' },
];

const DOCS_CHECKLIST = [
  { key: 'passport_copy',   label: 'Passport Copy (2 sets)' },
  { key: 'photos',          label: 'Photos (6 copies)' },
  { key: 'aadhar',          label: 'Aadhar Card' },
  { key: 'income_cert',     label: 'Income Certificate' },
  { key: 'pcc',             label: 'Police Clearance Cert' },
  { key: 'medical_cert',    label: 'Medical Fitness Cert' },
  { key: 'educational_cert',label: 'Educational Certificate' },
  { key: 'experience_cert', label: 'Experience Certificate' },
];

const PIPELINE_STAGES = [
  { key: 'selection', num: 1, label: 'Interview Detials', subtitle: 'Interview → Selection → Offer',         icon: BadgeCheck  },
  { key: 'documents', num: 2, label: 'Documents',        subtitle: 'Passport, photos, certificates',        icon: FileText    },
  { key: 'medical',   num: 3, label: 'Medical',          subtitle: 'Application → Completion → Approval',   icon: Stethoscope },
  { key: 'payment',   num: 4, label: 'Payment',          subtitle: 'Up to 4 installments',                  icon: '₹'  },
  { key: 'visa',      num: 5, label: 'Visa & MOFA',      subtitle: 'Courier → Visa → MOFA → VFS',           icon: Globe       },
  { key: 'flight',    num: 6, label: 'Flight',           subtitle: 'Booking → Confirmation → Departure',    icon: Plane       },
];

const CANDIDATE_STATUS_COLORS: Record<string, string> = {
  selected:           'bg-blue-50 text-blue-700 border-blue-200',
  documents_pending:  'bg-amber-50 text-amber-700 border-amber-200',
  medical_done:       'bg-teal-50 text-teal-700 border-teal-200',
  visa_applied:       'bg-violet-50 text-violet-700 border-violet-200',
  visa_received:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  ticket_booked:      'bg-sky-50 text-sky-700 border-sky-200',
  deployed:           'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_hold:            'bg-orange-50 text-orange-700 border-orange-200',
  cancelled:          'bg-red-50 text-red-700 border-red-200',
};

const MEDICAL_STATUS_COLORS: Record<string, string> = {
  pending:  'bg-gray-100 text-gray-600',
  applied:  'bg-blue-100 text-blue-700',
  fit:      'bg-emerald-100 text-emerald-700',
  unfit:    'bg-red-100 text-red-700',
  awaited:  'bg-amber-100 text-amber-700',
};

// Single active color — amber/gold
const ACTIVE = {
  bg:     'bg-amber-500',
  light:  'bg-amber-50',
  border: 'border-amber-400',
  text:   'text-amber-700',
  muted:  'text-amber-500',
  pill:   'bg-amber-100 text-amber-700',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: any, short = false) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return short
    ? dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysFromNow(d: any): number | null {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : Math.ceil((dt.getTime() - Date.now()) / 86400000);
}

function fmtCurrency(v: any, symbol = '₹') {
  if (!v && v !== 0) return '—';
  return `${symbol}${Number(v).toLocaleString('en-IN')}`;
}

function computeStage(r: any): string {
  if (r.deployment_date || r.ticket_confirm_date || r.ticket_booking_date) return 'flight';
  if (r.visa_issue_date || r.vfs_applied_date || r.visa_receiving_date) return 'visa';
  if (r.mofa_number || r.mofa_date) return 'payment';
  if (r.medical_app_date) return 'medical';
  if (r.courier_sent_date) return 'documents';
  return 'selection';
}

function computeNextStep(r: any): { label: string; color: string } {
  const stage = computeStage(r);
  const steps: Record<string, { label: string; color: string }> = {
    selection: { label: 'Collect & send documents to embassy',  color: 'text-amber-700 bg-amber-50 border-amber-200' },
    documents: { label: 'Schedule medical examination',          color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    medical:   { label: 'Collect payment installment',           color: 'text-blue-700 bg-blue-50 border-blue-200' },
    payment:   { label: 'Process MOFA stamp & Visa',             color: 'text-violet-700 bg-violet-50 border-violet-200' },
    visa:      { label: 'Book flight ticket & confirm departure', color: 'text-sky-700 bg-sky-50 border-sky-200' },
    flight:    { label: 'Candidate deployed ✓',                  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  };
  return steps[stage] || steps.selection;
}

function docsCount(record: any): { submitted: number; total: number } {
  const cl: Record<string, boolean> = (record.documents_checklist as Record<string, boolean>) || {};
  const submitted = DOCS_CHECKLIST.filter(d => cl[d.key]).length;
  return { submitted, total: DOCS_CHECKLIST.length };
}


// ── View Details Drawer ────────────────────────────────────────────────────────

function ViewDetailsDrawer({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: (r: any) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set(['selection']));
  const cj       = record.candidate_job;
  const cand     = cj?.candidate;
  const job      = cj?.job;
  const payments: any[] = cj?.payments || [];

  const toggle = (k: string) => setOpen(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const serviceCharge = Number(record.vendor_service_charge || 0);
  const discount  = Number(record.disc_allot || 0);
  // Net payable: prefer service_charge - discount (new flow); fall back to total_receivable_amount (legacy records)
  const totalFee  = serviceCharge > 0
    ? Math.max(0, serviceCharge - discount)
    : Number(record.total_receivable_amount || 0);
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount_paid || 0), 0);
  const dueAmount = totalFee > 0 ? Math.max(0, totalFee - totalPaid) : 0;
  const curStage  = computeStage(record);
  const curIdx    = PIPELINE_STAGES.findIndex(s => s.key === curStage);
  const nextStep  = computeNextStep(record);
  const dc        = docsCount(record);
  const visaExpiring = daysFromNow(record.visa_expiry_date);
  const medExpiring  = daysFromNow(record.medical_expiry_date);
  const cl: Record<string, boolean> = (record.documents_checklist as Record<string, boolean>) || {};

  // ── Sub-components ──
  const StageBtn = ({ stageKey, label, subtitle, num, Icon }: {
    stageKey: string; label: string; subtitle: string; num: number; Icon: React.ElementType;
  }) => {
    const isActive = curStage === stageKey;
    const isPast   = PIPELINE_STAGES.findIndex(s => s.key === stageKey) < curIdx;
    const isOpen   = open.has(stageKey);
    return (
      <button
        onClick={() => toggle(stageKey)}
        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left border-b border-gray-100 transition-all ${
          isActive ? 'bg-amber-50/70' : isPast ? 'bg-emerald-50/40' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          isPast   ? 'bg-emerald-100 text-emerald-600' :
          isActive ? 'bg-amber-100 text-amber-600'     : 'bg-gray-100 text-gray-400'
        }`}>
          {isPast ? <CheckCircle2 size={16} /> : <Icon size={15} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold leading-tight ${
            isActive ? 'text-amber-700' : isPast ? 'text-emerald-700' : 'text-gray-600'
          }`}>
            <span className={`text-[10px] font-bold mr-1.5 ${
              isActive ? 'text-amber-400' : isPast ? 'text-emerald-400' : 'text-gray-300'
            }`}>#{num}</span>
            {label}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
    );
  };

  const Row = ({ label, value, highlight, mono }: {
    label: string; value: string | null | undefined; highlight?: boolean; mono?: boolean;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 flex-shrink-0 mr-4">{label}</span>
      <span className={`text-sm font-semibold text-right ${
        highlight ? 'text-amber-700' : value ? 'text-gray-800' : 'text-gray-300'
      } ${mono ? 'font-mono tracking-wide' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-5 py-5 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white leading-tight">{cand?.full_name || '—'}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {cand?.passport_no && (
                  <span className="text-xs font-mono font-semibold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md">{cand.passport_no}</span>
                )}
                {cand?.whatsapp_no && (
                  <span className="text-xs text-gray-400">{cand.whatsapp_no}</span>
                )}
                <span className="text-xs text-gray-400">{job?.title}</span>
                <span className="text-xs text-gray-500">@</span>
                <span className="text-xs font-semibold text-gray-300">{job?.company?.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <button
                onClick={() => onEdit(record)}
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition-colors"
              >
                Edit
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Stage progress */}
          <div className="flex items-center gap-1">
            {PIPELINE_STAGES.map((s, i) => {
              const isPast   = i < curIdx;
              const isActive = i === curIdx;
              return (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full h-1.5 rounded-full transition-all ${
                    isPast ? 'bg-emerald-400' : isActive ? 'bg-amber-400' : 'bg-white/15'
                  }`} />
                  {isActive && (
                    <span className="text-[9px] font-bold text-amber-300 whitespace-nowrap">{s.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Next Step Banner ── */}
        <div className={`flex items-center gap-2.5 px-5 py-3 border-b text-sm font-medium flex-shrink-0 ${nextStep.color}`}>
          <ArrowRight size={14} className="flex-shrink-0" />
          <span><strong className="font-bold">Next:</strong> {nextStep.label}</span>
        </div>

        {/* ── Expiry Alerts ── */}
        {((visaExpiring !== null && visaExpiring <= 30) || (medExpiring !== null && medExpiring <= 30)) && (
          <div className="flex gap-3 px-5 py-2.5 bg-red-50 border-b border-red-100 flex-shrink-0 flex-wrap">
            {visaExpiring !== null && visaExpiring <= 30 && (
              <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                <Globe size={13} />
                Visa {visaExpiring < 0 ? `EXPIRED ${Math.abs(visaExpiring)}d ago` : `expires in ${visaExpiring}d`}
              </span>
            )}
            {medExpiring !== null && medExpiring <= 30 && (
              <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                <Stethoscope size={13} />
                Medical {medExpiring < 0 ? `EXPIRED ${Math.abs(medExpiring)}d ago` : `expires in ${medExpiring}d`}
              </span>
            )}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/40">

          {/* Candidate Details — informational card, always visible */}
          <div className="px-5 py-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <User size={13} className="text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Candidate Details</span>
            </div>
            <Row label="Source"               value={cand?.source?.name} />
            <Row label="Name"                 value={cand?.full_name} />
            <Row label="Applied for Position" value={cand?.position_1?.name || job?.title} />
            <Row label="ECR Type"             value={cand?.ecr_type ? cand.ecr_type.replace(/_/g, ' ').toUpperCase() : null} />
            <Row label="Work Experience"      value={[cand?.indian_experience, cand?.abroad_experience].filter(Boolean).join(' · ') || null} />
            <Row label="Contact No"           value={cand?.whatsapp_no} mono />
            <Row label="Email Id"             value={cand?.email} />
            <Row label="Passport No"          value={cand?.passport_no} mono />
            <Row label="Passport Expiry"      value={cand?.passport_expiry_date ? fmtDate(cand.passport_expiry_date, true) : null} />
            <Row label="Associate"            value={cand?.associate?.full_name || null} />
            <Row label="Associate Phone"      value={cand?.associate?.phone || null} mono />
          </div>

          {/* Interview Details */}
          <StageBtn stageKey="selection" label="Interview Details" subtitle="Interview → Selection → Offer" num={1} Icon={BadgeCheck} />
          {open.has('selection') && (
            <div className="px-5 py-3 bg-white border-b border-gray-100 space-y-0">
              <Row label="Interview date"   value={fmtDate(record.date_of_interview, true)} />
              <Row label="Selection date"   value={fmtDate(record.date_of_selection, true)} />
              <Row label="Mode"             value={record.mode_of_selection?.replace(/_/g, ' ')} />
              <Row label="Location"         value={record.interview_location} />
              <Row label="Sponsor"          value={record.sponsor} />
              <Row label="Company"          value={job?.company?.name} />
              <Row label="Employment Country" value={job?.country} />
              <Row label="Salary"           value={job?.salary_min ? `${fmtCurrency(job.salary_min)} ${job.salary_currency || ''}`.trim() : null} />
              <Row label="Service charge"   value={record.vendor_service_charge ? fmtCurrency(record.vendor_service_charge) : null} highlight />
              {/* PLEASE LOG TO SEE THE ACCOMMODATION AND TRANSPORTATION */}
              {console.log(record)}
              <Row
                label="Accommodation"
                value={
                  record.candidate_job === true  ? 'Provided' :
                  record.accommodation === false ? `Candidate pays${record.accommodation_cost ? ` · ${fmtCurrency(record.accommodation_cost)}` : ''}` :
                  null
                }
              />
              <Row
                label="Transportation"
                value={
                  record.transportation === true  ? 'Provided' :
                  record.transportation === false ? `Candidate pays${record.transportation_cost ? ` · ${fmtCurrency(record.transportation_cost)}` : ''}` :
                  null
                }
              />
              <Row label="Medical Approval Email" value={record.medical_approval_email_at ? new Date(record.medical_approval_email_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : null} />
              {record.candidate_status && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-400">Status</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${CANDIDATE_STATUS_COLORS[record.candidate_status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {record.candidate_status.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Documents */}
          <StageBtn stageKey="documents" label={`Documents (${dc.submitted}/${dc.total})`} subtitle="Passport, photos, certificates" num={2} Icon={FileText} />
          {open.has('documents') && (
            <div className="px-5 py-3 bg-white border-b border-gray-100">
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500">{dc.submitted} of {dc.total} submitted</span>
                  <span className="text-xs font-bold text-emerald-600">{Math.round((dc.submitted/dc.total)*100)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: `${(dc.submitted/dc.total)*100}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3 p-3 bg-gray-50 rounded-xl">
                {DOCS_CHECKLIST.map(d => (
                  <div key={d.key} className="flex items-center gap-2">
                    {cl[d.key]
                      ? <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                      : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                    <span className={`text-xs ${cl[d.key] ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{d.label}</span>
                  </div>
                ))}
              </div>
              {/* <Row label="Passport No"      value={cand?.passport_no} mono /> */}
              {/* <Row label="ECR Type"         value={cand?.ecr_type?.replace('_',' ').toUpperCase()} /> */}
              <Row label="Courier sent"     value={fmtDate(record.courier_sent_date, true)} />
              <Row label="Courier received" value={fmtDate(record.courier_received_date, true)} />
            </div>
          )}

          {/* Medical */}
          <StageBtn stageKey="medical" label="Medical" subtitle="Application → Completion → Approval" num={3} Icon={Stethoscope} />
          {open.has('medical') && (
            <div className="px-5 py-3 bg-white border-b border-gray-100 space-y-0">
              {record.medical_status && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Status</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${MEDICAL_STATUS_COLORS[record.medical_status] || 'bg-gray-100 text-gray-600'}`}>
                    {record.medical_status.toUpperCase()}
                  </span>
                </div>
              )}
              <Row label="Applied"          value={fmtDate(record.medical_app_date, true)} />
              <Row label="Completion"       value={fmtDate(record.medical_completion_date, true)} />
              <Row label="Approval"         value={fmtDate(record.medical_approval_date, true)} />
              <Row label="Expiry"           value={fmtDate(record.medical_expiry_date, true)} highlight={!!(medExpiring !== null && medExpiring <= 30)} />
              {record.medical_repeat_date && <Row label="Repeat" value={fmtDate(record.medical_repeat_date, true)} />}
              <Row label="GAMCA Slip Date"  value={fmtDate(record.gamca_slip_date, true)} />
              <Row label="GAMCA Slip Place" value={record.gamca_slip_place} />
            </div>
          )}

          {/* Payment */}
          <StageBtn stageKey="payment" label="Payment" subtitle="Up to 4 installments" num={4} Icon={DollarSign} />
          {open.has('payment') && (
            <div className="px-5 py-3 bg-white border-b border-gray-100">
              {payments.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {[1,2,3,4].map(n => {
                    const p = payments.find((x: any) => x.installment_number === n);
                    if (!p) return null;
                    return (
                      <div key={n} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                        <span className="text-sm text-gray-500 font-medium">Installment {n}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">{fmtCurrency(p.amount_paid)} / {fmtCurrency(p.amount_due)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Service Charge', val: fmtCurrency(serviceCharge || record.total_receivable_amount), color: 'bg-gray-50 text-gray-700' },
                  { label: 'Discount',       val: fmtCurrency(discount),                                         color: 'bg-blue-50 text-blue-700' },
                  { label: 'Collected',      val: fmtCurrency(totalPaid),                                        color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Due',            val: fmtCurrency(dueAmount),                                        color: dueAmount > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700' },
                ].map(({ label, val, color }) => (
                  <div key={label} className={`${color} rounded-xl p-2.5 text-center`}>
                    <div className="text-[10px] font-bold uppercase tracking-wide opacity-70 mb-0.5">{label}</div>
                    <div className="text-sm font-bold">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visa & MOFA */}
          <StageBtn stageKey="visa" label="Visa & MOFA" subtitle="Courier → Visa → MOFA → SVP → MOL/QVC" num={5} Icon={Globe} />
          {open.has('visa') && (
            <div className="px-5 py-3 bg-white border-b border-gray-100 space-y-0">
              <Row label="Visa issued"        value={fmtDate(record.visa_issue_date, true)} />
              <Row label="Visa expiry"        value={fmtDate(record.visa_expiry_date, true)} highlight={!!(visaExpiring !== null && visaExpiring <= 30)} />
              <Row label="Visa receiving"     value={fmtDate(record.visa_receiving_date, true)} />
              <Row label="MOFA No."           value={record.mofa_number} mono />
              <Row label="MOFA date"          value={fmtDate(record.mofa_date, true)} />
              <Row label="MOFA received"      value={fmtDate(record.mofa_received_date, true)} />
              <Row label="VFS applied"        value={fmtDate(record.vfs_applied_date, true)} />
              <Row label="VFS received"       value={fmtDate(record.vfs_received_date, true)} />
              <Row label="SVP - Apply Date"   value={fmtDate(record.svp_apply_date, true)} />
              <Row label="SVP - Appointment"  value={fmtDate(record.svp_appointment_date, true)} />
              <Row label="SVP - Received"     value={fmtDate(record.svp_received_date, true)} />
              <Row label="MOL/QVC - Apply"    value={fmtDate(record.mol_qvc_apply_date, true)} />
              <Row label="MOL/QVC - Status Receipt" value={fmtDate(record.mol_qvc_status_date, true)} />
              <Row label="Courier Consignment No" value={record.courier_consignment_no} mono />
              <Row label="Others"             value={record.other_remarks} />
            </div>
          )}

          {/* Flight & Deployment */}
          <StageBtn stageKey="flight" label="Flight & Deployment" subtitle="Booking → Confirmation → Departure" num={6} Icon={Plane} />
          {open.has('flight') && (
            <div className="px-5 py-3 bg-white border-b border-gray-100 space-y-0">
              <Row label="Booking date"           value={fmtDate(record.ticket_booking_date, true)} />
              <Row label="Confirmed date"         value={fmtDate(record.ticket_confirm_date, true)} />
              <Row label="Proposed Flight Date"   value={fmtDate(record.proposed_flight_date, true)} />
              <Row label="Onboarding city"        value={record.onboarding_city} />
              <Row label="Deployment From"        value={record.deployment_from} />
              <Row label="Deployment date"        value={fmtDate(record.deployment_date, true)} highlight={!!record.deployment_date} />
            </div>
          )}

          {/* Joining & Contract — separate informational card */}
          <div className="px-5 py-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <CalendarDays size={13} className="text-blue-600" />
              </div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Joining & Contract</span>
            </div>
            <Row label="Date of Joining"          value={fmtDate(record.joining_date, true)} />
            <Row label="Date of Contract Expiry" value={fmtDate(record.contract_expiry_date, true)} />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Edit Drawer sub-components — module-level prevents cursor-reset bug ─────────
// Defining components inside ProcessEditDrawer would create a new type each render,
// causing React to unmount/remount the input and lose cursor position every keystroke.

const EDIT_SEC_COLORS: Record<string, { border: string; icon: string; label: string }> = {
  blue:    { border: '',    icon: 'text-blue-500',    label: 'text-blue-700'    },
  emerald: { border: '', icon: 'text-emerald-500', label: 'text-emerald-700' },
  violet:  { border: '',  icon: 'text-violet-500',  label: 'text-violet-700'  },
  amber:   { border: '',   icon: 'text-amber-500',   label: 'text-amber-700'   },
  indigo:  { border: '',  icon: 'text-indigo-500',  label: 'text-indigo-700'  },
  sky:     { border: '',     icon: 'text-sky-500',     label: 'text-sky-700'     },
  gray:    { border: '',    icon: 'text-gray-400',    label: 'text-gray-600'    },
};

function EditSec({ title, icon: Icon, color = 'blue', children, locked, lockReason }: {
  title: string; icon: React.ElementType; color?: string; children: React.ReactNode;
  locked?: boolean; lockReason?: string;
}) {
  const c = EDIT_SEC_COLORS[color] || EDIT_SEC_COLORS.blue;
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${locked ? 'border-l-gray-300' : c.border} shadow-sm overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-gray-50 ${locked ? 'bg-gray-50' : ''}`}>
        {locked ? <Lock size={13} className="text-gray-400" /> : <Icon size={14} className={c.icon} />}
        <span className={`text-xs font-bold uppercase tracking-wider ${locked ? 'text-gray-400' : c.label}`}>{title}</span>
        {locked && (
          <span className="ml-auto text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Lock size={9} />
            {lockReason || 'Medical must be Fit to unlock'}
          </span>
        )}
      </div>
      <div className={`px-4 py-3 relative ${locked ? 'pointer-events-none select-none' : ''}`}>
        {locked && (
          <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-[1px] rounded-b-2xl z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <Lock size={18} className="text-gray-400" />
              </div>
              <p className="text-xs font-semibold text-gray-500">{lockReason || 'Requires Medical Status: Fit'}</p>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

const MONEY_CLS = 'w-full text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-gray-800 placeholder-gray-300';

function MoneyInp({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 pointer-events-none select-none">₹</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          className={`${MONEY_CLS} px-3 py-2 pl-7`}
        />
      </div>
    </div>
  );
}

// ── Edit Drawer ────────────────────────────────────────────────────────────────

type PayRow = { id: number | null; date: string; method: string; amount: string; status: 'paid' | 'unpaid' };

function ProcessEditDrawer({ record, onClose }: { record: any; onClose: () => void }) {
  const [updateDetails, { isLoading }] = useUpdateProcessDetailsMutation();
  const [createPayment]   = useCreatePaymentMutation();
  const [recordPayment]   = useRecordPaymentMutation();
  const [updateCandidate] = useUpdateCandidateMutation();
  const { data: vendorsData } = useGetVendorsQuery({ status: 'active', limit: 200 } as any);
  const vendors: any[] = (vendorsData as any)?.data || [];
  const { data: sourcesData } = useGetSourcesQuery({} as any);
  const sources: any[] = (sourcesData as any)?.data || (sourcesData as any) || [];
  const cj   = record.candidate_job;
  const cand = cj?.candidate;
  const job  = cj?.job;

  const [form, setForm] = useState({
    year_of_selection:        record.year_of_selection || new Date().getFullYear(),
    date_of_interview:        record.date_of_interview?.substring(0,10)        || '',
    date_of_selection:        record.date_of_selection?.substring(0,10)        || '',
    mode_of_selection:        record.mode_of_selection   || '',
    interview_location:       record.interview_location  || '',
    client_remark:            record.client_remark       || '',
    vendor:                   record.vendor              || record.candidate_job?.job?.interview_events?.[0]?.vendor?.name || '',
    sponsor:                  record.sponsor             || '',
    vendor_service_charge:    record.vendor_service_charge ?? record.candidate_job?.job?.service_fee ?? '',
    candidate_status:         record.candidate_status    || 'selected',
    medical_status:           record.medical_status            || 'pending',
    medical_app_date:         record.medical_app_date?.substring(0,10)         || '',
    medical_completion_date:  record.medical_completion_date?.substring(0,10)  || '',
    medical_approval_date:    record.medical_approval_date?.substring(0,10)    || '',
    medical_expiry_date:      record.medical_expiry_date?.substring(0,10)      || '',
    medical_repeat_date:      record.medical_repeat_date?.substring(0,10)      || '',
    courier_sent_date:        record.courier_sent_date?.substring(0,10)        || '',
    courier_received_date:    record.courier_received_date?.substring(0,10)    || '',
    mofa_number:              record.mofa_number             || '',
    mofa_date:                record.mofa_date?.substring(0,10)                || '',
    mofa_received_date:       record.mofa_received_date?.substring(0,10)       || '',
    visa_receiving_date:      record.visa_receiving_date?.substring(0,10)      || '',
    visa_issue_date:          record.visa_issue_date?.substring(0,10)          || '',
    visa_expiry_date:         record.visa_expiry_date?.substring(0,10)         || '',
    vfs_applied_date:         record.vfs_applied_date?.substring(0,10)         || '',
    vfs_received_date:        record.vfs_received_date?.substring(0,10)        || '',
    ticket_booking_date:      record.ticket_booking_date?.substring(0,10)      || '',
    ticket_confirm_date:      record.ticket_confirm_date?.substring(0,10)      || '',
    onboarding_city:          record.onboarding_city      || '',
    deployment_date:          record.deployment_date?.substring(0,10)          || '',
    deployment_month:         record.deployment_month     || '',
    total_receivable_amount:  record.total_receivable_amount ?? '',
    total_received_amount:    record.total_received_amount   ?? '',
    disc_allot:               record.disc_allot              ?? '',
    advance_received:         record.advance_received        ?? '',
    refund_date:              record.refund_date?.substring(0,10) || '',
    refund_amount:            record.refund_amount           ?? '',
    family_contact_name:      record.family_contact_name  || '',
    family_contact_phone:     record.family_contact_phone || '',
    candidate_address:        record.candidate_address    || '',
    remarks:                  record.remarks              || '',
    other_remarks:            record.other_remarks        || '',
    // New fields
    medical_approval_email_at: record.medical_approval_email_at?.substring(0, 16) || '',
    gamca_slip_date:          record.gamca_slip_date?.substring(0, 10)          || '',
    gamca_slip_place:         record.gamca_slip_place    || '',
    courier_consignment_no:   record.courier_consignment_no || '',
    svp_apply_date:           record.svp_apply_date?.substring(0, 10)           || '',
    svp_appointment_date:     record.svp_appointment_date?.substring(0, 10)     || '',
    svp_received_date:        record.svp_received_date?.substring(0, 10)        || '',
    mol_qvc_apply_date:       record.mol_qvc_apply_date?.substring(0, 10)       || '',
    mol_qvc_status_date:      record.mol_qvc_status_date?.substring(0, 10)      || '',
    proposed_flight_date:     record.proposed_flight_date?.substring(0, 10)     || '',
    deployment_from:          record.deployment_from     || '',
    joining_date:             record.joining_date?.substring(0, 10)             || '',
    contract_expiry_date:     record.contract_expiry_date?.substring(0, 10)     || '',
    accommodation:            record.accommodation === true ? 'yes' : record.accommodation === false ? 'no' : '',
    accommodation_cost:       record.accommodation_cost  ?? '',
    transportation:           record.transportation === true ? 'yes' : record.transportation === false ? 'no' : '',
    transportation_cost:      record.transportation_cost ?? '',
  });

  const [docs, setDocs] = useState<Record<string, any>>(
    (record.documents_checklist as Record<string, any>) || {}
  );
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const existingPayments: any[] = cj?.payments || [];

  // Candidate detail fields shown above Interview Detials.
  // All editable except "Applied for Position" which displays the candidate's position_1 (or job title fallback).
  const appliedPosition = cand?.position_1?.name || job?.title || '';
  const [candForm, setCandForm] = useState({
    source_id:            cand?.source?.id ? String(cand.source.id) : '',
    full_name:            cand?.full_name        || '',
    whatsapp_no:          cand?.whatsapp_no      || '',
    email:                cand?.email            || '',
    passport_no:          cand?.passport_no      || '',
    passport_expiry_date: cand?.passport_expiry_date?.substring(0, 10) || '',
    indian_experience:    cand?.indian_experience || '',
  });
  const setCand = (k: string, v: string) => setCandForm(c => ({ ...c, [k]: v }));
  const [numInstallments, setNumInstallments] = useState<number>(() => {
    const count = existingPayments.filter((p: any) => Number(p?.amount_due || 0) > 0).length;
    return count > 0 ? Math.min(4, count) : 1;
  });
  const [payRows, setPayRows] = useState<PayRow[]>(() => {
    const existingCount = existingPayments.filter((p: any) => Number(p?.amount_due || 0) > 0).length;
    const instCount = existingCount > 0 ? Math.min(4, existingCount) : 1;
    const sc   = parseFloat(String(record.vendor_service_charge ?? record.candidate_job?.job?.service_fee ?? 0)) || 0;
    const disc = parseFloat(String(record.disc_allot ?? 0)) || 0;
    const net  = Math.max(0, sc - disc);
    const base = instCount > 0 ? Math.floor(net / instCount) : 0;
    const dbAmounts = [1, 2, 3, 4].map(n => {
      const p = existingPayments.find((x: any) => x.installment_number === n);
      return n <= instCount && p?.amount_due ? Number(p.amount_due) : null;
    });
    const dbSum = dbAmounts.every(a => a !== null) ? dbAmounts.reduce((s, a) => s + (a ?? 0), 0) : null;
    const useDb = dbSum !== null && dbSum === net;
    return [1, 2, 3, 4].map(n => {
      const p = existingPayments.find((x: any) => x.installment_number === n);
      const dbAmt = p?.amount_due ? Number(p.amount_due) : null;
      const autoAmt = net > 0 && n <= instCount ? (n === instCount ? net - base * (instCount - 1) : base) : 0;
      // Show paid_date if paid, otherwise fall back to due_date — the UI's single "Date" field
      const displayDate = p?.paid_date?.substring(0, 10) || p?.due_date?.substring(0, 10) || '';
      return {
        id:     p?.id ?? null,
        date:   displayDate,
        method: p?.payment_method || '',
        amount: useDb && dbAmt !== null ? String(dbAmt) : (autoAmt > 0 ? String(autoAmt) : ''),
        status: (p?.status === 'paid' ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
      };
    });
  });

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const sc   = parseFloat(String(form.vendor_service_charge)) || 0;
    const disc = parseFloat(String(form.disc_allot)) || 0;
    const net  = Math.max(0, sc - disc);

    // Preserve amounts on already-paid installments; only redistribute the remaining
    // amount across the unpaid installments within the active range.
    setPayRows(prev => {
      const next = [...prev];
      const activeIdxs    = next.map((_, i) => i).filter(i => i < numInstallments);
      const paidActive    = activeIdxs.filter(i => next[i].status === 'paid');
      const unpaidActive  = activeIdxs.filter(i => next[i].status !== 'paid');
      const paidSum       = paidActive.reduce((s, i) => s + (parseFloat(next[i].amount) || 0), 0);
      const remaining     = Math.max(0, net - paidSum);

      if (unpaidActive.length === 0) return next;

      const perUnpaid = Math.floor(remaining / unpaidActive.length);
      let given = 0;
      unpaidActive.forEach((idx, k) => {
        const isLast = k === unpaidActive.length - 1;
        const amt    = isLast ? remaining - given : perUnpaid;
        next[idx]    = { ...next[idx], amount: String(Math.max(0, amt)) };
        given += amt;
      });
      return next;
    });
  }, [numInstallments, form.vendor_service_charge, form.disc_allot]);

  const set = (k: string, v: string) => setForm(f => {
    const next: any = { ...f, [k]: v };
    // Auto: when medical approval date is entered and status is Awaited/Pending, mark as Fit
    if (k === 'medical_approval_date' && v && (f.medical_status === 'awaited' || f.medical_status === 'pending' || !f.medical_status)) {
      next.medical_status = 'fit';
    }
    return next;
  });
  const toggleDoc = (k: string) => setDocs(d => ({ ...d, [k]: !d[k] }));

  const uploadDocFile = async (key: string, file: File) => {
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const authRaw = localStorage.getItem('auth');
      const token = authRaw ? JSON.parse(authRaw)?.token : null;
      const res = await fetch('/api/process-details/upload-doc', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setDocs(d => ({ ...d, [key]: data.url, [`${key}_name`]: data.name }));
      }
    } finally {
      setUploading(u => ({ ...u, [key]: false }));
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    const serviceCharge = parseFloat(String(form.vendor_service_charge)) || 0;
    const discount      = parseFloat(String(form.disc_allot))           || 0;
    const netTotal      = Math.max(0, serviceCharge - discount);

    // Validate installment amounts
    if (netTotal > 0) {
      const visibleAmounts = payRows.slice(0, numInstallments).map(r => parseFloat(r.amount) || 0);
      if (visibleAmounts.some(a => a <= 0)) {
        setSaveError('All installment amounts must be greater than ₹0.');
        return;
      }
      if (visibleAmounts.some(a => a > netTotal)) {
        setSaveError(`No installment can exceed the net payable amount (₹${netTotal.toLocaleString('en-IN')}).`);
        return;
      }
    }
    const baseInstallment = numInstallments > 0 ? Math.floor(netTotal / numInstallments) : 0;

    const payload: any = {
      ...form,
      documents_checklist: docs,
      total_receivable_amount: netTotal || form.total_receivable_amount,
    };
    // Convert accommodation/transportation string toggles back to booleans
    payload.accommodation = form.accommodation === 'yes' ? true : form.accommodation === 'no' ? false : null;
    payload.transportation = form.transportation === 'yes' ? true : form.transportation === 'no' ? false : null;
    if (payload.accommodation !== false) payload.accommodation_cost = null;
    if (payload.transportation !== false) payload.transportation_cost = null;
    if (payload.deployment_date) payload.candidate_status = 'deployed';
    const result = await updateDetails({ candidateJobId: record.candidate_job_id, ...payload });
    if ('error' in result) {
      setSaveError('Save failed. Please check your inputs and try again.');
      return;
    }

    // Save candidate-level edits (source, name, contact, email, passport, experience)
    if (cand?.id) {
      try {
        await updateCandidate({
          id:                   cand.id,
          source_id:            candForm.source_id ? Number(candForm.source_id) : null,
          full_name:            candForm.full_name,
          whatsapp_no:          candForm.whatsapp_no,
          email:                candForm.email || null,
          passport_no:          candForm.passport_no || null,
          passport_expiry_date: candForm.passport_expiry_date || null,
          indian_experience:    candForm.indian_experience || null,
        }).unwrap();
      } catch { /* candidate update is best-effort; main save succeeded */ }
    }

    // Save payment installments — only for selected number, evenly divided
    for (let i = 0; i < numInstallments; i++) {
      const row = payRows[i];
      const isLastInst = i === numInstallments - 1;
      const fallback = isLastInst ? netTotal - baseInstallment * (numInstallments - 1) : baseInstallment;
      const amount = parseFloat(row.amount) || fallback;
      if (amount <= 0) continue;
      const installmentNum = i + 1;
      // Explicit status sent to backend — no longer inferred from date
      const explicitStatus: 'paid' | 'pending' = row.status === 'paid' ? 'paid' : 'pending';
      try {
        let payId = row.id;
        if (!payId) {
          const res = await createPayment({
            candidate_job_id:   record.candidate_job_id,
            installment_number: installmentNum,
            total_fee:          amount,
            amount_due:         amount,
            fee_waiver_amount:  0,
            status:             explicitStatus,
            ...(row.date   ? { paid_date: row.date } : {}),
            ...(row.method ? { payment_method: row.method } : {}),
          }).unwrap();
          payId = res.id;
        }
        if (payId) {
          await recordPayment({
            id:                payId,
            amount_due:        amount,
            fee_waiver_amount: 0,
            status:            explicitStatus,
            ...(row.date   ? { paid_date:      row.date   } : {}),
            ...(row.method ? { payment_method: row.method } : {}),
          }).unwrap();
        }
      } catch { /* ignore individual payment errors — main save succeeded */ }
    }
    onClose();
  };

  const inp = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-gray-800 placeholder-gray-300';
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-base leading-tight">{cand?.full_name}</p>
              <p className="text-slate-400 text-xs mt-0.5">{job?.title} · {job?.company?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-gray-50">

          {/* Candidate Details — shown above Interview Detials; all editable except Applied Position */}
          <EditSec title="Candidate Details" icon={User} color="emerald">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Candidate Source</label>
                <select value={candForm.source_id} onChange={e => setCand('source_id', e.target.value)} className={inp}>
                  <option value="">— Select source —</option>
                  {sources.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Candidate Name</label>
                <input type="text" value={candForm.full_name} onChange={e => setCand('full_name', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Applied for Position</label>
                <div className={`${inp} bg-gray-100 text-gray-700 cursor-not-allowed select-text`}>
                  {appliedPosition || <span className="text-gray-300">—</span>}
                </div>
              </div>
              <div className="col-span-3">
                <label className={lbl}>Work Experience</label>
                <input type="text" value={candForm.indian_experience} onChange={e => setCand('indian_experience', e.target.value)} className={inp} placeholder="e.g. 5 years as electrician" />
              </div>
              <div>
                <label className={lbl}>Contact No</label>
                <input type="text" value={candForm.whatsapp_no} onChange={e => setCand('whatsapp_no', e.target.value)} className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Email Id</label>
                <input type="email" value={candForm.email} onChange={e => setCand('email', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Passport No</label>
                <input type="text" value={candForm.passport_no} onChange={e => setCand('passport_no', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Passport Expiry Date</label>
                <input type="date" value={candForm.passport_expiry_date} onChange={e => setCand('passport_expiry_date', e.target.value)} className={inp} />
              </div>
            </div>
          </EditSec>


          {/* Interview Detials */}
          <EditSec title="Interview Details" icon={BadgeCheck} color="blue">
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Interview Date</label><input type="date" value={form.date_of_interview} onChange={e=>set('date_of_interview',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Selection Date</label><input type="date" value={form.date_of_selection} onChange={e=>set('date_of_selection',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Mode</label><Select value={form.mode_of_selection} onChange={e=>set('mode_of_selection',e.target.value)}><option value="">Select</option>{MODE_OPTIONS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</Select></div>
              <div><label className={lbl}>Status</label><Select value={form.candidate_status} onChange={e=>set('candidate_status',e.target.value)}>{CANDIDATE_STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</Select></div>
              <div><label className={lbl}>Sponsor</label><input type="text" value={form.sponsor} onChange={e=>set('sponsor',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Vendor / Sub-agent</label><select value={form.vendor} onChange={e=>set('vendor',e.target.value)} className={inp}><option value="">— Select vendor —</option>{vendors.map((v:any) => <option key={v.id} value={v.name}>{v.name} ({v.vendor_id})</option>)}</select></div>
              <MoneyInp label="Service Charge" value={String(form.vendor_service_charge)} onChange={v=>set('vendor_service_charge',v)} />
              <div className={`${inp} bg-gray-100 text-gray-700 cursor-not-allowed select-text col-span-3`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">Company · Country · Salary (from job)</span>
                {[job?.company?.name, job?.country, job?.salary_min ? `${job.salary_min}–${job.salary_max} ${job.salary_currency || ''}` : null].filter(Boolean).join(' · ') || <span className="text-gray-300">—</span>}
              </div>
              {/* Accommodation toggle + cost */}
              <div>
                <label className={lbl}>Accommodation</label>
                <Select value={form.accommodation} onChange={e=>set('accommodation',e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="yes">Yes (Provided)</option>
                  <option value="no">No (Candidate Pays)</option>
                </Select>
              </div>
              {form.accommodation === 'no' && (
                <MoneyInp label="Accommodation Cost" value={String(form.accommodation_cost ?? 0)} onChange={v=>set('accommodation_cost',v)} />
              )}
              {/* Transportation toggle + cost */}
              <div>
                <label className={lbl}>Transportation</label>
                <Select value={form.transportation} onChange={e=>set('transportation',e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="yes">Yes (Provided)</option>
                  <option value="no">No (Candidate Pays)</option>
                </Select>
              </div>
              {form.transportation === 'no' && (
                <MoneyInp label="Transportation Cost" value={String(form.transportation_cost ?? 0)} onChange={v=>set('transportation_cost',v)} />
              )}
              <div className="col-span-3">
                <label className={lbl}>Medical Approval Email Date & Time (from Client)</label>
                <input type="datetime-local" value={form.medical_approval_email_at} onChange={e=>set('medical_approval_email_at',e.target.value)} className={inp} />
              </div>
            </div>
          </EditSec>

          {/* Documents */}
          <EditSec title="Documents" icon={FileText} color="violet">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { key: 'passport_doc', label: 'Passport Copy' },
                { key: 'id_doc', label: 'ID Document' },
              ].map(({ key, label }) => {
                const url = typeof docs[key] === 'string' ? docs[key] : null;
                const name = docs[`${key}_name`] as string | undefined;
                return (
                  <div key={key} className="border border-dashed border-gray-200 rounded-xl p-3 bg-gray-50 hover:bg-white transition-colors">
                    <div className="text-xs font-semibold text-gray-500 mb-2">{label}</div>
                    {url ? (
                      <div className="flex items-center gap-2">
                        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate flex-1">
                          <Eye size={12} /> {name || 'View file'}
                        </a>
                        <button type="button" onClick={() => setDocs(d => { const n = { ...d }; delete n[key]; delete n[`${key}_name`]; return n; })} className="text-gray-300 hover:text-red-400 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 cursor-pointer transition-colors">
                        {uploading[key] ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        {uploading[key] ? 'Uploading…' : 'Upload PDF / image'}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => e.target.files?.[0] && uploadDocFile(key, e.target.files[0])} />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 mb-3">
              <div className="text-xs font-semibold text-gray-500 mb-2">Document Checklist</div>
              <div className="grid grid-cols-2 gap-1.5">
                {DOCS_CHECKLIST.map(d => (
                  <label key={d.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input type="checkbox" checked={typeof docs[d.key] === 'boolean' ? !!docs[d.key] : false} onChange={() => toggleDoc(d.key)} className="rounded border-gray-300 text-emerald-600 w-3.5 h-3.5" />
                    <span className={`text-sm ${docs[d.key] ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Courier Sent</label><input type="date" value={form.courier_sent_date} onChange={e=>set('courier_sent_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Courier Received</label><input type="date" value={form.courier_received_date} onChange={e=>set('courier_received_date',e.target.value)} className={inp} /></div>
            </div>
          </EditSec>

          {/* Medical */}
          <EditSec title="Medical" icon={Stethoscope} color="emerald">
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Status</label><Select value={form.medical_status} onChange={e=>set('medical_status',e.target.value)}>{MEDICAL_STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</Select></div>
              <div><label className={lbl}>Application</label><input type="date" value={form.medical_app_date} onChange={e=>set('medical_app_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Completion</label><input type="date" value={form.medical_completion_date} onChange={e=>set('medical_completion_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Approval</label><input type="date" value={form.medical_approval_date} onChange={e=>set('medical_approval_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Expiry</label><input type="date" value={form.medical_expiry_date} onChange={e=>set('medical_expiry_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Repeat</label><input type="date" value={form.medical_repeat_date} onChange={e=>set('medical_repeat_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>GAMCA / Medical Slip Date</label><input type="date" value={form.gamca_slip_date} onChange={e=>set('gamca_slip_date',e.target.value)} className={inp} /></div>
              <div className="col-span-2"><label className={lbl}>GAMCA / Medical Slip Place</label><input type="text" value={form.gamca_slip_place} onChange={e=>set('gamca_slip_place',e.target.value)} className={inp} /></div>
            </div>
            {form.medical_approval_date && (
              <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Medical approval entered — status set to <strong>Fit</strong> automatically.
              </p>
            )}
          </EditSec>

          {/* Payment */}
          {(() => {
            const isFit          = form.medical_status === 'fit';
            const serviceCharge  = parseFloat(String(form.vendor_service_charge)) || 0;
            const discount       = parseFloat(String(form.disc_allot))            || 0;
            const netTotal       = Math.max(0, serviceCharge - discount);
            const perInstallment = numInstallments > 0 ? Math.floor(netTotal / numInstallments) : 0;
            const visibleRows    = payRows.slice(0, numInstallments);
            // Total paid uses explicit status field (not date) — status is the source of truth
            const totalPaid      = visibleRows.reduce((s, r, i) => {
              if (r.status !== 'paid') return s;
              const isLast = i === numInstallments - 1;
              const fallback = isLast ? netTotal - perInstallment * (numInstallments - 1) : perInstallment;
              return s + (parseFloat(r.amount) || fallback);
            }, 0);
            const balance        = Math.max(0, netTotal - totalPaid);
            const INST_COLORS    = ['bg-amber-100 text-amber-700','bg-blue-100 text-blue-700','bg-violet-100 text-violet-700','bg-teal-100 text-teal-700'];

            return (
              <EditSec title="Payment" icon={DollarSign} color="amber"
                locked={!isFit} lockReason="Medical status must be Fit to record payments">

                {/* Service charge + discount + installments */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <MoneyInp
                    label="Vendor Service Charge"
                    value={String(form.vendor_service_charge)}
                    onChange={v => set('vendor_service_charge', v)}
                  />
                  <MoneyInp
                    label="Discount"
                    value={String(form.disc_allot)}
                    onChange={v => set('disc_allot', v)}
                  />
                  <div>
                    <label className={lbl}>Installments</label>
                    <Select value={String(numInstallments)} onChange={e => setNumInstallments(parseInt(e.target.value, 10))}>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </Select>
                  </div>
                </div>

                {/* Net total readout */}
                <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Net Payable</p>
                    <p className="text-lg font-bold text-blue-700">₹{netTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Per Installment</p>
                    <p className="text-lg font-bold text-violet-700">
                      ₹{perInstallment.toLocaleString('en-IN')} <span className="text-xs text-gray-500 font-medium">× {numInstallments}</span>
                    </p>
                  </div>
                </div>

                {/* Header labels */}
                <div className="grid grid-cols-[28px_1.1fr_0.95fr_0.9fr_90px] gap-2 mb-1">
                  <div />
                  {['Amount','Date Paid','Method','Status'].map(h => (
                    <div key={h} className="text-[9px] font-bold text-gray-400 uppercase">{h}</div>
                  ))}
                </div>

                {/* Installment rows — only as many as numInstallments */}
                <div className="space-y-2">
                  {visibleRows.map((row, i) => {
                    const paid = row.status === 'paid';
                    return (
                      <div key={i} className={`grid grid-cols-[28px_1.1fr_0.95fr_0.9fr_90px] gap-2 items-center p-2 rounded-xl ${paid ? 'bg-emerald-50/60' : 'bg-gray-50'}`}>
                        <div className={`text-[10px] font-bold px-1.5 py-1 rounded-lg text-center ${INST_COLORS[i]}`}>#{i+1}</div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none select-none">&#8377;</span>
                          <input
                            type="text" inputMode="decimal"
                            value={row.amount}
                            placeholder={perInstallment > 0 ? String(perInstallment) : '0'}
                            disabled={row.status === 'paid'}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              const val = raw === '' ? '' : String(Math.min(parseFloat(raw) || 0, netTotal));
                              setPayRows(prev => {
                                const next = [...prev];
                                next[i] = { ...next[i], amount: val };
                                // Redistribute only across UNPAID rows after the current one — paid rows are locked
                                const laterUnpaidIdxs = next
                                  .map((r, idx) => (idx > i && idx < numInstallments && r.status !== 'paid' ? idx : -1))
                                  .filter(x => x !== -1);
                                if (laterUnpaidIdxs.length > 0 && val !== '') {
                                  const earlierPaidSum = next
                                    .slice(0, i)
                                    .filter(r => r.status === 'paid')
                                    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                                  const laterPaidSum = next
                                    .filter((r, idx) => idx > i && idx < numInstallments && r.status === 'paid')
                                    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                                  const entered  = parseFloat(val) || 0;
                                  const remaining = Math.max(0, netTotal - earlierPaidSum - entered - laterPaidSum);
                                  const perUnpaid = Math.floor(remaining / laterUnpaidIdxs.length);
                                  let given = 0;
                                  laterUnpaidIdxs.forEach((idx, k) => {
                                    const isLast = k === laterUnpaidIdxs.length - 1;
                                    const amt    = isLast ? remaining - given : perUnpaid;
                                    next[idx]    = { ...next[idx], amount: String(Math.max(0, amt)) };
                                    given += amt;
                                  });
                                }
                                return next;
                              });
                            }}
                            className={`${MONEY_CLS} pl-6 pr-2 py-1.5 text-sm font-bold ${row.status === 'paid' ? 'opacity-70 cursor-not-allowed' : ''} ${row.amount !== '' && (parseFloat(row.amount) <= 0 || parseFloat(row.amount) > netTotal) ? 'border-red-400 bg-red-50' : ''}`}
                          />
                        </div>
                        <input
                          type="date"
                          value={row.date}
                          onChange={e => setPayRows(prev => prev.map((r, idx) => idx === i ? { ...r, date: e.target.value } : r))}
                          className={`${inp} ${paid ? 'border-emerald-300 bg-emerald-50' : ''}`}
                        />
                        <select
                          value={row.method}
                          onChange={e => setPayRows(prev => prev.map((r, idx) => idx === i ? { ...r, method: e.target.value } : r))}
                          className={inp}
                        >
                          <option value="">—</option>
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="upi">UPI</option>
                          <option value="cheque">Cheque</option>
                        </select>
                        {/* Explicit Paid / Unpaid toggle — single source of truth for status */}
                        <button
                          type="button"
                          onClick={() => setPayRows(prev => prev.map((r, idx) => {
                            if (idx !== i) return r;
                            const next: 'paid' | 'unpaid' = r.status === 'paid' ? 'unpaid' : 'paid';
                            return {
                              ...r,
                              status: next,
                              // Auto-fill today's date only if empty; preserve existing date when toggling either way
                              date:   r.date || (next === 'paid' ? new Date().toISOString().substring(0, 10) : ''),
                              method: next === 'paid' ? (r.method || 'cash') : r.method,
                            };
                          }))}
                          className={`text-[10px] font-bold rounded-lg px-2 py-1.5 transition-all border ${
                            paid
                              ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-amber-400 hover:text-amber-700'
                          }`}
                          title={paid ? 'Click to mark as Unpaid' : 'Click to mark as Paid'}
                        >
                          {paid ? '✓ PAID' : 'UNPAID'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="border-t border-gray-100 mt-4 pt-3 grid grid-cols-4 gap-3">
                  {[
                    { label: 'Service Charge', val: serviceCharge, cls: 'text-gray-700',    bg: 'bg-gray-50' },
                    { label: 'Discount',       val: discount,      cls: 'text-red-600',     bg: 'bg-red-50'  },
                    { label: 'Net Payable',    val: netTotal,      cls: 'text-gray-900',    bg: 'bg-white',  bold: true },
                    { label: 'Total Paid',     val: totalPaid,     cls: 'text-emerald-700', bg: 'bg-emerald-50' },
                  ].map(({ label, val, cls, bg, bold }) => (
                    <div key={label}>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{label}</p>
                      <div className={`${MONEY_CLS} px-2.5 py-2 ${bg} ${cls} ${bold ? 'font-bold border-gray-300' : ''} cursor-default text-sm`}>
                        ₹{val.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Balance due */}
                <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-xl ${balance > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <span className={`text-xs font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    Balance Due
                  </span>
                  <span className={`text-sm font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '0 — Fully Paid'}
                  </span>
                </div>
              </EditSec>
            );
          })()}

          {/* Visa & MOFA */}
          <EditSec title="Visa & MOFA" icon={Globe} color="indigo"
            locked={form.medical_status !== 'fit'} lockReason="Medical status must be Fit to fill Visa details">
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Visa Issue</label><input type="date" value={form.visa_issue_date} onChange={e=>set('visa_issue_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Visa Expiry</label><input type="date" value={form.visa_expiry_date} onChange={e=>set('visa_expiry_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Visa Receiving</label><input type="date" value={form.visa_receiving_date} onChange={e=>set('visa_receiving_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>MOFA No.</label><input value={form.mofa_number} onChange={e=>set('mofa_number',e.target.value.replace(/\D/g,''))} placeholder="Numbers only" className={inp} /></div>
              <div><label className={lbl}>MOFA Date</label><input type="date" value={form.mofa_date} onChange={e=>set('mofa_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>MOFA Received</label><input type="date" value={form.mofa_received_date} onChange={e=>set('mofa_received_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>VFS Applied</label><input type="date" value={form.vfs_applied_date} onChange={e=>set('vfs_applied_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>VFS Received</label><input type="date" value={form.vfs_received_date} onChange={e=>set('vfs_received_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>SVP - Apply Date</label><input type="date" value={form.svp_apply_date} onChange={e=>set('svp_apply_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>SVP - Appointment</label><input type="date" value={form.svp_appointment_date} onChange={e=>set('svp_appointment_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>SVP - Received</label><input type="date" value={form.svp_received_date} onChange={e=>set('svp_received_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>MOL/QVC - Apply</label><input type="date" value={form.mol_qvc_apply_date} onChange={e=>set('mol_qvc_apply_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>MOL/QVC - Status Receipt</label><input type="date" value={form.mol_qvc_status_date} onChange={e=>set('mol_qvc_status_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Courier Consignment No</label><input type="text" value={form.courier_consignment_no} onChange={e=>set('courier_consignment_no',e.target.value)} className={inp} /></div>
              <div className="col-span-3"><label className={lbl}>Others (notes)</label><input type="text" value={form.other_remarks} onChange={e=>set('other_remarks',e.target.value)} className={inp} placeholder="Other documents / notes" /></div>
            </div>
          </EditSec>

          {/* Flight */}
          <EditSec title="Flight & Deployment" icon={Plane} color="sky"
            locked={form.medical_status !== 'fit'} lockReason="Medical status must be Fit to fill Flight details">
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Booking Date</label><input type="date" value={form.ticket_booking_date} onChange={e=>set('ticket_booking_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Confirm Date</label><input type="date" value={form.ticket_confirm_date} onChange={e=>set('ticket_confirm_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Proposed Flight Date</label><input type="date" value={form.proposed_flight_date} onChange={e=>set('proposed_flight_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Onboarding City</label><Select value={form.onboarding_city} onChange={e=>set('onboarding_city',e.target.value)}><option value="">Select</option>{ONBOARDING_CITIES.map(c=><option key={c} value={c}>{c}</option>)}</Select></div>
              <div>
                <label className={lbl}>Deployment From</label>
                <Select value={form.deployment_from} onChange={e=>set('deployment_from',e.target.value)}>
                  <option value="">Select</option>
                  <option value="BOM">BOM (Mumbai)</option>
                  <option value="DEL">DEL (Delhi)</option>
                  <option value="OTHERS">Others</option>
                </Select>
              </div>
              <div><label className={lbl}>Deployment Date</label><input type="date" value={form.deployment_date} onChange={e=>set('deployment_date',e.target.value)} className={inp} /></div>
              <div className="col-span-3"><label className={lbl}>Deployment Month</label><input value={form.deployment_month} onChange={e=>set('deployment_month',e.target.value)} placeholder="e.g. April 2026" className={inp} /></div>
            </div>
            {form.deployment_date && (
              <p className="mt-2 text-xs text-sky-700 bg-sky-50 border border-sky-100 px-3 py-2 rounded-xl flex items-center gap-1.5">
                <Zap size={12} /> Status will auto-set to <strong>Deployed</strong> on save.
              </p>
            )}
          </EditSec>

          {/* Joining & Contract — separate section */}
          <EditSec title="Joining & Contract" icon={CalendarDays} color="blue">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Date of Joining</label><input type="date" value={form.joining_date} onChange={e=>set('joining_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Date of Contract Expiry</label><input type="date" value={form.contract_expiry_date} onChange={e=>set('contract_expiry_date',e.target.value)} className={inp} /></div>
            </div>
          </EditSec>

          {/* Remarks & Contact */}
          <EditSec title="Remarks & Contact" icon={Users} color="gray">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={lbl}>Remarks</label><input value={form.remarks} onChange={e=>set('remarks',e.target.value)} className={inp} placeholder="Any remarks…" /></div>
              <div><label className={lbl}>Family Contact Name</label><input value={form.family_contact_name} onChange={e=>set('family_contact_name',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Family Phone</label><input value={form.family_contact_phone} onChange={e=>set('family_contact_phone',e.target.value)} className={inp} /></div>
              <div className="col-span-2"><label className={lbl}>Address</label><input value={form.candidate_address} onChange={e=>set('candidate_address',e.target.value)} className={inp} /></div>
            </div>
          </EditSec>

        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0 bg-white">
          {saveError && (
            <p className="text-xs text-red-600 font-medium mb-3 px-1">{saveError}</p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isLoading} className="btn-primary disabled:opacity-40">
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Add to Process Modal ──────────────────────────────────────────────────────

function AddToProcessModal({
  interview, onClose, onDone,
}: { interview: any | null; onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<'interview' | 'csv' | 'individual'>('individual');
  const [batchFromInterview, { isLoading: batching }] = useBatchFromInterviewMutation();
  const [quickAdd, { isLoading: adding }] = useQuickAddProcessMutation();
  const [importCsv, { isLoading: importing }] = useImportProcessCsvMutation();

  const { data: interviewData } = useGetInterviewEventQuery(interview?.id, { skip: !interview?.id });
  const checkins: any[] = interviewData?.checkins || [];

  // Fallback: if no checkins, load pipeline candidates for this job
  const { data: pipelineData } = useGetPipelineQuery(
    { job_id: interview?.job?.id, limit: 300 } as any,
    { skip: !interview?.job?.id || checkins.length > 0 },
  );
  const pipelineFallback: any[] = pipelineData?.data || [];
  const usingPipeline = checkins.length === 0 && pipelineFallback.length > 0;

  const [selectedCheckins, setSelectedCheckins] = useState<Set<number>>(new Set());
  const [batchResult, setBatchResult] = useState<string | null>(null);

  const [indiv, setIndiv] = useState({ passport_no: '', full_name: '', whatsapp_no: '', mode_of_selection: '', date_of_interview: interview?.event_date?.substring(0,10) || '' });
  const [indivErr, setIndivErr] = useState('');
  const [indivOk, setIndivOk] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvResult, setCsvResult] = useState<any>(null);

  const handleCsvFile = (f: File) => {
    setCsvFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target?.result, { type: 'binary' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }) as any[];
      setCsvRows(rows);
    };
    reader.readAsBinaryString(f);
  };

  const handleBatchAdd = async () => {
    if (!selectedCheckins.size) return;
    const ids = Array.from(selectedCheckins);
    try {
      await batchFromInterview({ candidate_job_ids: ids, initial_data: { date_of_interview: interview?.event_date, interview_location: interview?.venue_name, candidate_status: 'selected' } }).unwrap();
      setBatchResult(`${ids.length} candidate${ids.length > 1 ? 's' : ''} added to process`);
      setSelectedCheckins(new Set());
    } catch (err: any) {
      setBatchResult(`Error: ${err?.data?.message || 'Failed to add candidates. Please try again.'}`);
    }
  };

  const handleIndividualAdd = async () => {
    setIndivErr('');
    if (!indiv.passport_no.trim()) { setIndivErr('Passport number is required'); return; }
    if (!indiv.full_name.trim())   { setIndivErr('Full name is required'); return; }
    if (!indiv.whatsapp_no.trim()) { setIndivErr('Phone number is required'); return; }
    if (!interview?.job?.id)       { setIndivErr('No interview/job selected'); return; }
    try {
      await quickAdd({ ...indiv, job_id: interview.job.id }).unwrap();
      setIndivOk(true);
      setIndiv({ passport_no: '', full_name: '', whatsapp_no: '', mode_of_selection: '', date_of_interview: '' });
    } catch (err: any) { setIndivErr(err?.data?.message || 'Error adding candidate'); }
  };

  const handleCsvImport = async () => {
    if (!csvRows.length || !interview?.job?.id) return;
    const result = await importCsv({ rows: csvRows, job_id: interview.job.id }).unwrap();
    setCsvResult(result);
  };

  const downloadCsvTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 'Passport No': 'K1234567', 'Full Name': 'Mohammad Arif', Phone: '9800000001' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'process_import_template.xlsx');
  };

  const tabs = [
    { key: 'interview',  label: 'From Interview', icon: Users },
    { key: 'csv',        label: 'Import CSV',      icon: FileSpreadsheet },
    { key: 'individual', label: 'Add Individual',  icon: UserPlus },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="font-bold text-gray-900 text-sm">Add to Process</p>
            {interview && <p className="text-xs text-gray-400">{interview.job?.company?.name} · {interview.job?.title} · {fmtDate(interview.event_date, true)}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="flex border-b border-gray-100 flex-shrink-0 px-2 pt-2">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all mr-1 ${tab === t.key ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                <Icon size={13} />{t.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'interview' && (
            <div className="space-y-3">
              {!interview ? (
                <p className="text-sm text-gray-400 text-center py-8">Select an interview card first.</p>
              ) : batchResult ? (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${batchResult.startsWith('Error') ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <CheckCircle2 size={18} className={batchResult.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'} />
                  <p className={`font-semibold text-sm ${batchResult.startsWith('Error') ? 'text-red-700' : 'text-emerald-700'}`}>{batchResult}</p>
                </div>
              ) : checkins.length === 0 && pipelineFallback.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm font-semibold text-gray-500">No candidates lined up yet</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Add candidates to this interview via the Interview Events module, or use <strong>Add Individual</strong> or <strong>Import CSV</strong> above.
                  </p>
                </div>
              ) : (
                <>
                  {usingPipeline && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                      <Info size={12} className="flex-shrink-0 mt-0.5" />
                      <span>No candidates were formally checked in to this interview. Showing all pipeline candidates for this job.</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {usingPipeline ? pipelineFallback.length : checkins.length} candidate{(usingPipeline ? pipelineFallback.length : checkins.length) !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => {
                        if (usingPipeline) {
                          setSelectedCheckins(new Set(pipelineFallback.map((e: any) => e.id)));
                        } else {
                          setSelectedCheckins(new Set(checkins.map((c: any) => c.candidate_job_id)));
                        }
                      }}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Select all
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                    {usingPipeline ? (
                      pipelineFallback.map((entry: any) => {
                        const cand = entry.candidate;
                        const sel = selectedCheckins.has(entry.id);
                        return (
                          <label key={entry.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50/40 ${sel ? 'bg-blue-50' : 'bg-white'}`}>
                            <input type="checkbox" checked={sel} onChange={() => {
                              setSelectedCheckins(s => { const n = new Set(s); sel ? n.delete(entry.id) : n.add(entry.id); return n; });
                            }} className="rounded border-gray-300 text-blue-600" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-800">{cand?.full_name || '—'}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{cand?.passport_no || '—'} · {cand?.whatsapp_no}</div>
                            </div>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500`}>{entry.status?.replace(/_/g, ' ')}</span>
                          </label>
                        );
                      })
                    ) : (
                      checkins.map((c: any) => {
                        const cand = c.candidate_job?.candidate;
                        const sel = selectedCheckins.has(c.candidate_job_id);
                        return (
                          <label key={c.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50/40 ${sel ? 'bg-blue-50' : 'bg-white'}`}>
                            <input type="checkbox" checked={sel} onChange={() => {
                              setSelectedCheckins(s => { const n = new Set(s); sel ? n.delete(c.candidate_job_id) : n.add(c.candidate_job_id); return n; });
                            }} className="rounded border-gray-300 text-blue-600" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-800">{cand?.full_name || '—'}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{cand?.passport_no} · {cand?.whatsapp_no}</div>
                            </div>
                            {c.result && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.result === 'selected' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{c.result}</span>}
                          </label>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {tab === 'csv' && (
            <div className="space-y-3">
              {csvResult ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="font-semibold text-emerald-700 flex items-center gap-2 text-sm"><CheckCircle2 size={16} />{csvResult.created} candidates imported</p>
                  {csvResult.errors?.length > 0 && <div className="mt-2 text-xs text-red-600 space-y-0.5">{csvResult.errors.slice(0,5).map((e:string,i:number)=><p key={i}>• {e}</p>)}</div>}
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
                    <Info size={13} className="flex-shrink-0 mt-0.5" />
                    <div><strong>Passport No</strong> is mandatory. Columns: <code>Passport No, Full Name, Phone</code></div>
                  </div>
                  <button onClick={downloadCsvTemplate} className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl hover:bg-emerald-100">
                    <Download size={13} />Download Template
                  </button>
                  <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <FileSpreadsheet size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-600 text-sm">{csvFile ? csvFile.name : 'Click to upload .xlsx or .csv'}</p>
                    {csvRows.length > 0 && <p className="text-xs text-emerald-600 mt-1">{csvRows.length} rows loaded</p>}
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleCsvFile(e.target.files[0])} />
                  </div>
                </>
              )}
            </div>
          )}
          {tab === 'individual' && (
            <div className="space-y-3">
              {indivOk && <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-sm font-semibold text-emerald-700"><CheckCircle2 size={14} />Candidate added!</div>}
              {indivErr && <p className="text-sm text-red-600 font-medium">{indivErr}</p>}
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Passport No <span className="text-red-500">*</span></label>
                <input value={indiv.passport_no} onChange={e=>setIndiv(v=>({...v,passport_no:e.target.value.toUpperCase()}))} placeholder="K1234567" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 font-mono" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input value={indiv.full_name} onChange={e=>setIndiv(v=>({...v,full_name:e.target.value}))} placeholder="Mohammad Arif" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Phone <span className="text-red-500">*</span></label>
                <input value={indiv.whatsapp_no} onChange={e=>setIndiv(v=>({...v,whatsapp_no:e.target.value}))} placeholder="9800000001" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Interview Date</label>
                  <input type="date" value={indiv.date_of_interview} onChange={e=>setIndiv(v=>({...v,date_of_interview:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400" /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Mode</label>
                  <Select value={indiv.mode_of_selection} onChange={e=>setIndiv(v=>({...v,mode_of_selection:e.target.value}))}>
                    <option value="">Select</option>{MODE_OPTIONS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select></div>
              </div>
              {!interview?.job?.id && <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">Select an interview card first.</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <button onClick={onClose} className="btn-secondary text-xs">Close</button>
          {tab === 'interview' && !batchResult && (
            <button onClick={handleBatchAdd} disabled={!selectedCheckins.size || batching} className="btn-primary text-xs disabled:opacity-40 flex items-center gap-1.5">
              <Plus size={12} />{batching ? 'Adding…' : `Add ${selectedCheckins.size || ''} to Process`}
            </button>
          )}
          {tab === 'csv' && !csvResult && (
            <button onClick={handleCsvImport} disabled={!csvRows.length || importing || !interview?.job?.id} className="btn-primary text-xs disabled:opacity-40 flex items-center gap-1.5">
              <Upload size={12} />{importing ? 'Importing…' : 'Import'}
            </button>
          )}
          {tab === 'individual' && !indivOk && (
            <button onClick={handleIndividualAdd} disabled={adding} className="btn-primary text-xs disabled:opacity-40 flex items-center gap-1.5">
              <UserPlus size={12} />{adding ? 'Adding…' : 'Add to Process'}
            </button>
          )}
          {((batchResult && !batchResult.startsWith('Error')) || csvResult || indivOk) && (
            <button onClick={() => { setBatchResult(null); setCsvResult(null); setIndivOk(false); onDone(); onClose(); }} className="btn-primary text-xs flex items-center gap-1.5">
              <CheckCircle2 size={12} />Done
            </button>
          )}
          {batchResult?.startsWith('Error') && (
            <button onClick={() => setBatchResult(null)} className="btn-secondary text-xs">Try Again</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

function fmtDateISO(val: any) {
  if (!val) return '';
  return String(val).substring(0, 10);
}

function buildPaymentCols(payments: any[], num: number) {
  const p = payments?.find((x: any) => x.installment_number === num);
  return {
    [`P${num} Total Fee`]:   p?.total_fee        ?? '',
    [`P${num} Amount Due`]:  p?.amount_due        ?? '',
    [`P${num} Amount Paid`]: p?.amount_paid       ?? '',
    [`P${num} Waiver`]:      p?.fee_waiver_amount ?? '',
    [`P${num} Status`]:      p?.status            || '',
    [`P${num} Due Date`]:    fmtDateISO(p?.due_date),
    [`P${num} Paid Date`]:   fmtDateISO(p?.paid_date),
    [`P${num} Receipt No`]:  p?.receipt_number    || '',
    [`P${num} Method`]:      p?.payment_method    || '',
    [`P${num} Notes`]:       p?.notes             || '',
  };
}

function maxInstallmentCount(records: any[]) {
  let max = 0;
  for (const r of records) {
    for (const p of r?.candidate_job?.payments || []) {
      if (p.installment_number > max) max = p.installment_number;
    }
  }
  return Math.max(max, 3); // always emit at least 3 columns for layout consistency
}

function buildExportRows(records: any[]) {
  const installmentCount = maxInstallmentCount(records);
  return records.map((r, i) => {
    const cj   = r.candidate_job;
    const cand = cj?.candidate;
    const job  = cj?.job;
    const dc   = docsCount(r);
    const pays = cj?.payments || [];

    const paymentCols: Record<string, any> = {};
    for (let n = 1; n <= installmentCount; n++) {
      Object.assign(paymentCols, buildPaymentCols(pays, n));
    }

    return {
      'S.No':                    i + 1,
      // Candidate
      'Candidate ID':            cand?.id            || '',
      'Full Name':               cand?.full_name      || '',
      'Passport No':             cand?.passport_no    || '',
      'Passport Expiry Date':    fmtDateISO(cand?.passport_expiry_date),
      'WhatsApp No':             cand?.whatsapp_no    || '',
      'Alternate Contact':       cand?.alternate_contact || '',
      'Email':                   cand?.email          || '',
      'Gender':                  cand?.gender         || '',
      'Date of Birth':           fmtDateISO(cand?.dob),
      'Education':               cand?.education      || '',
      'ECR Type':                cand?.ecr_type       || '',
      'State':                   cand?.state?.name    || '',
      'City':                    cand?.city?.name     || '',
      'Indian Experience':       cand?.indian_experience || '',
      'Abroad Experience':       cand?.abroad_experience || '',
      // Source
      'Source':                  cand?.source?.name   || '',
      'Position 1':              cand?.position_1?.name || '',
      'Associate':               cand?.associate?.full_name || '',
      'Associate Phone':         cand?.associate?.phone || '',
      // Job / Company
      'Company':                 job?.company?.name   || '',
      'Trade / Job':             job?.title           || '',
      'Country':                 job?.country         || '',
      'Salary Min':              job?.salary_min      ?? '',
      'Salary Max':              job?.salary_max      ?? '',
      'Currency':                job?.salary_currency || '',
      'Service Fee':             job?.service_fee     ?? '',
      // Selection
      'Stage':                   computeStage(r),
      'Year of Selection':       r.year_of_selection  || '',
      'Date of Interview':       fmtDateISO(r.date_of_interview),
      'Date of Selection':       fmtDateISO(r.date_of_selection),
      'Selection Month':         r.selection_month    || '',
      'Mode of Selection':       r.mode_of_selection  || '',
      'Interview Location':      r.interview_location || '',
      'Candidate Status':        r.candidate_status   || '',
      'Client Remark':           r.client_remark      || '',
      'Vendor':                  r.vendor             || '',
      'Sponsor':                 r.sponsor            || '',
      'Medical Approval Email Date & Time': r.medical_approval_email_at
        ? String(r.medical_approval_email_at).substring(0, 16).replace('T', ' ')
        : '',
      // Medical
      'Medical Status':          r.medical_status             || '',
      'Medical App Date':        fmtDateISO(r.medical_app_date),
      'Medical Completion Date': fmtDateISO(r.medical_completion_date),
      'Medical Approval Date':   fmtDateISO(r.medical_approval_date),
      'Medical Expiry Date':     fmtDateISO(r.medical_expiry_date),
      'Medical Repeat Date':     fmtDateISO(r.medical_repeat_date),
      'GAMCA Slip Date':         fmtDateISO(r.gamca_slip_date),
      'GAMCA Slip Place':        r.gamca_slip_place   || '',
      // Documents
      'Documents Submitted':     dc.submitted,
      'Documents Total':         dc.total,
      'Courier Sent Date':       fmtDateISO(r.courier_sent_date),
      'Courier Received Date':   fmtDateISO(r.courier_received_date),
      'Courier Consignment No':  r.courier_consignment_no || '',
      // MOFA & Visa
      'MOFA Number':             r.mofa_number        || '',
      'MOFA Date':               fmtDateISO(r.mofa_date),
      'MOFA Received Date':      fmtDateISO(r.mofa_received_date),
      'Visa Issue Date':         fmtDateISO(r.visa_issue_date),
      'Visa Expiry Date':        fmtDateISO(r.visa_expiry_date),
      'Visa Receiving Date':     fmtDateISO(r.visa_receiving_date),
      'VFS Applied Date':        fmtDateISO(r.vfs_applied_date),
      'VFS Received Date':       fmtDateISO(r.vfs_received_date),
      'SVP Apply Date':          fmtDateISO(r.svp_apply_date),
      'SVP Appointment Date':    fmtDateISO(r.svp_appointment_date),
      'SVP Received Date':       fmtDateISO(r.svp_received_date),
      'MOL/QVC Apply Date':      fmtDateISO(r.mol_qvc_apply_date),
      'MOL/QVC Status Date':     fmtDateISO(r.mol_qvc_status_date),
      // Flight & Deployment
      'Ticket Booking Date':     fmtDateISO(r.ticket_booking_date),
      'Ticket Confirm Date':     fmtDateISO(r.ticket_confirm_date),
      'Proposed Flight Date':    fmtDateISO(r.proposed_flight_date),
      'Deployment From':         r.deployment_from    || '',
      'Onboarding City':         r.onboarding_city    || '',
      'Exit Paper Date':         fmtDateISO(r.exit_paper_date),
      'Deployment Date':         fmtDateISO(r.deployment_date),
      'Deployment Month':        r.deployment_month   || '',
      'Joining Date':            fmtDateISO(r.joining_date),
      'Contract Expiry Date':    fmtDateISO(r.contract_expiry_date),
      // Logistics
      'Accommodation':           r.accommodation === true ? 'Yes (Provided)' : r.accommodation === false ? 'No (Candidate Pays)' : '',
      'Accommodation Cost':      r.accommodation_cost ?? '',
      'Transportation':          r.transportation === true ? 'Yes (Provided)' : r.transportation === false ? 'No (Candidate Pays)' : '',
      'Transportation Cost':     r.transportation_cost ?? '',
      // Financials
      'Vendor Service Charge':   r.vendor_service_charge  ?? '',
      'Advance Received':        r.advance_received        ?? '',
      'Exit Setting Payment':    r.exit_setting_payment    ?? '',
      'Other Setting Charge':    r.other_setting_charge    ?? '',
      'Total Received':          r.total_received_amount   ?? '',
      'Total Receivable':        r.total_receivable_amount ?? '',
      'Disc Allot':              r.disc_allot              ?? '',
      'Refund Amount':           r.refund_amount           ?? '',
      'Refund Date':             fmtDateISO(r.refund_date),
      // Payment installments (dynamic — covers as many installments as exist)
      ...paymentCols,
      // Contact & Remarks
      'Family Contact Name':  r.family_contact_name  || '',
      'Family Contact Phone': r.family_contact_phone || '',
      'Address':              r.candidate_address    || '',
      'Remarks':              r.remarks              || '',
      'Other Remarks':        r.other_remarks        || '',
    };
  });
}

function generateExcelFile(records: any[]) {
  const rows = buildExportRows(records);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Process Data');
  XLSX.writeFile(wb, `process_export_${new Date().toISOString().substring(0, 10)}.xlsx`);
}

// ── EventGroup type ───────────────────────────────────────────────────────────

type EventGroup = {
  key: string;
  companyId: number;
  companyName: string;
  date: string;
  events: any[];
  jobIds: number[];
  totalCheckins: number;
};

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({
  group, isActive, stageCounts, processCount, onClick,
}: { group: EventGroup; isActive: boolean; stageCounts: Record<string,number>; processCount: number; onClick: () => void }) {
  const { companyName, date, events } = group;
  const initial  = companyName.charAt(0).toUpperCase();
  const daysLeft = daysFromNow(date);
  const isPast   = daysLeft !== null && daysLeft < 0;
  const total    = isActive ? (stageCounts.all ?? processCount) : processCount;
  const trades   = events.map((e: any) => e.job?.title).filter(Boolean) as string[];
  const tradeLabel = trades.length <= 2
    ? trades.join(', ')
    : `${trades[0]}, ${trades[1]} +${trades.length - 2} more`;

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-64 text-left rounded-2xl border-2 transition-all overflow-hidden ${
        isActive
          ? `${ACTIVE.border} shadow-lg ${ACTIVE.light}`
          : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className={`h-1 w-full ${isActive ? ACTIVE.bg : 'bg-gray-100'} transition-colors`} />
      <div className="p-3.5">
        <div className="flex items-start gap-2.5 mb-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 ${isActive ? `${ACTIVE.bg} text-white` : 'bg-gray-100 text-gray-500'}`}>
            {initial}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className={`text-xs font-bold truncate leading-tight ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{companyName}</div>
            <div className="text-[10px] text-gray-400 truncate mt-0.5" title={trades.join(', ')}>{tradeLabel || '—'}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <CalendarDays size={10} className={isActive ? ACTIVE.muted : 'text-gray-300'} />
            <span className={`text-[11px] font-semibold ${isPast ? 'text-gray-400' : isActive ? ACTIVE.text : 'text-gray-500'}`}>
              {fmtDate(date, true)}
            </span>
          </div>
          {isPast
            ? <span className="text-[9px] text-gray-300 font-medium">Completed</span>
            : daysLeft !== null && daysLeft <= 14
              ? <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${daysLeft <= 3 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{daysLeft}d away</span>
              : null}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Users size={10} className={isActive ? ACTIVE.muted : 'text-gray-300'} />
            <span className={`text-[11px] font-bold ${isActive ? ACTIVE.text : 'text-gray-500'}`}>
              {total} candidate{total !== 1 ? 's' : ''}
            </span>
          </div>
          {trades.length > 1 && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? ACTIVE.pill : 'bg-gray-100 text-gray-400'}`}>
              {trades.length} trades
            </span>
          )}
        </div>
        {isActive && (
          <div className="mt-2.5 pt-2.5 border-t border-amber-100 flex flex-wrap gap-1">
            {PIPELINE_STAGES.map(s => {
              const cnt = stageCounts[s.key] || 0;
              if (cnt === 0) return null;
              return (
                <span key={s.key} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white text-amber-700 border border-amber-200">
                  {cnt} {s.label.split(' ')[0]}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ProcessModule() {
  const [search, setSearch]               = useState('');
  const [stageFilter, setStageFilter]     = useState<string>('all');
  const [tradeFilter, setTradeFilter]     = useState<string>('all');
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | 'all' | null>(null);
  const [viewRecord, setViewRecord]       = useState<any | null>(null);
  const [editRecord, setEditRecord]       = useState<any | null>(null);
  const [showAdd, setShowAdd]             = useState(false);

  const { data: eventsData } = useGetInterviewEventsQuery({ limit: 50 } as any);
  const events: any[] = eventsData?.data || [];

  // Group events by company + date so one card = one company on one interview date
  const eventGroups = useMemo<EventGroup[]>(() => {
    const map = new Map<string, EventGroup>();
    for (const evt of events) {
      const companyId   = evt.job?.company?.id ?? 0;
      const companyName = evt.job?.company?.name || 'Unknown';
      const dateStr     = evt.event_date?.substring(0, 10) || '';
      const key         = `${companyId}__${dateStr}`;
      if (!map.has(key)) {
        map.set(key, { key, companyId, companyName, date: dateStr, events: [], jobIds: [], totalCheckins: 0 });
      }
      const g = map.get(key)!;
      g.events.push(evt);
      if (evt.job?.id) g.jobIds.push(evt.job.id);
      g.totalCheckins += evt._count?.checkins ?? 0;
    }
    return Array.from(map.values());
  }, [events]);

  const activeGroup = useMemo<EventGroup | null>(() => {
    if (selectedGroupKey === 'all') return null;
    if (selectedGroupKey !== null) return eventGroups.find(g => g.key === selectedGroupKey) ?? null;
    return eventGroups[0] ?? null;
  }, [selectedGroupKey, eventGroups]);

  const queryParams = useMemo(() => ({
    page: 1, limit: 500,
    search: search || undefined,
  }), [search]);

  const { data, isLoading, refetch } = useGetAllProcessDetailsQuery(queryParams);
  const records: any[] = data?.data || [];

  // Pre-compute process record count per group key for accurate inactive card counts
  const recordCountByGroupKey = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of eventGroups) {
      counts[group.key] = records.filter(r => group.jobIds.includes(r.candidate_job?.job?.id)).length;
    }
    return counts;
  }, [records, eventGroups]);

  // Filter by active group's job IDs (client-side, covers all trades in the group)
  const groupFiltered = useMemo(() => {
    if (!activeGroup) return records;
    return records.filter(r => activeGroup.jobIds.includes(r.candidate_job?.job?.id));
  }, [records, activeGroup]);

  // Unique trades from group-filtered records
  const uniqueTrades = useMemo(() => {
    const trades = new Set<string>();
    groupFiltered.forEach(r => { const t = r.candidate_job?.job?.title; if (t) trades.add(t); });
    return Array.from(trades).sort();
  }, [groupFiltered]);

  // Stage counts (after trade filter)
  const tradeFiltered = useMemo(() =>
    tradeFilter === 'all' ? groupFiltered : groupFiltered.filter(r => r.candidate_job?.job?.title === tradeFilter),
    [groupFiltered, tradeFilter]
  );

  const stageCounts = useMemo(() => {
    const c: Record<string,number> = { all: tradeFiltered.length };
    PIPELINE_STAGES.forEach(s => { c[s.key] = 0; });
    tradeFiltered.forEach(r => { const st = computeStage(r); c[st] = (c[st]||0)+1; });
    return c;
  }, [tradeFiltered]);

  const filtered = useMemo(() =>
    stageFilter === 'all' ? tradeFiltered : tradeFiltered.filter(r => computeStage(r) === stageFilter),
    [tradeFiltered, stageFilter]
  );

  const handleEdit = (r: any) => { setViewRecord(null); setEditRecord(r); };

  const [triggerExport, { isFetching: isExporting }] = useLazyExportProcessDetailsQuery();

  const handleExport = async () => {
    const result = await triggerExport({ search: search || undefined });
    if (!result.data) return;
    let exportData: any[] = result.data;
    // Apply same client-side filters as the table
    if (activeGroup) {
      exportData = exportData.filter((r: any) => activeGroup.jobIds.includes(r.candidate_job?.job?.id));
    }
    if (tradeFilter !== 'all') {
      exportData = exportData.filter((r: any) => r.candidate_job?.job?.title === tradeFilter);
    }
    if (stageFilter !== 'all') {
      exportData = exportData.filter((r: any) => computeStage(r) === stageFilter);
    }
    generateExcelFile(exportData);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Process Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Selection → Documents → Medical → Payment → Visa & MOFA → Flight</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search passport, name…"
              className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-400 w-52" />
          </div>
          <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100 disabled:opacity-50">
            {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-2 rounded-xl hover:bg-blue-700">
            <Plus size={12} />Add to Process
          </button>
        </div>
      </div>

      {/* Interview event cards — one card per company+date group */}
      {eventGroups.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto pb-2 flex-shrink-0" style={{ scrollbarWidth: 'thin' }}>
          {eventGroups.map((group) => {
            const isActive = activeGroup?.key === group.key;
            return (
              <GroupCard
                key={group.key}
                group={group}
                isActive={isActive}
                stageCounts={isActive ? stageCounts : {}}
                processCount={recordCountByGroupKey[group.key] ?? 0}
                onClick={() => {
                  setStageFilter('all');
                  setTradeFilter('all');
                  setSelectedGroupKey(isActive ? 'all' : group.key);
                }}
              />
            );
          })}
          <button
            onClick={() => { setSelectedGroupKey('all'); setStageFilter('selection'); setTradeFilter('all'); }}
            className={`flex-shrink-0 self-start flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all ${selectedGroupKey === 'all' ? 'border-gray-400 bg-gray-50 shadow' : 'border-gray-100 bg-white hover:border-gray-300'}`}
          >
            <Users size={15} className="text-gray-400 mb-1" />
            <span className="text-[9px] font-semibold text-gray-400">All</span>
          </button>
        </div>
      )}

      {/* Trade filter row — shown when multiple trades exist */}
      {uniqueTrades.length > 1 && (
        <div className="flex items-center gap-1.5 mb-2 flex-shrink-0 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Trade:</span>
          <button onClick={() => setTradeFilter('all')}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${tradeFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
            All ({groupFiltered.length})
          </button>
          {uniqueTrades.map(trade => (
            <button key={trade} onClick={() => setTradeFilter(trade)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${tradeFilter === trade ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
              {trade} ({groupFiltered.filter(r => r.candidate_job?.job?.title === trade).length})
            </button>
          ))}
        </div>
      )}

      {/* Stage filter tiles */}
      <div className="grid grid-cols-6 gap-2 mb-2 flex-shrink-0">
        {PIPELINE_STAGES.map(s => {
          const isActive = stageFilter === s.key;
          return (
            <button key={s.key} onClick={() => setStageFilter(isActive ? 'all' : s.key)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all ${isActive ? 'border-amber-400 bg-amber-50 shadow' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
              <span className={`text-xl font-bold ${isActive ? 'text-amber-700' : 'text-gray-700'}`}>{stageCounts[s.key] || 0}</span>
              <span className={`text-[10px] font-semibold text-center leading-tight mt-0.5 ${isActive ? 'text-amber-700' : 'text-gray-400'}`}>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Context bar */}
      {activeGroup && (
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <span className="text-xs font-bold text-gray-700">{activeGroup.companyName}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500">{fmtDate(activeGroup.date, true)}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500">{activeGroup.events.length} trade{activeGroup.events.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs font-semibold text-amber-700">{tradeFiltered.length} in process</span>
          {stageFilter !== 'all' && (
            <span className="text-xs text-gray-400">→ <strong className="text-gray-600">{filtered.length}</strong> in {PIPELINE_STAGES.find(s=>s.key===stageFilter)?.label}</span>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 flex-1">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 flex-1 rounded-2xl border border-gray-100">
          <Clock size={28} className="mb-3 opacity-30" />
          <p className="font-semibold text-sm">No candidates in this stage</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100">
            <Plus size={13} />Add to Process
          </button>
        </div>
      ) : (
        <div className="flex-1 rounded-2xl border border-gray-100 shadow-sm overflow-auto" style={{ minHeight: 0, scrollbarWidth: 'thin' }}>
          <table className="w-full text-xs min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', 'Candidate', 'Passport', 'Phone', 'Trade / ECR', 'Selection Date', 'Documents', 'Medical', 'Payment', 'Visa / MOFA', 'Flight', ''].map(h => (
                  <th key={h} className="px-2.5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filtered.map((record, idx) => {
                const cj       = record.candidate_job;
                const cand     = cj?.candidate;
                const job      = cj?.job;
                const payments: any[] = cj?.payments || [];
                const paid     = payments.reduce((s: number, p: any) => s + Number(p.amount_paid || 0), 0);
                const totalFee = Number(record.total_receivable_amount || 0);
                const dc       = docsCount(record);

                return (
                  <tr key={record.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="px-2.5 py-2 text-gray-400 text-[10px] w-7">{idx + 1}</td>

                    <td className="px-2.5 py-2">
                      <div className="font-semibold text-gray-800 whitespace-nowrap text-xs">{cand?.full_name || '—'}</div>
                      <div className="text-[9px] font-mono text-blue-600">{cand?.id ? `ALH-${String(cand.id).padStart(5,'0')}` : '—'}</div>
                    </td>

                    <td className="px-2.5 py-2 font-mono text-[11px] font-semibold text-gray-700 whitespace-nowrap">
                      {cand?.passport_no || <span className="text-red-400 font-normal text-[10px]">Missing</span>}
                    </td>

                    <td className="px-2.5 py-2 text-[10px] text-gray-500 whitespace-nowrap">{cand?.whatsapp_no || '—'}</td>

                    <td className="px-2.5 py-2">
                      <div className="text-gray-700 text-[11px] whitespace-nowrap">{job?.title || '—'}</div>
                      <div className="text-[9px] text-gray-400">{cand?.ecr_type?.replace('_', ' ').toUpperCase() || '—'}</div>
                    </td>

                    <td className="px-2.5 py-2 text-[10px] text-gray-500 whitespace-nowrap">
                      {record.date_of_selection ? fmtDate(record.date_of_selection, true) : <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-2.5 py-2">
                      <div className={`text-[11px] font-semibold ${dc.submitted === dc.total ? 'text-emerald-700' : dc.submitted > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                        {dc.submitted}/{dc.total}
                      </div>
                      {dc.submitted > 0 && dc.submitted < dc.total && (
                        <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5">
                          <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${(dc.submitted/dc.total)*100}%` }} />
                        </div>
                      )}
                    </td>

                    <td className="px-2.5 py-2">
                      {record.medical_status && record.medical_status !== 'pending' ? (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          record.medical_status === 'fit' ? 'bg-emerald-100 text-emerald-700' :
                          record.medical_status === 'unfit' ? 'bg-red-100 text-red-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>{record.medical_status}</span>
                      ) : <span className="text-[10px] text-gray-300">—</span>}
                    </td>

                    <td className="px-2.5 py-2">
                      {totalFee > 0 ? (
                        <div>
                          <div className="text-[11px] font-semibold text-gray-700">{fmtCurrency(paid)}</div>
                          <div className="text-[9px] text-gray-400">of {fmtCurrency(totalFee)}</div>
                        </div>
                      ) : <span className="text-[10px] text-gray-300">—</span>}
                    </td>

                    <td className="px-2.5 py-2">
                      {record.mofa_number ? (
                        <div>
                          <div className="text-[10px] font-semibold text-violet-700">{record.mofa_number}</div>
                          {record.visa_issue_date && <div className="text-[9px] text-gray-400">Visa: {fmtDate(record.visa_issue_date, true)}</div>}
                        </div>
                      ) : record.visa_issue_date ? (
                        <div className="text-[10px] text-gray-600">{fmtDate(record.visa_issue_date, true)}</div>
                      ) : <span className="text-[10px] text-gray-300">—</span>}
                    </td>

                    <td className="px-2.5 py-2">
                      {record.deployment_date ? (
                        <div>
                          <div className="text-[10px] font-semibold text-emerald-700">{fmtDate(record.deployment_date, true)}</div>
                          <div className="text-[9px] text-emerald-500">Deployed</div>
                        </div>
                      ) : record.ticket_confirm_date ? (
                        <div className="text-[10px] text-sky-700">{fmtDate(record.ticket_confirm_date, true)}</div>
                      ) : <span className="text-[10px] text-gray-300">—</span>}
                    </td>

                    <td className="px-2.5 py-2">
                      <button onClick={() => setViewRecord(record)}
                        className="text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewRecord && <ViewDetailsDrawer record={viewRecord} onClose={()=>setViewRecord(null)} onEdit={handleEdit} />}
      {editRecord && (
        <ProcessEditDrawer
          record={editRecord}
          onClose={() => {
            const savedId = editRecord!.id;
            setEditRecord(null);
            refetch().then((result: any) => {
              const fresh = result.data?.data?.find((r: any) => r.id === savedId);
              if (fresh) setViewRecord(fresh);
            });
          }}
        />
      )}
      {showAdd && <AddToProcessModal interview={activeGroup?.events[0] ?? null} onClose={()=>setShowAdd(false)} onDone={refetch} />}
    </div>
  );
}
