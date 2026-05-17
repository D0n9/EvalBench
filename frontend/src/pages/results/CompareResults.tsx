import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bot, Calendar, Database, Info, Loader2 } from "lucide-react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ─────────────── Types ─────────────── */

interface CategoryBreakdown {
  name: string;
  total: number;
  passed: number;
  pass_rate: number | null;
}

interface DatasetScore {
  result_id: string;
  dataset_name: string;
  score: number | null;
  metrics: Record<string, unknown> | null;
  total_samples: number;
  passed: number;
  failed: number;
  avg_score: number | null;
  min_score: number | null;
  max_score: number | null;
  std_score: number | null;
  category_breakdown: CategoryBreakdown[];
  dimension_breakdown: CategoryBreakdown[];
}

interface TaskComparison {
  task_id: string;
  task_name: string;
  status: string;
  model_name: string;
  datasets_config: string[];
  created_at: string | null;
  datasets: DatasetScore[];
  overall_score: number | null;
}

interface AgreementDataset {
  dataset_name: string;
  shared_questions: number;
  both_pass: number;
  both_fail: number;
  a_only_pass: number;
  b_only_pass: number;
  agreement_rate: number | null;
  flip_rate: number | null;
}

interface PairwiseAgreement {
  task_a_id: string;
  task_a_name: string;
  task_b_id: string;
  task_b_name: string;
  per_dataset: AgreementDataset[];
  summary: {
    both_pass: number;
    both_fail: number;
    a_only_pass: number;
    b_only_pass: number;
    agreement_rate: number | null;
    flip_rate: number | null;
  };
}

interface CompareData {
  tasks: TaskComparison[];
  dataset_names: string[];
  pairwise_agreement: PairwiseAgreement[];
}

/* ─────────────── Palette ─────────────── */

const COLORS = [
  "#00629B", "#e67e22", "#27ae60", "#8e44ad",
  "#e74c3c", "#2980b9", "#16a085", "#d35400",
];

/* ─────────────── Helpers ─────────────── */

function pct(v: number | null, decimals = 1): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

