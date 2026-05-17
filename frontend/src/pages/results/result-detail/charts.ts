import type { EChartsOption } from "echarts";
import type { ResultStats } from "./types";

export function buildPassRateOption(stats: ResultStats): EChartsOption {
  return {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { orient: "vertical", right: "10%", top: "center", data: ["通过", "未通过"] },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["35%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
        label: { show: true, position: "outside", formatter: "{b}\n{d}%", fontSize: 14 },
        labelLine: { show: true, length: 15, length2: 10 },
        emphasis: { label: { show: true, fontSize: 18, fontWeight: "bold" } },
        data: [
          { value: stats.passed, name: "通过", itemStyle: { color: "#22c55e" } },
          { value: stats.failed, name: "未通过", itemStyle: { color: "#ef4444" } },
        ],
      },
    ],
    animationDuration: 1000,
  };
}

export function buildScoreHistogramOption(stats: ResultStats): EChartsOption {
  const BUCKETS = 5;
  const bucketSize = 1 / BUCKETS;
  const buckets = Array.from({ length: BUCKETS }, (_, i) => ({
    label: `${(i * bucketSize).toFixed(1)}–${((i + 1) * bucketSize).toFixed(1)}`,
    count: 0,
    samples: [] as number[],
  }));

  stats.sample_scores.forEach((s) => {
    const v = typeof s.score === "number" ? s.score : 0;
    const idx = Math.min(Math.floor(v / bucketSize), BUCKETS - 1);
    buckets[idx].count++;
    buckets[idx].samples.push(v);
  });

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? (params as Array<Record<string, unknown>>) : [];
        const d = arr[0];
        if (!d) return "";
        const name = String(d.name || "");
        const value = typeof d.value === "number" ? d.value : 0;
        return `${name}<br/>样本数: ${value}`;
      },
    },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: buckets.map((b) => b.label),
      axisLabel: { fontSize: 11 },
      name: "分数区间",
      nameLocation: "center",
      nameGap: 30,
    },
    yAxis: { type: "value", name: "样本数", nameLocation: "center", nameGap: 35 },
    series: [
      {
        type: "bar",
        data: buckets.map((b, idx) => ({
          value: b.count,
          itemStyle: {
            color: b.count === 0 ? "#e2e8f0" : idx < 2 ? "#ef4444" : idx < 4 ? "#f59e0b" : "#22c55e",
          },
        })),
        barWidth: "60%",
        label: {
          show: true,
          position: "top",
          formatter: (p: unknown) => {
            const obj = p as Record<string, unknown>;
            return typeof obj.value === "number" && (obj.value as number) > 0 ? String(obj.value) : "";
          },
          fontSize: 13,
          fontWeight: "bold" as const,
        },
      },
    ],
    animationDuration: 800,
  };
}
