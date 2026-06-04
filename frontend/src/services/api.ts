/* ===== API Service — centralized HTTP client for backend ===== */

import axios from 'axios';
import type {
  LLMModel,
  LLMModelCreate,
  TestCase,
  TestCaseCreate,
  EvaluationRun,
  EvaluationRunCreate,
  EvaluationResult,
  DashboardOverview,
  ModelComparison,
  CategoryBreakdown,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/* ---------- Models ---------- */
export const modelsApi = {
  list: () => api.get<LLMModel[]>('/models').then(r => r.data),
  get: (id: string) => api.get<LLMModel>(`/models/${id}`).then(r => r.data),
  create: (data: LLMModelCreate) => api.post<LLMModel>('/models', data).then(r => r.data),
  update: (id: string, data: Partial<LLMModelCreate>) => api.put<LLMModel>(`/models/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/models/${id}`),
};

/* ---------- Test Cases ---------- */
export const testCasesApi = {
  list: (params?: { category?: string; language?: string; difficulty?: string }) =>
    api.get<TestCase[]>('/test-cases', { params }).then(r => r.data),
  get: (id: string) => api.get<TestCase>(`/test-cases/${id}`).then(r => r.data),
  create: (data: TestCaseCreate) => api.post<TestCase>('/test-cases', data).then(r => r.data),
  import: (testCases: TestCaseCreate[]) =>
    api.post<TestCase[]>('/test-cases/import', { test_cases: testCases }).then(r => r.data),
  delete: (id: string) => api.delete(`/test-cases/${id}`),
};

/* ---------- Evaluations ---------- */
export const evaluationsApi = {
  run: (data: EvaluationRunCreate) => api.post<EvaluationRun>('/evaluations/run', data).then(r => r.data),
  list: () => api.get<EvaluationRun[]>('/evaluations').then(r => r.data),
  get: (id: string) => api.get<EvaluationRun>(`/evaluations/${id}`).then(r => r.data),
  getResults: (id: string, params?: { model_id?: string; category?: string }) =>
    api.get<EvaluationResult[]>(`/evaluations/${id}/results`, { params }).then(r => r.data),
  delete: (id: string) => api.delete(`/evaluations/${id}`),
};

/* ---------- Reports ---------- */
export const reportsApi = {
  downloadCsv: (evalId: string) =>
    api.get(`/reports/${evalId}/csv`, { responseType: 'blob' }).then(r => {
      const blob = new Blob([r.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eval_${evalId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }),
  downloadJson: (evalId: string) =>
    api.get(`/reports/${evalId}/json`).then(r => {
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eval_${evalId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }),
  getMarkdown: (evalId: string) =>
    api.get<string>(`/reports/${evalId}/markdown`).then(r => r.data),
  downloadMarkdown: (evalId: string) =>
    api.get(`/reports/${evalId}/markdown`, { responseType: 'blob' }).then(r => {
      const blob = new Blob([r.data], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eval_${evalId.slice(0, 8)}_report.md`;
      a.click();
      URL.revokeObjectURL(url);
    }),
};

/* ---------- Stats ---------- */
export const statsApi = {
  overview: () => api.get<DashboardOverview>('/stats/overview').then(r => r.data),
  modelComparison: () => api.get<ModelComparison[]>('/stats/model-comparison').then(r => r.data),
  categoryBreakdown: () => api.get<CategoryBreakdown[]>('/stats/category-breakdown').then(r => r.data),
};
