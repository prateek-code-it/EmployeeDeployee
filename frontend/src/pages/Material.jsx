import { useState, useEffect } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

const TABS = ['Stock', 'Receipts', 'Issues'];

export default function Material() {
  const [activeTab, setActiveTab] = useState('Stock');
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  const [stock, setStock] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [receiptForm, setReceiptForm] = useState({ material_id: '', quantity: '', vendor_name: '', receipt_date: '' });
  const [issueForm, setIssueForm] = useState({ material_id: '', quantity: '', issued_to: '', issue_date: '' });
  const [materialForm, setMaterialForm] = useState({ name: '', unit: 'bag', category: '' });

  useEffect(() => {
    api.get('/projects').then((res) => {
      setProjects(res.data);
      const first = res.data.find((p) => !p.parent_project_id);
      if (first) setSelectedProject(String(first.id));
    }).catch(console.error);
    loadMaterials();
  }, []);

  useEffect(() => {
    if (selectedProject) loadData();
  }, [selectedProject, activeTab]);

  async function loadMaterials() {
    try {
      const res = await api.get('/materials');
      setMaterials(res.data);
    } catch (err) { console.error(err); }
  }

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'Stock') {
        const res = await api.get('/materials/stock', { params: { project_id: selectedProject } });
        setStock(res.data);
      } else if (activeTab === 'Receipts') {
        const res = await api.get('/materials/receipts', { params: { project_id: selectedProject } });
        setReceipts(res.data);
      } else {
        const res = await api.get('/materials/issues', { params: { project_id: selectedProject } });
        setIssues(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMaterial(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/materials', materialForm);
      setShowMaterialModal(false);
      setMaterialForm({ name: '', unit: 'bag', category: '' });
      loadMaterials();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add material');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddReceipt(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/materials/receipts', { ...receiptForm, project_id: selectedProject });
      setShowReceiptModal(false);
      setReceiptForm({ material_id: '', quantity: '', vendor_name: '', receipt_date: '' });
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add receipt');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddIssue(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/materials/issues', { ...issueForm, project_id: selectedProject });
      setShowIssueModal(false);
      setIssueForm({ material_id: '', quantity: '', issued_to: '', issue_date: '' });
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add issue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1>Material</h1>
        <button
          onClick={() => { setFormError(''); setShowMaterialModal(true); }}
          className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] underline"
        >
          + New material type
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]"
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex gap-1 bg-[var(--surface)] border border-[var(--line)] rounded-md p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                activeTab === tab ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {activeTab === 'Receipts' && (
          <button
            onClick={() => { setFormError(''); setShowReceiptModal(true); }}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95"
          >
            + Add Receipt
          </button>
        )}
        {activeTab === 'Issues' && (
          <button
            onClick={() => { setFormError(''); setShowIssueModal(true); }}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95"
          >
            + Add Issue
          </button>
        )}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        {activeTab === 'Stock' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
              ) : stock.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">No stock movement yet for this project.</td></tr>
              ) : (
                stock.map((row) => (
                  <tr key={row.material_id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 font-medium">{row.material_name}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{row.unit}</td>
                    <td className="px-4 py-3 mono">{parseFloat(row.total_in).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 mono">{parseFloat(row.total_out).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 mono font-semibold">{parseFloat(row.balance).toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'Receipts' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Received By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
              ) : receipts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">No receipts yet.</td></tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 mono text-[var(--ink-soft)]">{new Date(r.receipt_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium">{r.material_name}</td>
                    <td className="px-4 py-3 mono">{parseFloat(r.quantity).toLocaleString('en-IN')} {r.unit}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{r.vendor_name || '—'}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{r.received_by_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'Issues' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Issued To</th>
                <th className="px-4 py-3 font-medium">Issued By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
              ) : issues.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">No issues yet.</td></tr>
              ) : (
                issues.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 mono text-[var(--ink-soft)]">{new Date(r.issue_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium">{r.material_name}</td>
                    <td className="px-4 py-3 mono">{parseFloat(r.quantity).toLocaleString('en-IN')} {r.unit}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{r.issued_to || '—'}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{r.issued_by_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showMaterialModal && (
        <Modal title="New Material Type" onClose={() => setShowMaterialModal(false)}>
          <form onSubmit={handleAddMaterial}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text" required value={materialForm.name}
              onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              placeholder="e.g. Cement, Steel Rod 12mm"
            />
            <label className="block text-sm font-medium mb-1.5">Unit</label>
            <select
              value={materialForm.unit}
              onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            >
              {['bag', 'ton', 'kg', 'cft', 'nos', 'ltr', 'meter'].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <input
              type="text" value={materialForm.category}
              onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              placeholder="e.g. Cement, Steel, Electrical"
            />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Add Material Type'}
            </button>
          </form>
        </Modal>
      )}

      {showReceiptModal && (
        <Modal title="Add Material Receipt" onClose={() => setShowReceiptModal(false)}>
          <form onSubmit={handleAddReceipt}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Material</label>
            <select
              required value={receiptForm.material_id}
              onChange={(e) => setReceiptForm({ ...receiptForm, material_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            >
              <option value="">Select material</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </select>
            <label className="block text-sm font-medium mb-1.5">Quantity</label>
            <input
              type="number" required min="0" step="0.01" value={receiptForm.quantity}
              onChange={(e) => setReceiptForm({ ...receiptForm, quantity: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />
            <label className="block text-sm font-medium mb-1.5">Vendor Name</label>
            <input
              type="text" value={receiptForm.vendor_name}
              onChange={(e) => setReceiptForm({ ...receiptForm, vendor_name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input
              type="date" value={receiptForm.receipt_date}
              onChange={(e) => setReceiptForm({ ...receiptForm, receipt_date: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Add Receipt'}
            </button>
          </form>
        </Modal>
      )}

      {showIssueModal && (
        <Modal title="Add Material Issue" onClose={() => setShowIssueModal(false)}>
          <form onSubmit={handleAddIssue}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Material</label>
            <select
              required value={issueForm.material_id}
              onChange={(e) => setIssueForm({ ...issueForm, material_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            >
              <option value="">Select material</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </select>
            <label className="block text-sm font-medium mb-1.5">Quantity</label>
            <input
              type="number" required min="0" step="0.01" value={issueForm.quantity}
              onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />
            <label className="block text-sm font-medium mb-1.5">Issued To (work area / person)</label>
            <input
              type="text" value={issueForm.issued_to}
              onChange={(e) => setIssueForm({ ...issueForm, issued_to: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              placeholder="e.g. Foundation work"
            />
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input
              type="date" value={issueForm.issue_date}
              onChange={(e) => setIssueForm({ ...issueForm, issue_date: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Add Issue'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
