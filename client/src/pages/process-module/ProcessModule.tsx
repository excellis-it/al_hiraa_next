import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import {
  Search, Upload, Download, X, ChevronDown, ChevronRight,
  CheckCircle2, Clock, Zap, FileSpreadsheet,
  UserPlus, DollarSign, Plane, FileText, Stethoscope,
  Globe, BadgeCheck, Info, Plus, Users, CalendarDays,
  ArrowRight, CheckSquare, Square, Loader2, Eye,
} from 'lucide-react';
import Select from '../../components/ui/Select';
import {
  useGetAllProcessDetailsQuery,
  useUpdateProcessDetailsMutation,
  useBatchFromInterviewMutation,
  useQuickAddProcessMutation,
  useImportProcessCsvMutation,
} from '../../store/api/processDetailsApi';
import { useGetInterviewEventsQuery, useGetInterviewEventQuery } from '../../store/api/interviewEventsApi';
import { useGetPipelineQuery } from '../../store/api/pipelineApi';
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
  { key: 'selection', num: 1, label: 'Selection Offer', subtitle: 'Interview → Selection → Offer',         icon: BadgeCheck  },
  { key: 'documents', num: 2, label: 'Documents',        subtitle: 'Passport, photos, certificates',        icon: FileText    },
  { key: 'medical',   num: 3, label: 'Medical',          subtitle: 'Application → Completion → Approval',   icon: Stethoscope },
  { key: 'payment',   num: 4, label: 'Payment',          subtitle: 'Up to 4 installments',                  icon: DollarSign  },
  { key: 'visa',      num: 5, label: 'Visa & MOFA',      subtitle: 'Courier → Visa → MOFA → VFS',           icon: Globe       },
  { key: 'flight',    num: 6, label: 'Flight',           subtitle: 'Booking → Confirmation → Departure',    icon: Plane       },
];

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

// ── Chip ──────────────────────────────────────────────────────────────────────

