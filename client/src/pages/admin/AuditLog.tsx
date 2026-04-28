import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useGetAuditLogQuery } from '../../store/api/auditApi';
import Select from '../../components/ui/Select';
import type { AuditLogEntry } from '../../store/api/auditApi';

function formatTime(dt: string) {
  const date = new Date(dt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = '';
  if (diffMins < 1) relative = 'just now';
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else relative = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const absolute = date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { relative, absolute };
}

const ACTION_BADGE: Record<string, string> = {
  created: 'badge-green',
  updated: 'badge-blue',
  deleted: 'badge-red',
};

function ChangesCell({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  if (!entry.old_value && !entry.new_value) return <span className="text-gray-300">—</span>;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        View
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {entry.old_value && (
            <div>
              <p className="font-semibold text-red-500 mb-1">Before</p>
              <pre className="bg-red-50 border border-red-100 rounded-lg p-2 overflow-auto max-h-32 text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(entry.old_value, null, 2)}
              </pre>
            </div>
          )}
          {entry.new_value && (
            <div>
              <p className="font-semibold text-emerald-600 mb-1">After</p>
              <pre className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 overflow-auto max-h-32 text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(entry.new_value, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');

  const { data, isLoading } = useGetAuditLogQuery({
    page,
    limit: 50,
    entity_type: entityType || undefined,
    action: action || undefined,
    user_id: userId || undefined,
  });

  const entries = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-400 mt-0.5">All system activity</p>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <input
          className="form-input w-44"
          placeholder="Entity type..."
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
        />
        <Select
          className="w-36"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        >
          <option value="">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
        </Select>
        <input
          className="form-input w-44"
          placeholder="User ID or name..."
          value={userId}
          onChange={(e) => { setUserId(e.target.value); setPage(1); }}
        />
        {(entityType || action || userId) && (
          <button
            className="btn-ghost text-xs"
            onClick={() => { setEntityType(''); setAction(''); setUserId(''); setPage(1); }}
          >
            Clear Filters
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{total} entries</span>
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
                <th className="table-th">Timestamp</th>
                <th className="table-th">User</th>
                <th className="table-th">Entity Type</th>
                <th className="table-th">Entity ID</th>
                <th className="table-th">Action</th>
                <th className="table-th">Changes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const { relative, absolute } = formatTime(entry.created_at);
                return (
                  <tr key={entry.id} className="hover:bg-gray-50/60 transition-colors align-top">
                    <td className="table-td">
                      <span className="font-medium text-gray-700">{relative}</span>
                      <br />
                      <span className="text-xs text-gray-400">{absolute}</span>
                    </td>
                    <td className="table-td text-gray-700">{entry.user_name}</td>
                    <td className="table-td">
                      <span className="badge-blue">{entry.entity_type}</span>
                    </td>
                    <td className="table-td font-mono text-xs text-gray-500">{entry.entity_id}</td>
                    <td className="table-td">
                      <span className={ACTION_BADGE[entry.action] || 'badge-gray'}>{entry.action}</span>
                    </td>
                    <td className="table-td max-w-xs">
                      <ChangesCell entry={entry} />
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-td text-center text-gray-400 py-10">
                    No audit log entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn-ghost text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
