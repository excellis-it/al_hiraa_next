import { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Building2, Edit2, Plus, X } from 'lucide-react';
import Select from '../../components/ui/Select';
import {
  useGetCompaniesQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
} from '../../store/api/companiesApi';

const GULF_COUNTRIES = [
  { value: 'saudi_arabia', label: 'Saudi Arabia' },
  { value: 'uae', label: 'UAE' },
  { value: 'qatar', label: 'Qatar' },
  { value: 'kuwait', label: 'Kuwait' },
  { value: 'bahrain', label: 'Bahrain' },
  { value: 'oman', label: 'Oman' },
];

const COUNTRY_LABELS: Record<string, string> = {
  saudi_arabia: 'Saudi Arabia',
  uae: 'UAE',
  qatar: 'Qatar',
  kuwait: 'Kuwait',
  bahrain: 'Bahrain',
  oman: 'Oman',
};

const INDUSTRY_OPTIONS = [
  { value: 'construction', label: 'Construction' },
  { value: 'oil_and_gas', label: 'Oil & Gas' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  name: '',
  country: '',
  city: '',
  industry: '',
  contact_person: '',
  phone: '',
  email: '',
  agreement_details: '',
  status: 'active',
};

export default function CompanyList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useGetCompaniesQuery({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
  });

  const [createCompany, { isLoading: creating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: updating }] = useUpdateCompanyMutation();

  function openCreate() {
    setEditingCompany(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(company: any) {
    setEditingCompany(company);
    setForm({
      name: company.name || '',
      country: company.country || '',
      city: company.city || '',
      industry: company.industry || '',
      contact_person: company.contact_person || '',
      phone: company.phone || '',
      email: company.email || '',
      agreement_details: company.agreement_details || '',
      status: company.status || 'active',
    });
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCompany(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Company name is required.');
      return;
    }
    try {
      if (editingCompany) {
        await updateCompany({ id: editingCompany.id, ...form }).unwrap();
      } else {
        await createCompany(form).unwrap();
      }
      closeModal();
    } catch (err: any) {
      setFormError(err?.data?.message || 'Something went wrong.');
    }
  }

  const isSaving = creating || updating;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data?.meta?.total != null ? `${data.meta.total.toLocaleString()} companies` : 'Manage client companies'}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          Add Company
        </button>
      </div>

      {/* Filters */}
      <div className="card px-4 py-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, contact..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">#</th>
                    <th className="table-th min-w-[250px]">Company Name</th>
                    <th className="table-th">Country</th>
                    <th className="table-th">Industry</th>
                    <th className="table-th">Contact Name</th>
                    <th className="table-th">Contact Phone</th>
                    <th className="table-th">Total Jobs</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((company: any, idx: number) => (
                    <tr key={company.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="table-td text-gray-400 text-xs font-mono">
                        {(page - 1) * 20 + idx + 1}
                      </td>
                      <td className="table-td min-w-[250px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {company.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <span className="font-semibold text-gray-800 text-sm">{company.name}</span>
                        </div>
                      </td>
                      <td className="table-td text-gray-500">{COUNTRY_LABELS[company.country] || company.country || '—'}</td>
                      <td className="table-td text-gray-500 capitalize">
                        {company.industry ? company.industry.replace(/_/g, ' ') : '—'}
                      </td>
                      <td className="table-td text-gray-600">{company.contact_person || '—'}</td>
                      <td className="table-td font-mono text-sm text-gray-600">{company.phone || '—'}</td>
                      <td className="table-td">
                        <span className="badge-blue">{company._count?.jobs ?? 0}</span>
                      </td>
                      <td className="table-td">
                        <span className={company.status === 'active' ? 'badge-green' : 'badge-gray'}>
                          {company.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => openEdit(company)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!data?.data || data.data.length === 0) && (
                    <tr>
                      <td colSpan={9} className="table-td text-center py-16">
                        <Building2 size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1} />
                        <p className="text-sm text-gray-400 font-medium">No companies found</p>
                        <p className="text-xs text-gray-300 mt-1">Try adjusting your search or add a new company</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.meta && data.meta.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50">
                <span className="text-xs text-gray-400">
                  Showing <span className="font-semibold text-gray-700">{(page - 1) * 20 + 1}–{Math.min(page * 20, data.meta.total)}</span> of <span className="font-semibold text-gray-700">{data.meta.total.toLocaleString()}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(data.meta.pages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                        page === p
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))}
                    disabled={page >= data.meta.pages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="form-label">Company Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Al Noor Contracting"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Country</label>
                  <Select
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  >
                    <option value="">Select country</option>
                    {GULF_COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="form-label">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Dubai"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Industry</label>
                <Select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Contact Name</label>
                  <input
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="form-input"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="form-label">Contact Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="form-input"
                    placeholder="+971..."
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="form-input"
                  placeholder="contact@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
                <div>
                  <label className="form-label">Agreement Details</label>
                  <input
                    value={form.agreement_details}
                    onChange={(e) => setForm({ ...form, agreement_details: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Signed on 01-Jan-2026"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="btn-primary">
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {editingCompany ? 'Save Changes' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
