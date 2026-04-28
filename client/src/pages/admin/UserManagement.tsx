import { useState } from 'react';
import { UserPlus, Edit2, UserX, UserCheck } from 'lucide-react';
import Select from '../../components/ui/Select';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
} from '../../store/api/usersApi';
import type { User } from '../../store/api/usersApi';

const ROLE_LABELS: Record<string, string> = {
  data_entry: 'Data Entry',
  recruiter: 'Recruiter',
  process_manager: 'Process Manager',
  manager: 'Manager',
  admin: 'Administrator',
};

const ROLE_BADGE: Record<string, string> = {
  data_entry: 'bg-violet-100 text-violet-700 border border-violet-200',
  recruiter: 'bg-blue-100 text-blue-700 border border-blue-200',
  process_manager: 'bg-amber-100 text-amber-700 border border-amber-200',
  manager: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  admin: 'bg-rose-100 text-rose-700 border border-rose-200',
};

const ROLES = ['data_entry', 'recruiter', 'process_manager', 'manager', 'admin'];

interface UserFormData {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  password: string;
}

const defaultForm: UserFormData = {
  full_name: '',
  email: '',
  phone: '',
  role: 'data_entry',
  is_active: true,
  password: '',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatLastLogin(dt?: string) {
  if (!dt) return 'Never';
  return new Date(dt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserManagement() {
  const [page] = useState(1);
  const { data, isLoading } = useGetUsersQuery({ page, limit: 50 });
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(defaultForm);
  const [error, setError] = useState('');

  const openCreate = () => {
    setEditingUser(null);
    setForm(defaultForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      is_active: u.is_active,
      password: '',
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingUser) {
        const body: Partial<User> = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          is_active: form.is_active,
        };
        await updateUser({ id: editingUser.id, ...body }).unwrap();
      } else {
        const body: Record<string, unknown> = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
        };
        if (form.password) body.password = form.password;
        await createUser(body).unwrap();
      }
      closeModal();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'An error occurred');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await updateUser({ id: u.id, is_active: !u.is_active }).unwrap();
    } catch {
      // silent
    }
  };

  const users = data?.data || [];
  const total = data?.meta.total || 0;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} users total</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <UserPlus size={15} />
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th w-10">#</th>
                <th className="table-th">User</th>
                <th className="table-th">Email</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th">Last Login</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {getInitials(u.full_name)}
                      </div>
                      <span className="font-medium text-gray-800">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{u.email}</td>
                  <td className="table-td text-gray-500">{u.phone || '—'}</td>
                  <td className="table-td">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="table-td">
                    {u.is_active ? (
                      <span className="badge-green">Active</span>
                    ) : (
                      <span className="badge-gray">Inactive</span>
                    )}
                  </td>
                  <td className="table-td text-gray-400 text-xs">{formatLastLogin(u.last_login)}</td>
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                          u.is_active
                            ? 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                            : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'
                        }`}
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-td text-center text-gray-400 py-10">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Email *</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <Select
                label="Role *"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>

              {!editingUser && (
                <div>
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Default: Password@123"
                  />
                </div>
              )}

              {editingUser && (
                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active Account
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || updating}
                >
                  {creating || updating ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