function diffBadge(score: number | null, baseline: number | null) {
  if (score === null || baseline === null) return null;
  const diff = score - baseline;
  if (Math.abs(diff) < 0.005) return null;
  const sign = diff > 0 ? "+" : "";
  const cls = diff > 0
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded border font-mono ${cls}`}>
      {sign}{(diff * 100).toFixed(1)}%
    </span>
  );
}

function ScoreBar({ value, color = "#00629B" }: { value: number | null; color?: string }) {
  if (value === null) return <div className="text-xs text-slate-400">—</div>;
  const w = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-mono tabular-nums w-12 text-right">{pct(value)}</span>
    </div>
  );
}

/* ════════════════════════════════════════
   Tab 1 — Score Overview
   ════════════════════════════════════════ */

function ScoreOverviewTab({ data }: { data: CompareData }) {
  const { t } = useTranslation();
  const { tasks, dataset_names } = data;
  const baseline = tasks[0];

  const getDs = (task: TaskComparison, name: string) =>
    task.datasets.find(d => d.dataset_name === name);

  const getScore = (task: TaskComparison, name: string) =>
    getDs(task, name)?.score ?? null;

  /* Radar chart option */
  const radarOption = useMemo((): EChartsOption => {
    const indicators = dataset_names.map(n => ({ name: n.split("/").pop() || n, max: 1 }));
    indicators.push({ name: t("tasks.compare_overall"), max: 1 });

    const series = tasks.map((task, i) => ({
      value: [
        ...dataset_names.map(n => getScore(task, n) ?? 0),
        task.overall_score ?? 0,
      ],
      name: task.task_name,
      itemStyle: { color: COLORS[i % COLORS.length] },
      areaStyle: { opacity: 0.08 },
      lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
    }));

    return {
      tooltip: { trigger: "item" },
      legend: {
        data: tasks.map(t => t.task_name),
        bottom: 0,
        textStyle: { fontSize: 12 },
      },
      radar: {
        indicator: indicators,
        radius: "60%",
        splitArea: { areaStyle: { color: ["rgba(0,0,0,0.02)", "rgba(0,0,0,0.04)"] } },
        axisName: { fontSize: 11, color: "#475569" },
      },
      series: [{ type: "radar", data: series }],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dataset_names]);

  return (
    <div className="space-y-6">
      {/* Radar */}
      {dataset_names.length >= 3 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{t("compare.radar_title")}</h3>
          <ReactECharts option={radarOption} style={{ height: 340 }} />
        </div>
      )}

      {/* Score table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left font-semibold text-slate-700 px-4 py-3 sticky left-0 bg-slate-50 z-10 min-w-[180px]">
                  {t("results.table_dataset")}
                </th>
                {tasks.map((task, i) => (
                  <th key={task.task_id} className="text-left font-semibold text-slate-700 px-4 py-3 min-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate max-w-[150px]" title={task.task_name}>{task.task_name}</span>
                      {i === 0 && <span className="text-xs text-slate-400 font-normal">(baseline)</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {dataset_names.map(dsName => (
                <tr key={dsName} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100">
                    {dsName}
                  </td>
                  {tasks.map((task, i) => {
                    const ds = getDs(task, dsName);
                    const score = ds?.score ?? null;
                    const baseScore = getScore(baseline, dsName);
                    return (
                      <td key={task.task_id} className="px-4 py-3">
                        {score === null ? (
                          <span className="text-xs text-slate-400">{t("tasks.compare_no_data")}</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center flex-wrap gap-1">
                              <span className="font-mono font-semibold text-base text-slate-800">
                                {pct(score)}
                              </span>
                              {i > 0 && diffBadge(score, baseScore)}
                            </div>
                            <ScoreBar value={score} color={COLORS[i % COLORS.length]} />
                            {ds && (
                              <div className="flex gap-3 text-xs text-slate-400">
                                <span>{ds.passed}/{ds.total_samples} passed</span>
                                {ds.avg_score !== null && (
                                  <span>avg {pct(ds.avg_score)}</span>
                                )}
                                {ds.std_score !== null && (
                                  <span title={t("compare.std_hint")}>σ {(ds.std_score * 100).toFixed(1)}%</span>
                                )}
                              </div>
                            )}
                            {/* Key metrics from EvalScope */}
                            {ds?.metrics && Object.keys(ds.metrics).length > 0 && (
                              <MetricsTip metrics={ds.metrics} />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Overall row */}
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                <td className="px-4 py-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  {t("tasks.compare_overall")}
                </td>
                {tasks.map((task, i) => (
                  <td key={task.task_id} className="px-4 py-3">
                    {task.overall_score === null ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-semibold text-base text-slate-800">
                            {pct(task.overall_score)}
                          </span>
                          {i > 0 && diffBadge(task.overall_score, baseline.overall_score)}
                        </div>
                        <ScoreBar value={task.overall_score} color={COLORS[i % COLORS.length]} />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        {t("tasks.compare_diff_label")} ({baseline.task_name})
        {" · "}
        <span className="text-emerald-600">+N%</span> {t("compare.above_baseline")}
        {" · "}
        <span className="text-red-600">-N%</span> {t("compare.below_baseline")}
      </p>
    </div>
  );
}

function MetricsTip({ metrics }: { metrics: Record<string, unknown> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const entries = Object.entries(metrics).slice(0, 8);
  return (
    <div className="relative inline-block">
      <button
        className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600"
        onClick={() => setOpen(v => !v)}
      >
        <Info className="w-3 h-3" />
        {t("compare.metrics_detail")}
      </button>
      {open && (
        <div className="absolute left-0 top-5 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[180px] text-xs">
          <div className="space-y-1">
            {entries.map(([k, v]) => (
              <div key={k} className="flex gap-3 justify-between">
                <span className="text-slate-500">{k}</span>
                <span className="font-mono font-semibold text-slate-700">
                  {typeof v === "number" ? (v > 1 ? v.toFixed(2) : pct(v)) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Tab 2 — Category / Dimension Analysis
   ════════════════════════════════════════ */

function CategoryTab({ data }: { data: CompareData }) {
  const { t } = useTranslation();
  const { tasks, dataset_names } = data;
  const [activeDs, setActiveDs] = useState(dataset_names[0] || "");
  const [mode, setMode] = useState<"category" | "dimension">("category");

  const dsOptions = dataset_names.filter(n =>
    tasks.some(tk =>
      (tk.datasets.find(d => d.dataset_name === n)?.[mode === "category" ? "category_breakdown" : "dimension_breakdown"] || []).length > 0
    )
  );

  /* Gather all keys across tasks for current dataset + mode */
  const allKeys = useMemo(() => {
    const s = new Set<string>();
    for (const task of tasks) {
      const ds = task.datasets.find(d => d.dataset_name === activeDs);
      if (!ds) continue;
      const list = mode === "category" ? ds.category_breakdown : ds.dimension_breakdown;
      list.forEach(item => s.add(item.name));
    }
    return Array.from(s).sort();
  }, [tasks, activeDs, mode]);

  const barOption = useMemo((): EChartsOption => {
    const series = tasks.map((task, i) => {
      const ds = task.datasets.find(d => d.dataset_name === activeDs);
      const list = mode === "category" ? ds?.category_breakdown ?? [] : ds?.dimension_breakdown ?? [];
      const values = allKeys.map(k => {
        const item = list.find(x => x.name === k);
        return item ? Math.round((item.pass_rate ?? 0) * 100) : null;
      });
      return {
        name: task.task_name,
        type: "bar" as const,
        data: values,
        itemStyle: { color: COLORS[i % COLORS.length] },
        barMaxWidth: 32,
        label: {
          show: true,
          position: "top" as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (p: any) =>
            (p.value !== null && p.value !== undefined) ? `${p.value}%` : "",
          fontSize: 11,
          color: "#475569",
        },
      };
    });

    return {
      tooltip: {
        trigger: "axis",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          return (params as Array<{ seriesName: string; value: number | null; marker: string }>)
            .map(p => `${p.marker} ${p.seriesName}: ${p.value !== null ? p.value + "%" : "—"}`).join("<br/>");
        },
      },
      legend: {
        data: tasks.map(t => t.task_name),
        bottom: 0,
        textStyle: { fontSize: 12 },
      },
      grid: { left: 40, right: 20, bottom: 60, top: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: allKeys,
        axisLabel: {
          rotate: allKeys.length > 6 ? 30 : 0,
          fontSize: 11,
          color: "#475569",
          overflow: "truncate",
          width: 80,
        },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", fontSize: 11 },
      },
      series,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, activeDs, mode, allKeys]);

  if (dsOptions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-sm">
        {t("compare.no_breakdown")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          <button
            className={`px-3 py-1.5 ${mode === "category" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setMode("category")}
          >
            {t("compare.by_category")}
          </button>
          <button
            className={`px-3 py-1.5 ${mode === "dimension" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setMode("dimension")}
          >
            {t("compare.by_dimension")}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {dsOptions.map(n => (
            <button
              key={n}
              onClick={() => setActiveDs(n)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                activeDs === n
                  ? "bg-[#00629B] text-white border-[#00629B]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {allKeys.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-sm">
          {t("compare.no_breakdown")}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <ReactECharts option={barOption} style={{ height: Math.max(320, allKeys.length * 28 + 100) }} />
        </div>
      )}

      {/* Breakdown table */}
      {allKeys.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left font-semibold text-slate-700 px-4 py-3 sticky left-0 bg-slate-50 min-w-[160px]">
                    {mode === "category" ? t("compare.category") : t("compare.dimension")}
                  </th>
                  {tasks.map((task, i) => (
                    <th key={task.task_id} className="text-left font-semibold text-slate-700 px-4 py-3 min-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate max-w-[120px]">{task.task_name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {allKeys.map(key => (
                  <tr key={key} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-100">
                      {key}
                    </td>
                    {tasks.map((task, i) => {
                      const ds = task.datasets.find(d => d.dataset_name === activeDs);
                      const list = mode === "category" ? ds?.category_breakdown : ds?.dimension_breakdown;
                      const item = list?.find(x => x.name === key);
                      if (!item) return (
                        <td key={task.task_id} className="px-4 py-2.5 text-slate-300 text-xs">—</td>
                      );
                      return (
                        <td key={task.task_id} className="px-4 py-2.5">
                          <ScoreBar value={item.pass_rate} color={COLORS[i % COLORS.length]} />
                          <div className="text-xs text-slate-400 mt-0.5">{item.passed}/{item.total}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Tab 3 — Sample Agreement Analysis
   ════════════════════════════════════════ */

function AgreementTab({ data }: { data: CompareData }) {
  const { t } = useTranslation();
  const { pairwise_agreement, tasks } = data;

  if (pairwise_agreement.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-sm">
        {t("compare.no_agreement")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pairwise_agreement.map(pair => {
        const idxA = tasks.findIndex(t => t.task_id === pair.task_a_id);
        const idxB = tasks.findIndex(t => t.task_id === pair.task_b_id);
        const colorA = COLORS[idxA % COLORS.length];
        const colorB = COLORS[idxB % COLORS.length];
        const s = pair.summary;
        const grand = s.both_pass + s.both_fail + s.a_only_pass + s.b_only_pass;

        if (grand === 0) return null;

        // Sankey / stacked bar option for summary
        const pieOption: EChartsOption = {
          tooltip: {
            trigger: "item",
            formatter: "{b}: {c} ({d}%)",
          },
          series: [
            {
              type: "pie" as const,
              radius: ["40%", "65%"],
              data: [
                { value: s.both_pass, name: t("compare.both_pass"), itemStyle: { color: "#16a34a" } },
                { value: s.both_fail, name: t("compare.both_fail"), itemStyle: { color: "#94a3b8" } },
                { value: s.a_only_pass, name: `${pair.task_a_name} ${t("compare.only_pass")}`, itemStyle: { color: colorA } },
                { value: s.b_only_pass, name: `${pair.task_b_name} ${t("compare.only_pass")}`, itemStyle: { color: colorB } },
              ],
              label: { formatter: "{b}\n{d}%", fontSize: 11 },
              emphasis: { scale: true },
            },
          ],
        };

        return (
          <div key={`${pair.task_a_id}-${pair.task_b_id}`} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b bg-slate-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorA }} />
                <span className="max-w-[180px] truncate" title={pair.task_a_name}>{pair.task_a_name}</span>
              </div>
              <span className="text-slate-400 text-xs font-medium">VS</span>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorB }} />
                <span className="max-w-[180px] truncate" title={pair.task_b_name}>{pair.task_b_name}</span>
              </div>
              <div className="ml-auto flex gap-3 text-xs">
                <span className="text-slate-500">
                  {t("compare.agreement_rate")}:
                  <span className="ml-1 font-semibold text-slate-700">{pct(s.agreement_rate)}</span>
                </span>
                <span className="text-slate-500">
                  {t("compare.flip_rate")}:
                  <span className={`ml-1 font-semibold ${(s.flip_rate ?? 0) > 0.3 ? "text-orange-600" : "text-slate-700"}`}>
                    {pct(s.flip_rate)}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Pie chart */}
              <div className="p-4">
                <ReactECharts option={pieOption} style={{ height: 240 }} />
              </div>

              {/* Summary stats */}
              <div className="p-5 flex flex-col justify-center gap-3">
                <StatRow
                  label={t("compare.both_pass")}
                  value={s.both_pass}
                  total={grand}
                  color="#16a34a"
                />
                <StatRow
                  label={t("compare.both_fail")}
                  value={s.both_fail}
                  total={grand}
                  color="#94a3b8"
                />
                <StatRow
                  label={`${t("compare.only_pass")}: ${pair.task_a_name}`}
                  value={s.a_only_pass}
                  total={grand}
                  color={colorA}
                />
                <StatRow
                  label={`${t("compare.only_pass")}: ${pair.task_b_name}`}
                  value={s.b_only_pass}
                  total={grand}
                  color={colorB}
                />
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                  {t("compare.shared_questions", { count: grand })}
                </div>
              </div>
            </div>

            {/* Per-dataset breakdown */}
            {pair.per_dataset.length > 1 && (
              <div className="border-t">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        {["results.table_dataset", "compare.shared", "compare.both_pass", "compare.both_fail",
                          `compare.only_pass_a`, "compare.only_pass_b", "compare.agreement_rate", "compare.flip_rate"
                        ].map(k => (
                          <th key={k} className="text-left font-semibold text-slate-600 px-3 py-2">
                            {k.startsWith("compare.only_pass") ? (
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: k.endsWith("_a") ? colorA : colorB }} />
                                {t("compare.only_pass")}
                              </span>
                            ) : t(k)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pair.per_dataset.map(ds => (
                        <tr key={ds.dataset_name} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{ds.dataset_name}</td>
                          <td className="px-3 py-2 text-slate-600">{ds.shared_questions}</td>
                          <td className="px-3 py-2 text-emerald-700 font-medium">{ds.both_pass}</td>
                          <td className="px-3 py-2 text-slate-500">{ds.both_fail}</td>
                          <td className="px-3 py-2" style={{ color: colorA }}>{ds.a_only_pass}</td>
                          <td className="px-3 py-2" style={{ color: colorB }}>{ds.b_only_pass}</td>
                          <td className="px-3 py-2 text-slate-700 font-medium">{pct(ds.agreement_rate)}</td>
                          <td className={`px-3 py-2 font-medium ${(ds.flip_rate ?? 0) > 0.3 ? "text-orange-600" : "text-slate-600"}`}>
                            {pct(ds.flip_rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pctVal = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600 truncate max-w-[200px]" title={label}>{label}</span>
        <span className="font-mono font-semibold text-slate-700 ml-2">{value} ({pctVal}%)</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className="h-full rounded-full" style={{ width: `${pctVal}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Task Header Cards
   ════════════════════════════════════════ */

function TaskCards({ tasks }: { tasks: TaskComparison[] }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {tasks.map((task, i) => (
        <div key={task.task_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {i === 0 ? "Baseline" : `Task ${i + 1}`}
            </span>
          </div>
          <p className="font-semibold text-slate-800 text-sm leading-tight truncate mb-2.5" title={task.task_name}>
            {task.task_name}
          </p>

          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={task.model_name}>{task.model_name || "—"}</span>
            </div>
            {task.datasets_config.length > 0 && (
              <div className="flex items-start gap-1.5">
                <Database className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{task.datasets_config.join(", ")}</span>
              </div>
            )}
            {task.created_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{new Date(task.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {task.overall_score !== null && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-400 mb-1">{t("tasks.compare_overall")}</div>
              <ScoreBar value={task.overall_score} color={COLORS[i % COLORS.length]} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════
   Root Component
   ════════════════════════════════════════ */

export default function CompareResults() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdsParam = searchParams.get("tasks") || "";

  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskIdsParam) { setLoading(false); return; }
    setLoading(true);
    apiClient.get(`/results/compare?task_ids=${encodeURIComponent(taskIdsParam)}`)
      .then(res => setData(res.data))
      .catch(err => setError(err?.response?.data?.detail || String(err)))
      .finally(() => setLoading(false));
  }, [taskIdsParam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />{t("tasks.prev_page")}
        </Button>
        <p className="text-red-600">{error || "No data"}</p>
      </div>
    );
  }

  const hasCategoryData = data.tasks.some(task =>
    task.datasets.some(ds => ds.category_breakdown.length > 0 || ds.dimension_breakdown.length > 0)
  );
  const hasAgreementData = data.pairwise_agreement.some(pair => pair.per_dataset.length > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="w-4 h-4 mr-1" />{t("tasks.prev_page")}
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t("tasks.compare_title")}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t("tasks.compare_desc")}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {data.tasks.map((task, i) => (
            <Badge
              key={task.task_id}
              variant="outline"
              className="text-xs gap-1.5"
              style={{ borderColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {task.task_name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Task cards */}
      <TaskCards tasks={data.tasks} />

      {/* Tabs */}
      <Tabs defaultValue="scores">
        <TabsList>
          <TabsTrigger value="scores">{t("compare.tab_scores")}</TabsTrigger>
          <TabsTrigger value="category" disabled={!hasCategoryData}>
            {t("compare.tab_category")}
            {!hasCategoryData && <span className="ml-1 text-xs opacity-50">({t("compare.no_data")})</span>}
          </TabsTrigger>
          <TabsTrigger value="agreement" disabled={!hasAgreementData}>
            {t("compare.tab_agreement")}
            {!hasAgreementData && <span className="ml-1 text-xs opacity-50">({t("compare.no_data")})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="mt-4">
          <ScoreOverviewTab data={data} />
        </TabsContent>

        <TabsContent value="category" className="mt-4">
          <CategoryTab data={data} />
        </TabsContent>

        <TabsContent value="agreement" className="mt-4">
          <AgreementTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
