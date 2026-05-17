import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useNavigate, useRevalidator } from "react-router-dom";
import { apiClient } from "@/api/client";
import { pollJob } from "@/api/pollJob";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { buildPassRateOption, buildScoreHistogramOption } from "./result-detail/charts";
import type { LoaderData, ResultStats, SampleFilter, SampleResult, TaskProgressPayload } from "./result-detail/types";
import { asObject, buildMetricsDetails, extractYamlList, extractYamlScalar } from "./result-detail/utils";
import { ResultMetricsSection } from "./result-detail/ResultMetricsSection";
import { ResultOverviewSection } from "./result-detail/ResultOverviewSection";
import { ResultPendingState } from "./result-detail/ResultPendingState";
import { ResultSamplesSection } from "./result-detail/ResultSamplesSection";

export default function ResultDetail() {
  const navigate = useNavigate();

  const loaderData = useLoaderData() as LoaderData;
  const revalidator = useRevalidator();

  const result = loaderData.result;
  const task = loaderData.task;
  const resultId = result?.id;
  const isTaskRoute = Boolean(loaderData.isTask);

  const [stats, setStats] = useState<ResultStats | null>(() => loaderData.stats);
  const [statsLoading, setStatsLoading] = useState<boolean>(() => Boolean(loaderData.result && !loaderData.stats));
  const [statsError, setStatsError] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleResult[]>(loaderData.samplesPage?.items || []);
  const [totalSamples, setTotalSamples] = useState<number>(loaderData.samplesPage?.total || 0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(loaderData.samplesPage?.limit || 10);
  const [filter, setFilter] = useState<SampleFilter>("all");
  const [loadingSamples, setLoadingSamples] = useState<boolean>(() => {
    if (loaderData.samplesPage?.items?.length) return false;
    return Boolean(loaderData.result);
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());
  const [historyViewIdx, setHistoryViewIdx] = useState<Record<string, number>>({});
  const [confirmRetryId, setConfirmRetryId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [taskProgress, setTaskProgress] = useState<TaskProgressPayload | null>(null);

  const trackProgress = Boolean(task?.config?.enable_progress_tracker);

  const handleStop = async (taskId: string) => {
    try {
      await apiClient.post(`/tasks/${taskId}/stop`);
      toast({ title: t('tasks.stop_success'), description: t('tasks.stop_success_desc') });
      revalidator.revalidate();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({ title: t('tasks.stop_failed'), description: err.response?.data?.detail || t('tasks.stop_failed_desc'), variant: "destructive" });
    }
  };

  const handleDelete = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await apiClient.delete(`/tasks/${taskToDelete}`);
      toast({ title: t('tasks.deleted'), description: t('tasks.deleted_desc') });
      navigate("/tasks");
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({ title: t('tasks.error'), description: err.response?.data?.detail || t('tasks.error_desc'), variant: "destructive" });
    }
  };

  const taskStatus = task?.status;
  const shouldAutoRefresh = taskStatus === "pending" || taskStatus === "running";

  useEffect(() => {
    if (!shouldAutoRefresh) return;
    
    const interval = setInterval(() => {
      if (revalidator.state === "idle") {
        revalidator.revalidate();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [shouldAutoRefresh, revalidator]);

  useEffect(() => {
    if (!task?.id || !trackProgress || !shouldAutoRefresh) {
      setTaskProgress(null);
      return;
    }
    let cancelled = false;
    const fetchProgress = async () => {
      try {
        const res = await apiClient.get<{ found: boolean; progress?: TaskProgressPayload }>(
          `/tasks/${task.id}/progress`,
          { params: { _t: Date.now() } },
        );
        if (cancelled) return;
        if (res.data?.found && res.data.progress) {
          setTaskProgress(res.data.progress);
        } else {
          setTaskProgress(null);
        }
      } catch {
        if (!cancelled) setTaskProgress(null);
      }
    };
    void fetchProgress();
    const interval = setInterval(fetchProgress, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [task?.id, trackProgress, shouldAutoRefresh]);

  useEffect(() => {
    if (!result?.id) return;
    if (loaderData.stats) {
      setStats(loaderData.stats);
      setStatsLoading(false);
      setStatsError(null);
      return;
    }
    let cancelled = false;
    setStats(null);
    setStatsLoading(true);
    setStatsError(null);
    void (async () => {
      try {
        const res = await apiClient.get<ResultStats>(`/results/${result.id}/stats`, {
          params: { max_chart_items: 2000 },
        });
        if (!cancelled) {
          setStats(res.data);
          setStatsError(null);
        }
      } catch {
        if (!cancelled) {
          setStats(null);
          setStatsError("统计数据加载失败，请稍后重试");
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result?.id, loaderData.stats]);

  useEffect(() => {
    if (!result?.id) return;

    const preloaded = loaderData.samplesPage;
    if (preloaded?.items && preloaded.items.length > 0) {
      setSamples(preloaded.items);
      setTotalSamples(preloaded.total);
      if (preloaded.limit) setPageSize(preloaded.limit);
      setPage(1);
      setFilter("all");
      setLoadingSamples(false);
      const firstId = preloaded.items[0]?.id;
      setExpandedIds(firstId ? new Set([firstId]) : new Set());
      return;
    }

    let cancelled = false;
    setLoadingSamples(true);
    void (async () => {
      try {
        const res = await apiClient.get<{ items: SampleResult[]; total: number; limit?: number }>(
          `/results/${result.id}/samples`,
          { params: { skip: 0, limit: 10 } },
        );
        if (cancelled) return;
        setSamples(res.data.items);
        setTotalSamples(res.data.total);
        setPage(1);
        setPageSize(res.data.limit ?? 10);
        setFilter("all");
        const firstId = res.data.items?.[0]?.id;
        setExpandedIds(firstId ? new Set([firstId]) : new Set());
      } finally {
        if (!cancelled) setLoadingSamples(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [result?.id]);

  const passRateOption = useMemo(() => {
    if (!stats) return null;
    return buildPassRateOption(stats);
  }, [stats]);

  const scoreHistogramOption = useMemo(() => {
    if (!stats) return null;
    return buildScoreHistogramOption(stats);
  }, [stats]);

  if (!result) {
    return (
      <ResultPendingState
        task={task}
        taskStatus={taskStatus}
        trackProgress={trackProgress}
        taskProgress={taskProgress}
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogOpenChange={setDeleteDialogOpen}
        onBackToTasks={() => navigate("/tasks")}
        onStopTask={handleStop}
        onDeleteTask={handleDelete}
        onConfirmDelete={handleConfirmDelete}
        t={t}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalSamples / pageSize));
  const filteredTotal =
    stats == null
      ? null
      : filter === "all"
        ? stats.total
        : filter === "pass"
          ? stats.passed
          : stats.failed;

  const handleExportCSV = async () => {
    if (!resultId) return;
    setExporting(true);
    try {
      const res = await apiClient.get(`/results/${resultId}/export/csv`, { responseType: "blob" });
      const disposition = res.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : "export.csv";
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: t("results.export_success") });
    } catch {
      toast({ title: t("results.export_failed"), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  async function loadSamples(nextPage: number, nextFilter: SampleFilter, nextPageSize: number) {
    setLoadingSamples(true);
    const params: Record<string, unknown> = {
      skip: (nextPage - 1) * nextPageSize,
      limit: nextPageSize,
    };
    if (nextFilter === "pass") params.is_passed = "passed";
    if (nextFilter === "fail") params.is_passed = "failed";

    try {
      const res = await apiClient.get(`/results/${resultId}/samples`, { params });
      setSamples(res.data.items);
      setTotalSamples(res.data.total);
      setPage(nextPage);
      setPageSize(nextPageSize);
      setFilter(nextFilter);

      const firstId = res.data.items?.[0]?.id;
      if (nextPage === 1 && firstId) {
        setExpandedIds(new Set([firstId]));
      } else {
        setExpandedIds(new Set());
      }
    } finally {
      setLoadingSamples(false);
    }
  }

  async function handleRetrySample(sampleId: string) {
    if (!resultId) return;
    setConfirmRetryId(null);
    setRetryingIds((prev) => new Set(prev).add(sampleId));
    try {
      const submitRes = await apiClient.post(`/results/${resultId}/samples/${sampleId}/retry`);
      const jobId: string = submitRes.data?.job_id;
      if (!jobId) throw new Error("未获取到 job_id");
      const jobResult = await pollJob<SampleResult>(jobId);
      if (jobResult.status === "completed" && jobResult.result) {
        const updated = jobResult.result as SampleResult;
        setSamples((prev) => prev.map((s) => (s.id === sampleId ? updated : s)));
        setHistoryViewIdx((prev) => ({ ...prev, [sampleId]: 0 }));
        toast({ title: "重试成功", description: `样本已更新，得分: ${Number(updated.score ?? 0).toFixed(2)}` });
      } else {
        toast({ title: "重试失败", description: jobResult.error || "未知错误", variant: "destructive" });
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "请稍后再试";
      toast({ title: "重试失败", description: detail, variant: "destructive" });
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(sampleId);
        return next;
      });
    }
  }

  async function handlePromoteSample(sampleId: string, historyIndex: number) {
    if (!resultId) return;
    setPromotingIds((prev) => new Set(prev).add(sampleId));
    try {
      const res = await apiClient.put(`/results/${resultId}/samples/${sampleId}/promote`, {
        history_index: historyIndex,
      });
      const updated: SampleResult = res.data;
      setSamples((prev) => prev.map((s) => (s.id === sampleId ? updated : s)));
      setHistoryViewIdx((prev) => ({ ...prev, [sampleId]: 0 }));
      toast({ title: "已切换", description: "已将该版本设为当前正式结果" });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "操作失败";
      toast({ title: "切换失败", description: detail, variant: "destructive" });
    } finally {
      setPromotingIds((prev) => {
        const next = new Set(prev);
        next.delete(sampleId);
        return next;
      });
    }
  }

  const judgeStrategyRaw = extractYamlScalar(result.config_content || "", "judge_strategy");
  const judgeModel = extractYamlScalar(result.config_content || "", "model_id");

  const metricsObj = asObject(result.metrics);
  const headerModel = metricsObj?.model_name ? String(metricsObj.model_name) : result.model_name;
  
  const subsetList = extractYamlList(result.config_content || "", "subset_list");
  const headerDatasetName = subsetList ? subsetList.join(", ") : (metricsObj?.dataset_name ? String(metricsObj.dataset_name) : result.dataset_name);
  const metricsDetails = buildMetricsDetails(metricsObj);

  return (
    <div className="max-w-[1400px] mx-auto p-4 space-y-6 pb-8">
      <ResultOverviewSection
        task={task}
        taskStatus={taskStatus}
        result={result}
        headerModel={headerModel}
        headerDatasetName={headerDatasetName}
        statsLoading={statsLoading}
        statsError={statsError}
        stats={stats}
        exporting={exporting}
        onExportCSV={handleExportCSV}
        onDeleteTask={handleDelete}
        onBack={() => navigate(isTaskRoute ? "/tasks" : (-1 as unknown as string))}
        t={t}
        judgeStrategyRaw={judgeStrategyRaw}
        judgeModel={judgeModel}
        passRateOption={passRateOption}
        scoreHistogramOption={scoreHistogramOption}
      />

      <ResultMetricsSection metricsObj={metricsObj} metricsDetails={metricsDetails} />

      <ResultSamplesSection
        statsLoading={statsLoading}
        statsError={statsError}
        statsTotal={stats?.total ?? null}
        statsPassed={stats?.passed ?? null}
        statsFailed={stats?.failed ?? null}
        filter={filter}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        loadingSamples={loadingSamples}
        samples={samples}
        filteredTotal={filteredTotal}
        expandedIds={expandedIds}
        retryingIds={retryingIds}
        promotingIds={promotingIds}
        historyViewIdx={historyViewIdx}
        confirmRetryId={confirmRetryId}
        onLoadSamples={loadSamples}
        onToggleExpanded={(sampleId) => {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(sampleId)) next.delete(sampleId);
            else next.add(sampleId);
            return next;
          });
        }}
        onSetHistoryView={(sampleId, nextPos) => {
          setHistoryViewIdx((prev) => ({ ...prev, [sampleId]: nextPos }));
        }}
        onAskRetryConfirm={(sampleId) => setConfirmRetryId(sampleId)}
        onCancelRetryConfirm={() => setConfirmRetryId(null)}
        onRetrySample={handleRetrySample}
        onPromoteSample={handlePromoteSample}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('tasks.delete_confirm')}
        description={t('tasks.delete_confirm_desc')}
        confirmText={t('tasks.delete_btn')}
        cancelText={t('tasks.cancel_btn')}
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
}
