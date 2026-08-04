import { useState, useEffect } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: '', role: 'supervisor', employee_id: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [credentialsResult, setCredentialsResult] = useState(null);

  useEffect(() => {
    loadUsers();
    api.get('/employees').then((res) => setEmployees(res.data)).catch(console.error);
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setForm({ full_name: '', role: 'supervisor', employee_id: '' });
    setFormError('');
    setCredentialsResult(null);
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...form, employee_id: form.employee_id || null };
      const res = await api.post('/users', payload);
      setCredentialsResult(res.data);
      loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(u) {
    if (!confirm(`Deactivate ${u.full_name}'s account? They won't be able to log in.`)) return;
    try {
      await api.put(`/users/${u.id}/deactivate`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate user');
    }
  }

  async function handleReactivate(u) {
    try {
      await api.put(`/users/${u.id}/reactivate`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reactivate user');
    }
  }

  async function handleResetPassword(u) {
    if (!confirm(`Generate a new temporary password for ${u.full_name}?`)) return;
    try {
      const res = await api.put(`/users/${u.id}/reset-password`);
      alert(`New temporary password for ${u.full_name}:\n\n${res.data.temp_password}\n\nThey'll be asked to set a new password on next login.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Users</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">{users.length} login accounts</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition"
        >
          + Add User
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Login ID</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 mono">{u.login_id}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`status-tag ${u.is_active ? 'status-good' : 'status-neutral'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {u.must_reset_password && (
                      <span className="status-tag status-warn ml-1.5">Temp password</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'super_admin' && (
                      <>
                        <button onClick={() => handleResetPassword(u)} className="text-[var(--ink-soft)] hover:text-[var(--ink)] mr-3 text-sm">
                          Reset Password
                        </button>
                        {u.is_active ? (
                          <button onClick={() => handleDeactivate(u)} className="text-[var(--status-bad)] hover:brightness-90 text-sm">
                            Deactivate
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(u)} className="text-[var(--status-good)] hover:brightness-90 text-sm">
                            Reactivate
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add User" onClose={() => setShowModal(false)}>
          {credentialsResult ? (
            <div>
              <div className="status-tag status-good w-full mb-4 py-2 justify-center">Account created</div>
              <p className="text-sm mb-4">Share these login details with <strong>{credentialsResult.full_name}</strong>:</p>
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-md p-4 mb-4">
                <p className="text-sm mb-1"><span className="text-[var(--ink-soft)]">Login ID:</span> <span className="mono font-semibold">{credentialsResult.login_id}</span></p>
                <p className="text-sm"><span className="text-[var(--ink-soft)]">Temporary Password:</span> <span className="mono font-semibold">{credentialsResult.temp_password}</span></p>
              </div>
              <p className="text-xs text-[var(--ink-soft)] mb-4">They'll be asked to set their own password on first login.</p>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                type="text" required value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              />
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <select
                value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              >
                <option value="supervisor">Supervisor</option>
                <option value="employee">Employee</option>
              </select>
              <label className="block text-sm font-medium mb-1.5">Link to Employee record (optional)</label>
              <select
                value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              >
                <option value="">None</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <button
                type="submit" disabled={saving}
                className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60"
              >
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
