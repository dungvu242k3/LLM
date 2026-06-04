/* ===== Shared Types for the LLM Evaluation Dashboard ===== */

export interface LLMModel {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  context_length: number | null;
  input_price_per_1m_tokens: number | null;
  output_price_per_1m_tokens: number | null;
  is_active: boolean;
  created_at: string;
}

export interface LLMModelCreate {
  provider: string;
  model_id: string;
  display_name: string;
  context_length?: number | null;
  input_price_per_1m_tokens?: number | null;
  output_price_per_1m_tokens?: number | null;
  is_active?: boolean;
}

export interface TestCase {
  id: string;
  category: string;
  question: string;
  expected_answer: string | null;
  difficulty: string | null;
  language: string;
  tags: string[] | null;
  rubric: Record<string, unknown> | null;
  created_at: string;
}

export interface TestCaseCreate {
  category: string;
  question: string;
  expected_answer?: string;
  difficulty?: string;
  language?: string;
  tags?: string[];
  rubric?: Record<string, unknown>;
}

export interface EvaluationRun {
  id: string;
  name: string;
  status: string;
  config: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  total_results: number | null;
}

export interface EvaluationRunCreate {
  name: string;
  model_ids: string[];
  test_case_ids?: string[];
  category_filter?: string;
  temperature?: number;
  max_tokens?: number;
  evaluator_type?: string;
}

export interface EvaluationResult {
  id: string;
  evaluation_run_id: string;
  model_id: string;
  test_case_id: string;
  prompt: string | null;
  response: string | null;
  relevance_score: number | null;
  correctness_score: number | null;
  reasoning_score: number | null;
  factuality_score: number | null;
  safety_score: number | null;
  hallucination_score: number | null;
  total_score: number | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  created_at: string;
  model_display_name?: string;
  model_provider?: string;
  test_case_category?: string;
  test_case_question?: string;
}

export interface DashboardOverview {
  models_count: number;
  test_cases_count: number;
  runs_count: number;
  best_model: { name: string; score: number } | null;
  cheapest_model: { name: string; cost: number } | null;
  fastest_model: { name: string; latency_ms: number } | null;
  recent_runs: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
  }>;
}

export interface ModelComparison {
  model_id: string;
  display_name: string;
  provider: string;
  avg_relevance: number | null;
  avg_correctness: number | null;
  avg_reasoning: number | null;
  avg_factuality: number | null;
  avg_safety: number | null;
  avg_hallucination: number | null;
  avg_total: number | null;
  avg_latency_ms: number | null;
  total_cost: number | null;
  total_tests: number;
}

export interface CategoryBreakdown {
  model: string;
  category: string;
  avg_score: number;
  test_count: number;
}

export const PROVIDERS = [
  { value: 'nine_router', label: '9Router' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
] as const;

export const CATEGORIES = [
  'general',
  'reasoning',
  'math',
  'code',
  'vietnamese',
  'factuality',
  'hallucination',
  'safety',
  'summarization',
] as const;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
