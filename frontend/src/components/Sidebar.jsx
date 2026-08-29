import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
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
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <aside
      className={`shrink-0 bg-[#1b2430] text-white flex flex-col h-screen sticky top-0 border-r border-white/10 transition-all duration-300 relative ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        type="button"
        className="absolute -right-3 top-6 bg-[var(--accent)] text-[#1b2430] rounded-full p-1 shadow-md hover:scale-110 transition-transform cursor-pointer z-10"
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Header / Logo */}
      <div className={`px-4 py-5 flex items-center border-b border-white/10 min-w-0 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[#1b2430] flex items-center justify-center shrink-0" title="EmployeeDeployee">
          <HardHat className="w-5 h-5" />
        </div>
        {!isCollapsed && (
          <span className="font-[var(--font-display)] font-bold text-base tracking-wide text-white truncate">
            EmployeeDeployee
          </span>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2 rounded-md text-sm font-medium mb-1 transition ${
                  isCollapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive
                    ? 'bg-[var(--accent)] text-[#1b2430]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Controls */}
      <div className="px-3 py-4 border-t border-white/10">
        {/* Theme Toggle */}
        <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!isCollapsed && <span className="text-xs font-medium text-white/70 capitalize">{theme} Mode</span>}
          <button
            onClick={toggleTheme}
            type="button"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            className="relative w-10 h-5 rounded-full bg-white/10 border border-white/20 p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer shrink-0"
            aria-label="Toggle theme"
          >
            <div
              className={`w-4 h-4 rounded-full bg-[var(--accent)] text-[#1b2430] flex items-center justify-center shadow-md transform transition-transform duration-300 ${
                theme === 'light' ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {theme === 'light' ? (
                <Sun className="w-3 h-3 stroke-[2.5]" />
              ) : (
                <Moon className="w-3 h-3 stroke-[2.5]" />
              )}
            </div>
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <>
            <p className="text-sm font-medium truncate text-white">{user?.full_name}</p>
            <p className="text-xs text-white/50 capitalize mb-3">{user?.role?.replace('_', ' ')}</p>
          </>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          title={isCollapsed ? 'Log out' : undefined}
          className={`w-full flex items-center justify-center gap-2 text-sm py-1.5 rounded-md border border-white/20 hover:bg-white/10 transition text-white cursor-pointer ${
            isCollapsed ? 'px-0' : 'px-3'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
