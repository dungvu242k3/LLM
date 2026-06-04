import { useEffect, useState } from 'react';
import { Plus, Trash2, Upload, Filter } from 'lucide-react';
import { testCasesApi } from '../services/api';
import type { TestCase, TestCaseCreate } from '../types';
import { CATEGORIES, DIFFICULTIES } from '../types';

export default function TestCases() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [form, setForm] = useState<TestCaseCreate>({
    category: 'general',
    question: '',
    expected_answer: '',
    difficulty: 'medium',
    language: 'en',
    tags: [],
  });

  const load = () => {
    testCasesApi
      .list(filterCat ? { category: filterCat } : undefined)
      .then(setTestCases)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterCat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await testCasesApi.create(form);
    setForm({ category: 'general', question: '', expected_answer: '', difficulty: 'medium', language: 'en', tags: [] });
    setShowForm(false);
    load();
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text) as TestCaseCreate[];
        await testCasesApi.import(data);
        load();
      } catch {
        alert('Invalid JSON file format');
      }
    };
    input.click();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this test case?')) {
      await testCasesApi.delete(id);
      load();
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Test Cases</h1>
          <p>Manage benchmark questions and expected answers</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleImport}>
            <Upload size={16} /> Import JSON
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Test Case
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Filter size={16} style={{ color: '#64748b' }} />
        <select
          className="input"
          style={{ width: 200 }}
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
              Add Test Case
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>Difficulty</label>
                  <select className="input" value={form.difficulty ?? 'medium'} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>Language</label>
                  <select className="input" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    <option value="en">English</option>
                    <option value="vi">Tiếng Việt</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>Question</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  required
                  placeholder="Enter the test question / prompt..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>Expected Answer</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.expected_answer ?? ''}
                  onChange={e => setForm(f => ({ ...f, expected_answer: e.target.value }))}
                  placeholder="Reference answer for scoring..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>Tags (comma-separated)</label>
                <input
                  className="input"
                  value={(form.tags ?? []).join(', ')}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                  placeholder="math, reasoning, vietnamese"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="empty-state">Loading test cases...</div>
      ) : testCases.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>No test cases yet. Add or import test cases to start benchmarking.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Question</th>
                <th>Difficulty</th>
                <th>Language</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map(tc => (
                <tr key={tc.id}>
                  <td>
                    <span className="badge badge-info">{tc.category}</span>
                  </td>
                  <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tc.question}
                  </td>
                  <td>
                    <span className={`badge ${tc.difficulty === 'hard' ? 'badge-danger' : tc.difficulty === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                      {tc.difficulty ?? '—'}
                    </span>
                  </td>
                  <td>{tc.language.toUpperCase()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {(tc.tags ?? []).slice(0, 3).map(t => (
                        <span key={t} className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tc.id)}>
                      <Trash2 size={14} />
                    </button>
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
