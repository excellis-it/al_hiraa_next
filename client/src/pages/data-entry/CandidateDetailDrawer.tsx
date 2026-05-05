import { useState } from 'react';
import { X, Edit2, Phone, BookOpen, Briefcase, MapPin, AlertCircle, CheckCircle2, Clock, Briefcase as BriefcaseIcon } from 'lucide-react';
import Select from '../../components/ui/Select';
import { Link } from 'react-router';
import { useGetCandidateQuery } from '../../store/api/candidatesApi';
import { useCreateCallLogMutation, useGetCallLogsByCandidateQuery } from '../../store/api/callLogsApi';
import { useGetJobsQuery } from '../../store/api/jobsApi';
import { useAddToPipelineMutation } from '../../store/api/pipelineApi';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────────────

// Only "Interested" requires assigning the candidate to a job pipeline first.
// Other outcomes (not interested / call back / not reachable / wrong number)
// just record what happened on the call — no job assignment required.
const CALL_OUTCOMES = [
  { value: 'interested',     label: 'Interested',     color: 'bg-emerald-100 text-emerald-700 border-emerald-300', assignJob: true  },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-700 border-red-300',             assignJob: false },
  { value: 'call_back',      label: 'Call Back',      color: 'bg-blue-100 text-blue-700 border-blue-300',          assignJob: false },
  { value: 'not_reachable',  label: 'Not Reachable',  color: 'bg-gray-100 text-gray-600 border-gray-300',          assignJob: false },
  { value: 'wrong_number',   label: 'Wrong Number',   color: 'bg-orange-100 text-orange-700 border-orange-300',    assignJob: false },
];

const OUTCOME_HISTORY_COLORS: Record<string, string> = {
  interested:     'bg-emerald-100 text-emerald-700',
  not_interested: 'bg-red-100 text-red-700',
  call_back:      'bg-blue-100 text-blue-700',
  not_reachable:  'bg-gray-100 text-gray-600',
  wrong_number:   'bg-orange-100 text-orange-700',
  reached:        'bg-emerald-100 text-emerald-700',
  voicemail:      'bg-blue-100 text-blue-700',
  line_busy:      'bg-amber-100 text-amber-700',
  switched_off:   'bg-orange-100 text-orange-700',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return String(Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))) + ' yrs';
}

