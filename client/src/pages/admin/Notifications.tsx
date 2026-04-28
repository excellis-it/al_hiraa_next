import { useState } from 'react';
import { CheckCircle, Info, AlertTriangle, XCircle, Check, CheckCheck, Clock, Plane, FileText } from 'lucide-react';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '../../store/api/notificationsApi';

function relativeTime(dt: string) {
  const date = new Date(dt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'success':      return <CheckCircle size={16} className="text-emerald-500" />;
    case 'warning':      return <AlertTriangle size={16} className="text-amber-500" />;
    case 'error':        return <XCircle size={16} className="text-red-500" />;
    case 'contract_expiry': return <Clock size={16} className="text-orange-500" />;
    case 'follow_up':    return <Clock size={16} className="text-violet-500" />;
    case 'deployment':   return <Plane size={16} className="text-blue-600" />;
    case 'document':     return <FileText size={16} className="text-teal-500" />;
    default:             return <Info size={16} className="text-blue-500" />;
  }
}

export default function Notifications() {
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: notifResponse, isLoading } = useGetNotificationsQuery(
    unreadOnly ? { unread_only: true } : undefined
  );
  const notifications = notifResponse?.data ?? [];
  const { data: countData } = useGetUnreadCountQuery();
  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllReadMutation();

  const unreadCount = countData?.count ?? 0;

  const handleMarkRead = async (id: number) => {
    try {
      await markRead(id).unwrap();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
    } catch {
      // silent
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="btn-ghost text-sm"
          >
            {markingAll ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCheck size={15} />
            )}
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter toggle */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            !unreadOnly
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            unreadOnly
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          }`}
        >
          Unread only
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-600">You're all caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No notifications to show.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start gap-3 p-4 transition-all ${
                !n.is_read
                  ? 'border-l-4 border-l-blue-500 bg-blue-50/30'
                  : 'border-l-4 border-l-gray-200'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <TypeIcon type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${!n.is_read ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                  {n.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">{relativeTime(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors mt-0.5"
                  title="Mark as read"
                >
                  <Check size={13} />
                  Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
