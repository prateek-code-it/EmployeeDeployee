import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-5">
      <p className="text-xs text-[var(--ink-soft)] mb-1.5">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? 'text-[var(--accent)]' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--ink-soft)] mt-1">{sub}</p>}
    </div>
  );
}

function actionClass(action) {
  if (action === 'create') return 'status-good';
  if (action === 'update') return 'status-warn';
  return 'status-bad';
}

const TABLE_LABELS = { employees: 'Employee', projects: 'Project', bills: 'Bill' };

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then((res) => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="mb-1">Dashboard</h1>
        <p className="text-[var(--ink-soft)] text-sm">Loading...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6">
        <h1 className="mb-1">Dashboard</h1>
        <p className="text-[var(--status-bad)] text-sm">Could not load dashboard data.</p>
      </div>
    );
  }

  const totalPresent = summary.today_attendance.present + summary.today_attendance.half_day;
  const totalMarked = Object.values(summary.today_attendance).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6">
      <h1 className="mb-1">Dashboard</h1>
      <p className="text-[var(--ink-soft)] text-sm mb-6">Welcome back, {user?.full_name}.</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Projects" value={summary.active_projects} />
        <StatCard label="Active Employees" value={summary.total_employees} />
        <StatCard
          label="Pending Salary"
          value={`₹${summary.pending_salary_amount.toLocaleString('en-IN')}`}
          accent={summary.pending_salary_amount > 0}
        />
        <StatCard
          label="Today's Attendance"
          value={totalMarked > 0 ? `${totalPresent}/${totalMarked}` : 'Not marked'}
          sub={totalMarked > 0 ? 'present of marked' : 'No attendance recorded today'}
        />
      </div>

      {(summary.pending_employee_requests > 0 || summary.pending_purchase_requests > 0) && (
        <div className="bg-[var(--status-warn-bg)] border border-[var(--status-warn)]/30 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-[var(--status-warn)]">Needs your attention</p>
          <ul className="text-sm text-[var(--ink)] mt-1 space-y-0.5">
            {summary.pending_employee_requests > 0 && (
              <li>{summary.pending_employee_requests} employee request{summary.pending_employee_requests > 1 ? 's' : ''} awaiting approval</li>
            )}
            {summary.pending_purchase_requests > 0 && (
              <li>{summary.pending_purchase_requests} purchase request{summary.pending_purchase_requests > 1 ? 's' : ''} awaiting approval</li>
            )}
          </ul>
        </div>
      )}

      <h3 className="text-sm mb-2">Recent Activity</h3>
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        {summary.recent_activity.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)] p-6 text-center">No activity yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {summary.recent_activity.map((log) => (
                <tr key={log.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-2.5 mono text-[var(--ink-soft)] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`status-tag ${actionClass(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5">{TABLE_LABELS[log.table_name] || log.table_name}</td>
                  <td className="px-4 py-2.5 text-[var(--ink-soft)]">{log.changed_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
