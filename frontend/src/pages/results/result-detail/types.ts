export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface SampleResult {
  id: string;
  question_id: string;
  category: string;
  dimension: string;
  severity: string;
  prompt: string;
  response: string;
  reference: string;
  is_passed: string;
  score: number;
  retry_count: number;
  created_at: string;
  raw_data?: JsonValue;
}

export type SampleFilter = "all" | "pass" | "fail";

export interface ResultItem {
  id: string;
  task_id: string;
  model_name: string;
  dataset_name: string;
  score: number;
  metrics: JsonValue;
  config_content: string;
  log_content: string;
}

export interface ResultStats {
  total: number;
  passed: number;
  failed: number;
  sample_scores: Array<{ question_id: string; score: number | null; is_passed: string | null }>;
}

export interface TaskMeta {
  id: string;
  name: string;
  status?: string;
  created_at?: string;
  output_dir?: string;
  config?: Record<string, unknown>;
}

export interface ProgressStage {
  name?: string;
  label?: string;
  current?: number;
  total?: number;
  status?: string;
  children?: ProgressStage[];
}

export interface TaskProgressPayload {
  status?: string;
  pipeline?: string;
  total_count?: number;
  processed_count?: number;
  percent?: number;
  stage?: ProgressStage;
  updated_at?: string;
}

export interface LoaderData {
  result: ResultItem | null;
  stats: ResultStats | null;
  task: TaskMeta | null;
  samplesPage: { items: SampleResult[]; total: number; skip: number; limit: number } | null;
  isTask?: boolean;
}

export interface MetricDetail {
  metricName: string;
  score: number;
  num: number;
  category: string;
  subset: string;
  isMain: boolean;
}
