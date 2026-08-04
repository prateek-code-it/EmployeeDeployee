import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/Modal';

function statusTagClass(status) {
  if (status === 'active') return 'status-good';
  if (status === 'maintenance') return 'status-warn';
  if (status === 'breakdown') return 'status-bad';
  return 'status-neutral';
}

export default function Machinery() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'company_head' || user?.role === 'super_admin';

  const [equipmentList, setEquipmentList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [addForm, setAddForm] = useState({ name: '', equipment_type: '', asset_code: '', project_id: '' });
  const [fuelForm, setFuelForm] = useState({ quantity: '', cost: '', notes: '' });
  const [maintForm, setMaintForm] = useState({ description: '', cost: '', next_due_date: '' });
  const [breakdownForm, setBreakdownForm] = useState({ description: '' });

  useEffect(() => {
    loadEquipment();
    api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  async function loadEquipment() {
    setLoading(true);
    try {
      const res = await api.get('/equipment');
      setEquipmentList(res.data);
      if (!selectedId && res.data.length > 0) setSelectedId(res.data[0].id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function loadDetail(id) {
    try {
      const res = await api.get(`/equipment/${id}`);
      setDetail(res.data);
    } catch (err) { console.error(err); }
  }

  async function handleAddEquipment(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      const res = await api.post('/equipment', addForm);
      setShowAddModal(false);
      setAddForm({ name: '', equipment_type: '', asset_code: '', project_id: '' });
      await loadEquipment();
      setSelectedId(res.data.id);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add equipment');
    } finally { setSaving(false); }
  }

  async function handleAddFuel(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      await api.post(`/equipment/${selectedId}/fuel`, fuelForm);
      setShowFuelModal(false);
      setFuelForm({ quantity: '', cost: '', notes: '' });
      loadDetail(selectedId);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add fuel log');
    } finally { setSaving(false); }
  }

  async function handleAddMaintenance(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      await api.post(`/equipment/${selectedId}/maintenance`, maintForm);
      setShowMaintModal(false);
      setMaintForm({ description: '', cost: '', next_due_date: '' });
      loadDetail(selectedId);
      loadEquipment();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add maintenance log');
    } finally { setSaving(false); }
  }

  async function handleReportBreakdown(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      await api.post(`/equipment/${selectedId}/breakdowns`, breakdownForm);
      setShowBreakdownModal(false);
      setBreakdownForm({ description: '' });
      loadDetail(selectedId);
      loadEquipment();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to report breakdown');
    } finally { setSaving(false); }
  }

  async function handleResolveBreakdown(breakdownId) {
    try {
      await api.put(`/equipment/breakdowns/${breakdownId}/resolve`, {});
      loadDetail(selectedId);
      loadEquipment();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve breakdown');
    }
  }

  return (
    <div className="flex h-screen">
      <div className="w-72 shrink-0 border-r border-[var(--line)] bg-[var(--surface)] flex flex-col">
        <div className="px-4 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <h2 className="text-base">Machinery</h2>
          {isAdmin && (
            <button
              onClick={() => { setFormError(''); setShowAddModal(true); }}
              className="text-xs px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold hover:brightness-95"
            >
              + New
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-sm text-[var(--ink-soft)] p-2">Loading...</p>
          ) : equipmentList.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)] p-2">No equipment yet.</p>
          ) : (
            equipmentList.map((eq) => (
              <div
                key={eq.id}
                onClick={() => setSelectedId(eq.id)}
                className={`px-3 py-2 rounded-md cursor-pointer text-sm mb-1 ${
                  selectedId === eq.id ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-medium' : 'hover:bg-black/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{eq.name}</span>
                </div>
                <span className={`status-tag ${statusTagClass(eq.status)} mt-1`} style={{ fontSize: '10px' }}>
                  {eq.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!detail ? (
          <p className="text-[var(--ink-soft)] text-sm">Select equipment from the list.</p>
        ) : (
          <>
            <div className="flex items-start justify-between mb-1">
              <h1>{detail.name}</h1>
              <span className={`status-tag ${statusTagClass(detail.status)}`}>{detail.status}</span>
            </div>
            <p className="text-[var(--ink-soft)] text-sm mb-6">
              {detail.equipment_type} {detail.asset_code && `· ${detail.asset_code}`} {detail.project_name && `· ${detail.project_name}`}
            </p>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setFormError(''); setShowFuelModal(true); }}
                className="px-3 py-1.5 rounded-md border border-[var(--line)] text-sm hover:border-[var(--accent)]"
              >
                + Log Fuel
              </button>
              <button
                onClick={() => { setFormError(''); setShowMaintModal(true); }}
                className="px-3 py-1.5 rounded-md border border-[var(--line)] text-sm hover:border-[var(--accent)]"
              >
                + Log Maintenance
              </button>
              <button
                onClick={() => { setFormError(''); setShowBreakdownModal(true); }}
                className="px-3 py-1.5 rounded-md border border-[var(--status-bad)] text-[var(--status-bad)] text-sm hover:brightness-90"
              >
                Report Breakdown
              </button>
            </div>

            {detail.breakdowns.filter((b) => !b.resolved).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm mb-2">Active Breakdowns</h3>
                <div className="space-y-2">
                  {detail.breakdowns.filter((b) => !b.resolved).map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-[var(--status-bad-bg)] rounded-md">
                      <div>
                        <p className="text-sm font-medium">{b.description}</p>
                        <p className="text-xs text-[var(--ink-soft)]">
                          {new Date(b.breakdown_date).toLocaleDateString('en-IN')} · reported by {b.reported_by_name}
                        </p>
                      </div>
                      <button
                        onClick={() => handleResolveBreakdown(b.id)}
                        className="text-xs px-2.5 py-1 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm mb-2">Fuel Logs</h3>
              {detail.fuel_logs.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">No fuel logs yet.</p>
              ) : (
                <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {detail.fuel_logs.map((f) => (
                        <tr key={f.id} className="border-b border-[var(--line)] last:border-0">
                          <td className="px-3 py-2 mono text-[var(--ink-soft)]">{new Date(f.fuel_date).toLocaleDateString('en-IN')}</td>
                          <td className="px-3 py-2 mono">{f.quantity} L</td>
                          <td className="px-3 py-2 mono">{f.cost ? `₹${parseFloat(f.cost).toLocaleString('en-IN')}` : '—'}</td>
                          <td className="px-3 py-2 text-[var(--ink-soft)]">{f.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-sm mb-2">Maintenance History</h3>
              {detail.maintenance_logs.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">No maintenance logged yet.</p>
              ) : (
                <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {detail.maintenance_logs.map((m) => (
                        <tr key={m.id} className="border-b border-[var(--line)] last:border-0">
                          <td className="px-3 py-2 mono text-[var(--ink-soft)]">{new Date(m.maintenance_date).toLocaleDateString('en-IN')}</td>
                          <td className="px-3 py-2">{m.description}</td>
                          <td className="px-3 py-2 mono">{m.cost ? `₹${parseFloat(m.cost).toLocaleString('en-IN')}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <Modal title="New Equipment" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddEquipment}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input type="text" required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <input type="text" placeholder="e.g. Excavator, Crane" value={addForm.equipment_type} onChange={(e) => setAddForm({ ...addForm, equipment_type: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Asset Code</label>
            <input type="text" value={addForm.asset_code} onChange={(e) => setAddForm({ ...addForm, asset_code: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Assigned Project</label>
            <select value={addForm.project_id} onChange={(e) => setAddForm({ ...addForm, project_id: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none">
              <option value="">Unassigned</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Add Equipment'}
            </button>
          </form>
        </Modal>
      )}

      {showFuelModal && (
        <Modal title="Log Fuel" onClose={() => setShowFuelModal(false)}>
          <form onSubmit={handleAddFuel}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Quantity (Liters)</label>
            <input type="number" required min="0" step="0.01" value={fuelForm.quantity} onChange={(e) => setFuelForm({ ...fuelForm, quantity: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Cost (₹)</label>
            <input type="number" min="0" value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <input type="text" value={fuelForm.notes} onChange={(e) => setFuelForm({ ...fuelForm, notes: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Log Fuel'}
            </button>
          </form>
        </Modal>
      )}

      {showMaintModal && (
        <Modal title="Log Maintenance" onClose={() => setShowMaintModal(false)}>
          <form onSubmit={handleAddMaintenance}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea required rows={3} value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Cost (₹)</label>
            <input type="number" min="0" value={maintForm.cost} onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Next Due Date</label>
            <input type="date" value={maintForm.next_due_date} onChange={(e) => setMaintForm({ ...maintForm, next_due_date: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <p className="text-xs text-[var(--ink-soft)] mb-4">Note: logging maintenance sets this equipment's status to "Maintenance".</p>
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Log Maintenance'}
            </button>
          </form>
        </Modal>
      )}

      {showBreakdownModal && (
        <Modal title="Report Breakdown" onClose={() => setShowBreakdownModal(false)}>
          <form onSubmit={handleReportBreakdown}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">What happened?</label>
            <textarea required rows={3} value={breakdownForm.description} onChange={(e) => setBreakdownForm({ ...breakdownForm, description: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--status-bad)] text-white font-semibold text-sm hover:brightness-90 disabled:opacity-60">
              {saving ? 'Reporting...' : 'Report Breakdown'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
