import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, XCircle, Loader2, Trash2, RotateCcw, BarChart3, Calendar, Database, Bot, StopCircle, GitCompareArrows } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Task {
  id: string;
  name: string;
  task_type: string;
  status: string;
  created_at: string;
  config?: Record<string, unknown>;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(18);
  const [total, setTotal] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [rerunDialogOpen, setRerunDialogOpen] = useState(false);
  const [taskToRerun, setTaskToRerun] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchTasks = async (signal?: AbortSignal, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await apiClient.get("/tasks/", {
        params: { skip: (page - 1) * pageSize, limit: pageSize },
        signal
      });
      setTasks(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to fetch tasks", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTasks(controller.signal);

    // Set up polling
    const interval = setInterval(() => {
      fetchTasks(controller.signal, false);
    }, 5000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [page, pageSize]);

  const handleDelete = async (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await apiClient.delete(`/tasks/${taskToDelete}`);
      toast({ title: t('tasks.deleted'), description: t('tasks.deleted_desc') });
      fetchTasks();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({ title: t('tasks.error'), description: err.response?.data?.detail || t('tasks.error_desc'), variant: "destructive" });
    }
  };

  const handleRerun = (taskId: string) => {
    setTaskToRerun(taskId);
    setRerunDialogOpen(true);
  };

  const handleConfirmRerun = async () => {
    if (!taskToRerun) return;
    try {
      await apiClient.post(`/tasks/${taskToRerun}/rerun`);
      toast({ title: t('tasks.rerun_success'), description: t('tasks.rerun_success_desc') });
      fetchTasks();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({ title: t('tasks.rerun_failed'), description: err.response?.data?.detail || t('tasks.rerun_failed_desc'), variant: "destructive" });
    }
  };

  const handleStop = async (taskId: string) => {
    try {
      await apiClient.post(`/tasks/${taskId}/stop`);
      toast({ title: t('tasks.stop_success'), description: t('tasks.stop_success_desc') });
      fetchTasks();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({ title: t('tasks.stop_failed'), description: err.response?.data?.detail || t('tasks.stop_failed_desc'), variant: "destructive" });
    }
  };

  const getStatusConfig = (status: string) => {
    const labels: Record<string, string> = {
      completed: t('tasks.status_completed'),
      running: t('tasks.status_running'),
      failed: t('tasks.status_failed'),
      cancelled: t('tasks.status_cancelled'),
      pending: t('tasks.status_pending'),
    };
    switch (status) {
      case "completed":
        return { bg: "bg-emerald-500", text: "text-emerald-600", label: labels.completed, icon: CheckCircle };
      case "running":
        return { bg: "bg-blue-500", text: "text-blue-600", label: labels.running, icon: Loader2 };
      case "failed":
        return { bg: "bg-red-500", text: "text-red-600", label: labels.failed, icon: XCircle };
      case "cancelled":
        return { bg: "bg-red-500", text: "text-red-600", label: labels.cancelled, icon: XCircle };
      case "pending":
        return { bg: "bg-slate-400", text: "text-slate-500", label: labels.pending, icon: Clock };
      default:
        return { bg: "bg-slate-400", text: "text-slate-500", label: status, icon: Clock };
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return t('tasks.time_just_now');
    if (diffMins < 60) return t('tasks.time_minutes_ago', { count: diffMins });
    if (diffHours < 24) return t('tasks.time_hours_ago', { count: diffHours });
    if (diffDays < 7) return t('tasks.time_days_ago', { count: diffDays });
    return date.toLocaleDateString();
  };

  const getTaskSummary = (config?: Record<string, unknown>) => {
    if (!config) return { model: t('tasks.unknown_model'), datasets: [] };
    const model = typeof config.model === "string" ? config.model : t('tasks.unknown_model');
    const datasets = Array.isArray(config.datasets) ? config.datasets : [];
    return { model, datasets };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-500">
            {t('tasks.total_tasks', { count: total })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size >= 2 && (
            <Button
              variant="outline"
              onClick={() => navigate(`/results/compare?tasks=${[...selectedIds].join(",")}`)}
              className="border-[#00629B] text-[#00629B] hover:bg-blue-50"
            >
              <GitCompareArrows className="w-4 h-4 mr-2" />
              {t('tasks.compare_btn')} ({selectedIds.size})
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-slate-500">
              ✕ {t('tasks.cancel_btn')}
            </Button>
          )}
          <Button onClick={() => navigate("/tasks/create")} className="bg-[#00629B] hover:bg-[#005080]">
            <Plus className="w-4 h-4 mr-2" />
            {t('tasks.create_btn')}
          </Button>
        </div>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Database className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">{t('tasks.empty')}</p>
          <p className="text-sm mt-1">{t('tasks.empty_hint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const statusConfig = getStatusConfig(task.status);
            const StatusIcon = statusConfig.icon;
            const summary = getTaskSummary(task.config);
            const isCompleted = task.status === "completed";
            const isSelected = selectedIds.has(task.id);
            return (
              <div
                key={task.id}
                className={[
                  "bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group",
                  isCompleted ? "cursor-pointer" : "",
                  isSelected ? "border-[#00629B] ring-2 ring-[#00629B]/30" : "border-slate-200 hover:border-slate-300",
                ].join(" ")}
                onClick={() => {
                  if (!isCompleted) return;
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.has(task.id) ? next.delete(task.id) : next.add(task.id);
                    return next;
                  });
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0 flex items-start gap-2">
                      {isCompleted && (
                        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-[#00629B] bg-[#00629B]" : "border-slate-300"}`}>
                          {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate group-hover:text-[#00629B] transition-colors" title={task.name}>
                          {task.name}
                        </h3>
                        <Badge variant="outline" className="mt-1 text-xs uppercase font-mono">
                          {task.task_type}
                        </Badge>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} text-white flex-shrink-0`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${task.status === "running" ? "animate-spin" : ""}`} />
                      {statusConfig.label}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Bot className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate" title={summary.model}>{summary.model}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Database className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {summary.datasets.length > 0 ? summary.datasets.join(", ") : t('tasks.no_dataset_specified')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{getRelativeTime(task.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-[#00629B] hover:bg-[#005080]"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <BarChart3 className="w-4 h-4 mr-1.5" />
                    {t('tasks.view_results')}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleRerun(task.id)}
                    title={t('tasks.rerun')}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  {task.status === "running" ? (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-orange-600 hover:text-orange-700 hover:border-orange-300 hover:bg-orange-50"
                      onClick={() => handleStop(task.id)}
                      title={t('tasks.stop_task')}
                    >
                      <StopCircle className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-600 hover:border-red-300"
                      onClick={() => handleDelete(task.id)}
                      title={t('tasks.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedIds.size === 1 && (
        <p className="text-xs text-slate-400 text-center -mt-2">
          {t('tasks.compare_hint')}
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            {t('tasks.prev_page')}
          </Button>
          <span className="text-sm text-slate-500 px-4">
            {t('tasks.page_indicator', { current: page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            {t('tasks.next_page')}
          </Button>
        </div>
      )}

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

      <ConfirmDialog
        open={rerunDialogOpen}
        onOpenChange={setRerunDialogOpen}
        title={t('tasks.rerun_confirm')}
        description={t('tasks.rerun_confirm_desc')}
        confirmText={t('tasks.rerun_btn')}
        cancelText={t('tasks.cancel_btn')}
        onConfirm={handleConfirmRerun}
      />
    </div>
  );
}
