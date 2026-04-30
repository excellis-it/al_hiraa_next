import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import {
  AlertTriangle, ChevronRight, ChevronDown, Save, X, Plus,
  CheckCircle2, Loader2, UserCheck, FileText, Upload, FileDown,
} from 'lucide-react';
import Select from '../../components/ui/Select';
import {
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useGetCandidateQuery,
  useLazyCheckDuplicateQuery,
} from '../../store/api/candidatesApi';
import { useGetTradesQuery, useGetStatesQuery, useGetCitiesQuery, useGetSourcesQuery } from '../../store/api/mastersApi';
import { useGetAssociatesQuery } from '../../store/api/associatesApi';
import { useGetReferrersQuery } from '../../store/api/referrersApi';
import { generateCandidateCV, CVData } from '../../utils/generateCV';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  full_name: string;
  dob: string;
  gender: string;
  religion: string;
  whatsapp_code: string;
  whatsapp_no: string;
  alternate_contact: string;
  email: string;
  passport_no: string;
  ecr_type: string;
  state_id: string;
  city_id: string;
  education: string;
  education_other: string;
  indian_experience: string;
  abroad_experience: string;
  indian_driving_license: string;
  gulf_driving_license: string;
  english_speaking: string;
  arabic_speaking: string;
  gulf_return: string;
  gulf_return_details: string;
  registration_mode: string;
  source_id: string;
  referrer_id: string;
  associate_id: string;
  remarks: string;
}

interface Trade { id: number; name: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', label: 'India' },
  { code: '+971', flag: '🇦🇪', label: 'UAE' },
  { code: '+966', flag: '🇸🇦', label: 'Saudi Arabia' },
  { code: '+974', flag: '🇶🇦', label: 'Qatar' },
  { code: '+965', flag: '🇰🇼', label: 'Kuwait' },
  { code: '+973', flag: '🇧🇭', label: 'Bahrain' },
  { code: '+968', flag: '🇴🇲', label: 'Oman' },
  { code: '+1',   flag: '🇺🇸', label: 'USA / Canada' },
  { code: '+44',  flag: '🇬🇧', label: 'UK' },
  { code: '+60',  flag: '🇲🇾', label: 'Malaysia' },
  { code: '+65',  flag: '🇸🇬', label: 'Singapore' },
];

const EDUCATION_OPTIONS = ['8th Pass', '10th Pass', '12th Pass', 'Diploma', 'ITI', 'Bachelors', 'Masters', 'Other'];
const EXPERIENCE_OPTIONS = ['Fresher', '<1 yr', '1–3 yrs', '3–5 yrs', '5–10 yrs', '10+ yrs'];
const RELIGION_OPTIONS   = ['Islam', 'Hindu', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const LANG_LEVELS        = [
  { value: 'none',  label: 'None' },
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'fluent',label: 'Fluent' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {step}
      </div>
      <div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// Sel is now the shared Select component
const Sel = Select;

// Phone input with country code selector
function PhoneField({
  label,
  required,
  codeValue,
  onCodeChange,
  error,
  inputProps,
}: {
  label: string;
  required?: boolean;
  codeValue: string;
  onCodeChange: (v: string) => void;
  error?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div>
      <label className="form-label">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <div className="flex">
        <div className="relative flex-shrink-0">
          <select
            value={codeValue}
            onChange={(e) => onCodeChange(e.target.value)}
            className="form-input appearance-none rounded-r-none border-r-0 pr-6 pl-2 text-sm w-[88px] cursor-pointer bg-gray-50"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          {...inputProps}
          className="form-input rounded-l-none flex-1 min-w-0"
          placeholder="10-digit mobile number"
        />
      </div>
      {error && <p className="text-red-500 text-[10px] mt-1">{error}</p>}
    </div>
  );
}

// Multi-select position tags with predictive autocomplete
function PositionSelect({
  trades = [],
  value,
  onChange,
}: {
  trades: Trade[];
  value: Trade[];
  onChange: (v: Trade[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = trades.filter((t) => !value.find((v) => v.id === t.id));
  const filtered = query.trim()
    ? available.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
    : available;

  useEffect(() => { setActiveIdx(0); }, [query, open]);

  useEffect(() => {
    function out(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);

  const addPosition = (t: Trade) => {
    onChange([...value, t]);
    setQuery('');
    setOpen(false);
  };

  const canAdd = value.length < 3;

  return (
    <div ref={ref} className="relative">
      <div
        className="form-input min-h-[38px] flex flex-wrap items-center gap-1.5 cursor-text"
        onClick={() => { if (canAdd) { setOpen(true); inputRef.current?.focus(); } }}
      >
        {value.map((pos) => (
          <span key={pos.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
            {pos.name}
            <button type="button" className="hover:text-blue-900"
              onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v.id !== pos.id)); }}>
              <X size={9} strokeWidth={3} />
            </button>
          </span>
        ))}
        {canAdd && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIdx]) addPosition(filtered[activeIdx]); }
              else if (e.key === 'Backspace' && !query && value.length > 0) { onChange(value.slice(0, -1)); }
              else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            }}
            className="flex-1 min-w-[120px] text-xs outline-none bg-transparent placeholder-gray-400"
            placeholder={value.length === 0 ? 'Type to search positions…' : 'Add another…'}
          />
        )}
      </div>
      {open && canAdd && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {filtered.map((t, idx) => (
            <button key={t.id} type="button"
              className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                idx === activeIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => addPosition(t)}>
              {t.name}
            </button>
          ))}
        </div>
      )}
      {open && canAdd && filtered.length === 0 && query.trim() && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-3.5 py-2 text-xs text-gray-400">
          No positions matching "{query}"
        </div>
      )}
    </div>
  );
}

