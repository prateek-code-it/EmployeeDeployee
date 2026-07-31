import { useState, useEffect } from 'react';
import api from '../lib/api';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', cls: 'status-good' },
  { value: 'half_day', label: 'Half Day', cls: 'status-warn' },
  { value: 'leave', label: 'Leave', cls: 'status-neutral' },
  { value: 'absent', label: 'Absent', cls: 'status-bad' },
];

function statusClass(status) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.cls || 'status-neutral';
}

export default function Attendance() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProject) loadTeam(selectedProject);
    else { setTeamEmployees([]); setMarks({}); }
  }, [selectedProject]);

  useEffect(() => {
    loadHistory();
  }, [filterProject]);

  async function loadTeam(projectId) {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setTeamEmployees(res.data.employees);
      const initialMarks = {};
      res.data.employees.forEach((e) => (initialMarks[e.id] = 'present'));
      setMarks(initialMarks);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const params = {};
      if (filterProject) params.project_id = filterProject;
      const res = await api.get('/attendance', { params });
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function setMark(employeeId, status) {
    setMarks((prev) => ({ ...prev, [employeeId]: status }));
  }

  async function handleSaveAttendance() {
    setSaveMessage('');
    setSaving(true);
    try {
      const entries = teamEmployees.map((e) => ({ employee_id: e.id, status: marks[e.id] }));
      await api.post('/attendance/bulk', { project_id: selectedProject, attendance_date: date, entries });
      setSaveMessage('Attendance saved.');
      loadHistory();
    } catch (err) {
      setSaveMessage(err.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6">Attendance</h1>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-5 mb-6">
        <h3 className="text-sm mb-4">Mark Attendance</h3>
        <div className="flex gap-3 mb-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-[var(--line)] rounded-md text-sm flex-1"
          >
            <option value="">Select a project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-[var(--line)] rounded-md text-sm"
          />
        </div>

        {selectedProject && teamEmployees.length === 0 && (
          <p className="text-sm text-[var(--ink-soft)]">No employees assigned to this project yet.</p>
        )}

        {teamEmployees.length > 0 && (
          <>
            <div className="space-y-2 mb-4">
              {teamEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between py-2 px-3 border border-[var(--line)] rounded-md">
                  <span className="text-sm font-medium">{emp.full_name}</span>
                  <div className="flex gap-1.5">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMark(emp.id, opt.value)}
                        className={`status-tag ${marks[emp.id] === opt.value ? opt.cls : 'status-neutral opacity-40'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {saveMessage && <p className="text-sm text-[var(--ink-soft)] mb-3">{saveMessage}</p>}

            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm">History</h3>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]"
        >
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--ink-soft)]">No attendance records yet.</td></tr>
            ) : (
              history.map((rec) => (
                <tr key={rec.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 mono text-[var(--ink-soft)]">
                    {new Date(rec.attendance_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-medium">{rec.employee_name}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{rec.project_name}</td>
                  <td className="px-4 py-3">
                    <span className={`status-tag ${statusClass(rec.status)}`}>
                      {rec.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
