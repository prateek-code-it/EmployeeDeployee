import { useState, useEffect } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

export default function DPR() {
  const [projects, setProjects] = useState([]);
  const [filterProject, setFilterProject] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({ project_id: '', report_date: '', work_summary: '', weather: '', manpower_count: '', notes: '' });
  const [photoFiles, setPhotoFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [filterProject]);

  async function loadEntries() {
    setLoading(true);
    try {
      const params = {};
      if (filterProject) params.project_id = filterProject;
      const res = await api.get('/dpr', { params });
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setForm({ project_id: filterProject || '', report_date: new Date().toISOString().slice(0, 10), work_summary: '', weather: '', manpower_count: '', notes: '' });
    setFormError('');
    setShowAddModal(true);
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/dpr', form);
      setShowAddModal(false);
      loadEntries();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save DPR');
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(entry) {
    try {
      const res = await api.get(`/dpr/${entry.id}`);
      setSelected(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  function openPhotoModal() {
    setPhotoFiles([]);
    setFormError('');
    setShowPhotoModal(true);
  }

  async function handlePhotoSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (photoFiles.length === 0) {
      setFormError('Please choose at least one photo');
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      Array.from(photoFiles).forEach((file) => data.append('photos', file));
      await api.post(`/dpr/${selected.id}/photos`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowPhotoModal(false);
      await openDetail(selected);
      loadEntries();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to upload photos');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Daily Progress Reports</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">{entries.length} reports</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition"
        >
          + New DPR
        </button>
      </div>

      <select
        value={filterProject}
        onChange={(e) => setFilterProject(e.target.value)}
        className="px-3 py-2 mb-4 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]"
      >
        <option value="">All Projects</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {!selected ? (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Weather</th>
                <th className="px-4 py-3 font-medium">Manpower</th>
                <th className="px-4 py-3 font-medium">Photos</th>
                <th className="px-4 py-3 font-medium">Submitted By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-soft)]">No reports yet.</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => openDetail(entry)}
                    className="border-b border-[var(--line)] last:border-0 cursor-pointer hover:bg-black/5"
                  >
                    <td className="px-4 py-3 mono">{new Date(entry.report_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">{entry.project_name}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{entry.weather || '—'}</td>
                    <td className="px-4 py-3">{entry.manpower_count ?? '—'}</td>
                    <td className="px-4 py-3">{entry.photo_count}</td>
                    <td className="px-4 py-3 text-[var(--ink-soft)]">{entry.submitted_by_name}</td>
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
                <h3 className="text-base">{selected.project_name}</h3>
                <p className="text-sm text-[var(--ink-soft)]">{new Date(selected.report_date).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="flex gap-3">
                {selected.weather && <span className="status-tag status-neutral">{selected.weather}</span>}
                {selected.manpower_count != null && <span className="status-tag status-good">{selected.manpower_count} workers</span>}
              </div>
            </div>
            <p className="text-sm mb-2">{selected.work_summary}</p>
            {selected.notes && <p className="text-sm text-[var(--ink-soft)]">{selected.notes}</p>}
            <p className="text-xs text-[var(--ink-soft)] mt-3">Submitted by {selected.submitted_by_name}</p>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm">Photo Gallery</h3>
            <button
              onClick={openPhotoModal}
              className="px-3 py-1.5 rounded-md border border-[var(--line)] text-sm hover:border-[var(--accent)]"
            >
              + Add Photos
            </button>
          </div>

          {selected.photos.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">No photos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {selected.photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setPreviewImage(`${API_BASE}${photo.image_path}`)}
                  className="aspect-square rounded-lg overflow-hidden border border-[var(--line)] hover:opacity-80"
                >
                  <img src={`${API_BASE}${photo.image_path}`} alt="DPR" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <Modal title="New Daily Progress Report" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Project</label>
            <select required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none">
              <option value="">Select a project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <label className="block text-sm font-medium mb-1.5">Work Summary</label>
            <textarea required rows={4} value={form.work_summary} onChange={(e) => setForm({ ...form, work_summary: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Weather</label>
                <input type="text" placeholder="e.g. Sunny" value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Manpower Count</label>
                <input type="number" min="0" value={form.manpower_count} onChange={(e) => setForm({ ...form, manpower_count: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
              </div>
            </div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none" />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Report'}
            </button>
          </form>
        </Modal>
      )}

      {showPhotoModal && (
        <Modal title="Add Photos" onClose={() => setShowPhotoModal(false)}>
          <form onSubmit={handlePhotoSubmit}>
            {formError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>}
            <label className="block text-sm font-medium mb-1.5">Photos (select multiple)</label>
            <input
              type="file" multiple accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhotoFiles(e.target.files)}
              className="w-full text-sm mb-6"
            />
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 disabled:opacity-60">
              {saving ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </Modal>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="DPR full size" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
