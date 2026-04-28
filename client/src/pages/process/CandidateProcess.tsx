import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, PauseCircle, Circle, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import Select from '../../components/ui/Select';
import type { RootState } from '../../store/store';
import { useGetProcessStepsQuery, useUpdateProcessStepMutation } from '../../store/api/processTrackingApi';
import { useGetPaymentsQuery, useGetPaymentSummaryQuery, useCreatePaymentMutation, useRecordPaymentMutation } from '../../store/api/paymentsApi';

const STEP_LABELS: Record<number, string> = {
  1: 'Document Collection',
  2: 'Medical Test',
  3: 'GAMCA Slip',
  4: 'Visa Processing',
  5: 'Visa Stamping',
  6: 'Air Ticket / Departure',
};

const STEP_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'failed', label: 'Failed' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

function stepCircleClass(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-500 text-white';
    case 'in_progress': return 'bg-blue-600 text-white animate-pulse';
    case 'on_hold': return 'bg-amber-500 text-white';
    case 'failed': return 'bg-red-500 text-white';
    default: return 'bg-gray-200 text-gray-500';
  }
}

function stepLabelClass(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-600';
    case 'in_progress': return 'text-blue-600';
    case 'on_hold': return 'text-amber-600';
    case 'failed': return 'text-red-600';
    default: return 'text-gray-400';
  }
}

function stepStatusBadge(status: string) {
  switch (status) {
    case 'completed': return <span className="badge-green">Completed</span>;
    case 'in_progress': return <span className="badge-blue">In Progress</span>;
    case 'on_hold': return <span className="badge-orange">On Hold</span>;
    case 'failed': return <span className="badge-red">Failed</span>;
    default: return <span className="badge-gray">Not Started</span>;
  }
}

function stepIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle2 size={14} />;
    case 'in_progress': return <Clock size={14} />;
    case 'on_hold': return <PauseCircle size={14} />;
    case 'failed': return <AlertCircle size={14} />;
    default: return <Circle size={14} />;
  }
}

function connectorClass(prevStatus: string): string {
  return prevStatus === 'completed' ? 'bg-green-400' : 'bg-gray-200';
}

