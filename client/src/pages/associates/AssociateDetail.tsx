import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Plus, X } from 'lucide-react';
import {
  useGetAssociateQuery,
  useGetCommissionSummaryQuery,
  useUpdateCommissionStatusMutation,
  useCreateCommissionMutation,
} from '../../store/api/associatesApi';

function formatINR(amount: number | null | undefined): string {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="badge-gray">—</span>;
  switch (status) {
    case 'active': return <span className="badge-green">Active</span>;
    case 'inactive': return <span className="badge-gray">Inactive</span>;
    default: return <span className="badge-gray">{status}</span>;
  }
}

function CommissionStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="badge-gray">—</span>;
  switch (status) {
    case 'earned': return <span className="badge-orange">Earned</span>;
    case 'paid': return <span className="badge-green">Paid</span>;
    case 'cancelled': return <span className="badge-red">Cancelled</span>;
    default: return <span className="badge-gray">{status}</span>;
  }
}

interface AddCommissionForm {
  candidate_job_id: string;
  amount: string;
  notes: string;
}

interface AddCommissionModalProps {
  associateId: number;
  onClose: () => void;
}

function AddCommissionModal({ associateId, onClose }: AddCommissionModalProps) {
  const [form, setForm] = useState<AddCommissionForm>({ candidate_job_id: '', amount: '5000', notes: '' });
  const [createCommission, { isLoading }] = useCreateCommissionMutation();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidate_job_id || !form.amount) {
      setError('Candidate Job ID and amount are required.');
      return;
    }
    try {
      await createCommission({
        associate_id: associateId,
        candidate_job_id: parseInt(form.candidate_job_id),
        amount: parseFloat(form.amount),
        notes: form.notes || undefined,
      }).unwrap();
      onClose();
    } catch {
      setError('Failed to add commission. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Add Commission</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{error}</div>
          )}
          <div>
            <label className="form-label">Candidate Job ID <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={form.candidate_job_id}
              onChange={(e) => setForm({ ...form, candidate_job_id: e.target.value })}
              className="form-input"
              placeholder="Enter candidate job ID"
            />
          </div>
          <div>
            <label className="form-label">Amount (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="0"
              step="100"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="form-input"
              placeholder="5000"
            />
            <p className="text-[10px] text-gray-400 mt-1">Default ₹5,000 per candidate. Edit to override (e.g., 7,000, 10,000).</p>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="form-input resize-none"
              rows={3}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1 justify-center">
              {isLoading ? 'Adding...' : 'Add Commission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AssociateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const associateId = parseInt(id ?? '0');

  const { data: associateData, isLoading: loadingAssociate } = useGetAssociateQuery(associateId);
  const { data: summaryData, isLoading: loadingSummary } = useGetCommissionSummaryQuery(associateId);
  const [updateCommissionStatus, { isLoading: updatingStatus }] = useUpdateCommissionStatusMutation();
  const [showAddCommission, setShowAddCommission] = useState(false);

  const associate = associateData?.associate || associateData;
  const summary = summaryData?.summary || summaryData;
  const commissions: any[] = summaryData?.commissions || associateData?.commissions || [];

  const handleMarkPaid = async (commissionId: number) => {
    try {
      await updateCommissionStatus({ id: commissionId, status: 'paid' }).unwrap();
    } catch {
      // handle error silently
    }
  };

  if (loadingAssociate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!associate) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Associate not found.</p>
        <button onClick={() => navigate('/associates')} className="mt-3 btn-ghost mx-auto">
          ← Back to Associates
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/associates')}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{associate.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Associate Profile</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Info Card */}
        <div className="card p-5 col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Contact & Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Phone</p>
              <p className="text-sm text-gray-800 mt-1">{associate.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Email</p>
              <p className="text-sm text-gray-800 mt-1">{associate.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Base Commission</p>
              <p className="text-sm text-gray-800 mt-1">
                <span className="badge-blue">
                  ₹{associate.commission_rate != null
                    ? Number(associate.commission_rate).toLocaleString('en-IN')
                    : '5,000'} / candidate
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Status</p>
              <div className="mt-1"><StatusBadge status={associate.status} /></div>
            </div>
          </div>
          {associate.notes && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Notes</p>
              <p className="text-sm text-gray-700 mt-1 bg-gray-50 rounded-xl px-3 py-2">{associate.notes}</p>
            </div>
          )}
        </div>

        {/* Commission Summary Card */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Commission Summary</h2>
          {loadingSummary ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Total Earned</p>
                <p className="text-sm font-bold text-gray-800">{formatINR(summary?.total_earned)}</p>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Total Paid</p>
                <p className="text-sm font-bold text-emerald-700">{formatINR(summary?.total_paid)}</p>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-sm font-bold text-amber-600">{formatINR(summary?.pending)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Commissions Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Commissions</h2>
          <button onClick={() => setShowAddCommission(true)} className="btn-primary text-xs px-3 py-1.5">
            <Plus size={14} />
            Add Commission
          </button>
        </div>
        {commissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Candidate</th>
                  <th className="table-th">Job</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c: any, i: number) => (
                  <tr key={c.id ?? i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="table-td font-medium text-gray-800">{c.candidate_name ?? '—'}</td>
                    <td className="table-td text-gray-500">{c.job_title ?? '—'}</td>
                    <td className="table-td font-semibold text-gray-800">{formatINR(c.amount)}</td>
                    <td className="table-td"><CommissionStatusBadge status={c.status} /></td>
                    <td className="table-td text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="table-td">
                      {c.status === 'earned' && (
                        <button
                          onClick={() => handleMarkPaid(c.id)}
                          disabled={updatingStatus}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">No commissions recorded yet</div>
        )}
      </div>

      {/* Add Commission Modal */}
      {showAddCommission && (
        <AddCommissionModal
          associateId={associateId}
          onClose={() => setShowAddCommission(false)}
        />
      )}
    </div>
  );
}
