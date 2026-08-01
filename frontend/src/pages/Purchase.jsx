import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/Modal';

const TABS = ['Requests', 'Orders', 'Vendors'];

function prStatusClass(status) {
  if (status === 'approved') return 'status-good';
  if (status === 'pending') return 'status-warn';
  if (status === 'rejected') return 'status-bad';
  return 'status-neutral'; // converted
}

function poStatusClass(status) {
  if (status === 'open') return 'status-warn';
  if (status === 'partially_received') return 'status-warn';
  if (status === 'closed') return 'status-good';
  return 'status-bad'; // cancelled
}

export default function Purchase() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('Requests');
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [prs, setPrs] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPO, setSelectedPO] = useState(null);

  const [showPRModal, setShowPRModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [prForm, setPrForm] = useState({ project_id: '', description: '', estimated_cost: '' });
  const [poForm, setPoForm] = useState({ project_id: '', vendor_id: '', po_number: '', description: '', amount: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', contact_person: '', phone: '', email: '' });
  const [grnForm, setGrnForm] = useState({ description: '', notes: '' });

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
    loadVendors();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadVendors() {
    try {
      const res = await api.get('/vendors');
      setVendors(res.data);
    } catch (err) { console.error(err); }
  }

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'Requests') {
        const res = await api.get('/purchase/requests');
        setPrs(res.data);
      } else if (activeTab === 'Orders') {
        const res = await api.get('/purchase/orders');
        setPos(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPR(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      await api.post('/purchase/requests', prForm);
      setShowPRModal(false);
      setPrForm({ project_id: '', description: '', estimated_cost: '' });
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create purchase request');
    } finally { setSaving(false); }
  }

  async function handleApprovePR(id) {
    try {
      await api.post(`/purchase/requests/${id}/approve`);
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to approve'); }
  }

  async function handleRejectPR(id) {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await api.post(`/purchase/requests/${id}/reject`, { rejection_reason: reason || '' });
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to reject'); }
  }

  function openPOModalFromPR(pr) {
    setPoForm({
      project_id: String(pr.project_id), vendor_id: '', po_number: '',
      description: pr.description, amount: pr.estimated_cost || '', pr_id: pr.id,
    });
    setFormError('');
    setShowPOModal(true);
  }

  function openPOModal() {
    setPoForm({ project_id: '', vendor_id: '', po_number: '', description: '', amount: '' });
    setFormError('');
    setShowPOModal(true);
  }

  async function handleAddPO(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      await api.post('/purchase/orders', poForm);
      setShowPOModal(false);
      setActiveTab('Orders');
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create purchase order');
    } finally { setSaving(false); }
  }

  async function handleAddVendor(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      await api.post('/vendors', vendorForm);
      setShowVendorModal(false);
      setVendorForm({ name: '', contact_person: '', phone: '', email: '' });
      loadVendors();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add vendor');
    } finally { setSaving(false); }
  }

  async function openPODetail(po) {
    try {
      const res = await api.get(`/purchase/orders/${po.id}`);
      setSelectedPO(res.data);
    } catch (err) { console.error(err); }
  }

  async function handleAddGRN(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      await api.post('/purchase/grn', { ...grnForm, po_id: selectedPO.id });
      setShowGRNModal(false);
      setGrnForm({ description: '', notes: '' });
      await openPODetail(selectedPO);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to record GRN');
    } finally { setSaving(false); }
  }

  async function handleClosePO() {
    if (!confirm('Mark this PO as fully received and closed?')) return;
    try {
      await api.put(`/purchase/orders/${selectedPO.id}/close`, {});
      await openPODetail(selectedPO);
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to close PO'); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1>Purchase</h1>
        <button
          onClick={() => { setFormError(''); setShowVendorModal(true); }}
          className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] underline"
        >
          + New vendor
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-[var(--surface)] border border-[var(--line)] rounded-md p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedPO(null); }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                activeTab === tab ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {activeTab === 'Requests' && (
          <button
            onClick={() => { setPrForm({ project_id: '', description: '', estimated_cost: '' }); setFormError(''); setShowPRModal(true); }}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95"
          >
            + New Request
          </button>
        )}
        {activeTab === 'Orders' && (
          <button
            onClick={openPOModal}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95"
          >
            + New Order
          </button>
        )}
      </div>

      {activeTab === 'Requests' && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Est. Cost</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Requested By</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
              ) : prs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-soft)]">No purchase requests yet.</td></tr>
              ) : (
                prs.map((pr) => (
                  <tr key={pr.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3">{pr.project_name}</td>
                    <td className="px-4 py-3">{pr.description}</td>
                    <td className="px-4 py-3 mono">{pr.estimated_cost ? `₹${parseFloat(pr.estimated_cost).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="px-4 py-3"><span className={`status-tag ${prStatusClass(pr.status)}`}>{pr.status}</span></td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{pr.requested_by_name}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {pr.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprovePR(pr.id)} className="text-[var(--status-good)] text-sm mr-3">Approve</button>
                            <button onClick={() => handleRejectPR(pr.id)} className="text-[var(--status-bad)] text-sm mr-3">Reject</button>
                          </>
                        )}
                        {pr.status === 'approved' && (
                          <button onClick={() => openPOModalFromPR(pr)} className="text-[var(--accent)] text-sm underline">Convert to PO</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Orders' && !selectedPO && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-medium">PO Number</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
              ) : pos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">No purchase orders yet.</td></tr>
              ) : (
                pos.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() => openPODetail(po)}
                    className="border-b border-[var(--line)] last:border-0 cursor-pointer hover:bg-black/5"
                  >
                    <td className="px-4 py-3 mono">{po.po_number || '—'}</td>
                    <td className="px-4 py-3">{po.project_name}</td>
                    <td className="px-4 py-3">{po.vendor_name}</td>
                    <td className="px-4 py-3 mono">₹{parseFloat(po.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><span className={`status-tag ${poStatusClass(po.status)}`}>{po.status.replace('_', ' ')}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Orders' && selectedPO && (
        <div>
          <button onClick={() => setSelectedPO(null)} className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] mb-4">← Back to list</button>
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-5 mb-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-base">{selectedPO.po_number || `PO #${selectedPO.id}`}</h3>
                <p className="text-sm text-[var(--ink-soft)]">{selectedPO.project_name} · {selectedPO.vendor_name}</p>
              </div>
              <span className={`status-tag ${poStatusClass(selectedPO.status)}`}>{selectedPO.status.replace('_', ' ')}</span>
            </div>
            <p className="text-sm mb-1">{selectedPO.description}</p>
            <p className="text-sm mono font-semibold">₹{parseFloat(selectedPO.amount).toLocaleString('en-IN')}</p>

            {isAdmin && selectedPO.status !== 'closed' && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setFormError(''); setShowGRNModal(true); }}
                  className="px-3 py-1.5 rounded-md border border-[var(--line)] text-sm hover:border-[var(--accent)]"
                >
                  + Record GRN
                </button>
                <button
                  onClick={handleClosePO}
                  className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95"
                >
                  Mark Closed
                </button>
              </div>
            )}
          </div>

          <h3 className="text-sm mb-2">Goods Received (GRN)</h3>
          {selectedPO.grns.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">Nothing received yet.</p>
          ) : (
            <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {selectedPO.grns.map((g) => (
                    <tr key={g.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-3 py-2 mono text-[var(--ink-soft)]">{new Date(g.received_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2">{g.description}</td>
                      <td className="px-3 py-2 text-[var(--ink-soft)]">{g.received_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Vendors' && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact Person</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--ink-soft)]">No vendors yet.</td></tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 font-medium">{v.name}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{v.contact_person || '—'}</td>
                    <td className="px-4 py-3 mono">{v.phone || '—'}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{v.email || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showPRModal && (
        <Modal title="New Purchase Request" onClose={() => setShowPRModal(false)}>
          <form onSubmit={handleAddPR}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Project</label>
            <select required value={prForm.project_id} onChange={(e) => setPrForm({ ...prForm, project_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none">
              <option value="">Select a project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea required rows={3} value={prForm.description} onChange={(e) => setPrForm({ ...prForm, description: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Estimated Cost (₹)</label>
            <input type="number" min="0" value={prForm.estimated_cost} onChange={(e) => setPrForm({ ...prForm, estimated_cost: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </Modal>
      )}

      {showPOModal && (
        <Modal title="New Purchase Order" onClose={() => setShowPOModal(false)}>
          <form onSubmit={handleAddPO}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Project</label>
            <select required value={poForm.project_id} onChange={(e) => setPoForm({ ...poForm, project_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none">
              <option value="">Select a project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="block text-sm font-medium mb-1.5">Vendor</label>
            <select required value={poForm.vendor_id} onChange={(e) => setPoForm({ ...poForm, vendor_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none">
              <option value="">Select a vendor</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <label className="block text-sm font-medium mb-1.5">PO Number</label>
            <input type="text" value={poForm.po_number} onChange={(e) => setPoForm({ ...poForm, po_number: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" placeholder="e.g. PO-2026-002" />
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea required rows={3} value={poForm.description} onChange={(e) => setPoForm({ ...poForm, description: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Amount (₹)</label>
            <input type="number" required min="0" value={poForm.amount} onChange={(e) => setPoForm({ ...poForm, amount: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Order'}
            </button>
          </form>
        </Modal>
      )}

      {showVendorModal && (
        <Modal title="New Vendor" onClose={() => setShowVendorModal(false)}>
          <form onSubmit={handleAddVendor}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input type="text" required value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Contact Person</label>
            <input type="text" value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input type="text" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Add Vendor'}
            </button>
          </form>
        </Modal>
      )}

      {showGRNModal && (
        <Modal title="Record GRN" onClose={() => setShowGRNModal(false)}>
          <form onSubmit={handleAddGRN}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">What was received?</label>
            <textarea required rows={3} value={grnForm.description} onChange={(e) => setGrnForm({ ...grnForm, description: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <input type="text" value={grnForm.notes} onChange={(e) => setGrnForm({ ...grnForm, notes: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Record GRN'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
