import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { modelsApi } from '../services/api';
import type { LLMModel, LLMModelCreate } from '../types';
import { PROVIDERS } from '../types';

export default function Models() {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LLMModelCreate>({
    provider: 'openai',
    model_id: '',
    display_name: '',
    context_length: null,
    input_price_per_1m_tokens: null,
    output_price_per_1m_tokens: null,
    is_active: true,
  });

  const load = () => {
    modelsApi.list().then(setModels).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      provider: 'openai', model_id: '', display_name: '',
      context_length: null, input_price_per_1m_tokens: null,
      output_price_per_1m_tokens: null, is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await modelsApi.update(editingId, form);
    } else {
      await modelsApi.create(form);
    }
    resetForm();
    load();
  };

  const handleEdit = (m: LLMModel) => {
    setForm({
      provider: m.provider,
      model_id: m.model_id,
      display_name: m.display_name,
      context_length: m.context_length,
      input_price_per_1m_tokens: m.input_price_per_1m_tokens,
      output_price_per_1m_tokens: m.output_price_per_1m_tokens,
      is_active: m.is_active,
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this model?')) {
      await modelsApi.delete(id);
      load();
    }
  };

  const handleToggle = async (m: LLMModel) => {
    await modelsApi.update(m.id, { is_active: !m.is_active });
    load();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Models</h1>
          <p>Configure LLM models for evaluation</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} /> Add Model
        </button>
      </div>

      {/* Model Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
              {editingId ? 'Edit Model' : 'Add Model'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                  Provider
                </label>
                <select
                  className="input"
                  value={form.provider}
                  onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                  Model ID
                </label>
                <input
                  className="input"
                  placeholder="e.g. qwen/qwen-2.5-coder"
                  value={form.model_id}
                  onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                  Display Name
                </label>
                <input
                  className="input"
                  placeholder="e.g. Qwen 2.5 Coder"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                    Context Length
                  </label>
                  <input
                    className="input"
                    type="number"
                    placeholder="128000"
                    value={form.context_length ?? ''}
                    onChange={e => setForm(f => ({ ...f, context_length: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                    Input $/1M
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    placeholder="0.15"
                    value={form.input_price_per_1m_tokens ?? ''}
                    onChange={e => setForm(f => ({ ...f, input_price_per_1m_tokens: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                    Output $/1M
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    placeholder="0.60"
                    value={form.output_price_per_1m_tokens ?? ''}
                    onChange={e => setForm(f => ({ ...f, output_price_per_1m_tokens: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Models Table */}
      {loading ? (
        <div className="empty-state">Loading models...</div>
      ) : models.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>No models configured yet. Add your first model to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Provider</th>
                <th>Model ID</th>
                <th>Context</th>
                <th>Input $/1M</th>
                <th>Output $/1M</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500, color: '#e2e8f0' }}>{m.display_name}</td>
                  <td>
                    <span className="badge badge-primary">
                      {PROVIDERS.find(p => p.value === m.provider)?.label ?? m.provider}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{m.model_id}</td>
                  <td>{m.context_length ? m.context_length.toLocaleString() : '—'}</td>
                  <td>{m.input_price_per_1m_tokens != null ? `$${m.input_price_per_1m_tokens}` : '—'}</td>
                  <td>{m.output_price_per_1m_tokens != null ? `$${m.output_price_per_1m_tokens}` : '—'}</td>
                  <td>
                    <button
                      className={`btn btn-ghost btn-sm`}
                      onClick={() => handleToggle(m)}
                      title={m.is_active ? 'Active — click to disable' : 'Disabled — click to enable'}
                    >
                      {m.is_active ? (
                        <Power size={14} style={{ color: '#10b981' }} />
                      ) : (
                        <PowerOff size={14} style={{ color: '#64748b' }} />
                      )}
                      {m.is_active ? 'Active' : 'Off'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(m)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
