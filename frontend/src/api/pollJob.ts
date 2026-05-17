import { apiClient } from "./client";

export interface JobResult<T = unknown> {
  status: "pending" | "running" | "completed" | "failed" | "not_found";
  result: T | null;
  error: string | null;
}

/**
 * Poll `GET /jobs/{jobId}` until the job reaches a terminal state
 * (`completed` or `failed`) or the caller-supplied timeout expires.
 *
 * Each request includes a unique `_t` query param to bypass the
 * apiClient GET-request deduplication.
 */
export async function pollJob<T = unknown>(
  jobId: string,
  intervalMs = 1500,
  timeoutMs = 180_000,
): Promise<JobResult<T>> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await apiClient.get<JobResult<T>>(`/jobs/${jobId}`, {
      params: { _t: Date.now() },
    });
    const data = res.data;
    if (data.status === "completed" || data.status === "failed" || data.status === "not_found") {
      return data;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return { status: "failed", result: null, error: "轮询超时，请稍后刷新页面查看结果" };
}
