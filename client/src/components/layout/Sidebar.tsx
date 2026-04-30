import { NavLink } from 'react-router';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  AlertCircle,
  Settings,
  Briefcase,
  ClipboardList,
  Building2,
  CalendarCheck,
  UserCog,
  MessageSquare,
  ScrollText,
  DollarSign,
  CreditCard,
  UserCheck,
  BarChart2,
  Plane,
  FileCheck,
} from 'lucide-react';
import type { RootState } from '../../store/store';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU: MenuSection[] = [
  {
    title: '',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard size={16} />,
        roles: ['data_entry', 'recruiter', 'process_manager', 'manager', 'admin'],
      },
    ],
  },
  {
    title: 'Data Entry',
    items: [
      {
        label: 'Register Candidate',
        path: '/data-entry/register',
        icon: <UserPlus size={16} />,
        roles: ['data_entry', 'manager', 'admin'],
      },
      {
        label: 'All Candidates',
        path: '/data-entry/candidates',
        icon: <Users size={16} />,
        roles: ['data_entry', 'recruiter', 'process_manager', 'manager', 'admin'],
      },
      {
        label: 'Incomplete Queue',
        path: '/data-entry/incomplete',
        icon: <AlertCircle size={16} />,
        roles: ['data_entry', 'manager', 'admin'],
      },
    ],
  },
  {
    title: 'Recruitment',
    items: [
      {
        label: 'Interviews',
        path: '/recruitment/interviews',
        icon: <CalendarCheck size={16} />,
        roles: ['recruiter', 'process_manager', 'manager', 'admin'],
      },
      {
        label: 'Process Management',
        path: '/process-module',
        icon: <FileCheck size={16} />,
        roles: ['process_manager', 'manager', 'admin'],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Overview',
        path: '/finance/overview',
        icon: '₹',
        roles: ['process_manager', 'manager', 'admin'],
      },
      {
        label: 'All Payments',
        path: '/finance/payments',
        icon: <CreditCard size={16} />,
        roles: ['process_manager', 'manager', 'admin'],
      },
      {
        label: 'Reports',
        path: '/finance/reports',
        icon: <BarChart2 size={16} />,
        roles: ['manager', 'admin'],
      },
    ],
  },
  {
    title: 'General',
    items: [
      {
        label: 'Associates',
        path: '/associates',
        icon: <UserCheck size={16} />,
        roles: ['manager', 'admin'],
      },
      {
        label: 'Deployed',
        path: '/deployed',
        icon: <Plane size={16} />,
        roles: ['process_manager', 'manager', 'admin'],
      },
    ],
  },
  {
    title: 'Reports',
    items: [
      {
        label: 'Analytics',
        path: '/analytics',
        icon: <BarChart2 size={16} />,
        roles: ['manager', 'admin'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Companies',
        path: '/recruitment/companies',
        icon: <Building2 size={16} />,
        roles: ['recruiter', 'process_manager', 'manager', 'admin'],
      },
      {
        label: 'Masters Config',
        path: '/admin/masters',
        icon: <Settings size={16} />,
        roles: ['admin'],
      },
      {
        label: 'User Management',
        path: '/admin/users',
        icon: <UserCog size={16} />,
        roles: ['admin'],
      },
      {
        label: 'Message Templates',
        path: '/admin/message-templates',
        icon: <MessageSquare size={16} />,
        roles: ['admin'],
      },
      {
        label: 'Audit Log',
        path: '/admin/audit-log',
        icon: <ScrollText size={16} />,
        roles: ['admin'],
      },
    ],
  },
];

export default function Sidebar() {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user) return null;

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col">
      <div className="flex-1 py-4 overflow-y-auto">
        {MENU.map((section) => {
          const visibleItems = section.items.filter((item) =>
            item.roles.includes(user.role),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-2">
              {section.title && (
                <div className="text-[10px] uppercase tracking-widest font-semibold text-gray-300 px-5 pt-4 pb-2">
                  {section.title}
                </div>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `mx-2 px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all mb-0.5 ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-200'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-white' : 'text-gray-400'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-center">
          <img src="/logo.png" alt="Al-Hiraa" className="h-10 w-auto object-contain" />
        </div>
      </div>
    </aside>
  );
}
