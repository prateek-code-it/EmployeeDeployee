import { useState, useEffect } from 'react';
import api from '../lib/api';

const TABLE_LABELS = {
  employees: 'Employee',
  projects: 'Project',
  bills: 'Bill',
};

function actionClass(action) {
  if (action === 'create') return 'status-good';
  if (action === 'update') return 'status-warn';
  return 'status-bad'; // delete
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState('');

  useEffect(() => {
    loadLogs();
  }, [filterTable]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = {};
      if (filterTable) params.table_name = filterTable;
      const res = await api.get('/audit-log', { params });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function formatDetails(details) {
    if (!details) return '—';
    try {
      const entries = Object.entries(details).filter(([k]) => k !== 'action');
      return entries.map(([k, v]) => `${k}: ${v}`).join(', ') || '—';
    } catch {
      return '—';
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Audit Log</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">Most recent 200 actions across the system</p>
        </div>
        <select
          value={filterTable}
          onChange={(e) => setFilterTable(e.target.value)}
          className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]"
        >
          <option value="">All Tables</option>
          {Object.entries(TABLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Date &amp; Time</th>
              <th className="px-4 py-3 font-medium">Table</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Changed By</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">No activity recorded yet.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 mono text-[var(--ink-soft)]">
                    {new Date(log.created_at).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 capitalize">{TABLE_LABELS[log.table_name] || log.table_name}</td>
                  <td className="px-4 py-3">
                    <span className={`status-tag ${actionClass(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3">{log.changed_by_name || '—'}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)] text-xs">{formatDetails(log.details)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