function Field({ label, value }: { label: string; value?: string | null | React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium break-words">
        {value === null || value === undefined || value === '' ? <span className="text-gray-300 font-normal">—</span> : value}
      </p>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">{icon}</div>
      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-500',
    deployed: 'bg-blue-100 text-blue-700',
    blacklisted: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CandidateDetailDrawer({
  candidateId,
  onClose,
}: {
  candidateId: number;
  onClose: () => void;
}) {
  const { data: candidate, isLoading } = useGetCandidateQuery(candidateId);
  const { data: callLogs } = useGetCallLogsByCandidateQuery(candidateId);
  const [createCallLog, { isLoading: savingCall }] = useCreateCallLogMutation();
  const [addToPipeline, { isLoading: assigningJob }] = useAddToPipelineMutation();

  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [callNotes, setCallNotes] = useState('');
  const [callSaved, setCallSaved] = useState(false);
  const [showJobAssign, setShowJobAssign] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobAssigned, setJobAssigned] = useState(false);

  const hasJob = !!(candidate as any)?.active_candidate_job_id;
  const requiresCallUpdate = hasJob && !callSaved;

  const selectedOutcomeObj = CALL_OUTCOMES.find((o) => o.value === selectedOutcome);
  // Allow assigning to another job even if the candidate is already in one — schema
  // permits multiple candidate_jobs per candidate (one row per job). Only same
  // (candidate, job) pair is blocked by @@unique([candidate_id, job_id]).
  const shouldShowJobAssign = !!selectedOutcomeObj?.assignJob;
  // Only show jobs with a today/future interview date — assigning to past-only jobs has no purpose.
  const { data: jobsData } = useGetJobsQuery({ status: 'open', limit: 100, upcoming: 'true' }, { skip: !shouldShowJobAssign });
  const openJobs: any[] = jobsData?.data || [];

  const handleClose = () => onClose();

  const handleSaveCall = async () => {
    if (!selectedOutcome) return;
    let candidateJobId = (candidate as any)?.active_candidate_job_id as number | undefined;

    // If the outcome requires job assignment and the user has picked one in the
    // inline assign UI, create the CandidateJob first and use its id below.
    if (shouldShowJobAssign && showJobAssign && selectedJobId && !jobAssigned) {
      try {
        const created = await addToPipeline({
          candidate_id: candidateId,
          job_id: +selectedJobId,
        }).unwrap();
        setJobAssigned(true);
        if ((created as any)?.id) candidateJobId = (created as any).id;
      } catch { /* fall through; the call-log step below will surface the error */ }
    }

    // For non-engagement outcomes (Not Interested / Call Back / Not Reachable /
    // Wrong Number) we skip logging when there's no job in the pipeline. The
    // backend's CallLog table requires candidate_job_id, so without one we just
    // record the outcome locally and close — no spurious "must be added to a
    // job pipeline" error for a perfectly valid outcome.
    if (!candidateJobId && !shouldShowJobAssign) {
      setCallSaved(true);
      toast.success(`Outcome recorded: ${selectedOutcomeObj?.label ?? selectedOutcome}`);
      return;
    }

    try {
      await createCallLog({
        ...(candidateJobId
          ? { candidate_job_id: candidateJobId }
          : { candidate_id: candidateId }),
        outcome: selectedOutcome,
        notes: callNotes || undefined,
      }).unwrap();
      setCallSaved(true);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save call log');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-base leading-tight truncate">
              {candidate?.full_name || '…'}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                {candidate?.candidate_code || '…'}
              </span>
              {candidate && <StatusBadge status={candidate.status} />}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
            {candidate && (
              <Link
                to={`/data-entry/candidates/${candidate.id}/edit`}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Edit2 size={11} /> Edit
              </Link>
            )}
            <button
              onClick={handleClose}
              className={`p-1.5 rounded-lg transition-colors ${requiresCallUpdate ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : candidate ? (
            <>
              {/* ── Log Call Outcome (compact) ── */}
              <section className={`rounded-xl border px-3.5 py-2.5 ${callSaved ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50/60'}`}>
                {callSaved ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">Call logged — {CALL_OUTCOMES.find((o) => o.value === selectedOutcome)?.label}</p>
                      {(jobAssigned || callNotes) && (
                        <p className="text-[11px] text-emerald-600">
                          {jobAssigned && 'Assigned to job'}
                          {jobAssigned && callNotes && ' · '}
                          {callNotes && `"${callNotes}"`}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={12} className="text-amber-600 flex-shrink-0" />
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Log Call Outcome</span>
                      {hasJob && (
                        <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-medium ml-auto">Required before closing</span>
                      )}
                    </div>

                    {(candidate as any).active_job_title && (
                      <p className="text-[11px] text-amber-600 mb-2">
                        Pipeline: <span className="font-semibold">{(candidate as any).active_job_title}</span>
                      </p>
                    )}

                    {/* Outcome pills */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {CALL_OUTCOMES.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => { setSelectedOutcome(o.value); setShowJobAssign(false); setSelectedJobId(''); }}
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                            selectedOutcome === o.value
                              ? o.color + ' ring-2 ring-offset-1 ring-blue-400'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>

                    {/* Assign to Job */}
                    {shouldShowJobAssign && (
                      <div className="mb-2">
                        {!showJobAssign ? (
                          <button
                            onClick={() => setShowJobAssign(true)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <BriefcaseIcon size={11} /> Assign to Job
                          </button>
                        ) : (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1.5">Select Active Job</p>
                            <Select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                              <option value="">— Choose a job —</option>
                              {openJobs.map((j: any) => (
                                <option key={j.id} value={j.id}>
                                  {j.title} — {j.company?.name} ({j.positions_required} positions)
                                </option>
                              ))}
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes + save */}
                    <div className="flex gap-2 items-center">
                      <input
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        placeholder="Notes (optional)…"
                        className="flex-1 text-xs border border-amber-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-400"
                      />
                      <button
                        onClick={handleSaveCall}
                        disabled={!selectedOutcome || savingCall || assigningJob}
                        className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {savingCall || assigningJob ? 'Saving…' : showJobAssign && selectedJobId ? 'Save & Assign' : 'Save Log'}
                      </button>
                    </div>
                  </>
                )}
              </section>

              {/* ── Key Information ── */}
              <section>
                <SectionTitle icon={<Phone size={12} />} label="Key Information" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                  <Field label="WhatsApp No." value={<span className="font-mono">{candidate.whatsapp_no}</span>} />
                  <Field label="Alternate Phone" value={<span className="font-mono">{(candidate as any).alternate_contact}</span>} />
                  <Field label="Age" value={calcAge(candidate.dob as any)} />
                  <Field label="ECR Type" value={<span className="uppercase">{candidate.ecr_type}</span>} />
                  <Field
                    label="Passport No."
                    value={candidate.passport_no
                      ? <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{candidate.passport_no}</span>
                      : null}
                  />
                  <div />
                  <Field label="Position 1" value={(candidate as any).position_1?.name} />
                  <Field label="Position 2" value={(candidate as any).position_2?.name} />
                  <Field label="Position 3" value={(candidate as any).position_3?.name} />
                  <Field label="Education" value={candidate.education} />
                  <Field label="Gulf Return" value={candidate.gulf_return ? 'Yes' : 'No'} />
                  <div />
                  <Field label="Indian Experience" value={(candidate as any).indian_experience} />
                  <Field label="Abroad Experience" value={(candidate as any).abroad_experience} />
                  <Field label="English Speaking" value={<span className="capitalize">{candidate.english_speaking?.replace(/_/g, ' ')}</span>} />
                  <Field label="Arabic Speaking" value={candidate.arabic_speaking ? 'Yes' : 'No'} />
                </div>
              </section>

              {/* ── Registration Details ── */}
              <section>
                <SectionTitle icon={<MapPin size={12} />} label="Registration Details" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                  <Field label="Registration Mode" value={<span className="capitalize">{candidate.registration_mode?.replace(/_/g, ' ')}</span>} />
                  <Field label="Source" value={(candidate as any).source?.name} />
                  <Field label="Referred By" value={candidate.referred_by} />
                  <Field label="Associate" value={(candidate as any).associate?.full_name} />
                  <Field label="Registered By" value={candidate.registered_by} />
                  <Field label="Date Registered" value={fmtDate(candidate.created_at as any)} />
                </div>
              </section>

              {/* ── Call History ── */}
              {callLogs && callLogs.length > 0 && (
                <section>
                  <SectionTitle icon={<Clock size={12} />} label="Call History" />
                  <div className="space-y-2">
                    {(callLogs as any[]).map((log: any) => (
                      <div key={log.id} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${OUTCOME_HISTORY_COLORS[log.outcome] || 'bg-gray-100 text-gray-600'}`}>
                              {log.outcome.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-semibold text-gray-700">{log.caller?.full_name}</span>
                            {log.candidate_job?.job?.title && (
                              <span className="text-[10px] text-gray-400">· {log.candidate_job.job.title}</span>
                            )}
                          </div>
                          {log.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{log.notes}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(log.call_timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            {' · Attempt #'}{log.call_attempt_number}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">Candidate not found</p>
          )}
        </div>

        {/* ── Footer ── */}
        {candidate && (
          <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0 bg-gray-50 flex items-center justify-between">
            {requiresCallUpdate && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertCircle size={12} />
                Log call before closing
              </span>
            )}
            <div className="ml-auto">
              <Link
                to={`/data-entry/candidates/${candidate.id}/edit`}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors"
              >
                <Edit2 size={13} />
                Edit Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
