import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/Modal';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');
const BILL_TYPES = ['material', 'vendor', 'salary', 'misc'];

const EMPTY_FORM = {
  project_id: '', bill_type: 'material', description: '', vendor_name: '',
  amount: '', bill_date: '', payment_status: 'pending',
};

export default function Bills() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [bills, setBills] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterProject, setFilterProject] = useState('');
  const [filterType, setFilterType] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    loadBills();
  }, [filterProject, filterType]);

  async function loadBills() {
    setLoading(true);
    try {
      const params = {};
      if (filterProject) params.project_id = filterProject;
      if (filterType) params.bill_type = filterType;
      const res = await api.get('/bills', { params });
      setBills(res.data.bills);
      setTotalAmount(res.data.total_amount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setForm({ ...EMPTY_FORM, bill_date: new Date().toISOString().slice(0, 10) });
    setImageFile(null);
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, val]) => data.append(key, val));
      if (imageFile) data.append('image', imageFile);

      await api.post('/bills', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowModal(false);
      loadBills();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bill) {
    if (!confirm(`Delete this bill? "${bill.description}"`)) return;
    try {
      await api.delete(`/bills/${bill.id}`);
      loadBills();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete bill');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Bills & Inventory</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">
            {bills.length} entries · Total ₹{totalAmount.toLocaleString('en-IN')}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition"
        >
          + Add Bill
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]"
        >
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)] capitalize"
        >
          <option value="">All Types</option>
          {BILL_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Photo</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--ink-soft)]">No bills yet.</td></tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 text-[var(--ink-soft)] mono">
                    {new Date(bill.bill_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">{bill.project_name}</td>
                  <td className="px-4 py-3 capitalize">{bill.bill_type}</td>
                  <td className="px-4 py-3">{bill.description}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{bill.vendor_name || '—'}</td>
                  <td className="px-4 py-3 mono font-medium">₹{parseFloat(bill.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`status-tag ${bill.payment_status === 'paid' ? 'status-good' : 'status-warn'}`}>
                      {bill.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {bill.image_path ? (
                      <button onClick={() => setPreviewImage(`${API_BASE}${bill.image_path}`)}>
                        <img
                          src={`${API_BASE}${bill.image_path}`}
                          alt="Bill"
                          className="w-10 h-10 object-cover rounded border border-[var(--line)] hover:opacity-80"
                        />
                      </button>
                    ) : (
                      <span className="text-[var(--ink-soft)]">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(bill)}
                        className="text-[var(--status-bad)] hover:brightness-90 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add Bill" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>
            )}

            <label className="block text-sm font-medium mb-1.5">Project</label>
            <select
              required
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            >
              <option value="">Select a project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <label className="block text-sm font-medium mb-1.5">Type</label>
            <select
              value={form.bill_type}
              onChange={(e) => setForm({ ...form, bill_type: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none capitalize"
            >
              {BILL_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>

            <label className="block text-sm font-medium mb-1.5">Description</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <label className="block text-sm font-medium mb-1.5">Vendor Name</label>
            <input
              type="text"
              value={form.vendor_name}
              onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.bill_date}
                  onChange={(e) => setForm({ ...form, bill_date: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <label className="block text-sm font-medium mb-1.5">Payment Status</label>
            <select
              value={form.payment_status}
              onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>

            <label className="block text-sm font-medium mb-1.5">Photo of Bill (optional)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full text-sm mb-6"
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Add Bill'}
            </button>
          </form>
        </Modal>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="Bill full size" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
