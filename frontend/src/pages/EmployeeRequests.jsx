import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/Modal';

function statusClass(status) {
  if (status === 'approved') return 'status-good';
  if (status === 'pending') return 'status-warn';
  if (status === 'rejected') return 'status-bad';
  return 'status-neutral';
}

export default function EmployeeRequests() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'company_head' || user?.role === 'super_admin';
  const isSupervisor = user?.role === 'supervisor';

  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', trade_role: '', monthly_salary: '', project_id: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadRequests();
    if (isSupervisor) {
      api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
    }
  }, [filterStatus]);

  async function loadRequests() {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/employee-requests', { params });
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setForm({ full_name: '', phone: '', trade_role: '', monthly_salary: '', project_id: '' });
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/employee-requests', form);
      setShowModal(false);
      loadRequests();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id) {
    try {
      await api.post(`/employee-requests/${id}/approve`);
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    }
  }

  async function handleReject(id) {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await api.post(`/employee-requests/${id}/reject`, { rejection_reason: reason || '' });
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Employee Requests</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">{requests.length} requests</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {isSupervisor && (
            <button
              onClick={openModal}
              className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition"
            >
              + New Request
            </button>
          )}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Trade</th>
              <th className="px-4 py-3 font-medium">Salary</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Requested By</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--ink-soft)]">No requests yet.</td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 font-medium">{r.full_name}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{r.trade_role || '—'}</td>
                  <td className="px-4 py-3 mono">₹{parseFloat(r.monthly_salary).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{r.project_name || '—'}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{r.requested_by_name}</td>
                  <td className="px-4 py-3"><span className={`status-tag ${statusClass(r.status)}`}>{r.status}</span></td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(r.id)} className="text-[var(--status-good)] text-sm mr-3">Approve</button>
                          <button onClick={() => handleReject(r.id)} className="text-[var(--status-bad)] text-sm">Reject</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="New Employee Request" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Trade / Role</label>
            <input type="text" value={form.trade_role} onChange={(e) => setForm({ ...form, trade_role: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Monthly Salary (₹)</label>
            <input type="number" required min="0" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Project</label>
            <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none">
              <option value="">None</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
