import ReactECharts from "echarts-for-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Download, FileText, Info, Loader2, Terminal, Trash2 } from "lucide-react";
import type { EChartsOption } from "echarts";
import { formatDateTimeUtc8 } from "@/lib/datetime";
import type { ResultItem, ResultStats, TaskMeta } from "./types";

const QA_DATASET_PATTERN = /\bgeneral[_-]?qa\b/i;

interface ResultOverviewSectionProps {
  task: TaskMeta | null;
  taskStatus?: string;
  result: ResultItem;
  headerModel: string;
  headerDatasetName: string;
  statsLoading: boolean;
  statsError: string | null;
  stats: ResultStats | null;
  exporting: boolean;
  onExportCSV: () => void;
  onDeleteTask: (taskId: string) => void;
  onBack: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  judgeStrategyRaw: string | null;
  judgeModel: string | null;
  passRateOption: EChartsOption | null;
  scoreHistogramOption: EChartsOption | null;
}

export function ResultOverviewSection({
  task,
  taskStatus,
  result,
  headerModel,
  headerDatasetName,
  statsLoading,
  statsError,
  stats,
  exporting,
  onExportCSV,
  onDeleteTask,
  onBack,
  t,
  judgeStrategyRaw,
  judgeModel,
  passRateOption,
  scoreHistogramOption,
}: ResultOverviewSectionProps) {
  return (
    <>
      <div className="rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,98,155,0.3)] bg-gradient-to-br from-[#00629B] to-[#0088CC] text-white">
        <div className="p-8 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-[28px] font-bold truncate">{task?.name || result.model_name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm opacity-90">
              <span className="bg-white/20 px-3 py-1.5 rounded-full text-xs">📊 评测报告</span>
              <span>模型: {headerModel}</span>
              <span>数据集: {headerDatasetName}</span>
              <span className="inline-flex items-center gap-2">
                样本数:
                {statsLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin opacity-90" />
                    <span className="opacity-90">加载中</span>
                  </>
                ) : statsError ? (
                  <span className="text-amber-200 text-xs">{statsError}</span>
                ) : stats ? (
                  stats.total
                ) : null}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/15 border border-white/25 text-sm hover:bg-white/25 hover:border-white/40 transition">
                    <FileText className="w-4 h-4" />
                    任务配置
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>任务配置 (task_config.yaml)</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[70vh] w-full rounded-md border p-4 bg-slate-950">
                    <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap">{result.config_content || ""}</pre>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/15 border border-white/25 text-sm hover:bg-white/25 hover:border-white/40 transition">
                    <Terminal className="w-4 h-4" />
                    执行日志
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>执行日志 (eval_log.log)</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[70vh] w-full rounded-md border p-4 bg-slate-950">
                    <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap">{result.log_content || ""}</pre>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <button
                onClick={onExportCSV}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/15 border border-white/25 text-sm hover:bg-white/25 hover:border-white/40 transition disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {t("results.export_csv")}
              </button>

              {task?.id && taskStatus !== "completed" ? (
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-sm text-red-100 hover:bg-red-500/30 hover:border-red-500/50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("tasks.delete")}
                </button>
              ) : null}
            </div>
            <div className="text-right text-xs opacity-80 whitespace-nowrap">
              {formatDateTimeUtc8(task?.created_at)}
              <br />
              {task?.id ? <>任务ID: {task.id}</> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">综合评分 (Mean Accuracy)</CardDescription>
            <CardTitle className={`text-3xl font-bold ${result.score >= 0.8 ? "text-emerald-600" : result.score >= 0.5 ? "text-amber-500" : "text-red-500"}`}>
              {(Number(result.score || 0)).toFixed(2)}
            </CardTitle>
            <div className="text-xs text-slate-400 mt-1 inline-flex items-center gap-1.5 min-h-[1rem]">
              {statsLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  加载中
                </>
              ) : statsError ? (
                <span className="text-amber-600">{statsError}</span>
              ) : stats ? (
                <>
                  {stats.passed}/{stats.total} 样本通过
                </>
              ) : null}
            </div>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">正确数</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600 min-h-[2.25rem] flex items-center">
              {statsLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500/70" />
              ) : statsError ? (
                <span className="text-sm font-normal text-amber-600 leading-snug">加载失败</span>
              ) : stats ? (
                stats.passed
              ) : null}
            </CardTitle>
            <div className="text-xs text-slate-400 mt-1">安全响应</div>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">错误数</CardDescription>
            <CardTitle className="text-3xl font-bold text-red-500 min-h-[2.25rem] flex items-center">
              {statsLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-red-400/70" />
              ) : statsError ? (
                <span className="text-sm font-normal text-amber-600 leading-snug">加载失败</span>
              ) : stats ? (
                stats.failed
              ) : null}
            </CardTitle>
            <div className="text-xs text-slate-400 mt-1">未通过评判</div>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">评测类型</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">{judgeStrategyRaw === "llm" ? "LLM Judge" : (judgeStrategyRaw || "N/A")}</CardTitle>
            <div className="text-xs text-slate-400 mt-1">{judgeModel || ""}</div>
          </CardHeader>
        </Card>
      </div>

      {QA_DATASET_PATTERN.test(result.dataset_name) && judgeStrategyRaw !== "llm" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <span>
            当前数据集为 QA 类型且未使用 LLM Judge 评测，系统仅通过精确匹配判定答案正误，
            因此<strong>错误数偏高属于正常现象</strong>。如需更准确的语义评判，建议创建任务时启用 LLM Judge。
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="inline-block w-1 h-4 bg-[#00629B] rounded-sm" />
            样本通过率
          </div>
          <div className="h-[300px] relative">
            {statsLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin text-[#00629B]" />
                <span className="text-sm">加载图表数据…</span>
              </div>
            ) : statsError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <p className="text-sm text-amber-700 text-center">{statsError}</p>
              </div>
            ) : passRateOption ? (
              <ReactECharts option={passRateOption} style={{ height: "100%", width: "100%" }} />
            ) : null}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="inline-block w-1 h-4 bg-[#00629B] rounded-sm" />
            分数分布直方图
          </div>
          <div className="h-[300px] relative">
            {statsLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin text-[#00629B]" />
                <span className="text-sm">加载图表数据…</span>
              </div>
            ) : statsError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <p className="text-sm text-amber-700 text-center">{statsError}</p>
              </div>
            ) : scoreHistogramOption ? (
              <ReactECharts option={scoreHistogramOption} style={{ height: "100%", width: "100%" }} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
