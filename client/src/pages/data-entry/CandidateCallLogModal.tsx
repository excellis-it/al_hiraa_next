import { X, Phone, PhoneOff, PhoneMissed, PhoneForwarded, Clock, Calendar, User, Briefcase } from 'lucide-react';
import { useGetCallLogsByCandidateQuery } from '../../store/api/callLogsApi';

// ── Outcome config ───────────────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  interested:       { label: 'Interested',       bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <Phone    size={12} /> },
  not_interested:   { label: 'Not Interested',   bg: 'bg-red-100',     text: 'text-red-700',     icon: <PhoneOff size={12} /> },
  call_back:        { label: 'Call Back',         bg: 'bg-amber-100',   text: 'text-amber-700',   icon: <PhoneForwarded size={12} /> },
  not_reachable:    { label: 'Not Reachable',     bg: 'bg-gray-100',    text: 'text-gray-600',    icon: <PhoneMissed size={12} /> },
  wrong_number:     { label: 'Wrong Number',      bg: 'bg-rose-100',    text: 'text-rose-700',    icon: <PhoneOff size={12} /> },
  reached:          { label: 'Reached',           bg: 'bg-blue-100',    text: 'text-blue-700',    icon: <Phone size={12} /> },
  voicemail:        { label: 'Voicemail',         bg: 'bg-gray-100',    text: 'text-gray-500',    icon: <PhoneMissed size={12} /> },
  line_busy:        { label: 'Line Busy',         bg: 'bg-orange-100',  text: 'text-orange-700',  icon: <PhoneMissed size={12} /> },
  switched_off:     { label: 'Switched Off',      bg: 'bg-slate-100',   text: 'text-slate-600',   icon: <PhoneOff size={12} /> },
};

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cfg = OUTCOME_CONFIG[outcome] ?? { label: outcome, bg: 'bg-gray-100', text: 'text-gray-600', icon: <Phone size={12} /> };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function fmtDateTime(val: string) {
  const d = new Date(val);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtDate(val: string) {
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(val: string) {
  const diff = Date.now() - new Date(val).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return fmtDate(val);
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  candidate: { id: number; full_name: string; whatsapp_no?: string };
  onClose: () => void;
}

export default function CandidateCallLogModal({ candidate, onClose }: Props) {
  const { data, isLoading } = useGetCallLogsByCandidateQuery(candidate.id);
  const logs: any[] = Array.isArray(data) ? data : [];

  // Group logs by job for display
  const byJob: Record<string, any[]> = {};
  for (const log of logs) {
    const key = log.candidate_job?.job?.title ?? 'General';
    if (!byJob[key]) byJob[key] = [];
    byJob[key].push(log);
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-end bg-black/30 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Phone size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{candidate.full_name}</p>
              {candidate.whatsapp_no && (
                <p className="text-blue-200 text-[11px] font-mono">{candidate.whatsapp_no}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Summary bar */}
        {!isLoading && logs.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-blue-700">{logs.length}</span>
              <span className="text-[9px] text-blue-500 font-semibold uppercase">Total Calls</span>
            </div>
            <div className="w-px h-8 bg-blue-200" />
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(
                logs.reduce((acc: Record<string, number>, l) => {
                  acc[l.outcome] = (acc[l.outcome] || 0) + 1;
                  return acc;
                }, {})
              ).map(([outcome, count]) => (
                <span key={outcome} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${OUTCOME_CONFIG[outcome]?.bg ?? 'bg-gray-100'} ${OUTCOME_CONFIG[outcome]?.text ?? 'text-gray-600'}`}>
                  {count}× {OUTCOME_CONFIG[outcome]?.label ?? outcome}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading call history…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <PhoneMissed size={28} className="text-gray-300" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">No call logs yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Call logs appear here after a recruiter logs a call from the Pipeline module.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              {logs.map((log, idx) => {
                const cfg = OUTCOME_CONFIG[log.outcome] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: log.outcome, icon: <Phone size={12} /> };
                const isFirst = idx === 0;
                return (
                  <div key={log.id} className={`relative rounded-xl border p-4 transition-all ${isFirst ? 'border-blue-200 bg-blue-50/40 shadow-sm' : 'border-gray-100 bg-white'}`}>
                    {/* Attempt number */}
                    <div className="absolute -top-2.5 left-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isFirst ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200'}`}>
                        #{log.call_attempt_number}
                        {isFirst && ' · Latest'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 mt-1">
                      <OutcomeBadge outcome={log.outcome} />
                      <span className="text-[10px] text-gray-400 flex-shrink-0 flex items-center gap-1">
                        <Clock size={9} />
                        {timeAgo(log.call_timestamp)}
                      </span>
                    </div>

                    {/* Job context */}
                    {log.candidate_job?.job?.title && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                        <Briefcase size={9} className="flex-shrink-0" />
                        <span className="truncate">{log.candidate_job.job.title}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {log.notes && (
                      <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">
                        {log.notes}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <User size={9} />
                        <span className="font-medium text-gray-600">{log.caller?.full_name ?? 'Unknown'}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {fmtDateTime(log.call_timestamp)}
                      </div>
                    </div>

                    {/* Follow-up date */}
                    {log.follow_up_date && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                        <Calendar size={10} />
                        <span>Follow-up: <strong>{fmtDate(log.follow_up_date)}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
