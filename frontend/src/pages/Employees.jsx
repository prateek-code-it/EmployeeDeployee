import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/Modal';

const EMPTY_FORM = { full_name: '', phone: '', email: '', post_id: '', monthly_salary: '' };

export default function Employees() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'company_head' || user?.role === 'super_admin';
  const canCreate = isAdmin || user?.role === 'supervisor';

  const [employees, setEmployees] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [credentialsResult, setCredentialsResult] = useState(null);

  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostName, setNewPostName] = useState('');
  const [savingPost, setSavingPost] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadPosts();
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

  async function loadPosts() {
    try {
      const res = await api.get('/posts');
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setCredentialsResult(null);
    setShowModal(true);
  }

  function openEditModal(emp) {
    setEditingId(emp.id);
    setForm({
      full_name: emp.full_name,
      phone: emp.phone || '',
      email: emp.email || '',
      post_id: emp.post_id || '',
      monthly_salary: emp.monthly_salary,
    });
    setFormError('');
    setCredentialsResult(null);
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...form, post_id: form.post_id || null };
      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
        setShowModal(false);
        loadEmployees();
      } else {
        const res = await api.post('/employees', payload);
        setCredentialsResult(res.data);
        loadEmployees();
      }
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

  async function handleAddPost(e) {
    e.preventDefault();
    if (!newPostName.trim()) return;
    setSavingPost(true);
    try {
      await api.post('/posts', { name: newPostName.trim() });
      setNewPostName('');
      loadPosts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add post');
    } finally {
      setSavingPost(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Employees</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">{employees.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowPostModal(true)}
              className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] underline"
            >
              Manage Posts
            </button>
          )}
          {canCreate && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition"
            >
              + Add Employee
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[var(--status-bad)] text-sm mb-4">{error}</p>}

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Emp Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Post</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Monthly Salary</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--ink-soft)]">No employees yet.</td></tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 mono text-[var(--ink-soft)]">{emp.emp_code || '—'}</td>
                  <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{emp.post_name || '—'}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)] mono">{emp.phone || '—'}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{emp.email || '—'}</td>
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
          {credentialsResult ? (
            <div>
              <div className="status-tag status-good w-full mb-4 py-2 justify-center">Employee created</div>
              <p className="text-sm mb-4">
                Login account auto-created for <strong>{credentialsResult.full_name}</strong>:
              </p>
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-md p-4 mb-4">
                <p className="text-sm mb-1"><span className="text-[var(--ink-soft)]">Employee Code:</span> <span className="mono font-semibold">{credentialsResult.emp_code}</span></p>
                <p className="text-sm mb-1"><span className="text-[var(--ink-soft)]">Login ID:</span> <span className="mono font-semibold">{credentialsResult.login.login_id}</span></p>
                <p className="text-sm"><span className="text-[var(--ink-soft)]">Temporary Password:</span> <span className="mono font-semibold">{credentialsResult.login.temp_password}</span></p>
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

              <label className="block text-sm font-medium mb-1.5">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              />

              <label className="block text-sm font-medium mb-1.5">Post / Job Title</label>
              <select
                value={form.post_id}
                onChange={(e) => setForm({ ...form, post_id: e.target.value })}
                className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              >
                <option value="">None</option>
                {posts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <label className="block text-sm font-medium mb-1.5">Monthly Salary (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={form.monthly_salary}
                onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
                className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              />

              {!editingId && (
                <p className="text-xs text-[var(--ink-soft)] mb-4">
                  A login account will be created automatically for this employee.
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Employee'}
              </button>
            </form>
          )}
        </Modal>
      )}

      {showPostModal && (
        <Modal title="Manage Posts" onClose={() => setShowPostModal(false)}>
          <form onSubmit={handleAddPost} className="mb-4">
            <label className="block text-sm font-medium mb-1.5">New Post / Job Title</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPostName}
                onChange={(e) => setNewPostName(e.target.value)}
                placeholder="e.g. Site Engineer"
                className="flex-1 px-3 py-2 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              />
              <button
                type="submit"
                disabled={savingPost}
                className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </form>
          <div className="border-t border-[var(--line)] pt-4">
            <p className="text-xs text-[var(--ink-soft)] mb-2">Existing posts</p>
            {posts.length === 0 ? (
              <p className="text-sm text-[var(--ink-soft)]">No posts yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {posts.map((p) => (
                  <span key={p.id} className="status-tag status-neutral">{p.name}</span>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
