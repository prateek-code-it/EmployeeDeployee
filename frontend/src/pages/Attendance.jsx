import { useState, useEffect } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', cls: 'status-good' },
  { value: 'half_day', label: 'Half Day', cls: 'status-warn' },
  { value: 'leave', label: 'Leave', cls: 'status-neutral' },
  { value: 'absent', label: 'Absent', cls: 'status-bad' },
];

function statusClass(status) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.cls || 'status-neutral';
}

export default function Attendance() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');

  // Attendance sheet upload state
  const [sites, setSites] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [filterSite, setFilterSite] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ site_id: '', upload_date: '', notes: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [siteForm, setSiteForm] = useState({ name: '', address: '' });
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedProject) loadTeam(selectedProject);
    else { setTeamEmployees([]); setMarks({}); }
  }, [selectedProject]);

  useEffect(() => {
    loadHistory();
  }, [filterProject]);

  useEffect(() => {
    loadUploads();
  }, [filterSite]);

  async function loadTeam(projectId) {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setTeamEmployees(res.data.employees);
      const initialMarks = {};
      res.data.employees.forEach((e) => (initialMarks[e.id] = 'present'));
      setMarks(initialMarks);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const params = {};
      if (filterProject) params.project_id = filterProject;
      const res = await api.get('/attendance', { params });
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadSites() {
    try {
      const res = await api.get('/sites');
      setSites(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadUploads() {
    setUploadsLoading(true);
    try {
      const params = {};
      if (filterSite) params.site_id = filterSite;
      const res = await api.get('/attendance-uploads', { params });
      setUploads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadsLoading(false);
    }
  }

  function setMark(employeeId, status) {
    setMarks((prev) => ({ ...prev, [employeeId]: status }));
  }

  async function handleSaveAttendance() {
    setSaveMessage('');
    setSaving(true);
    try {
      const entries = teamEmployees.map((e) => ({ employee_id: e.id, status: marks[e.id] }));
      await api.post('/attendance/bulk', { project_id: selectedProject, attendance_date: date, entries });
      setSaveMessage('Attendance saved.');
      loadHistory();
    } catch (err) {
      setSaveMessage(err.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  function openUploadModal() {
    setUploadForm({ site_id: filterSite || '', upload_date: new Date().toISOString().slice(0, 10), notes: '' });
    setUploadFile(null);
    setUploadError('');
    setShowUploadModal(true);
  }

  async function handleUploadSubmit(e) {
    e.preventDefault();
    setUploadError('');
    if (!uploadFile) {
      setUploadError('Please choose a file to upload');
      return;
    }
    setUploadSaving(true);
    try {
      const data = new FormData();
      Object.entries(uploadForm).forEach(([key, val]) => data.append(key, val));
      data.append('file', uploadFile);
      await api.post('/attendance-uploads', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUploadModal(false);
      loadUploads();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload attendance sheet');
    } finally {
      setUploadSaving(false);
    }
  }

  async function handleAddSite(e) {
    e.preventDefault();
    setUploadError('');
    setUploadSaving(true);
    try {
      const res = await api.post('/sites', siteForm);
      setShowSiteModal(false);
      setSiteForm({ name: '', address: '' });
      await loadSites();
      setUploadForm((prev) => ({ ...prev, site_id: res.data.id }));
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to add site');
    } finally {
      setUploadSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6">Attendance</h1>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-5 mb-6">
        <h3 className="text-sm mb-4">Mark Attendance</h3>
        <div className="flex gap-3 mb-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-[var(--line)] rounded-md text-sm flex-1"
          >
            <option value="">Select a project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-[var(--line)] rounded-md text-sm"
          />
        </div>

        {selectedProject && teamEmployees.length === 0 && (
          <p className="text-sm text-[var(--ink-soft)]">No employees assigned to this project yet.</p>
        )}

        {teamEmployees.length > 0 && (
          <>
            <div className="space-y-2 mb-4">
              {teamEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between py-2 px-3 border border-[var(--line)] rounded-md">
                  <span className="text-sm font-medium">{emp.full_name}</span>
                  <div className="flex gap-1.5">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMark(emp.id, opt.value)}
                        className={`status-tag ${marks[emp.id] === opt.value ? opt.cls : 'status-neutral opacity-40'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {saveMessage && <p className="text-sm text-[var(--ink-soft)] mb-3">{saveMessage}</p>}

            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm">History</h3>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]"
        >
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--ink-soft)]">No attendance records yet.</td></tr>
            ) : (
              history.map((rec) => (
                <tr key={rec.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 mono text-[var(--ink-soft)]">
                    {new Date(rec.attendance_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-medium">{rec.employee_name}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{rec.project_name}</td>
                  <td className="px-4 py-3">
                    <span className={`status-tag ${statusClass(rec.status)}`}>
                      {rec.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm">Attendance Sheet Uploads</h3>
          <p className="text-xs text-[var(--ink-soft)] mt-0.5">Photo or PDF of the physical attendance register, per site.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="px-3 py-2 border border-[var(--line)] rounded-md text-sm bg-[var(--surface)]"
          >
            <option value="">All Sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={openUploadModal}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition"
          >
            + Upload
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Site</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Uploaded By</th>
              <th className="px-4 py-3 font-medium">File</th>
            </tr>
          </thead>
          <tbody>
            {uploadsLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">Loading...</td></tr>
            ) : uploads.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-soft)]">No uploads yet.</td></tr>
            ) : (
              uploads.map((u) => (
                <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 mono text-[var(--ink-soft)]">
                    {new Date(u.upload_date).toLocaleDateString('en-IN')}
                    <div className="text-xs text-[var(--ink-soft)]">{new Date(u.created_at).toLocaleTimeString('en-IN')}</div>
                  </td>
                  <td className="px-4 py-3">{u.site_name}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{u.notes || '—'}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{u.uploaded_by_name}</td>
                  <td className="px-4 py-3">
                    {u.file_type === 'image' ? (
                      <button onClick={() => setPreviewFile({ type: 'image', url: `${API_BASE}${u.file_path}` })}>
                        <img
                          src={`${API_BASE}${u.file_path}`}
                          alt="Attendance sheet"
                          className="w-10 h-10 object-cover rounded border border-[var(--line)] hover:opacity-80"
                        />
                      </button>
			) : (
 			 <a
			    href={`${API_BASE}${u.file_path}`}
			    target="_blank"
			    rel="noreferrer"
			    className="text-sm text-[var(--accent)] underline"
 			 >
		      View PDF
		      </a>
		    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showUploadModal && (
        <Modal title="Upload Attendance Sheet" onClose={() => setShowUploadModal(false)}>
          <form onSubmit={handleUploadSubmit}>
            {uploadError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{uploadError}</div>}

            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Site</label>
              <button
                type="button"
                onClick={() => { setUploadError(''); setShowSiteModal(true); }}
                className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] underline"
              >
                + New site
              </button>
            </div>
            <select
              required
              value={uploadForm.site_id}
              onChange={(e) => setUploadForm({ ...uploadForm, site_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            >
              <option value="">Select a site</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input
              type="date"
              value={uploadForm.upload_date}
              onChange={(e) => setUploadForm({ ...uploadForm, upload_date: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <input
              type="text"
              value={uploadForm.notes}
              onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
              placeholder="Optional"
            />

            <label className="block text-sm font-medium mb-1.5">File (image or PDF)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full text-sm mb-6"
            />

            <button
              type="submit"
              disabled={uploadSaving}
              className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
            >
              {uploadSaving ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </Modal>
      )}

      {showSiteModal && (
        <Modal title="New Site" onClose={() => setShowSiteModal(false)}>
          <form onSubmit={handleAddSite}>
            {uploadError && <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{uploadError}</div>}
            <label className="block text-sm font-medium mb-1.5">Site Name</label>
            <input
              type="text"
              required
              value={siteForm.name}
              onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <input
              type="text"
              value={siteForm.address}
              onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />
            <button
              type="submit"
              disabled={uploadSaving}
              className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
            >
              {uploadSaving ? 'Saving...' : 'Add Site'}
            </button>
          </form>
        </Modal>
      )}

      {previewFile && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewFile(null)}
        >
          <img src={previewFile.url} alt="Attendance sheet full size" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
