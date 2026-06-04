import { useEffect, useState } from 'react';
import {
  Bot,
  FileText,
  Trophy,
  DollarSign,
  Zap,
  Clock,
  Trash2,
} from 'lucide-react';
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
import { statsApi, evaluationsApi } from '../services/api';
import type { DashboardOverview, ModelComparison } from '../types';

export default function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [comparison, setComparison] = useState<ModelComparison[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = (showLoading = true) => {
    if (showLoading) setLoading(true);
    Promise.all([
      statsApi.overview().catch(() => null),
      statsApi.modelComparison().catch(() => []),
    ]).then(([ov, comp]) => {
      setOverview(ov);
      setComparison(comp);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const handleDeleteRun = async (id: string) => {
    if (confirm('Are you sure you want to delete this evaluation run and all its results?')) {
      try {
        await evaluationsApi.delete(id);
        fetchData(false);
      } catch (err) {
        console.error('Error deleting evaluation run:', err);
        alert('Failed to delete evaluation run.');
      }
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Models Tested',
      value: overview?.models_count ?? 0,
      icon: Bot,
      color: '#6366f1',
    },
    {
      label: 'Test Cases',
      value: overview?.test_cases_count ?? 0,
      icon: FileText,
      color: '#06b6d4',
    },
    {
      label: 'Best Model',
      value: overview?.best_model?.name ?? '—',
      sub: overview?.best_model ? `Score: ${overview.best_model.score}` : undefined,
      icon: Trophy,
      color: '#10b981',
    },
    {
      label: 'Cheapest',
      value: overview?.cheapest_model?.name ?? '—',
      sub: overview?.cheapest_model ? `$${overview.cheapest_model.cost.toFixed(4)}` : undefined,
      icon: DollarSign,
      color: '#f59e0b',
    },
    {
      label: 'Fastest',
      value: overview?.fastest_model?.name ?? '—',
      sub: overview?.fastest_model ? `${overview.fastest_model.latency_ms}ms` : undefined,
      icon: Zap,
      color: '#8b5cf6',
    },
    {
      label: 'Eval Runs',
      value: overview?.runs_count ?? 0,
      icon: Clock,
      color: '#ec4899',
    },
  ];

  // Prepare radar chart data
  const radarData = comparison.length > 0
    ? [
        { metric: 'Relevance', ...Object.fromEntries(comparison.map(m => [m.display_name, m.avg_relevance ?? 0])) },
        { metric: 'Correctness', ...Object.fromEntries(comparison.map(m => [m.display_name, m.avg_correctness ?? 0])) },
        { metric: 'Reasoning', ...Object.fromEntries(comparison.map(m => [m.display_name, m.avg_reasoning ?? 0])) },
        { metric: 'Factuality', ...Object.fromEntries(comparison.map(m => [m.display_name, m.avg_factuality ?? 0])) },
        { metric: 'Safety', ...Object.fromEntries(comparison.map(m => [m.display_name, m.avg_safety ?? 0])) },
        { metric: 'Anti-Halluc.', ...Object.fromEntries(comparison.map(m => [m.display_name, m.avg_hallucination ?? 0])) },
      ]
    : [];

  const chartColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  // Prepare latency & cost bar data
  const latencyData = comparison.map(m => ({
    name: m.display_name,
    latency: m.avg_latency_ms ?? 0,
  }));

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your LLM evaluation benchmarks</p>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="stat-card animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>
                  {s.value}
                </div>
                {s.sub && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                    {s.sub}
                  </div>
                )}
              </div>
              <s.icon size={24} style={{ color: s.color, opacity: 0.7 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {comparison.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Radar Chart */}
          <div className="card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
              Model Comparison — Radar
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#32324a" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 5]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                {comparison.map((m, i) => (
                  <Radar
                    key={m.model_id}
                    name={m.display_name}
                    dataKey={m.display_name}
                    stroke={chartColors[i % chartColors.length]}
                    fill={chartColors[i % chartColors.length]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                <Tooltip
                  contentStyle={{
                    background: '#1e1e28',
                    border: '1px solid #32324a',
                    borderRadius: 8,
                    fontSize: '0.8125rem',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Latency Bar Chart */}
          <div className="card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
              Average Latency (ms)
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#32324a" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    background: '#1e1e28',
                    border: '1px solid #32324a',
                    borderRadius: 8,
                    fontSize: '0.8125rem',
                  }}
                />
                <Bar dataKey="latency" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Runs */}
      {overview?.recent_runs && overview.recent_runs.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
            Recent Evaluation Runs
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overview.recent_runs.map((run) => (
                  <tr key={run.id}>
                    <td style={{ fontWeight: 500, color: '#e2e8f0' }}>{run.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          run.status === 'completed'
                            ? 'badge-success'
                            : run.status === 'running'
                            ? 'badge-warning'
                            : run.status === 'failed'
                            ? 'badge-danger'
                            : 'badge-info'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td>{run.created_at ? new Date(run.created_at).toLocaleString() : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteRun(run.id)}
                        title="Delete evaluation run"
                        style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!overview?.runs_count && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Bot size={48} style={{ color: '#4a4a6a', marginBottom: '1rem' }} />
          <h3 style={{ color: '#94a3b8', margin: '0 0 0.5rem' }}>No evaluations yet</h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Add some models and test cases, then run your first evaluation!
          </p>
        </div>
      )}
    </div>
  );
}
