import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JsonValue, MetricDetail } from "./types";
import { scoreBarColor } from "./utils";

interface ResultMetricsSectionProps {
  metricsObj: Record<string, JsonValue> | null;
  metricsDetails: MetricDetail[];
}

export function ResultMetricsSection({ metricsObj, metricsDetails }: ResultMetricsSectionProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span className="inline-block w-1 h-4 bg-[#00629B] rounded-sm" />
        评测指标详情
      </div>

      {metricsObj?.dataset_description ? (
        <div className="mb-6 bg-slate-50 border border-slate-100 rounded-lg p-4">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
            <FileText className="w-3 h-3" />
            数据集说明
          </div>
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {String(metricsObj.dataset_description)}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="w-[200px]">核心指标</TableHead>
              <TableHead>分类 / 子集</TableHead>
              <TableHead className="w-[100px] text-right">得分</TableHead>
              <TableHead className="w-[100px] text-right">样本数</TableHead>
              <TableHead className="w-[200px]">可视化</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricsDetails.map((r, idx) => (
              <TableRow key={`${r.metricName}-${r.category}-${r.subset}-${idx}`} className={r.isMain ? "bg-blue-50/30" : ""}>
                <TableCell>
                  {r.isMain ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{r.metricName}</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px] px-1.5 py-0">
                        PRIMARY
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-slate-500 font-medium">{r.metricName}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700">{r.category}</span>
                    <span className="text-xs text-slate-400">{r.subset}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono font-bold" style={{ color: scoreBarColor(r.score) }}>
                    {r.score.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right text-slate-600 font-mono">{r.num}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{ width: `${r.score * 100}%`, backgroundColor: scoreBarColor(r.score) }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{Math.round(r.score * 100)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {metricsDetails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-10 italic">
                  未检测到详细指标数据
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