// Associate info panel
function AssociateInfo({ associate }: { associate: any }) {
  if (!associate) return null;
  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-0.5">
      <div className="font-semibold">{associate.full_name}</div>
      <div className="text-blue-600">{associate.phone} {associate.location_city ? `• ${associate.location_city}, ${associate.location_state || ''}` : ''}</div>
      <div className="text-blue-600">Base commission: ₹{associate.commission_rate != null ? Number(associate.commission_rate).toLocaleString('en-IN') : '5,000'} / candidate</div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
export default function CandidateForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { whatsapp_code: '+91' },
  });

  // Contact verification state
  const [contactCode, setContactCode]     = useState('+91');
  const [contactNumber, setContactNumber] = useState('');
  const [verifyState, setVerifyState]     = useState<'idle' | 'checking' | 'new' | 'exists'>('idle');
  const [existingMatch, setExistingMatch] = useState<any>(null);
  const formUnlocked = isEdit || verifyState === 'new';

  // Positions
  const [selectedPositions, setSelectedPositions] = useState<Trade[]>([]);
  const [positionError, setPositionError]          = useState(false);

  // CV upload
  const [cvFile, setCvFile]   = useState<File | null>(null);
  const [cvUrl, setCvUrl]     = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: trades = []    } = useGetTradesQuery(undefined);
  const { data: states         } = useGetStatesQuery(undefined);
  const { data: sources        } = useGetSourcesQuery(undefined);
  const { data: associatesRaw } = useGetAssociatesQuery(undefined);
  const associates: any[] = Array.isArray(associatesRaw) ? associatesRaw : (associatesRaw as any)?.data ?? [];
  const { data: referrersRaw } = useGetReferrersQuery(undefined, { refetchOnMountOrArgChange: false });
  const referrers: any[] = Array.isArray(referrersRaw) ? referrersRaw : (referrersRaw as any)?.data ?? [];

  const selectedStateId    = watch('state_id');
  const education          = watch('education');
  const gulfReturn         = watch('gulf_return');
  const registrationMode   = watch('registration_mode');
  const selectedAssociate  = watch('associate_id');
  const whatsappCode       = watch('whatsapp_code');

  const { data: cities } = useGetCitiesQuery(
    selectedStateId ? { state_id: Number(selectedStateId) } : undefined,
    { skip: !selectedStateId },
  );

  const { data: editCandidate } = useGetCandidateQuery(Number(id), { skip: !isEdit });
  const [createCandidate, { isLoading: creating }] = useCreateCandidateMutation();
  const [updateCandidate, { isLoading: updating }] = useUpdateCandidateMutation();
  const [checkDuplicate] = useLazyCheckDuplicateQuery();

  // Populate form in edit mode
  useEffect(() => {
    if (editCandidate && isEdit) {
      const c = editCandidate;
      // Separate stored number into code + number if starts with +
      let code = '+91', num = c.whatsapp_no || '';
      const match = num.match(/^(\+\d{1,4})\s*(.+)$/);
      if (match) { code = match[1]; num = match[2]; }

      reset({
        full_name: c.full_name,
        dob: c.dob ? new Date(c.dob).toISOString().split('T')[0] : '',
        gender: c.gender,
        religion: c.religion || '',
        whatsapp_code: code,
        whatsapp_no: num,
        alternate_contact: c.alternate_contact || '',
        email: c.email || '',
        passport_no: c.passport_no || '',
        ecr_type: c.ecr_type || '',
        state_id: c.state_id?.toString() || '',
        city_id: c.city_id?.toString() || '',
        education: c.education,
        education_other: c.education_other || '',
        indian_experience: c.indian_experience || '',
        abroad_experience: c.abroad_experience || '',
        indian_driving_license: c.indian_driving_license?.length > 0 ? 'yes' : 'no',
        gulf_driving_license:   c.gulf_driving_license?.length   > 0 ? 'yes' : 'no',
        english_speaking: c.english_speaking || '',
        arabic_speaking: c.arabic_speaking ? 'basic' : 'none',
        gulf_return: c.gulf_return ? 'yes' : 'no',
        gulf_return_details: c.gulf_return_details || '',
        registration_mode: c.registration_mode,
        source_id: c.source_id?.toString() || '',
        referrer_id: (c as any).referrer_id?.toString() || '',
        associate_id: c.associate_id?.toString() || '',
        remarks: c.remarks || '',
      });
      setContactCode(code);
      setContactNumber(num);
      setCvUrl(c.cv_url || '');
    }
  }, [editCandidate, isEdit, reset]);

  // Restore positions for edit
  useEffect(() => {
    if (editCandidate && isEdit && trades.length > 0) {
      const c = editCandidate;
      const positions: Trade[] = [];
      [c.position_1_id, c.position_2_id, c.position_3_id].forEach((pid: any) => {
        if (pid) {
          const t = (trades as Trade[]).find((tr) => tr.id === pid);
          if (t) positions.push(t);
        }
      });
      setSelectedPositions(positions);
    }
  }, [editCandidate, isEdit, trades]);

  // Phone verification — live, debounced, triggers on full number length
  const verifyTimer = useRef<number | null>(null);

  const runVerify = useCallback(async (number: string, code: string) => {
    setVerifyState('checking');
    try {
      // Server stores whatsapp_no as digits only — match on the raw number
      const result = await checkDuplicate({ phone: number }).unwrap();
      if (result.has_duplicates) {
        setVerifyState('exists');
        setExistingMatch(result.duplicates[0]);
      } else {
        setVerifyState('new');
        setExistingMatch(null);
        setValue('whatsapp_code', code);
        setValue('whatsapp_no', number);
      }
    } catch {
      setVerifyState('new');
    }
  }, [checkDuplicate, setValue]);

  const scheduleVerify = useCallback((number: string, code: string) => {
    if (verifyTimer.current) {
      window.clearTimeout(verifyTimer.current);
      verifyTimer.current = null;
    }
    const digits = number.replace(/\D/g, '');
    const requiredLen = code === '+91' ? 10 : 8;
    if (digits.length < requiredLen) {
      setVerifyState('idle');
      setExistingMatch(null);
      return;
    }
    verifyTimer.current = window.setTimeout(() => {
      runVerify(digits, code);
    }, 300);
  }, [runVerify]);

  useEffect(() => {
    return () => {
      if (verifyTimer.current) window.clearTimeout(verifyTimer.current);
    };
  }, []);

  // CV upload
  const handleCvUpload = async (file: File) => {
    setUploading(true);
    setCvFile(file);
    try {
      const fd = new FormData();
      fd.append('cv', file);
      const authRaw = localStorage.getItem('auth');
      const token = authRaw ? JSON.parse(authRaw)?.token : null;
      const res = await fetch('/api/candidates/upload-cv', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setCvUrl(data.cv_url);
        toast.success('CV uploaded');
      } else {
        toast.error('CV upload failed');
        setCvFile(null);
      }
    } catch {
      toast.error('CV upload failed');
      setCvFile(null);
    } finally {
      setUploading(false);
    }
  };

  // Generate CV (draft from current form values)
  const handleGenerateCV = async () => {
    const vals = watch() as any;
    const fullWA = `${vals.whatsapp_code || contactCode}${vals.whatsapp_no || contactNumber}`;
    const assocObj = associates.find((a: any) => a.id === Number(vals.associate_id));
    const refObj   = referrers.find((r: any)  => r.id === Number(vals.referrer_id));
    const stateObj = (states as any[])?.find((s: any) => s.id === Number(vals.state_id));
    const cityObj  = (cities as any[])?.find((c: any) => c.id === Number(vals.city_id));
    const srcObj   = (sources as any[])?.find((s: any) => s.id === Number(vals.source_id));

    const cvData: CVData = {
      candidate_code:   isEdit ? editCandidate?.candidate_code : undefined,
      full_name:        vals.full_name || 'Draft Candidate',
      dob:              vals.dob,
      gender:           vals.gender,
      religion:         vals.religion,
      passport_no:      vals.passport_no,
      ecr_type:         vals.ecr_type,
      education:        vals.education,
      whatsapp_no:      fullWA,
      alternate_contact: vals.alternate_contact,
      email:            vals.email,
      state:            stateObj?.name,
      city:             cityObj?.name,
      positions:        selectedPositions.map((p) => p.name),
      indian_experience: vals.indian_experience,
      abroad_experience: vals.abroad_experience,
      english_speaking:  vals.english_speaking,
      arabic_speaking:   vals.arabic_speaking,
      gulf_return:       vals.gulf_return === 'yes',
      gulf_return_details: vals.gulf_return_details,
      indian_driving_license: vals.indian_driving_license,
      gulf_driving_license:   vals.gulf_driving_license,
      registration_mode: vals.registration_mode,
      source:           srcObj?.name,
      registered_date:  isEdit ? editCandidate?.created_at : new Date().toISOString(),
      associate_name:   assocObj?.full_name,
      referrer_name:    refObj?.name,
      referred_by:      vals.referred_by,
      remarks:          vals.remarks,
    };
    await generateCandidateCV(cvData);
    toast.success('CV downloaded');
  };

  const onSubmit = async (data: FormData) => {
    if (selectedPositions.length === 0) {
      setPositionError(true);
      toast.error('Select at least one position');
      return;
    }
    setPositionError(false);

    // Store digits only so duplicate checks match seeded/imported data
    const fullWA = `${data.whatsapp_no || ''}`.replace(/\D/g, '');

    const payload: any = {
      full_name:         data.full_name,
      whatsapp_no:       fullWA,
      gender:            data.gender,
      education:         data.education,
      position_1_id:     selectedPositions[0].id,
      registration_mode: data.registration_mode,
      source_id:         Number(data.source_id),
    };

    if (data.dob)                payload.dob                = data.dob;
    if (data.alternate_contact)  payload.alternate_contact  = data.alternate_contact;
    if (data.email)              payload.email              = data.email;
    if (data.passport_no)        payload.passport_no        = data.passport_no;
    if (data.ecr_type)           payload.ecr_type           = data.ecr_type;
    if (data.state_id)           payload.state_id           = Number(data.state_id);
    if (data.city_id)            payload.city_id            = Number(data.city_id);
    if (data.religion)           payload.religion           = data.religion;
    if (data.education_other)    payload.education_other    = data.education_other;
    if (selectedPositions[1])    payload.position_2_id      = selectedPositions[1].id;
    if (selectedPositions[2])    payload.position_3_id      = selectedPositions[2].id;
    if (data.indian_experience)  payload.indian_experience  = data.indian_experience;
    if (data.abroad_experience)  payload.abroad_experience  = data.abroad_experience;
    payload.indian_driving_license = data.indian_driving_license === 'yes' ? ['Yes'] : [];
    payload.gulf_driving_license   = data.gulf_driving_license   === 'yes' ? ['Yes'] : [];
    if (data.english_speaking)   payload.english_speaking   = data.english_speaking;
    payload.arabic_speaking = data.arabic_speaking !== 'none' && Boolean(data.arabic_speaking);
    payload.gulf_return     = data.gulf_return === 'yes';
    if (data.gulf_return_details) payload.gulf_return_details = data.gulf_return_details;
    if (data.referrer_id)    payload.referrer_id  = Number(data.referrer_id);
    if (data.associate_id)   payload.associate_id = Number(data.associate_id);
    if (data.remarks)        payload.remarks      = data.remarks;
    if (cvUrl)               payload.cv_url       = cvUrl;

    try {
      if (isEdit) {
        await updateCandidate({ id: Number(id), ...payload }).unwrap();
        toast.success('Candidate updated');
      } else {
        const result = await createCandidate(payload).unwrap();
        toast.success(`Candidate ${result.candidate_code} registered`);
      }
      navigate('/data-entry/candidates');
    } catch (err: any) {
      const msg = err?.data?.message;
      if (typeof msg === 'string') toast.error(msg);
      else if (Array.isArray(msg)) toast.error(msg[0]);
      else toast.error('Failed to save candidate');
    }
  };

  const associateObj = associates.find((a: any) => a.id === Number(selectedAssociate));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <span>Data Entry</span>
          <ChevronRight size={12} />
          <span className="text-gray-600 font-medium">{isEdit ? 'Edit Candidate' : 'Register Candidate'}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Edit Candidate' : 'Register New Candidate'}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {isEdit ? 'Update candidate information' : 'Start with the mobile number to check for duplicates'}
        </p>
      </div>

      {/* ── CONTACT VERIFICATION ────────────────────────────────── */}
      {!isEdit && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
              <UserCheck size={14} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Contact Verification</h2>
              <p className="text-xs text-gray-400 mt-0.5">Enter the candidate's mobile number to check if already registered</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Contact Number <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <div className="relative flex-shrink-0">
                  <select
                    value={contactCode}
                    onChange={(e) => {
                      const next = e.target.value;
                      setContactCode(next);
                      scheduleVerify(contactNumber, next);
                    }}
                    className="form-input appearance-none rounded-r-none border-r-0 pr-6 pl-2 text-sm w-[88px] cursor-pointer bg-gray-50"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <input
                  type="tel"
                  value={contactNumber}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setContactNumber(digits);
                    scheduleVerify(digits, contactCode);
                  }}
                  className="form-input rounded-l-none flex-1"
                  placeholder="10-digit mobile number"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">We'll check automatically as you type</p>
            </div>

            {/* Verification status */}
            <div className="flex items-end pb-1">
              {verifyState === 'idle' && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  Enter a number to verify
                </div>
              )}
              {verifyState === 'checking' && (
                <div className="text-xs text-blue-500 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Checking database…
                </div>
              )}
              {verifyState === 'new' && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-700 font-medium">
                  <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                  New candidate — proceed to fill form
                </div>
              )}
              {verifyState === 'exists' && existingMatch && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 w-full">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800">Already registered</p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      <strong>{existingMatch.full_name}</strong> · {existingMatch.candidate_code}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/data-entry/candidates/${existingMatch.id}/edit`)}
                      className="text-xs text-blue-600 hover:underline mt-1 font-medium"
                    >
                      Open profile →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN FORM — unlocked only after verification ─────────── */}
      {formUnlocked && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Section 1: Personal Information */}
          <div className="card p-6">
            <SectionHeader step={1} title="Personal Information" subtitle="Identity and contact details" />
            <div className="space-y-4">
              {/* Row: Name, DOB, Gender */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                  <input
                    {...register('full_name', { required: 'Required', minLength: { value: 3, message: 'Min 3 chars' } })}
                    className="form-input"
                    placeholder="Enter full name"
                  />
                  {errors.full_name && <p className="text-red-500 text-[10px] mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="form-label">Date of Birth</label>
                  <input type="date" {...register('dob')} className="form-input" max={new Date(Date.now() - 86400000).toISOString().split('T')[0]} />
                </div>
                <Sel label="Gender" required error={errors.gender?.message}
                  {...register('gender', { required: 'Required' })}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Sel>
              </div>

              {/* Row: WhatsApp, Alt, Email, Passport */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PhoneField
                  label="WhatsApp Number"
                  required
                  codeValue={whatsappCode}
                  onCodeChange={(v) => setValue('whatsapp_code', v)}
                  error={errors.whatsapp_no?.message}
                  inputProps={{
                    ...register('whatsapp_no', { required: 'Required' }),
                  }}
                />
                <div>
                  <label className="form-label">Alternate Contact</label>
                  <input {...register('alternate_contact')} className="form-input" placeholder="Optional" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" {...register('email')} className="form-input" placeholder="Optional" />
                </div>
                <div>
                  <label className="form-label">Passport Number</label>
                  <input {...register('passport_no')} className="form-input" placeholder="e.g., A1234567" />
                </div>
              </div>

              {/* Row: State, City, Religion, Education */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Sel label="State" {...register('state_id')}>
                  <option value="">Select State</option>
                  {(states as any[])?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Sel>
                <Sel label="City" disabled={!selectedStateId} {...register('city_id')}>
                  <option value="">{selectedStateId ? 'Select City' : 'Select state first'}</option>
                  {(cities as any[])?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Sel>
                <Sel label="Religion" {...register('religion')}>
                  <option value="">Select</option>
                  {RELIGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </Sel>
                <Sel label="Education" required error={errors.education?.message}
                  {...register('education', { required: 'Required' })}>
                  <option value="">Select</option>
                  {EDUCATION_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </Sel>
              </div>

              {education === 'Other' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label">Specify Education</label>
                    <input {...register('education_other')} className="form-input" placeholder="Qualification" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Positions */}
          <div className="card p-6">
            <SectionHeader step={2} title="Positions Applied For" subtitle="Select up to 3 trade positions" />
            <div>
              <label className="form-label">Positions <span className="text-red-500">*</span></label>
              <PositionSelect
                trades={trades as Trade[]}
                value={selectedPositions}
                onChange={(v) => { setSelectedPositions(v); if (v.length > 0) setPositionError(false); }}
              />
              {positionError && <p className="text-red-500 text-[10px] mt-1">Select at least one position</p>}
              {selectedPositions.length === 3 && <p className="text-gray-400 text-[10px] mt-1">Maximum 3 positions</p>}
            </div>
          </div>

          {/* Section 3: Experience & Skills */}
          <div className="card p-6">
            <SectionHeader step={3} title="Experience & Skills" subtitle="Work history, languages, licenses and Gulf profile" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Sel label="Indian Work Experience" {...register('indian_experience')}>
                  <option value="">Select</option>
                  {EXPERIENCE_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </Sel>
                <Sel label="Abroad Work Experience" {...register('abroad_experience')}>
                  <option value="">Select</option>
                  {EXPERIENCE_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </Sel>
                <Sel label="Indian Driving License" {...register('indian_driving_license')}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Sel>
                <Sel label="Gulf Driving License" {...register('gulf_driving_license')}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Sel>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Sel label="English Speaking" {...register('english_speaking')}>
                  <option value="">Select</option>
                  {LANG_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Sel>
                <Sel label="Arabic Speaking" {...register('arabic_speaking')}>
                  <option value="">Select</option>
                  {LANG_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Sel>
                <Sel label="Gulf Return" {...register('gulf_return')}>
                  <option value="">Select</option>
                  <option value="yes">Yes — Previously worked in Gulf</option>
                  <option value="no">No</option>
                </Sel>
                <Sel label="ECR Type" {...register('ecr_type')}>
                  <option value="">Select</option>
                  <option value="ecr">ECR (Emigration Check Required)</option>
                  <option value="ecnr">ECNR (Not Required)</option>
                </Sel>
              </div>
              {gulfReturn === 'yes' && (
                <div>
                  <label className="form-label">Gulf Return Details</label>
                  <textarea {...register('gulf_return_details')} className="form-input resize-none" rows={2}
                    placeholder="Country, duration, role, employer…" />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Registration Info */}
          <div className="card p-6">
            <SectionHeader step={4} title="Registration Info" subtitle="Source, mode of registration, and referral details" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Sel label="Mode of Registration" required error={errors.registration_mode?.message}
                  {...register('registration_mode', { required: 'Required' })}>
                  <option value="">Select</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="phone">Telecalling / Phone</option>
                  <option value="online">Online (Social Media / App)</option>
                  <option value="referral">Referral (by person)</option>
                  <option value="associate">Associate / Sub-Agent</option>
                  <option value="camp">Camp / Recruitment Drive</option>
                </Sel>
                <Sel label="Source" required error={errors.source_id?.message}
                  {...register('source_id', { required: 'Required' })}>
                  <option value="">Select Source</option>
                  {(sources as any[])?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Sel>

                {/* Referral — show referrer from DB */}
                {registrationMode === 'referral' && (
                  <Sel label="Referred By" {...register('referrer_id')}>
                    <option value="">Select referrer</option>
                    {(referrers as any[]).map((r) => (
                      <option key={r.id} value={r.id}>{r.name}{r.phone ? ` — ${r.phone}` : ''}</option>
                    ))}
                  </Sel>
                )}

                {/* Associate — show sub-agent from DB */}
                {registrationMode === 'associate' && (
                  <Sel label="Associate / Sub-Agent" {...register('associate_id')}>
                    <option value="">Select associate</option>
                    {(associates as any[]).map((a) => (
                      <option key={a.id} value={a.id}>{a.full_name}{a.location_city ? ` — ${a.location_city}` : ''}</option>
                    ))}
                  </Sel>
                )}
              </div>

              {/* Associate info panel */}
              {registrationMode === 'associate' && associateObj && (
                <AssociateInfo associate={associateObj} />
              )}

              {referrers.length === 0 && registrationMode === 'referral' && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  No referrers found in the database. Ask your admin to add referrers via the Masters Config.
                </p>
              )}

              <div>
                <label className="form-label">Remarks</label>
                <textarea {...register('remarks')} className="form-input resize-none" rows={3}
                  placeholder="Internal notes, follow-up reminders…" />
              </div>
            </div>
          </div>

          {/* Section 5: CV */}
          <div className="card p-6">
            <SectionHeader step={5} title="Candidate CV" subtitle="Upload an existing CV or generate one from the form data" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload */}
              <div>
                <label className="form-label">Upload CV</label>
                <input
                  type="file"
                  ref={fileRef}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCvUpload(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {uploading
                    ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                    : <><Upload size={15} /> {cvFile ? cvFile.name : 'Choose PDF, DOC, or image'}</>
                  }
                </button>
                {cvUrl && !uploading && (
                  <a href={cvUrl} target="_blank" rel="noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                    <FileText size={12} /> View uploaded CV
                  </a>
                )}
              </div>

              {/* Generate */}
              <div>
                <label className="form-label">Generate Profile PDF</label>
                <p className="text-xs text-gray-400 mb-2">
                  Creates a formatted one-page Al-Hiraa candidate profile PDF from the data entered above.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateCV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <FileDown size={15} />
                  Generate & Download CV
                </button>
              </div>
            </div>
          </div>

          {/* Submit bar */}
          <div className="card px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Fields marked <span className="text-red-500 font-bold">*</span> are required
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={14} /> Cancel
              </button>
              <button type="submit" disabled={creating || updating} className="btn-primary">
                <Save size={15} />
                {creating || updating ? 'Saving…' : isEdit ? 'Update Candidate' : 'Register Candidate'}
              </button>
            </div>
          </div>

        </form>
      )}
    </div>
  );
}
