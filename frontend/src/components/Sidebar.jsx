import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HardHat,
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Receipt,
  Boxes,
  Truck,
  ShoppingCart,
  FileText,
  CalendarCheck,
  Banknote,
  FileQuestion,
  MessageSquare,
  History,
  UserCheck,
  LogOut
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'company_head', 'hr', 'supervisor', 'employee'], exact: true },
  { to: '/companies', label: 'Companies', icon: Building2, roles: ['super_admin'] },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['company_head', 'hr', 'supervisor'] },
  { to: '/projects', label: 'Projects', icon: Briefcase, roles: ['super_admin', 'company_head', 'supervisor', 'employee'] },
  { to: '/bills', label: 'Bills & Inventory', icon: Receipt, roles: ['company_head', 'supervisor'] },
  { to: '/material', label: 'Material', icon: Boxes, roles: ['company_head', 'supervisor'] },
  { to: '/machinery', label: 'Machinery', icon: Truck, roles: ['company_head', 'supervisor'] },
  { to: '/purchase', label: 'Purchase', icon: ShoppingCart, roles: ['company_head', 'supervisor'] },
  { to: '/dpr', label: 'Daily Reports', icon: FileText, roles: ['company_head', 'supervisor'] },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['company_head', 'supervisor', 'employee'] },
  { to: '/salary', label: 'Salary', icon: Banknote, roles: ['company_head', 'hr', 'supervisor', 'employee'] },
  { to: '/requests', label: 'Employee Requests', icon: FileQuestion, roles: ['company_head', 'hr', 'supervisor'] },
  { to: '/chat', label: 'Messages', icon: MessageSquare, roles: ['company_head', 'supervisor', 'employee'] },
  { to: '/audit-log', label: 'Audit Log', icon: History, roles: ['company_head', 'super_admin'] },
  { to: '/users', label: 'Users', icon: UserCheck, roles: ['company_head', 'hr', 'super_admin'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="w-56 shrink-0 bg-[var(--ink)] text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shrink-0">
          <HardHat className="w-5 h-5" />
        </div>
        <span className="font-[var(--font-display)] font-bold text-lg tracking-wide">EmployeeDeployee</span>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium mb-1 transition ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-sm font-medium truncate">{user?.full_name}</p>
        <p className="text-xs text-white/50 capitalize mb-3">{user?.role?.replace('_', ' ')}</p>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-sm px-3 py-1.5 rounded-md border border-white/20 hover:bg-white/10 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