function paymentStatusBadge(status: string) {
  switch (status) {
    case 'paid': return <span className="badge-green">Paid</span>;
    case 'partial': return <span className="badge-blue">Partial</span>;
    case 'overdue': return <span className="badge-red">Overdue</span>;
    default: return <span className="badge-gray">Pending</span>;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number | string | null | undefined, currency = '₹'): string {
  if (amount == null || amount === '') return '—';
  return `${currency}${Number(amount).toLocaleString('en-IN')}`;
}

interface StepUpdateForm {
  status: string;
  notes: string;
  failure_action: string;
  failure_reason: string;
}

interface AddInstallmentForm {
  amount_due: string;
  due_date: string;
  notes: string;
}

interface RecordPaymentForm {
  amount_paid: string;
  payment_date: string;
  payment_method: string;
  reference: string;
}

export default function CandidateProcess() {
  const { candidateJobId } = useParams<{ candidateJobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  const candidateJobIdNum = Number(candidateJobId);

  // Candidate name passed via navigation state from pipeline
  const candidateName: string =
    (location.state as { candidateName?: string } | null)?.candidateName ??
    `Candidate #${candidateJobId}`;

  const { data: stepsData, isLoading: stepsLoading } = useGetProcessStepsQuery(candidateJobIdNum);
  const { data: paymentsData, isLoading: paymentsLoading } = useGetPaymentsQuery(candidateJobIdNum);
  const { data: summaryData } = useGetPaymentSummaryQuery(candidateJobIdNum);
  const [updateProcessStep, { isLoading: updatingStep }] = useUpdateProcessStepMutation();
  const [createPayment, { isLoading: creatingPayment }] = useCreatePaymentMutation();
  const [recordPayment, { isLoading: recordingPayment }] = useRecordPaymentMutation();

  // Which step's inline edit panel is open
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);
  const [stepForms, setStepForms] = useState<Record<number, StepUpdateForm>>({});

  // Add installment modal
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [addInstallmentForm, setAddInstallmentForm] = useState<AddInstallmentForm>({
    amount_due: '',
    due_date: '',
    notes: '',
  });

  // Record payment modal
  const [recordingPaymentId, setRecordingPaymentId] = useState<number | null>(null);
  const [recordPaymentForm, setRecordPaymentForm] = useState<RecordPaymentForm>({
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference: '',
  });

  const isManagerOrAbove = user && ['manager', 'admin'].includes(user.role);

  const steps: any[] = Array.isArray(stepsData) ? stepsData : (stepsData as any)?.steps ?? [];
  const payments: any[] = Array.isArray(paymentsData) ? paymentsData : (paymentsData as any)?.payments ?? [];

  function getStepForm(stepId: number, step: any): StepUpdateForm {
    return stepForms[stepId] ?? {
      status: step.status ?? 'not_started',
      notes: step.notes ?? '',
      failure_action: step.failure_action ?? 'retry',
      failure_reason: step.failure_reason ?? '',
    };
  }

  function setStepFormField(stepId: number, step: any, field: keyof StepUpdateForm, value: string) {
    setStepForms((prev) => ({
      ...prev,
      [stepId]: { ...getStepForm(stepId, step), [field]: value },
    }));
  }

  async function handleStepSave(step: any) {
    const form = getStepForm(step.id, step);
    try {
      await updateProcessStep({
        id: step.id,
        status: form.status,
        notes: form.notes || undefined,
        ...(form.status === 'failed'
          ? { failure_action: form.failure_action, failure_reason: form.failure_reason || undefined }
          : {}),
      }).unwrap();
      setExpandedStepId(null);
    } catch {
      // error is handled by RTK Query
    }
  }

  async function handleAddInstallment() {
    try {
      await createPayment({
        candidate_job_id: candidateJobIdNum,
        amount_due: Number(addInstallmentForm.amount_due),
        due_date: addInstallmentForm.due_date || undefined,
        notes: addInstallmentForm.notes || undefined,
      }).unwrap();
      setShowAddInstallment(false);
      setAddInstallmentForm({ amount_due: '', due_date: '', notes: '' });
    } catch {
      // handled by RTK Query
    }
  }

  async function handleRecordPayment() {
    if (!recordingPaymentId) return;
    try {
      await recordPayment({
        id: recordingPaymentId,
        amount_paid: Number(recordPaymentForm.amount_paid),
        payment_date: recordPaymentForm.payment_date,
        payment_method: recordPaymentForm.payment_method || undefined,
        reference: recordPaymentForm.reference || undefined,
      }).unwrap();
      setRecordingPaymentId(null);
      setRecordPaymentForm({
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference: '',
      });
    } catch {
      // handled by RTK Query
    }
  }

  const summary = summaryData as any;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Pipeline
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800">Process Tracking</h1>
        <span className="text-gray-400 font-medium text-sm">— {candidateName}</span>
      </div>

      {stepsLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Left: 6-step stepper */}
          <div className="flex-1" style={{ flex: '2' }}>
            <div className="card p-6">
              <h2 className="text-base font-bold text-gray-800 mb-6">Process Steps</h2>

              <div className="relative">
                {steps.map((step: any, index: number) => {
                  const stepNum: number = step.step_number ?? index + 1;
                  const label = STEP_LABELS[stepNum] ?? step.step_name ?? `Step ${stepNum}`;
                  const isExpanded = expandedStepId === step.id;
                  const form = getStepForm(step.id, step);
                  const prevStep = index > 0 ? steps[index - 1] : null;

                  return (
                    <div key={step.id} className="flex gap-4">
                      {/* Timeline column */}
                      <div className="flex flex-col items-center" style={{ width: '40px', flexShrink: 0 }}>
                        {/* Connector line above (not for first step) */}
                        {index > 0 && (
                          <div
                            className={`w-0.5 h-4 ${connectorClass(prevStep?.status ?? 'not_started')}`}
                          />
                        )}
                        {/* Step circle */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${stepCircleClass(step.status)}`}
                        >
                          {step.status === 'completed' ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            stepNum
                          )}
                        </div>
                        {/* Connector line below (not for last step) */}
                        {index < steps.length - 1 && (
                          <div
                            className={`w-0.5 flex-1 min-h-[2rem] ${connectorClass(step.status)}`}
                          />
                        )}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-semibold text-sm ${stepLabelClass(step.status)}`}>
                                {label}
                              </span>
                              {stepStatusBadge(step.status)}
                            </div>
                            {step.notes && (
                              <p className="text-xs text-gray-500 mb-1">{step.notes}</p>
                            )}
                            {(step.started_at || step.completed_at) && (
                              <div className="flex gap-4 text-xs text-gray-400 mt-1">
                                {step.started_at && (
                                  <span>Started: {formatDate(step.started_at)}</span>
                                )}
                                {step.completed_at && (
                                  <span>Completed: {formatDate(step.completed_at)}</span>
                                )}
                              </div>
                            )}
                            {step.failure_reason && (
                              <p className="text-xs text-red-500 mt-1">
                                Failure: {step.failure_reason}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setExpandedStepId(isExpanded ? null : step.id)
                            }
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={13} /> Close
                              </>
                            ) : (
                              <>
                                <ChevronDown size={13} /> Update
                              </>
                            )}
                          </button>
                        </div>

                        {/* Inline update panel */}
                        {isExpanded && (
                          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                            <Select
                              label="Status"
                              value={form.status}
                              onChange={(e) =>
                                setStepFormField(step.id, step, 'status', e.target.value)
                              }
                            >
                              {STEP_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Select>

                            <div>
                              <label className="form-label">Notes</label>
                              <textarea
                                className="form-input resize-none"
                                rows={2}
                                value={form.notes}
                                onChange={(e) =>
                                  setStepFormField(step.id, step, 'notes', e.target.value)
                                }
                                placeholder="Optional notes..."
                              />
                            </div>

                            {form.status === 'failed' && (
                              <>
                                <div>
                                  <label className="form-label">Failure Action</label>
                                  <div className="flex gap-4 mt-1">
                                    {['retry', 'release'].map((action) => (
                                      <label key={action} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`failure_action_${step.id}`}
                                          value={action}
                                          checked={form.failure_action === action}
                                          onChange={() =>
                                            setStepFormField(step.id, step, 'failure_action', action)
                                          }
                                          className="accent-blue-600"
                                        />
                                        <span className="text-sm text-gray-700 capitalize">{action}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="form-label">Failure Reason</label>
                                  <textarea
                                    className="form-input resize-none"
                                    rows={2}
                                    value={form.failure_reason}
                                    onChange={(e) =>
                                      setStepFormField(step.id, step, 'failure_reason', e.target.value)
                                    }
                                    placeholder="Describe the failure reason..."
                                  />
                                </div>
                              </>
                            )}

                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setExpandedStepId(null)}
                                className="btn-ghost text-xs px-3 py-1.5"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleStepSave(step)}
                                disabled={updatingStep}
                                className="btn-primary text-xs px-3 py-1.5"
                              >
                                {updatingStep ? (
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {steps.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No process steps found. They will be initialized on first load.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Payment summary card */}
          <div style={{ flex: '1', minWidth: 0 }}>
            <div className="card p-5 mb-4">
              <h2 className="text-base font-bold text-gray-800 mb-4">Payment Summary</h2>
              {summary ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500 font-medium">Total Fee</span>
                    <span className="text-sm font-bold text-gray-800">
                      {formatCurrency(summary.total_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500 font-medium">Total Paid</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(summary.total_paid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-gray-500 font-medium">Balance Due</span>
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(summary.balance_due)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No summary available.</p>
              )}
            </div>

            {/* Installments */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800">Installments</h2>
                {isManagerOrAbove && (
                  <button
                    onClick={() => setShowAddInstallment(true)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={13} /> Add
                  </button>
                )}
              </div>

              {paymentsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No installments yet.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((pmt: any, idx: number) => (
                    <div
                      key={pmt.id}
                      className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">
                          Installment #{idx + 1}
                        </span>
                        {paymentStatusBadge(pmt.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
                        <span>Due: {formatCurrency(pmt.amount_due)}</span>
                        <span>Paid: {formatCurrency(pmt.amount_paid)}</span>
                        <span>Due Date: {formatDate(pmt.due_date)}</span>
                        {pmt.payment_date && (
                          <span>Paid On: {formatDate(pmt.payment_date)}</span>
                        )}
                      </div>
                      {pmt.status !== 'paid' && (
                        <button
                          onClick={() => {
                            setRecordingPaymentId(pmt.id);
                            setRecordPaymentForm({
                              amount_paid: String(pmt.amount_due - (pmt.amount_paid ?? 0)),
                              payment_date: new Date().toISOString().split('T')[0],
                              payment_method: 'cash',
                              reference: '',
                            });
                          }}
                          className="w-full text-xs btn-primary justify-center mt-1 py-1.5"
                        >
                          Record Payment
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Installment Modal */}
      {showAddInstallment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">Add Installment</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label">Amount Due (PKR) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={addInstallmentForm.amount_due}
                  onChange={(e) =>
                    setAddInstallmentForm((f) => ({ ...f, amount_due: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={addInstallmentForm.due_date}
                  onChange={(e) =>
                    setAddInstallmentForm((f) => ({ ...f, due_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input resize-none"
                  rows={2}
                  value={addInstallmentForm.notes}
                  onChange={(e) =>
                    setAddInstallmentForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddInstallment(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleAddInstallment}
                disabled={!addInstallmentForm.amount_due || creatingPayment}
                className="btn-primary"
              >
                {creatingPayment ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Add'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {recordingPaymentId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">Record Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label">Amount Paid (PKR) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={recordPaymentForm.amount_paid}
                  onChange={(e) =>
                    setRecordPaymentForm((f) => ({ ...f, amount_paid: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="form-label">Payment Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={recordPaymentForm.payment_date}
                  onChange={(e) =>
                    setRecordPaymentForm((f) => ({ ...f, payment_date: e.target.value }))
                  }
                />
              </div>
              <Select
                label="Payment Method"
                value={recordPaymentForm.payment_method}
                onChange={(e) =>
                  setRecordPaymentForm((f) => ({ ...f, payment_method: e.target.value }))
                }
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </Select>
              <div>
                <label className="form-label">Reference / Receipt #</label>
                <input
                  type="text"
                  className="form-input"
                  value={recordPaymentForm.reference}
                  onChange={(e) =>
                    setRecordPaymentForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRecordingPaymentId(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={!recordPaymentForm.amount_paid || recordingPayment}
                className="btn-primary"
              >
                {recordingPayment ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Record'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
