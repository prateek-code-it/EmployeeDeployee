import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-[var(--ink)] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl">Site Manager</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{user?.full_name}</p>
            <p className="text-xs text-white/60 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-md border border-white/20 hover:bg-white/10 transition"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="p-6">
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-8 text-center">
          <h2 className="mb-2">Welcome, {user?.full_name}</h2>
          <p className="text-[var(--ink-soft)] text-sm">
            You're logged in as <span className="capitalize font-medium">{user?.role}</span>.
            The full dashboard (employees, projects, bills, attendance, salary, chat) is coming up next.
          </p>
        </div>
      </main>
    </div>
  );
}
