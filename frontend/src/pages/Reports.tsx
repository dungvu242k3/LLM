import { useEffect, useState } from 'react';
import { Download, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import { evaluationsApi, reportsApi } from '../services/api';
import type { EvaluationRun } from '../types';

export default function Reports() {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState('');
  const [mdPreview, setMdPreview] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    evaluationsApi.list().then(r => {
      const completed = r.filter(x => x.status === 'completed');
      setRuns(completed);
      if (completed.length > 0) setSelectedRun(completed[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    reportsApi.getMarkdown(selectedRun).then(setMdPreview).catch(() => setMdPreview(''));
  }, [selectedRun]);

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <p>Generate and export evaluation reports</p>
      </div>

      {/* Run Selector */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <select
          className="input"
          style={{ width: 320 }}
          value={selectedRun}
          onChange={e => setSelectedRun(e.target.value)}
        >
          <option value="">Select an evaluation run</option>
          {runs.map(r => (
            <option key={r.id} value={r.id}>
              {r.name} — {r.total_results ?? 0} results
            </option>
          ))}
        </select>

        {selectedRun && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => reportsApi.downloadCsv(selectedRun)}
            >
              <FileSpreadsheet size={16} /> CSV
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => reportsApi.downloadJson(selectedRun)}
            >
              <FileJson size={16} /> JSON
            </button>
            <button
              className="btn btn-primary"
              onClick={() => reportsApi.downloadMarkdown(selectedRun)}
            >
              <Download size={16} /> Markdown
            </button>
          </div>
        )}
      </div>

      {/* Markdown Preview */}
      {mdPreview ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
              Report Preview
            </h3>
            <span className="badge badge-success">
              <FileText size={12} style={{ marginRight: 4 }} /> Markdown
            </span>
          </div>
          <div
            style={{
              background: 'var(--color-surface-900)',
              border: '1px solid var(--color-surface-600)',
              borderRadius: 8,
              padding: '1.5rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              lineHeight: 1.7,
              color: '#cbd5e1',
              whiteSpace: 'pre-wrap',
              maxHeight: '600px',
              overflowY: 'auto',
            }}
          >
            {mdPreview}
          </div>
        </div>
      ) : selectedRun ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>Loading report preview...</p>
        </div>
      ) : loading ? (
        <div className="empty-state">Loading runs...</div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FileText size={48} style={{ color: '#4a4a6a', marginBottom: '1rem' }} />
          <h3 style={{ color: '#94a3b8', margin: '0 0 0.5rem' }}>No completed evaluations</h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Complete an evaluation run to generate reports.
          </p>
        </div>
      )}
    </div>
  );
}