type ChipType = 'normal' | 'warn' | 'auto' | 'bad' | 'filled';
function Chip({ label, type = 'normal', value }: { label: string; type?: ChipType; value?: string | null }) {
  const styles: Record<ChipType, string> = {
    normal: 'bg-white border-gray-200 text-gray-600',
    filled: 'bg-white border-emerald-300 text-emerald-700',
    warn:   'bg-amber-50 border-amber-300 text-amber-700',
    auto:   'bg-emerald-50 border-emerald-300 text-emerald-700',
    bad:    'bg-red-50 border-red-300 text-red-600',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${styles[type]}`}>
      {type === 'auto' && <Zap size={9} />}
      {type === 'bad' && <X size={9} />}
      {label}{value ? `: ${value}` : ''}
    </span>
  );
}

// ── StageDots ──────────────────────────────────────────────────────────────────

function StageDots({ record }: { record: any }) {
  const cur = PIPELINE_STAGES.findIndex(s => s.key === computeStage(record));
  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE_STAGES.map((s, i) => (
        <div key={s.key} title={s.label}
          className={`w-2 h-2 rounded-full ${i < cur ? 'bg-emerald-400' : i === cur ? 'bg-amber-500' : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

// ── View Details Drawer ────────────────────────────────────────────────────────

function ViewDetailsDrawer({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: (r: any) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set(['selection']));
  const cj   = record.candidate_job;
  const cand = cj?.candidate;
  const job  = cj?.job;
  const payments: any[] = cj?.payments || [];

  const toggle = (k: string) => setOpen(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const totalFee  = Number(record.total_receivable_amount || 0);
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount_paid || 0), 0);
  const discount  = Number(record.disc_allot || 0);
  const dueAmount = totalFee > 0 ? Math.max(0, totalFee - totalPaid - discount) : 0;
  const curStage  = computeStage(record);
  const nextStep  = computeNextStep(record);
  const dc        = docsCount(record);
  const visaExpiring = daysFromNow(record.visa_expiry_date);
  const medExpiring  = daysFromNow(record.medical_expiry_date);

  const cl: Record<string,boolean> = (record.documents_checklist as Record<string,boolean>) || {};

  const SectionHeader = ({ stageKey, label, subtitle, num }: { stageKey: string; label: string; subtitle: string; num: number }) => {
    const isCurrentStage = curStage === stageKey;
    const isPastStage = PIPELINE_STAGES.findIndex(s => s.key === stageKey) < PIPELINE_STAGES.findIndex(s => s.key === curStage);
    return (
      <button onClick={() => toggle(stageKey)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left border-b border-gray-100 transition-colors ${
          isCurrentStage ? 'bg-amber-50' : isPastStage ? 'bg-gray-50/60' : 'bg-white hover:bg-gray-50'
        }`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
          isPastStage ? 'bg-emerald-100 text-emerald-700' : isCurrentStage ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
        }`}>{isPastStage ? '✓' : num}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-semibold ${isCurrentStage ? 'text-amber-700' : isPastStage ? 'text-emerald-700' : 'text-gray-600'}`}>{label}</div>
          <div className="text-[10px] text-gray-400">{subtitle}</div>
        </div>
        {open.has(stageKey) ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />}
      </button>
    );
  };

  const Row = ({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) => (
    <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className={`text-[11px] font-semibold ${highlight ? 'text-amber-700' : value ? 'text-gray-700' : 'text-gray-300'}`}>{value || '—'}</span>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-gray-900 text-sm">{cand?.full_name || '—'}</div>
            <div className="flex flex-wrap gap-x-2 mt-0.5">
              <span className="text-[11px] font-mono font-semibold text-blue-600">{cand?.passport_no || '—'}</span>
              <span className="text-[11px] text-gray-400">{cand?.whatsapp_no}</span>
              <span className="text-[11px] text-gray-400">{job?.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <StageDots record={record} />
              <span className="text-[11px] font-semibold text-amber-700">
                {PIPELINE_STAGES.find(s => s.key === curStage)?.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <button onClick={() => onEdit(record)} className="text-xs font-semibold text-white bg-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-700">Edit</button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
          </div>
        </div>

        {/* Next Step Banner */}
        <div className={`flex items-center gap-2 px-4 py-2 border-b text-xs font-medium ${nextStep.color} flex-shrink-0`}>
          <ArrowRight size={12} className="flex-shrink-0" />
          <span><strong>Next:</strong> {nextStep.label}</span>
        </div>

        {/* Expiry alerts (compact) */}
        {((visaExpiring !== null && visaExpiring <= 30) || (medExpiring !== null && medExpiring <= 30)) && (
          <div className="flex gap-2 px-4 py-1.5 bg-red-50 border-b border-red-100 flex-shrink-0 flex-wrap">
            {visaExpiring !== null && visaExpiring <= 30 && (
              <span className="text-[11px] font-semibold text-red-600">
                Visa {visaExpiring < 0 ? `EXPIRED ${Math.abs(visaExpiring)}d ago` : `expires in ${visaExpiring}d`}
              </span>
            )}
            {medExpiring !== null && medExpiring <= 30 && (
              <span className="text-[11px] font-semibold text-red-600">
                Medical {medExpiring < 0 ? `EXPIRED ${Math.abs(medExpiring)}d ago` : `expires in ${medExpiring}d`}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Selection */}
          <SectionHeader stageKey="selection" label="Selection Offer" subtitle="Interview → Selection → Offer" num={1} />
          {open.has('selection') && (
            <div className="px-4 py-2.5 bg-white">
              <Row label="Interview date"    value={fmtDate(record.date_of_interview, true)} />
              <Row label="Selection date"    value={fmtDate(record.date_of_selection, true)} />
              <Row label="Mode"              value={record.mode_of_selection} />
              <Row label="Location"          value={record.interview_location} />
              <Row label="Salary"            value={job?.salary_min ? `${fmtCurrency(job.salary_min)} ${job.salary_currency || ''}`.trim() : null} />
              <Row label="Service charge"    value={job?.service_fee ? fmtCurrency(job.service_fee) : null} highlight />
              <Row label="Vendor charge"     value={record.vendor_service_charge ? fmtCurrency(record.vendor_service_charge) : null} highlight />
              <Row label="Sponsor"           value={record.sponsor} />
            </div>
          )}

          {/* Documents */}
          <SectionHeader stageKey="documents" label={`Documents (${dc.submitted}/${dc.total})`} subtitle="Passport, photos, certificates" num={2} />
          {open.has('documents') && (
            <div className="px-4 py-2.5 bg-white">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                {DOCS_CHECKLIST.map(d => (
                  <div key={d.key} className="flex items-center gap-1.5 py-0.5">
                    {cl[d.key]
                      ? <CheckSquare size={12} className="text-emerald-500 flex-shrink-0" />
                      : <Square size={12} className="text-gray-300 flex-shrink-0" />}
                    <span className={`text-[11px] ${cl[d.key] ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{d.label}</span>
                  </div>
                ))}
              </div>
              <Row label="Passport No" value={cand?.passport_no} />
              <Row label="ECR Type"    value={cand?.ecr_type?.replace('_',' ').toUpperCase()} />
              <Row label="Courier sent"     value={fmtDate(record.courier_sent_date, true)} />
              <Row label="Courier received" value={fmtDate(record.courier_received_date, true)} />
            </div>
          )}

          {/* Medical */}
          <SectionHeader stageKey="medical" label="Medical" subtitle="Application → Completion → Approval" num={3} />
          {open.has('medical') && (
            <div className="px-4 py-2.5 bg-white">
              <Row label="Status"      value={record.medical_status?.toUpperCase()} highlight={record.medical_status === 'fit'} />
              <Row label="Applied"     value={fmtDate(record.medical_app_date, true)} />
              <Row label="Completion"  value={fmtDate(record.medical_completion_date, true)} />
              <Row label="Approval"    value={fmtDate(record.medical_approval_date, true)} />
              <Row label="Expiry"      value={fmtDate(record.medical_expiry_date, true)} />
              {record.medical_repeat_date && <Row label="Repeat" value={fmtDate(record.medical_repeat_date, true)} />}
            </div>
          )}

          {/* Payment */}
          <SectionHeader stageKey="payment" label="Payment" subtitle="Up to 4 installments" num={4} />
          {open.has('payment') && (
            <div className="px-4 py-2.5 bg-white">
              {[1,2,3,4].map(n => {
                const p = payments.find((x: any) => x.installment_number === n);
                if (!p) return null;
                return (
                  <div key={n} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] text-gray-400">Installment {n}</span>
                    <span className="text-[11px] font-semibold text-gray-700">
                      {fmtCurrency(p.amount_paid)} / {fmtCurrency(p.amount_due)}
                      <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                    </span>
                  </div>
                );
              })}
              <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden text-[11px]">
                <div className="flex justify-between px-2.5 py-1 bg-gray-50"><span className="text-gray-500">Total fee</span><span className="font-semibold">{fmtCurrency(record.total_receivable_amount)}</span></div>
                <div className="flex justify-between px-2.5 py-1"><span className="text-gray-500">Discount</span><span className="font-semibold">{fmtCurrency(record.disc_allot)}</span></div>
                <div className="flex justify-between px-2.5 py-1"><span className="text-gray-500">Collected</span><span className="font-semibold text-emerald-700">{fmtCurrency(totalPaid)}</span></div>
                <div className={`flex justify-between px-2.5 py-1 ${dueAmount > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <span className={`font-bold ${dueAmount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>Due (auto-calc)</span>
                  <span className={`font-bold ${dueAmount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmtCurrency(dueAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Visa & MOFA */}
          <SectionHeader stageKey="visa" label="Visa & MOFA" subtitle="Courier → Visa → MOFA → VFS" num={5} />
          {open.has('visa') && (
            <div className="px-4 py-2.5 bg-white">
              <Row label="Visa issued"      value={fmtDate(record.visa_issue_date, true)} />
              <Row label="Visa expiry"      value={fmtDate(record.visa_expiry_date, true)} highlight={!!(visaExpiring !== null && visaExpiring <= 30)} />
              <Row label="Visa receiving"   value={fmtDate(record.visa_receiving_date, true)} />
              <Row label="MOFA No."         value={record.mofa_number} />
              <Row label="MOFA date"        value={fmtDate(record.mofa_date, true)} />
              <Row label="MOFA received"    value={fmtDate(record.mofa_received_date, true)} />
              <Row label="VFS applied"      value={fmtDate(record.vfs_applied_date, true)} />
              <Row label="VFS received"     value={fmtDate(record.vfs_received_date, true)} />
            </div>
          )}

          {/* Flight */}
          <SectionHeader stageKey="flight" label="Flight" subtitle="Booking → Confirmation → Departure" num={6} />
          {open.has('flight') && (
            <div className="px-4 py-2.5 bg-white">
              <Row label="Booking date"    value={fmtDate(record.ticket_booking_date, true)} />
              <Row label="Confirmed date"  value={fmtDate(record.ticket_confirm_date, true)} />
              <Row label="Onboarding city" value={record.onboarding_city} />
              <Row label="Deployment date" value={fmtDate(record.deployment_date, true)} highlight={!!record.deployment_date} />
              <Row label="Status"          value={record.candidate_status?.replace(/_/g,' ')} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Edit Drawer ────────────────────────────────────────────────────────────────

function ProcessEditDrawer({ record, onClose }: { record: any; onClose: () => void }) {
  const [updateDetails, { isLoading }] = useUpdateProcessDetailsMutation();
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
    vendor:                   record.vendor              || '',
    sponsor:                  record.sponsor             || '',
    vendor_service_charge:    record.vendor_service_charge || '',
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
    total_receivable_amount:  record.total_receivable_amount || '',
    total_received_amount:    record.total_received_amount   || '',
    disc_allot:               record.disc_allot              || '',
    advance_received:         record.advance_received        || '',
    refund_date:              record.refund_date?.substring(0,10) || '',
    refund_amount:            record.refund_amount           || '',
    family_contact_name:      record.family_contact_name  || '',
    family_contact_phone:     record.family_contact_phone || '',
    candidate_address:        record.candidate_address    || '',
    remarks:                  record.remarks              || '',
  });

  const [docs, setDocs] = useState<Record<string, any>>(
    (record.documents_checklist as Record<string, any>) || {}
  );
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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
    const payload: any = { ...form, documents_checklist: docs };
    if (payload.deployment_date) payload.candidate_status = 'deployed';
    await updateDetails({ candidateJobId: record.candidate_job_id, ...payload });
    onClose();
  };

  const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5';
  const inp = 'w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all';

  function Sec({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="mb-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 pb-1 border-b border-gray-100">{title}</div>
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="font-bold text-gray-900 text-sm">{cand?.full_name}</div>
            <div className="text-[11px] text-gray-400">{cand?.passport_no} · {job?.title} @ {job?.company?.name}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">

          <Sec title="Selection Offer">
            <div className="grid grid-cols-3 gap-2">
              <div><label className={lbl}>Interview Date</label><input type="date" value={form.date_of_interview} onChange={e=>set('date_of_interview',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Selection Date</label><input type="date" value={form.date_of_selection} onChange={e=>set('date_of_selection',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Mode</label><Select value={form.mode_of_selection} onChange={e=>set('mode_of_selection',e.target.value)}><option value="">Select</option>{MODE_OPTIONS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</Select></div>
              <div><label className={lbl}>Status</label><Select value={form.candidate_status} onChange={e=>set('candidate_status',e.target.value)}>{CANDIDATE_STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</Select></div>
              <div><label className={lbl}>Service Charge (₹)</label><input type="number" value={form.vendor_service_charge} onChange={e=>set('vendor_service_charge',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Vendor (if sub-agent)</label><input value={form.vendor} onChange={e=>set('vendor',e.target.value)} className={inp} placeholder="e.g. Al-Noor Travels" /></div>
            </div>
          </Sec>

          <Sec title="Documents">
            {/* Passport + ID Document Uploads */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { key: 'passport_doc', label: 'Passport Copy' },
                { key: 'id_doc', label: 'ID Document' },
              ].map(({ key, label }) => {
                const url = typeof docs[key] === 'string' ? docs[key] : null;
                const name = docs[`${key}_name`] as string | undefined;
                return (
                  <div key={key} className="border border-dashed border-gray-200 rounded-lg p-2">
                    <div className="text-[10px] font-semibold text-gray-500 mb-1.5">{label}</div>
                    {url ? (
                      <div className="flex items-center gap-1.5">
                        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline truncate flex-1">
                          <Eye size={10} /> {name || 'View file'}
                        </a>
                        <button type="button" onClick={() => setDocs(d => { const n = { ...d }; delete n[key]; delete n[`${key}_name`]; return n; })} className="text-gray-300 hover:text-red-400">
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-blue-600 cursor-pointer transition-colors">
                        {uploading[key] ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                        {uploading[key] ? 'Uploading…' : 'Upload PDF / image'}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => e.target.files?.[0] && uploadDocFile(key, e.target.files[0])} />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Document Checklist */}
            <div className="p-2 bg-gray-50 rounded-lg mb-2">
              <div className="text-[10px] font-semibold text-gray-500 mb-1.5">Document Checklist</div>
              <div className="grid grid-cols-2 gap-1">
                {DOCS_CHECKLIST.map(d => (
                  <label key={d.key} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input type="checkbox" checked={typeof docs[d.key] === 'boolean' ? !!docs[d.key] : false} onChange={() => toggleDoc(d.key)} className="rounded border-gray-300 text-emerald-600 w-3 h-3" />
                    <span className={`text-[11px] ${docs[d.key] ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>Courier Sent</label><input type="date" value={form.courier_sent_date} onChange={e=>set('courier_sent_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Courier Received</label><input type="date" value={form.courier_received_date} onChange={e=>set('courier_received_date',e.target.value)} className={inp} /></div>
            </div>
          </Sec>

          <Sec title="Medical">
            <div className="grid grid-cols-3 gap-2">
              <div><label className={lbl}>Status</label><Select value={form.medical_status} onChange={e=>set('medical_status',e.target.value)}>{MEDICAL_STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</Select></div>
              <div><label className={lbl}>Application</label><input type="date" value={form.medical_app_date} onChange={e=>set('medical_app_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Completion</label><input type="date" value={form.medical_completion_date} onChange={e=>set('medical_completion_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Approval</label><input type="date" value={form.medical_approval_date} onChange={e=>set('medical_approval_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Expiry</label><input type="date" value={form.medical_expiry_date} onChange={e=>set('medical_expiry_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Repeat</label><input type="date" value={form.medical_repeat_date} onChange={e=>set('medical_repeat_date',e.target.value)} className={inp} /></div>
            </div>
          </Sec>

          <Sec title="Payment">
            <div className="grid grid-cols-3 gap-2">
              <div><label className={lbl}>Total Fee (₹)</label><input type="number" value={form.total_receivable_amount} onChange={e=>set('total_receivable_amount',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Discount (₹)</label><input type="number" value={form.disc_allot} onChange={e=>set('disc_allot',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Advance (₹)</label><input type="number" value={form.advance_received} onChange={e=>set('advance_received',e.target.value)} className={inp} /></div>
            </div>
          </Sec>

          <Sec title="Visa & MOFA">
            <div className="grid grid-cols-3 gap-2">
              <div><label className={lbl}>Visa Issue</label><input type="date" value={form.visa_issue_date} onChange={e=>set('visa_issue_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Visa Expiry</label><input type="date" value={form.visa_expiry_date} onChange={e=>set('visa_expiry_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Visa Receiving</label><input type="date" value={form.visa_receiving_date} onChange={e=>set('visa_receiving_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>MOFA No.</label><input value={form.mofa_number} onChange={e=>set('mofa_number',e.target.value.replace(/\D/g,''))} placeholder="Numbers only" className={inp} /></div>
              <div><label className={lbl}>MOFA Date</label><input type="date" value={form.mofa_date} onChange={e=>set('mofa_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>MOFA Received</label><input type="date" value={form.mofa_received_date} onChange={e=>set('mofa_received_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>VFS Applied</label><input type="date" value={form.vfs_applied_date} onChange={e=>set('vfs_applied_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>VFS Received</label><input type="date" value={form.vfs_received_date} onChange={e=>set('vfs_received_date',e.target.value)} className={inp} /></div>
            </div>
          </Sec>

          <Sec title="Flight">
            <div className="grid grid-cols-3 gap-2">
              <div><label className={lbl}>Booking Date</label><input type="date" value={form.ticket_booking_date} onChange={e=>set('ticket_booking_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Confirm Date</label><input type="date" value={form.ticket_confirm_date} onChange={e=>set('ticket_confirm_date',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Onboarding City</label><Select value={form.onboarding_city} onChange={e=>set('onboarding_city',e.target.value)}><option value="">Select</option>{ONBOARDING_CITIES.map(c=><option key={c} value={c}>{c}</option>)}</Select></div>
              <div><label className={lbl}>Deployment Date</label><input type="date" value={form.deployment_date} onChange={e=>set('deployment_date',e.target.value)} className={inp} /></div>
              <div className="col-span-2"><label className={lbl}>Deployment Month</label><input value={form.deployment_month} onChange={e=>set('deployment_month',e.target.value)} placeholder="e.g. April 2026" className={inp} /></div>
            </div>
            {form.deployment_date && <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-lg mt-1 flex items-center gap-1"><Zap size={10} />Status will auto-set to Deployed on save.</p>}
          </Sec>

          <Sec title="Remarks & Contact">
            <div className="grid grid-cols-2 gap-2 pb-2">
              <div><label className={lbl}>Remarks</label><input value={form.remarks} onChange={e=>set('remarks',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Family Contact</label><input value={form.family_contact_name} onChange={e=>set('family_contact_name',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Family Phone</label><input value={form.family_contact_phone} onChange={e=>set('family_contact_phone',e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Address</label><input value={form.candidate_address} onChange={e=>set('candidate_address',e.target.value)} className={inp} /></div>
            </div>
          </Sec>
        </div>
        <div className="border-t border-gray-100 px-4 py-3 flex justify-end gap-2 flex-shrink-0 bg-gray-50">
          <button onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          <button onClick={handleSave} disabled={isLoading} className="btn-primary text-xs disabled:opacity-40">{isLoading ? 'Saving…' : 'Save Changes'}</button>
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
    await batchFromInterview({ candidate_job_ids: ids, initial_data: { date_of_interview: interview?.event_date, interview_location: interview?.venue_name, candidate_status: 'selected' } });
    setBatchResult(`${ids.length} candidate${ids.length > 1 ? 's' : ''} added to process`);
    setSelectedCheckins(new Set());
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
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <p className="font-semibold text-emerald-700 text-sm">{batchResult}</p>
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
          {(batchResult || csvResult || indivOk) && (
            <button onClick={() => { setBatchResult(null); setCsvResult(null); setIndivOk(false); onDone(); onClose(); }} className="btn-primary text-xs flex items-center gap-1.5">
              <CheckCircle2 size={12} />Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportToExcel(records: any[]) {
  const rows = records.map(r => {
    const cj = r.candidate_job; const cand = cj?.candidate; const job = cj?.job;
    const dc = docsCount(r);
    return {
      'Passport No': cand?.passport_no || '',
      'Full Name': cand?.full_name || '',
      'Phone': cand?.whatsapp_no || '',
      'ECR': cand?.ecr_type || '',
      'Trade': job?.title || '',
      'Company': job?.company?.name || '',
      'Stage': computeStage(r),
      'Selection Date': r.date_of_selection?.substring(0,10) || '',
      'Documents': `${dc.submitted}/${dc.total}`,
      'Medical': r.medical_status || '',
      'Visa Issue': r.visa_issue_date?.substring(0,10) || '',
      'MOFA': r.mofa_number || '',
      'Deployment Date': r.deployment_date?.substring(0,10) || '',
    };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Process');
  XLSX.writeFile(wb, `process_${new Date().toISOString().substring(0,10)}.xlsx`);
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
          <button onClick={() => exportToExcel(filtered)} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100">
            <Download size={12} />Export
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
      {editRecord && <ProcessEditDrawer record={editRecord} onClose={()=>{setEditRecord(null);refetch();}} />}
      {showAdd && <AddToProcessModal interview={activeGroup?.events[0] ?? null} onClose={()=>setShowAdd(false)} onDone={refetch} />}
    </div>
  );
}
