import { useEffect, useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { evaluationsApi } from '../services/api';
import type { EvaluationRun, EvaluationResult } from '../types';

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span style={{ color: '#4a4a6a' }}>—</span>;
  const cls = score >= 4 ? 'score-high' : score >= 2.5 ? 'score-medium' : 'score-low';
  return <span className={cls} style={{ fontWeight: 600 }}>{score.toFixed(1)}</span>;
}

export default function Results() {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState('');
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModel, setFilterModel] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    evaluationsApi.list().then(r => {
      setRuns(r);
      if (r.length > 0) setSelectedRun(r[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    setLoading(true);
    evaluationsApi
      .getResults(selectedRun, {
        model_id: filterModel || undefined,
        category: filterCategory || undefined,
      })
      .then(setResults)
      .finally(() => setLoading(false));
  }, [selectedRun, filterModel, filterCategory]);

  const uniqueModels = [...new Set(results.map(r => r.model_display_name).filter(Boolean))];
  const uniqueCategories = [...new Set(results.map(r => r.test_case_category).filter(Boolean))];

  return (
    <div>
      <div className="page-header">
        <h1>Results</h1>
        <p>Detailed evaluation results with scores and metrics</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={16} style={{ color: '#64748b' }} />
        <select className="input" style={{ width: 240 }} value={selectedRun} onChange={e => setSelectedRun(e.target.value)}>
          <option value="">Select Run</option>
          {runs.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
          ))}
        </select>
        <select className="input" style={{ width: 180 }} value={filterModel} onChange={e => setFilterModel(e.target.value)}>
          <option value="">All Models</option>
          {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="input" style={{ width: 160 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="empty-state">Loading results...</div>
      ) : results.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>No results found. Run an evaluation first.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Category</th>
                <th>Correct</th>
                <th>Relevance</th>
                <th>Reasoning</th>
                <th>Factuality</th>
                <th>Halluc.</th>
                <th>Total</th>
                <th>Latency</th>
                <th>Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <>
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.model_display_name ?? '—'}</td>
                    <td><span className="badge badge-info">{r.test_case_category ?? '—'}</span></td>
                    <td><ScoreCell score={r.correctness_score} /></td>
                    <td><ScoreCell score={r.relevance_score} /></td>
                    <td><ScoreCell score={r.reasoning_score} /></td>
                    <td><ScoreCell score={r.factuality_score} /></td>
                    <td><ScoreCell score={r.hallucination_score} /></td>
                    <td><ScoreCell score={r.total_score} /></td>
                    <td>{r.latency_ms ? `${r.latency_ms}ms` : '—'}</td>
                    <td>{r.estimated_cost != null ? `$${r.estimated_cost.toFixed(4)}` : '—'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      >
                        {expandedId === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={11} style={{ padding: '1rem 1.5rem', background: 'var(--color-surface-800)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                              Question
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#e2e8f0', background: 'var(--color-surface-700)', padding: '0.75rem', borderRadius: 8 }}>
                              {r.test_case_question ?? r.prompt}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
                              Response
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#e2e8f0', background: 'var(--color-surface-700)', padding: '0.75rem', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                              {r.response}
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                          Tokens: {r.input_tokens ?? 0} in / {r.output_tokens ?? 0} out
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
