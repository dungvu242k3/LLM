import { useEffect, useState, useRef } from 'react';
import { Play, CheckCircle, AlertCircle } from 'lucide-react';
import { modelsApi, testCasesApi, evaluationsApi } from '../services/api';
import type { LLMModel, TestCase, EvaluationRun } from '../types';
import { CATEGORIES } from '../types';

export default function RunEvaluation() {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [evaluatorType, setEvaluatorType] = useState('rule_based');
  const [runName, setRunName] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EvaluationRun | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    modelsApi.list().then(m => setModels(m.filter(x => x.is_active)));
    testCasesApi.list().then(setTestCases);
  }, []);

  const filteredTestCases = categoryFilter
    ? testCases.filter(tc => tc.category === categoryFilter)
    : testCases;

  const toggleModel = (id: string) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRun = async () => {
    if (!selectedModels.length) return setError('Select at least one model');
    if (!filteredTestCases.length) return setError('No test cases available');
    if (!runName.trim()) return setError('Enter a name for this run');

    setError('');
    setRunning(true);
    setResult(null);

    try {
      const run = await evaluationsApi.run({
        name: runName.trim(),
        model_ids: selectedModels,
        category_filter: categoryFilter || undefined,
        temperature,
        max_tokens: maxTokens,
        evaluator_type: evaluatorType,
      });

      // Poll for completion
      pollRef.current = setInterval(async () => {
        const updated = await evaluationsApi.get(run.id);
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(pollRef.current);
          setResult(updated);
          setRunning(false);
        }
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to start evaluation');
      setRunning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Run Evaluation</h1>
        <p>Configure and execute a benchmark run across selected models</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Configuration */}
        <div className="card">
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
            Configuration
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
              Run Name
            </label>
            <input
              className="input"
              placeholder="e.g. Benchmark Run #1"
              value={runName}
              onChange={e => setRunName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                Temperature
              </label>
              <input
                className="input"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                Max Tokens
              </label>
              <input
                className="input"
                type="number"
                min="1"
                max="16384"
                value={maxTokens}
                onChange={e => setMaxTokens(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                Evaluator
              </label>
              <select className="input" value={evaluatorType} onChange={e => setEvaluatorType(e.target.value)}>
                <option value="rule_based">Rule-based</option>
                <option value="llm_judge">LLM Judge</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                Category Filter
              </label>
              <select className="input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleRun}
            disabled={running}
          >
            {running ? (
              <>Running evaluation...</>
            ) : (
              <>
                <Play size={18} /> Run Evaluation
              </>
            )}
          </button>

          {running && (
            <div style={{ marginTop: '1rem' }}>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: '60%', animation: 'shimmer 2s linear infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #6366f1, #06b6d4, #6366f1)' }}
                />
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Processing {selectedModels.length} model(s) × {filteredTestCases.length} test case(s)...
              </p>
            </div>
          )}

          {result && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: result.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: result.status === 'completed' ? '#34d399' : '#f87171' }}>
                <CheckCircle size={18} />
                <strong>
                  {result.status === 'completed' ? 'Evaluation completed!' : 'Evaluation failed'}
                </strong>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '0.5rem 0 0' }}>
                {result.total_results} results saved. View them in the Results page.
              </p>
            </div>
          )}
        </div>

        {/* Right: Model Selection */}
        <div className="card">
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
            Select Models ({selectedModels.length} selected)
          </h3>

          {models.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              No active models found. Add models first.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {models.map(m => (
                <label
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: `1px solid ${selectedModels.includes(m.id) ? 'var(--color-primary-600)' : 'var(--color-surface-600)'}`,
                    background: selectedModels.includes(m.id) ? 'rgba(99,102,241,0.08)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(m.id)}
                    onChange={() => toggleModel(m.id)}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.875rem' }}>
                      {m.display_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {m.provider} · {m.model_id}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-surface-700)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              <strong style={{ color: '#e2e8f0' }}>Test Cases:</strong>{' '}
              {filteredTestCases.length} available
              {categoryFilter && ` (filtered: ${categoryFilter})`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
