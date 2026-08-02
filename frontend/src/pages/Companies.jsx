import { useState, useEffect } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ company_name: '', head_full_name: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    setLoading(true);
    try {
      const res = await api.get('/companies');
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setForm({ company_name: '', head_full_name: '' });
    setFormError('');
    setResult(null);
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await api.post('/companies', form);
      setResult(res.data);
      loadCompanies();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(company) {
    if (!confirm(`Deactivate ${company.name}? Their users won't be able to log in.`)) return;
    try {
      await api.put(`/companies/${company.id}/deactivate`);
      loadCompanies();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate company');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Companies</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">{companies.length} companies on the platform</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition"
        >
          + Add Company
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Company Name</th>
              <th className="px-4 py-3 font-medium">Employees</th>
              <th className="px-4 py-3 font-medium">Projects</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">No companies yet.</td></tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.employee_count}</td>
                  <td className="px-4 py-3">{c.project_count}</td>
                  <td className="px-4 py-3">
                    <span className={`status-tag ${c.is_active ? 'status-good' : 'status-neutral'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.is_active && (
                      <button onClick={() => handleDeactivate(c)} className="text-[var(--status-bad)] hover:brightness-90 text-sm">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add Company" onClose={() => setShowModal(false)}>
          {result ? (
            <div>
              <div className="status-tag status-good w-full mb-4 py-2 justify-center">Company created</div>
              <p className="text-sm mb-4">
                <strong>{result.company.name}</strong> is set up. Share these login details with the Company Head:
              </p>
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-md p-4 mb-4">
                <p className="text-sm mb-1"><span className="text-[var(--ink-soft)]">Name:</span> {result.company_head.full_name}</p>
                <p className="text-sm mb-1"><span className="text-[var(--ink-soft)]">Login ID:</span> <span className="mono font-semibold">{result.company_head.login_id}</span></p>
                <p className="text-sm"><span className="text-[var(--ink-soft)]">Temporary Password:</span> <span className="mono font-semibold">{result.company_head.temp_password}</span></p>
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
              <label className="block text-sm font-medium mb-1.5">Company Name</label>
              <input
                type="text" required value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              />
              <label className="block text-sm font-medium mb-1.5">Company Head's Name</label>
              <input
                type="text" required value={form.head_full_name}
                onChange={(e) => setForm({ ...form, head_full_name: e.target.value })}
                className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              />
              <button
                type="submit" disabled={saving}
                className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60"
              >
                {saving ? 'Creating...' : 'Create Company'}
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
