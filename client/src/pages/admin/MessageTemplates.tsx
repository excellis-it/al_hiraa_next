import { useState } from 'react';
import { Plus, Edit2, Eye, X } from 'lucide-react';
import Select from '../../components/ui/Select';
import {
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  usePreviewTemplateMutation,
} from '../../store/api/messageTemplatesApi';
import type { MessageTemplate } from '../../store/api/messageTemplatesApi';

const TYPE_BADGE: Record<string, string> = {
  whatsapp: 'badge-green',
  email: 'badge-blue',
  sms: 'badge-orange',
};

const TYPE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
};

const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

function extractPlaceholders(body: string): string[] {
  const matches: string[] = [];
  let match;
  const re = new RegExp(PLACEHOLDER_REGEX.source, 'g');
  while ((match = re.exec(body)) !== null) {
    if (!matches.includes(match[1])) matches.push(match[1]);
  }
  return matches;
}

const SAMPLE_DATA = {
  candidate_name: 'Mohammed Rafiq',
  job_title: 'Senior Welder',
  company_name: 'Al Rajhi Construction',
  interview_date: '15 April 2026',
};

const TYPE_FILTER_TABS = ['all', 'whatsapp', 'email', 'sms'];

interface TemplateFormData {
  name: string;
  type: 'whatsapp' | 'email' | 'sms';
  body: string;
  is_active: boolean;
}

const defaultForm: TemplateFormData = {
  name: '',
  type: 'whatsapp',
  body: '',
  is_active: true,
};

export default function MessageTemplates() {
  const [typeFilter, setTypeFilter] = useState('all');
  const { data: templates = [], isLoading } = useGetTemplatesQuery(
    typeFilter === 'all' ? undefined : { type: typeFilter }
  );

  const [createTemplate, { isLoading: creating }] = useCreateTemplateMutation();
  const [updateTemplate, { isLoading: updating }] = useUpdateTemplateMutation();
  const [previewTemplate] = usePreviewTemplateMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormData>(defaultForm);
  const [error, setError] = useState('');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm(defaultForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      type: t.type,
      body: t.body,
      is_active: t.is_active,
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, ...form }).unwrap();
      } else {
        await createTemplate(form).unwrap();
      }
      closeModal();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'An error occurred');
    }
  };

  const handlePreview = async (t: MessageTemplate) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewContent('');
    try {
      const result = await previewTemplate({ id: t.id, sample_data: SAMPLE_DATA }).unwrap();
      setPreviewContent(result.preview);
    } catch {
      setPreviewContent(t.body);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">{templates.length} templates</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={15} />
          New Template
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1.5">
        {TYPE_FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setTypeFilter(tab)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              typeFilter === tab
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {tab === 'all' ? 'All' : TYPE_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((t) => {
            const placeholders = extractPlaceholders(t.body);
            return (
              <div key={t.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 leading-tight">{t.name}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={TYPE_BADGE[t.type] || 'badge-gray'}>{TYPE_LABELS[t.type]}</span>
                    {t.is_active ? (
                      <span className="badge-green">Active</span>
                    ) : (
                      <span className="badge-gray">Inactive</span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{t.body}</p>

                {placeholders.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {placeholders.map((p) => (
                      <span key={p} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] font-mono rounded-md">
                        {`{{${p}}}`}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  <button
                    onClick={() => openEdit(t)}
                    className="btn-ghost text-xs py-1.5"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => handlePreview(t)}
                    className="btn-ghost text-xs py-1.5"
                  >
                    <Eye size={12} />
                    Preview
                  </button>
                </div>
              </div>
            );
          })}
          {templates.length === 0 && (
            <div className="col-span-2 card p-10 text-center text-gray-400">
              No templates found. Create your first template.
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Template Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <Select
                label="Type *"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'whatsapp' | 'email' | 'sms' })}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </Select>

              <div>
                <label className="form-label">Body *</label>
                <textarea
                  className="form-input resize-none"
                  rows={8}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Available placeholders: <span className="font-mono">{'{{candidate_name}}'}</span>,{' '}
                  <span className="font-mono">{'{{job_title}}'}</span>,{' '}
                  <span className="font-mono">{'{{company_name}}'}</span>,{' '}
                  <span className="font-mono">{'{{interview_date}}'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="tpl_is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="tpl_is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating || updating}>
                  {creating || updating ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Template Preview</h2>
              <button
                onClick={() => setPreviewOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600 mb-2">Sample data used:</p>
              {Object.entries(SAMPLE_DATA).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-mono text-gray-400">{`{{${k}}}`}</span>
                  <span className="text-gray-600">→ {v}</span>
                </div>
              ))}
            </div>

            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {previewContent}
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => setPreviewOpen(false)} className="btn-ghost">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
