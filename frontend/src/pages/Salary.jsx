import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/Modal';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function statusClass(status) {
  if (status === 'paid') return 'status-good';
  if (status === 'partial') return 'status-warn';
  return 'status-bad'; // pending
}

export default function Salary() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'company_head' || user?.role === 'super_admin';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [salaries, setSalaries] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [selected, setSelected] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_mode: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadSalaries();
  }, [month, year]);

  async function loadSalaries() {
    setLoading(true);
    try {
      const res = await api.get('/salary', { params: { month, year } });
      setSalaries(res.data.salaries);
      setTotalPending(res.data.total_pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await api.post('/salary/generate', { month, year });
      alert(res.data.message);
      loadSalaries();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate salaries');
    } finally {
      setGenerating(false);
    }
  }

  async function openDetail(s) {
    try {
      const res = await api.get(`/salary/${s.id}`);
      setSelected(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  function openPayModal() {
    setPayForm({ amount: '', payment_mode: 'cash', notes: '' });
    setFormError('');
    setShowPayModal(true);
  }

  async function handlePaySubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post(`/salary/${selected.id}/payments`, payForm);
      setShowPayModal(false);
      await openDetail(selected);
      loadSalaries();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Salary</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">
            Total pending this period: <span className="font-semibold text-[var(--status-warn)]">₹{totalPending.toLocaleString('en-IN')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {isAdmin && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60"
            >
              {generating ? 'Generating...' : 'Generate Salaries'}
            </button>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Base Salary</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
              ) : salaries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">
                  No salary records for this period yet.{isAdmin ? ' Click "Generate Salaries" above.' : ''}
                </td></tr>
              ) : (
                salaries.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openDetail(s)}
                    className="border-b border-[var(--line)] last:border-0 cursor-pointer hover:bg-black/5"
                  >
                    <td className="px-4 py-3 font-medium">{s.employee_name}</td>
                    <td className="px-4 py-3 mono">₹{parseFloat(s.base_salary).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 mono">₹{parseFloat(s.total_paid).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 mono font-medium">₹{parseFloat(s.balance_due).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><span className={`status-tag ${statusClass(s.status)}`}>{s.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <button onClick={() => setSelected(null)} className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] mb-4">← Back to list</button>

          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-5 mb-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base">{selected.employee_name}</h3>
                <p className="text-sm text-[var(--ink-soft)]">{MONTHS[selected.pay_month - 1]} {selected.pay_year}</p>
              </div>
              <span className={`status-tag ${statusClass(selected.status)}`}>{selected.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-[var(--ink-soft)]">Base Salary</p>
                <p className="mono font-semibold">₹{parseFloat(selected.base_salary).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--ink-soft)]">Paid So Far</p>
                <p className="mono font-semibold">₹{parseFloat(selected.total_paid).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--ink-soft)]">Balance Due</p>
                <p className="mono font-semibold text-[var(--status-warn)]">₹{parseFloat(selected.balance_due).toLocaleString('en-IN')}</p>
              </div>
            </div>
            {isAdmin && selected.status !== 'paid' && (
              <button
                onClick={openPayModal}
                className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95"
              >
                Record Payment
              </button>
            )}
          </div>

          <h3 className="text-sm mb-2">Payment History</h3>
          {selected.transactions.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">No payments recorded yet.</p>
          ) : (
            <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {selected.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-4 py-2.5 mono text-[var(--ink-soft)]">{new Date(t.payment_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-2.5 mono font-medium">₹{parseFloat(t.amount).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-[var(--ink-soft)] capitalize">{t.payment_mode || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--ink-soft)]">{t.notes || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--ink-soft)]">{t.marked_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showPayModal && (
        <Modal title="Record Payment" onClose={() => setShowPayModal(false)}>
          <form onSubmit={handlePaySubmit}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Amount (₹)</label>
            <input type="number" required min="0" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Payment Mode</label>
            <select value={payForm.payment_mode} onChange={(e) => setPayForm({ ...payForm, payment_mode: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none">
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="other">Other</option>
            </select>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <input type="text" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" placeholder="Optional" />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
