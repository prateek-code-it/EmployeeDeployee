import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Modal from '../components/Modal';

function buildTree(flatList) {
  const map = {};
  flatList.forEach((p) => (map[p.id] = { ...p, children: [] }));
  const roots = [];
  flatList.forEach((p) => {
    if (p.parent_project_id) {
      map[p.parent_project_id]?.children.push(map[p.id]);
    } else {
      roots.push(map[p.id]);
    }
  });
  return roots;
}

function TreeNode({ node, depth, selectedId, onSelect, expanded, toggleExpand }) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        className={`flex items-center gap-1.5 py-1.5 pr-2 rounded-md cursor-pointer text-sm ${
          selectedId === node.id ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-medium' : 'hover:bg-black/5'
        }`}
      >
        {hasChildren ? (
          <span
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            className="w-4 h-4 flex items-center justify-center text-xs shrink-0"
          >
            {isExpanded ? '▾' : '▸'}
          </span>
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          expanded={expanded}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
}

const EMPTY_FORM = { name: '', description: '', client_name: '', tender_reference: '', parent_project_id: '' };

export default function Projects() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'company_head' || user?.role === 'super_admin';

  const [projects, setProjects] = useState([]);
  const [tree, setTree] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
      setTree(buildTree(res.data));
      if (!selectedId && res.data.length > 0) {
        const topLevel = res.data.find((p) => !p.parent_project_id);
        if (topLevel) setSelectedId(topLevel.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id) {
    try {
      const res = await api.get(`/projects/${id}`);
      setSelectedDetail(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openCreateModal(parentId = '') {
    setForm({ ...EMPTY_FORM, parent_project_id: parentId });
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...form, parent_project_id: form.parent_project_id || null };
      const res = await api.post('/projects', payload);
      setShowModal(false);
      await loadProjects();
      setSelectedId(res.data.id);
      if (form.parent_project_id) {
        setExpanded((prev) => new Set(prev).add(parseInt(form.parent_project_id, 10)));
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen">
      <div className="w-72 shrink-0 border-r border-[var(--line)] bg-[var(--surface)] flex flex-col">
        <div className="px-4 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <h2 className="text-base">Projects</h2>
          {isAdmin && (
            <button
              onClick={() => openCreateModal()}
              className="text-xs px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold hover:brightness-95"
            >
              + New
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-sm text-[var(--ink-soft)] p-2">Loading...</p>
          ) : tree.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)] p-2">No projects yet.</p>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                onSelect={setSelectedId}
                expanded={expanded}
                toggleExpand={toggleExpand}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selectedDetail ? (
          <p className="text-[var(--ink-soft)] text-sm">Select a project from the tree.</p>
        ) : (
          <>
            <div className="flex items-start justify-between mb-1">
              <h1>{selectedDetail.name}</h1>
              <span className={`status-tag ${
                selectedDetail.status === 'ongoing' ? 'status-good' :
                selectedDetail.status === 'completed' ? 'status-neutral' :
                selectedDetail.status === 'on_hold' ? 'status-warn' : 'status-bad'
              }`}>
                {selectedDetail.status.replace('_', ' ')}
              </span>
            </div>
            {selectedDetail.client_name && (
              <p className="text-[var(--ink-soft)] text-sm mb-6">{selectedDetail.client_name}</p>
            )}

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-4">
                <p className="text-xs text-[var(--ink-soft)] mb-1">Total Spend</p>
                <p className="text-xl font-semibold mono">₹{selectedDetail.total_spend.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-4">
                <p className="text-xs text-[var(--ink-soft)] mb-1">Progress</p>
                <p className="text-xl font-semibold">{selectedDetail.progress_percent}%</p>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-4">
                <p className="text-xs text-[var(--ink-soft)] mb-1">Team</p>
                <p className="text-xl font-semibold">{selectedDetail.employees.length}</p>
              </div>
            </div>

            {selectedDetail.description && (
              <div className="mb-6">
                <h3 className="text-sm mb-1.5">Description</h3>
                <p className="text-sm text-[var(--ink-soft)]">{selectedDetail.description}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm">Sub-projects</h3>
                {isAdmin && (
                  <button
                    onClick={() => openCreateModal(selectedDetail.id)}
                    className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] underline"
                  >
                    + Add sub-project
                  </button>
                )}
              </div>
              {selectedDetail.children.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">No sub-projects.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedDetail.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedId(child.id)}
                      className="block w-full text-left px-3 py-2 rounded-md border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] text-sm"
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-sm mb-2">Team on this project</h3>
              {selectedDetail.employees.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">No one assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedDetail.employees.map((emp) => (
                    <span key={emp.id} className="status-tag status-neutral">{emp.full_name}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <Modal title={form.parent_project_id ? 'Add Sub-project' : 'New Project (Tender)'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="status-tag status-bad w-full mb-4 py-2 justify-center">{formError}</div>
            )}

            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <label className="block text-sm font-medium mb-1.5">Client Name</label>
            <input
              type="text"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <label className="block text-sm font-medium mb-1.5">Tender Reference</label>
            <input
              type="text"
              value={form.tender_reference}
              onChange={(e) => setForm({ ...form, tender_reference: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <label className="block text-sm font-medium mb-1.5">Parent Project (leave blank for top-level tender)</label>
            <select
              value={form.parent_project_id}
              onChange={(e) => setForm({ ...form, parent_project_id: e.target.value })}
              className="w-full px-3 py-2 mb-4 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            >
              <option value="">— Top-level tender —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 mb-6 border border-[var(--line)] rounded-md focus:border-[var(--accent)] outline-none"
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:brightness-95 transition disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
