import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="mb-1">Dashboard</h1>
      <p className="text-[var(--ink-soft)] text-sm mb-6">
        Welcome back, {user?.full_name}.
      </p>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-8 text-center">
        <p className="text-[var(--ink-soft)] text-sm">
          Summary stats (active projects, pending payments, today's attendance) coming up next.
        </p>
      </div>
    </div>
  );
}
