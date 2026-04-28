import { useState } from 'react';
import { X, Plane } from 'lucide-react';
import Select from '../../components/ui/Select';
import { useCreateDeploymentMutation } from '../../store/api/deploymentsApi';
import { useGetCandidatesQuery } from '../../store/api/candidatesApi';
import { useGetCompaniesQuery } from '../../store/api/companiesApi';
import { useGetTradesQuery } from '../../store/api/mastersApi';

const GULF_COUNTRIES = [
  { value: 'saudi_arabia', label: 'Saudi Arabia' },
  { value: 'uae', label: 'UAE' },
  { value: 'qatar', label: 'Qatar' },
  { value: 'kuwait', label: 'Kuwait' },
  { value: 'bahrain', label: 'Bahrain' },
  { value: 'oman', label: 'Oman' },
];

const CURRENCIES = ['SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR'];

export default function DeploymentForm({ onClose, onSuccess, prefilledCandidateId }: {
  onClose: () => void;
  onSuccess: () => void;
  prefilledCandidateId?: number;
}) {
  const [form, setForm] = useState({
    candidate_id: prefilledCandidateId ? String(prefilledCandidateId) : '',
    company_id: '',
    position_id: '',
    deployment_date: '',
    contract_end_date: '',
    salary_amount: '',
    salary_currency: 'SAR',
    country: 'saudi_arabia',
    visa_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  });
  const [candidateSearch, setCandidateSearch] = useState('');

  const [create, { isLoading }] = useCreateDeploymentMutation();
  const { data: candidatesData } = useGetCandidatesQuery({ search: candidateSearch || undefined, limit: 20 });
  const { data: companiesData } = useGetCompaniesQuery({ limit: 100 } as any);
  const { data: tradesData } = useGetTradesQuery(true);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.candidate_id || !form.company_id || !form.position_id || !form.deployment_date || !form.contract_end_date || !form.salary_amount) return;
    try {
      await create({
        candidate_id: +form.candidate_id,
        company_id: +form.company_id,
        position_id: +form.position_id,
        deployment_date: form.deployment_date,
        contract_end_date: form.contract_end_date,
        salary_amount: +form.salary_amount,
        salary_currency: form.salary_currency,
        country: form.country,
        visa_number: form.visa_number || undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        notes: form.notes || undefined,
      }).unwrap();
      onSuccess();
    } catch (e) {
      console.error(e);
    }
  };

  const labelCls = 'block text-[10px] font-semibold text-gray-400 uppercase mb-1';
  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Plane size={16} className="text-blue-600" />
            </div>
            <span className="font-semibold text-gray-800">Add Deployment</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Candidate */}
          {!prefilledCandidateId && (
            <div>
              <label className={labelCls}>Candidate *</label>
              <input
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                placeholder="Search by name or passport..."
                className={inputCls + ' mb-2'}
              />
              <Select value={form.candidate_id} onChange={(e) => set('candidate_id', e.target.value)}>
                <option value="">Select candidate</option>
                {candidatesData?.data?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.full_name} — {c.candidate_code}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Gulf Company *</label>
              <Select value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
                <option value="">Select company</option>
                {companiesData?.data?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className={labelCls}>Position *</label>
              <Select value={form.position_id} onChange={(e) => set('position_id', e.target.value)}>
                <option value="">Select position</option>
                {(tradesData as any[])?.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className={labelCls}>Deployment Date *</label>
              <input type="date" value={form.deployment_date} onChange={(e) => set('deployment_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contract End Date *</label>
              <input type="date" value={form.contract_end_date} onChange={(e) => set('contract_end_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Monthly Salary *</label>
              <div className="flex gap-2">
                <input type="number" value={form.salary_amount} onChange={(e) => set('salary_amount', e.target.value)} placeholder="Amount" className={inputCls + ' flex-1'} />
                <Select value={form.salary_currency} onChange={(e) => set('salary_currency', e.target.value)} className="w-24">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Country *</label>
              <Select value={form.country} onChange={(e) => set('country', e.target.value)}>
                {GULF_COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
            <div>
              <label className={labelCls}>Visa / Iqama Number</label>
              <input value={form.visa_number} onChange={(e) => set('visa_number', e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div />
            <div>
              <label className={labelCls}>Emergency Contact Name</label>
              <input value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} placeholder="Name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Emergency Contact Phone</label>
              <input value={form.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} placeholder="Phone number" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Any additional notes..." className={inputCls + ' resize-none'} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !form.candidate_id || !form.company_id || !form.position_id || !form.deployment_date || !form.contract_end_date || !form.salary_amount}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plane size={14} />
            {isLoading ? 'Saving...' : 'Create Deployment'}
          </button>
        </div>
      </div>
    </div>
  );
}
