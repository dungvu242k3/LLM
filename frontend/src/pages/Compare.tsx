import { useEffect, useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { statsApi } from '../services/api';
import type { ModelComparison, CategoryBreakdown } from '../types';

const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function Compare() {
  const [comparison, setComparison] = useState<ModelComparison[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      statsApi.modelComparison(),
      statsApi.categoryBreakdown(),
    ]).then(([comp, cat]) => {
      setComparison(comp);
      setCategoryData(cat);
      setSelectedModels(comp.map(c => c.display_name));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = comparison.filter(c => selectedModels.includes(c.display_name));

  const radarData = filtered.length > 0
    ? [
        { metric: 'Relevance', ...Object.fromEntries(filtered.map(m => [m.display_name, m.avg_relevance ?? 0])) },
        { metric: 'Correctness', ...Object.fromEntries(filtered.map(m => [m.display_name, m.avg_correctness ?? 0])) },
        { metric: 'Reasoning', ...Object.fromEntries(filtered.map(m => [m.display_name, m.avg_reasoning ?? 0])) },
        { metric: 'Factuality', ...Object.fromEntries(filtered.map(m => [m.display_name, m.avg_factuality ?? 0])) },
        { metric: 'Safety', ...Object.fromEntries(filtered.map(m => [m.display_name, m.avg_safety ?? 0])) },
        { metric: 'Anti-Halluc.', ...Object.fromEntries(filtered.map(m => [m.display_name, m.avg_hallucination ?? 0])) },
      ]
    : [];

  // Aggregate category data for bar chart
  const categories = [...new Set(categoryData.map(c => c.category))];
  const catBarData = categories.map(cat => {
    const row: Record<string, unknown> = { category: cat };
    filtered.forEach(m => {
      const entry = categoryData.find(c => c.model === m.display_name && c.category === cat);
      row[m.display_name] = entry?.avg_score ?? 0;
    });
    return row;
  });

  const toggleModel = (name: string) => {
    setSelectedModels(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  if (loading) {
    return <div className="empty-state">Loading comparison data...</div>;
  }

  if (comparison.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Compare Models</h1>
          <p>Side-by-side comparison of evaluated models</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>No evaluation data yet. Run some evaluations first!</p>
        </div>
      </div>
    );
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (filtered.length >= 2) {
    const bestScore = filtered.reduce((a, b) => (a.avg_total ?? 0) > (b.avg_total ?? 0) ? a : b);
    const cheapest = filtered.reduce((a, b) => (a.total_cost ?? Infinity) < (b.total_cost ?? Infinity) ? a : b);
    const fastest = filtered.reduce((a, b) => (a.avg_latency_ms ?? Infinity) < (b.avg_latency_ms ?? Infinity) ? a : b);

    recommendations.push(`🏆 **${bestScore.display_name}** has the highest average score (${bestScore.avg_total?.toFixed(2)})`);
    if (cheapest.display_name !== bestScore.display_name)
      recommendations.push(`💰 **${cheapest.display_name}** is the most cost-effective ($${cheapest.total_cost?.toFixed(4)})`);
    if (fastest.display_name !== bestScore.display_name)
      recommendations.push(`⚡ **${fastest.display_name}** is the fastest (${fastest.avg_latency_ms}ms avg)`);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Compare Models</h1>
        <p>Side-by-side comparison of evaluated models</p>
      </div>

      {/* Model Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {comparison.map(m => (
          <button
            key={m.model_id}
            className={`btn btn-sm ${selectedModels.includes(m.display_name) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => toggleModel(m.display_name)}
          >
            {m.display_name}
          </button>
        ))}
      </div>

      {/* Summary Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
          Score Summary
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Provider</th>
                <th>Avg Score</th>
                <th>Correctness</th>
                <th>Reasoning</th>
                <th>Factuality</th>
                <th>Halluc.</th>
                <th>Latency</th>
                <th>Cost</th>
                <th>Tests</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.model_id}>
                  <td style={{ fontWeight: 500, color: '#e2e8f0' }}>{m.display_name}</td>
                  <td><span className="badge badge-primary">{m.provider}</span></td>
                  <td style={{ fontWeight: 600, color: (m.avg_total ?? 0) >= 4 ? '#34d399' : (m.avg_total ?? 0) >= 2.5 ? '#fbbf24' : '#f87171' }}>
                    {m.avg_total?.toFixed(2) ?? '—'}
                  </td>
                  <td>{m.avg_correctness?.toFixed(2) ?? '—'}</td>
                  <td>{m.avg_reasoning?.toFixed(2) ?? '—'}</td>
                  <td>{m.avg_factuality?.toFixed(2) ?? '—'}</td>
                  <td>{m.avg_hallucination?.toFixed(2) ?? '—'}</td>
                  <td>{m.avg_latency_ms ? `${m.avg_latency_ms}ms` : '—'}</td>
                  <td>{m.total_cost != null ? `$${m.total_cost.toFixed(4)}` : '—'}</td>
                  <td>{m.total_tests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Radar */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
            Multi-Criteria Comparison
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#32324a" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10, fill: '#64748b' }} />
              {filtered.map((m, i) => (
                <Radar
                  key={m.model_id}
                  name={m.display_name}
                  dataKey={m.display_name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
              <Tooltip contentStyle={{ background: '#1e1e28', border: '1px solid #32324a', borderRadius: 8, fontSize: '0.8125rem' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
            Score by Category
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={catBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#32324a" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e1e28', border: '1px solid #32324a', borderRadius: 8, fontSize: '0.8125rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
              {filtered.map((m, i) => (
                <Bar key={m.model_id} dataKey={m.display_name} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="card-glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
            Recommendations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{ fontSize: '0.9375rem', color: '#cbd5e1' }}>
                {rec.replace(/\*\*(.*?)\*\*/g, '$1')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
