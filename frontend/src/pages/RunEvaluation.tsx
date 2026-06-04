import { useEffect, useState, useRef } from 'react';
import { Play, CheckCircle, AlertCircle } from 'lucide-react';
import { modelsApi, testCasesApi, evaluationsApi } from '../services/api';
import type { LLMModel, TestCase, EvaluationRun, EvaluationResult } from '../types';
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
  const [liveResults, setLiveResults] = useState<EvaluationResult[]>([]);
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
    setLiveResults([]);

    try {
      const run = await evaluationsApi.run({
        name: runName.trim(),
        model_ids: selectedModels,
        category_filter: categoryFilter || undefined,
        temperature,
        max_tokens: maxTokens,
        evaluator_type: evaluatorType,
      });

      // Poll for completion and live results
      pollRef.current = setInterval(async () => {
        try {
          const updated = await evaluationsApi.get(run.id);
          setResult(updated);

          const results = await evaluationsApi.getResults(run.id);
          setLiveResults(results);

          if (updated.status === 'completed' || updated.status === 'failed') {
            clearInterval(pollRef.current);
            setRunning(false);
          }
        } catch (pollErr) {
          console.error('Error polling evaluation run:', pollErr);
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

  const totalTasks = selectedModels.length * filteredTestCases.length;
  const completedTasks = result ? (result.total_results ?? 0) : 0;
  const progressPercent = result?.status === 'completed'
    ? 100
    : (totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0);

  return (
    <div>
      <div className="page-header">
        <h1>Run Evaluation</h1>
        <p>Configure and execute a benchmark run across selected models</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
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
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                <span style={{ color: '#94a3b8' }}>Progress</span>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{progressPercent}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%`, transition: 'width 0.3s ease-out', animation: 'shimmer 2s linear infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #6366f1, #06b6d4, #6366f1)' }}
                />
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Processing {completedTasks} / {totalTasks} tasks...
              </p>

              {liveResults.length > 0 && (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-surface-600)', paddingTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#f1f5f9' }}>
                    Live Execution Feed
                  </h4>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    paddingRight: '0.25rem',
                  }}>
                    {[...liveResults].reverse().map((res) => {
                      const isError = res.response?.startsWith('ERROR:');
                      return (
                        <div
                          key={res.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 6,
                            background: 'var(--color-surface-800)',
                            borderLeft: `3px solid ${isError ? '#ef4444' : '#10b981'}`,
                            fontSize: '0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
                            <span style={{ fontWeight: 600 }}>{res.model_display_name || res.model_id}</span>
                            <span style={{ color: isError ? '#f87171' : '#34d399', fontWeight: 600 }}>
                              {isError ? 'Failed' : `Score: ${res.total_score?.toFixed(1) ?? 'N/A'}/5.0`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                            <span>Category: {res.test_case_category || 'general'}</span>
                            <span>{res.latency_ms ? `${(res.latency_ms / 1000).toFixed(2)}s` : ''}</span>
                          </div>
                          <div style={{ color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Q: {res.test_case_question || res.prompt}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {result && result.status === 'completed' && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
                <CheckCircle size={18} />
                <strong>Evaluation completed!</strong>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '0.25rem' }}>
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
