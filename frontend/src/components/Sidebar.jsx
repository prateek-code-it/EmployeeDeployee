import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', roles: ['super_admin', 'company_head', 'supervisor', 'employee'], exact: true },
  { to: '/companies', label: 'Companies', roles: ['super_admin'] },
  { to: '/employees', label: 'Employees', roles: ['company_head', 'supervisor'] },
  { to: '/projects', label: 'Projects', roles: ['super_admin', 'company_head', 'supervisor', 'employee'] },
  { to: '/bills', label: 'Bills & Inventory', roles: ['company_head', 'supervisor'] },
  { to: '/material', label: 'Material', roles: ['company_head', 'supervisor'] },
  { to: '/machinery', label: 'Machinery', roles: ['company_head', 'supervisor'] },
  { to: '/purchase', label: 'Purchase', roles: ['company_head', 'supervisor'] },
  { to: '/attendance', label: 'Attendance', roles: ['company_head', 'supervisor', 'employee'] },
  { to: '/salary', label: 'Salary', roles: ['company_head', 'supervisor', 'employee'] },
  { to: '/requests', label: 'Employee Requests', roles: ['company_head', 'supervisor'] },
  { to: '/chat', label: 'Messages', roles: ['company_head', 'supervisor', 'employee'] },
  { to: '/audit-log', label: 'Audit Log', roles: ['company_head'] },
  { to: '/users', label: 'Users', roles: ['company_head'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="w-56 shrink-0 bg-[var(--ink)] text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-8 h-8 rounded bg-[var(--accent)] flex items-center justify-center">
          <span className="font-[var(--font-display)] text-[var(--accent-ink)] text-sm font-bold">CM</span>
        </div>
        <span className="font-[var(--font-display)] font-bold text-lg tracking-wide">Site Manager</span>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium mb-1 transition ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-sm font-medium truncate">{user?.full_name}</p>
        <p className="text-xs text-white/50 capitalize mb-3">{user?.role}</p>
        <button
          onClick={logout}
          className="w-full text-sm px-3 py-1.5 rounded-md border border-white/20 hover:bg-white/10 transition"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
