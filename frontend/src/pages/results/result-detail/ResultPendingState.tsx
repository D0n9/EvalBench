import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, Loader2, StopCircle, Trash2, XCircle } from "lucide-react";
import { StageTreeRows } from "./StageTreeRows";
import type { TaskMeta, TaskProgressPayload } from "./types";

interface ResultPendingStateProps {
  task: TaskMeta | null;
  taskStatus?: string;
  trackProgress: boolean;
  taskProgress: TaskProgressPayload | null;
  deleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onBackToTasks: () => void;
  onStopTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onConfirmDelete: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function ResultPendingState({
  task,
  taskStatus,
  trackProgress,
  taskProgress,
  deleteDialogOpen,
  onDeleteDialogOpenChange,
  onBackToTasks,
  onStopTask,
  onDeleteTask,
  onConfirmDelete,
  t,
}: ResultPendingStateProps) {
  const isPending = taskStatus === "pending";
  const isRunning = taskStatus === "running";
  const isFailed = taskStatus === "failed";
  const isCancelled = taskStatus === "cancelled";
  const isTerminated = isFailed || isCancelled;

  return (
    <div className="max-w-[1400px] mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBackToTasks}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{task?.name || "加载中..."}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && task?.id ? (
            <Button
              variant="outline"
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
              onClick={() => onStopTask(task.id)}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              {t("tasks.stop_task")}
            </Button>
          ) : null}
          {!isRunning && task?.id ? (
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => onDeleteTask(task.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("tasks.delete")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-20 text-center">
          {isTerminated ? (
            <>
              <XCircle className="w-10 h-10 mx-auto text-red-500 mb-4" />
              <CardTitle className="text-xl text-red-600">{isCancelled ? "评测任务已取消" : "评测任务已失败"}</CardTitle>
              <CardDescription className="mt-2">
                {isCancelled ? "该任务已被手动取消。" : '该任务在执行过程中失败，状态已标记为"失败"。'}
              </CardDescription>
            </>
          ) : isPending ? (
            <>
              <Clock className="w-10 h-10 mx-auto text-slate-400 mb-4" />
              <CardTitle className="text-xl text-slate-600">评测任务正在等待中</CardTitle>
              <CardDescription className="mt-2">任务已排队等待执行，请稍后刷新查看进度...</CardDescription>
            </>
          ) : isRunning ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500 mb-4" />
              <CardTitle className="text-xl text-blue-600">评测任务正在进行中</CardTitle>
              <CardDescription className="mt-2">任务正在执行中，请稍后刷新查看结果...</CardDescription>
            </>
          ) : (
            <>
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-slate-400 mb-4" />
              <CardTitle className="text-xl text-slate-600">
                {task?.id ? "评测任务正在进行中，请稍后刷新查看结果..." : "正在获取评测数据..."}
              </CardTitle>
              <CardDescription className="mt-2">
                {task?.id ? `任务 ID: ${task.id}` : "如果长时间无反应，请检查后台日志。"}
              </CardDescription>
            </>
          )}
        </CardHeader>
      </Card>

      {trackProgress && task?.id ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("results.task_progress_title")}</CardTitle>
            <CardDescription>{t("results.task_progress_desc")}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4">
            {!taskProgress ? (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                {t("results.task_progress_waiting")}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge
                    variant="outline"
                    className={
                      taskProgress.status === "error"
                        ? "border-red-300 text-red-700 bg-red-50"
                        : taskProgress.status === "completed" || taskProgress.percent === 100
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                          : "border-blue-300 text-blue-700 bg-blue-50"
                    }
                  >
                    {taskProgress.pipeline || "eval"} · {taskProgress.status || "—"}
                  </Badge>
                  {typeof taskProgress.processed_count === "number" && typeof taskProgress.total_count === "number" ? (
                    <span className="text-slate-600">
                      {t("results.task_progress_counts", {
                        processed: taskProgress.processed_count,
                        total: taskProgress.total_count,
                      })}
                    </span>
                  ) : null}
                  {taskProgress.updated_at ? <span className="text-xs text-slate-400 ml-auto">{taskProgress.updated_at}</span> : null}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t("results.task_progress_percent")}</span>
                    <span>{Math.round(Math.min(100, Math.max(0, Number(taskProgress.percent ?? 0))))}%</span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, Number(taskProgress.percent ?? 0)))} className="h-2.5 bg-slate-100" />
                </div>
                {taskProgress.stage ? (
                  <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t("results.task_progress_stage")}</div>
                    <StageTreeRows stage={taskProgress.stage} depth={0} />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={onDeleteDialogOpenChange}
        title={t("tasks.delete_confirm")}
        description={t("tasks.delete_confirm_desc")}
        confirmText={t("tasks.delete_btn")}
        cancelText={t("tasks.cancel_btn")}
        onConfirm={onConfirmDelete}
        variant="danger"
      />
    </div>
  );
}
