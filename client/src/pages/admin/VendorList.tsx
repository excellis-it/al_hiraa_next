import { useState } from 'react';
import { Store, Plus, X, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from '../../components/ui/Select';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} from '../../store/api/vendorsApi';

interface VendorFormData {
  name: string;
  phone: string;
  email: string;
  service_charge: string;
  status: string;
}

const EMPTY: VendorFormData = { name: '', phone: '', email: '', service_charge: '', status: 'active' };

function StatusBadge({ status }: { status: string }) {
  return status === 'active'
    ? <span className="badge-green">Active</span>
    : <span className="badge-gray">Inactive</span>;
}

interface ModalProps {
  mode: 'create' | 'edit';
  initial?: any;
  onClose: () => void;
  onSave: (data: VendorFormData) => void;
  saving: boolean;
}

function VendorModal({ mode, initial, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState<VendorFormData>(
    initial
      ? {
          name:           initial.name           ?? '',
          phone:          initial.phone          ?? '',
          email:          initial.email          ?? '',
          service_charge: initial.service_charge != null ? String(initial.service_charge) : '',
          status:         initial.status         ?? 'active',
        }
      : EMPTY,
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setError('');
    onSave(form);
  };

  const field = (label: string, key: keyof VendorFormData, type = 'text', placeholder = '') => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="form-input"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {mode === 'create' ? 'Add Vendor' : 'Edit Vendor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`form-input ${error ? 'border-red-400' : ''}`}
              placeholder="Vendor / agency name"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Phone', 'phone', 'text', '+91 XXXXX XXXXX')}
            {field('Email', 'email', 'email', 'vendor@example.com')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Service Charge (₹)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.service_charge}
                onChange={(e) => setForm({ ...form, service_charge: e.target.value })}
                className="form-input"
                placeholder="0"
              />
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

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : mode === 'create' ? 'Add Vendor' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VendorList() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [editTarget, setEditTarget]   = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data, isLoading } = useGetVendorsQuery(
    { search: search || undefined, status: statusFilter || undefined },
    { refetchOnMountOrArgChange: true },
  );
  const [createVendor, { isLoading: creating }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: updating }] = useUpdateVendorMutation();
  const [deleteVendor, { isLoading: deleting }] = useDeleteVendorMutation();

  const vendors: any[] = data?.data ?? [];

  const buildPayload = (f: VendorFormData) => ({
    name:           f.name,
    phone:          f.phone   || undefined,
    email:          f.email   || undefined,
    status:         f.status  || 'active',
    service_charge: f.service_charge ? parseFloat(f.service_charge) : 0,
  });

  const handleCreate = async (f: VendorFormData) => {
    try {
      await createVendor(buildPayload(f)).unwrap();
      toast.success('Vendor added');
      setShowCreate(false);
    } catch (err: any) {
      const msg = err?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Failed to create vendor');
    }
  };

  const handleUpdate = async (f: VendorFormData) => {
    if (!editTarget) return;
    try {
      await updateVendor({ id: editTarget.id, ...buildPayload(f) }).unwrap();
      toast.success('Vendor updated');
      setEditTarget(null);
    } catch (err: any) {
      const msg = err?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Failed to update vendor');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVendor(deleteTarget.id).unwrap();
      toast.success('Vendor deactivated');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to deactivate vendor');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? 'Loading...' : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="card px-4 py-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : vendors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Vendor ID</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Email</th>
                  <th className="table-th text-right">Service Charge</th>
                  <th className="table-th text-center">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v: any, i: number) => (
                  <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="table-td text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="table-td">
                      <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                        {v.vendor_id}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">
                          {v.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-800 text-sm">{v.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-gray-500 text-sm">{v.phone ?? '—'}</td>
                    <td className="table-td text-gray-500 text-sm">{v.email ?? '—'}</td>
                    <td className="table-td text-right">
                      <span className="badge-green">
                        ₹{Number(v.service_charge).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="table-td text-center">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditTarget(v)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(v)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 size={12} /> Deactivate
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
            <Store size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
            <p className="text-sm text-gray-400">No vendors yet</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 btn-primary mx-auto">
              <Plus size={15} /> Add First Vendor
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <VendorModal mode="create" onClose={() => setShowCreate(false)} onSave={handleCreate} saving={creating} />
      )}
      {editTarget && (
        <VendorModal mode="edit" initial={editTarget} onClose={() => setEditTarget(null)} onSave={handleUpdate} saving={updating} />
      )}

      {/* Deactivate confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-800">Deactivate Vendor?</h3>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">{deleteTarget.name}</span> will be marked
              inactive. This can be reversed by editing the vendor.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 justify-center inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {deleting ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
