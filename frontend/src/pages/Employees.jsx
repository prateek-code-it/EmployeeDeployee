import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/Modal';

const EMPTY_FORM = { full_name: '', phone: '', trade_role: '', monthly_salary: '' };

export default function Employees() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(emp) {
    setEditingId(emp.id);
    setForm({
      full_name: emp.full_name,
      phone: emp.phone || '',
      trade_role: emp.trade_role || '',
      monthly_salary: emp.monthly_salary,
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, form);
      } else {
        await api.post('/employees', form);
      }
      setShowModal(false);
      loadEmployees();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(emp) {
    if (!confirm(`Deactivate ${emp.full_name}? Their history will be kept.`)) return;
    try {
      await api.delete(`/employees/${emp.id}`);
      loadEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate employee');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Employees</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">{employees.length} total</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition"
          >
            + Add Employee
          </button>
        )}
      </div>

      {error && <p className="text-[var(--status-bad)] text-sm mb-4">{error}</p>}

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Trade</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Monthly Salary</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-soft)]">No employees yet.</td></tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{emp.trade_role || '—'}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)] mono">{emp.phone || '—'}</td>
                  <td className="px-4 py-3 mono">₹{parseFloat(emp.monthly_salary).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`status-tag ${emp.is_active ? 'status-good' : 'status-neutral'}`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="text-[var(--ink-soft)] hover:text-[var(--ink)] mr-3 text-sm"
                      >
                        Edit
                      </button>
                      {emp.is_active && (
                        <button
                          onClick={() => handleDeactivate(emp)}
                          className="text-[var(--status-bad)] hover:brightness-90 text-sm"
                        >
                          Deactivate
                        </button>
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
        <Modal title={editingId ? 'Edit Employee' : 'Add Employee'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>
            )}

            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <label className="block text-sm font-medium mb-1.5">Trade / Role</label>
            <input
              type="text"
              placeholder="e.g. Mason, Electrician"
              value={form.trade_role}
              onChange={(e) => setForm({ ...form, trade_role: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <label className="block text-sm font-medium mb-1.5">Monthly Salary (₹)</label>
            <input
              type="number"
              required
              min="0"
              value={form.monthly_salary}
              onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Employee'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
