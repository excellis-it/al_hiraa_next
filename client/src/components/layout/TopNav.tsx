import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';
import { Bell, LogOut, ChevronDown, Users, Database, FileText } from 'lucide-react';
import type { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { useGetUnreadCountQuery } from '../../store/api/notificationsApi';

const ROLE_LABELS: Record<string, string> = {
  data_entry: 'Data Entry',
  recruiter: 'Recruiter',
  process_manager: 'Process Manager',
  manager: 'Manager',
  admin: 'Administrator',
};

const ROLE_COLORS: Record<string, string> = {
  data_entry: 'bg-violet-100 text-violet-700',
  recruiter: 'bg-blue-100 text-blue-700',
  process_manager: 'bg-amber-100 text-amber-700',
  manager: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-rose-100 text-rose-700',
};

export default function TopNav() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: unreadData } = useGetUnreadCountQuery(undefined, { skip: !user });
  const unreadCount = unreadData?.count ?? 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMenuOpen(false);
    dispatch(logout());
    navigate('/login');
  };

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const initials = user?.full_name
    ?.split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '';

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center">
        <img src="/logo.png" alt="Al-Hiraa" className="h-12 w-auto object-contain" />
      </div>

      {user && (
        <div className="flex items-center gap-2">
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
            onClick={() => navigate('/notifications')}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-gray-800 leading-tight">{user.full_name}</div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-60 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-800 truncate">{user.full_name}</div>
                  <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  <span className={`inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </div>

                {isAdmin && (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => go('/admin/users')}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Users size={15} className="text-gray-400" />
                      User Management
                    </button>
                    <button
                      type="button"
                      onClick={() => go('/admin/masters')}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Database size={15} className="text-gray-400" />
                      Master Data
                    </button>
                    <button
                      type="button"
                      onClick={() => go('/admin/audit-log')}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FileText size={15} className="text-gray-400" />
                      Audit Log
                    </button>
                  </div>
                )}

                <div className="border-t border-gray-100 py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
