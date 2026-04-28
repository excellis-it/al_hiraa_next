import { useState } from 'react';
import { useNavigate } from 'react-router';
import { UserCheck, Plus, X } from 'lucide-react';
import Select from '../../components/ui/Select';
import {
  useGetAssociatesQuery,
  useCreateAssociateMutation,
  useUpdateAssociateMutation,
} from '../../store/api/associatesApi';

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="badge-gray">—</span>;
  switch (status) {
    case 'active': return <span className="badge-green">Active</span>;
    case 'inactive': return <span className="badge-gray">Inactive</span>;
    default: return <span className="badge-gray">{status}</span>;
  }
}

interface AssociateFormData {
  name: string;
  phone: string;
  email: string;
  commission_rate: string;
  notes: string;
  status: string;
}

const EMPTY_FORM: AssociateFormData = {
  name: '',
  phone: '',
  email: '',
  commission_rate: '',
  notes: '',
  status: 'active',
};

interface ModalProps {
  mode: 'create' | 'edit';
  initial?: any;
  onClose: () => void;
  onSave: (data: AssociateFormData) => void;
  saving: boolean;
}

function AssociateModal({ mode, initial, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState<AssociateFormData>(
    initial
      ? {
          name: initial.name ?? '',
          phone: initial.phone ?? '',
          email: initial.email ?? '',
          commission_rate: initial.commission_rate?.toString() ?? '',
          notes: initial.notes ?? '',
          status: initial.status ?? 'active',
        }
      : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<Partial<AssociateFormData>>({});

  const validate = () => {
    const e: Partial<AssociateFormData> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {mode === 'create' ? 'Add Associate' : 'Edit Associate'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`form-input ${errors.name ? 'border-red-400' : ''}`}
              placeholder="Full name"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="form-input"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="form-input"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Base Commission (₹ per candidate)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.commission_rate || '5000'}
                onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
                className="form-input"
                placeholder="5000"
              />
              <p className="text-[10px] text-gray-400 mt-1">Default ₹5,000 — edit to override per candidate</p>
            </div>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="form-input resize-none"
              rows={3}
              placeholder="Any notes about this associate..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : mode === 'create' ? 'Add Associate' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AssociateList() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetAssociatesQuery({});
  const [createAssociate, { isLoading: creating }] = useCreateAssociateMutation();
  const [updateAssociate, { isLoading: updating }] = useUpdateAssociateMutation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  const associates: any[] = data?.associates || data?.data || data || [];

  const handleCreate = async (formData: AssociateFormData) => {
    try {
      await createAssociate({
        ...formData,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
      }).unwrap();
      setShowCreateModal(false);
    } catch {
      // error handled silently; backend validation errors can be added here
    }
  };

  const handleUpdate = async (formData: AssociateFormData) => {
    if (!editTarget) return;
    try {
      await updateAssociate({
        id: editTarget.id,
        ...formData,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
      }).unwrap();
      setEditTarget(null);
    } catch {
      // error handled silently
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Associates</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? 'Loading...' : `${associates.length} associate${associates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus size={16} />
          Add Associate
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : associates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Commission Rate</th>
                  <th className="table-th">Total Commissions</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {associates.map((a: any, i: number) => (
                  <tr key={a.id ?? i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="table-td text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="table-td">
                      <button
                        onClick={() => navigate(`/associates/${a.id}`)}
                        className="font-semibold text-blue-700 hover:text-blue-900 hover:underline text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                            {(a.name ?? '?')[0]?.toUpperCase()}
                          </div>
                          {a.name ?? '—'}
                        </span>
                      </button>
                    </td>
                    <td className="table-td text-gray-500">{a.phone ?? '—'}</td>
                    <td className="table-td text-gray-500">{a.email ?? '—'}</td>
                    <td className="table-td text-center">
                      {a.commission_rate != null
                        ? <span className="badge-blue">₹{Number(a.commission_rate).toLocaleString('en-IN')}</span>
                        : <span className="badge-blue">₹5,000</span>
                      }
                    </td>
                    <td className="table-td text-center">
                      {a.total_commissions != null
                        ? <span className="badge-green">{a.total_commissions}</span>
                        : <span className="badge-gray">0</span>
                      }
                    </td>
                    <td className="table-td"><StatusBadge status={a.status} /></td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/associates/${a.id}`)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        <span className="text-gray-200">|</span>
                        <button
                          onClick={() => setEditTarget(a)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <UserCheck size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
            <p className="text-sm text-gray-400">No associates yet</p>
            <button onClick={() => setShowCreateModal(true)} className="mt-3 btn-primary mx-auto">
              <Plus size={15} />
              Add First Associate
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <AssociateModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
          saving={creating}
        />
      )}
      {editTarget && (
        <AssociateModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
          saving={updating}
        />
      )}
    </div>
  );
}
