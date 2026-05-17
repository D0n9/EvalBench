import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { formatDateTimeUtc8 } from "@/lib/datetime";
import type { SampleFilter, SampleResult } from "./types";
import { asArray, asObject, buildCaseTitle, parseSystemAndUser, resolvePromptForDisplay } from "./utils";

interface ResultSamplesSectionProps {
  statsLoading: boolean;
  statsError: string | null;
  statsTotal: number | null;
  statsPassed: number | null;
  statsFailed: number | null;
  filter: SampleFilter;
  page: number;
  pageSize: number;
  totalPages: number;
  loadingSamples: boolean;
  samples: SampleResult[];
  filteredTotal: number | null;
  expandedIds: Set<string>;
  retryingIds: Set<string>;
  promotingIds: Set<string>;
  historyViewIdx: Record<string, number>;
  confirmRetryId: string | null;
  onLoadSamples: (nextPage: number, nextFilter: SampleFilter, nextPageSize: number) => Promise<void>;
  onToggleExpanded: (sampleId: string) => void;
  onSetHistoryView: (sampleId: string, nextPos: number) => void;
  onAskRetryConfirm: (sampleId: string) => void;
  onCancelRetryConfirm: () => void;
  onRetrySample: (sampleId: string) => Promise<void>;
  onPromoteSample: (sampleId: string, historyIndex: number) => Promise<void>;
}

export function ResultSamplesSection({
  statsLoading,
  statsError,
  statsTotal,
  statsPassed,
  statsFailed,
  filter,
  page,
  pageSize,
  totalPages,
  loadingSamples,
  samples,
  filteredTotal,
  expandedIds,
  retryingIds,
  promotingIds,
  historyViewIdx,
  confirmRetryId,
  onLoadSamples,
  onToggleExpanded,
  onSetHistoryView,
  onAskRetryConfirm,
  onCancelRetryConfirm,
  onRetrySample,
  onPromoteSample,
}: ResultSamplesSectionProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="text-xl font-bold text-slate-800 mb-4 flex flex-wrap items-center gap-2">
        评测样本数量：
        {statsLoading ? (
          <span className="inline-flex items-center gap-2 font-normal text-base text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            加载中
          </span>
        ) : statsError ? (
          <span className="font-normal text-base text-amber-700">{statsError}</span>
        ) : statsTotal != null ? (
          <span className="font-mono mr-2">{statsTotal}</span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-2 rounded-lg text-sm border transition ${filter === "all" ? "bg-[#00629B] text-white border-[#00629B]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`}
            onClick={() => void onLoadSamples(1, "all", pageSize)}
            disabled={loadingSamples || statsLoading || statsTotal == null}
          >
            全部{" "}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1 ${filter === "all" ? "bg-white/25" : "bg-slate-100"}`}>
              {statsLoading || statsTotal == null ? <Loader2 className="w-3 h-3 animate-spin" /> : statsTotal}
            </span>
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm border transition ${filter === "pass" ? "bg-[#00629B] text-white border-[#00629B]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`}
            onClick={() => void onLoadSamples(1, "pass", pageSize)}
            disabled={loadingSamples || statsLoading || statsPassed == null}
          >
            ✅ 通过{" "}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1 ${filter === "pass" ? "bg-white/25" : "bg-slate-100"}`}>
              {statsLoading || statsPassed == null ? <Loader2 className="w-3 h-3 animate-spin" /> : statsPassed}
            </span>
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm border transition ${filter === "fail" ? "bg-[#00629B] text-white border-[#00629B]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`}
            onClick={() => void onLoadSamples(1, "fail", pageSize)}
            disabled={loadingSamples || statsLoading || statsFailed == null}
          >
            ❌ 未通过{" "}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1 ${filter === "fail" ? "bg-white/25" : "bg-slate-100"}`}>
              {statsLoading || statsFailed == null ? <Loader2 className="w-3 h-3 animate-spin" /> : statsFailed}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => void onLoadSamples(1, filter, Number(v))}
            disabled={loadingSamples || statsLoading}
          >
            <SelectTrigger className="w-[120px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5条/页</SelectItem>
              <SelectItem value="10">10条/页</SelectItem>
              <SelectItem value="20">20条/页</SelectItem>
              <SelectItem value="50">50条/页</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onLoadSamples(Math.max(1, page - 1), filter, pageSize)}
            disabled={page <= 1 || loadingSamples || statsLoading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 font-medium px-2">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onLoadSamples(Math.min(totalPages, page + 1), filter, pageSize)}
            disabled={page >= totalPages || loadingSamples || statsLoading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {loadingSamples ? <span className="text-xs text-slate-500 ml-2">加载中…</span> : null}
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3 mb-4 flex flex-wrap gap-6 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">分类</span>
          <span>= 测试场景分类</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">严重</span>
          <span>= <strong>数据集预设</strong>风险等级（hover查看）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-600">✅</span>
          <span>= 评测通过</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500">❌</span>
          <span>= 评测未通过</span>
        </div>
      </div>

      <div className="space-y-4">
        {loadingSamples && samples.length === 0 ? (
          <div className="space-y-4" aria-busy="true">
            {[1, 2, 4].map((k) => (
              <div
                key={k}
                className="border border-slate-200 rounded-xl h-28 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : null}
        {samples.map((s, idx) => {
          const isPass = s.is_passed === "passed";
          const { system, user } = parseSystemAndUser(resolvePromptForDisplay(s));
          const rawObj = asObject(s.raw_data);
          const sampleScoreObj = rawObj ? asObject(rawObj.sample_score) : null;
          const scoreObj = sampleScoreObj ? asObject(sampleScoreObj.score) : null;
          const explanation = scoreObj && typeof scoreObj.explanation === "string" ? scoreObj.explanation : null;
          const title = buildCaseTitle(s);
          const cardExpanded = expandedIds.has(s.id);
          const indexBadge = (page - 1) * pageSize + idx + 1;
          const retryHistory = rawObj ? asArray(rawObj.retry_history) : null;

          return (
            <div key={s.id} className={`border border-slate-200 rounded-xl overflow-hidden ${cardExpanded ? "shadow-sm" : ""}`}>
              <div className="w-full text-left bg-white px-5 py-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition">
                <button
                  className="flex items-start gap-4 min-w-0 flex-1"
                  onClick={() => onToggleExpanded(s.id)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${isPass ? "bg-emerald-500" : "bg-red-500"}`}>
                    {indexBadge}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span title="测试场景分类" className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {s.dimension || "-"}
                      </span>
                      <span
                        title="数据集预设风险等级，非评测结果"
                        className={`px-2 py-0.5 rounded-full text-xs border ${s.severity === "critical" ? "bg-red-100 text-red-700 border-red-200" : s.severity === "high" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}
                      >
                        风险等级: {s.severity || "unknown"}
                      </span>
                      {s.retry_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 border border-orange-200">
                          已重试 {s.retry_count} 次
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${isPass ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                    {isPass ? "✅ 通过" : "❌ 未通过"}
                  </span>
                  <span className="text-sm text-slate-500">准确率: {Number(s.score ?? 0).toFixed(2)}</span>
                  <button className="text-slate-400" onClick={() => onToggleExpanded(s.id)}>
                    {cardExpanded ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {cardExpanded ? (
                <div className="bg-white px-5 pb-5 pt-1">
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100">System Prompt (安全准则)</div>
                      <pre className="p-4 text-sm text-slate-700 whitespace-pre-wrap">{system}</pre>
                    </div>
                    <div className="bg-blue-50/30 border border-blue-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 text-xs font-bold text-blue-500 bg-blue-50">User Query (用户问题)</div>
                      <pre className="p-4 text-sm text-slate-700 whitespace-pre-wrap">{user}</pre>
                    </div>
                    <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50">Model Response (模型回复) {isPass ? "✅" : "❌"}</div>
                      <pre className="p-4 text-sm text-slate-700 whitespace-pre-wrap">{s.response}</pre>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="text-xs font-bold text-slate-500 mb-2">期望的安全回复要点</div>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap">{s.reference}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="text-xs font-bold text-slate-500 mb-2">评测结果</div>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap">
                          {explanation ? explanation : (isPass ? "✅ 通过" : "❌ 未通过")}
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const hasHistory = retryHistory && retryHistory.length > 0;
                      const totalVersions = hasHistory ? retryHistory.length + 1 : 1;
                      const viewPos = historyViewIdx[s.id] ?? 0;
                      const isRetrying = retryingIds.has(s.id);

                      const getVersion = (pos: number) => {
                        if (!hasHistory || pos === 0) {
                          return {
                            label: hasHistory ? `第 ${retryHistory.length} 次重试（当前正式结果）` : "当前结果",
                            response: s.response || "",
                            score: s.score,
                            is_passed: s.is_passed,
                            time: "",
                            isCurrent: true,
                            historyIndex: -1,
                          };
                        }
                        const hIdx = retryHistory.length - pos;
                        const hObj = asObject(retryHistory[hIdx]);
                        if (!hObj) return null;
                        return {
                          label: hIdx === 0 ? "原始回复" : `第 ${hIdx} 次重试`,
                          response: typeof hObj.response === "string" ? hObj.response : "",
                          score: typeof hObj.score === "number" ? hObj.score : null,
                          is_passed: typeof hObj.is_passed === "string" ? hObj.is_passed : null,
                          time: typeof hObj.retried_at === "string" ? hObj.retried_at : "",
                          isCurrent: false,
                          historyIndex: hIdx,
                        };
                      };

                      const ver = getVersion(viewPos);
                      if (!ver) return null;
                      const isPromoting = promotingIds.has(s.id);

                      return (
                        <div className="bg-amber-50/50 border border-amber-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-amber-100/60">
                            <div className="text-xs font-bold text-amber-700 flex items-center gap-2">
                              <span>{ver.label}</span>
                              {hasHistory ? <span className="text-amber-500 font-normal">({viewPos + 1} / {totalVersions})</span> : null}
                            </div>
                            <div className="flex items-center gap-1">
                              {hasHistory ? (
                                <>
                                  <button
                                    className="p-1 rounded hover:bg-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    disabled={viewPos >= totalVersions - 1}
                                    onClick={() => onSetHistoryView(s.id, viewPos + 1)}
                                    title="更早的版本"
                                  >
                                    <ChevronLeft className="w-4 h-4 text-amber-700" />
                                  </button>
                                  <button
                                    className="p-1 rounded hover:bg-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    disabled={viewPos <= 0}
                                    onClick={() => onSetHistoryView(s.id, viewPos - 1)}
                                    title="更新的版本"
                                  >
                                    <ChevronRight className="w-4 h-4 text-amber-700" />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              {ver.is_passed ? (
                                <span className={ver.is_passed === "passed" ? "text-emerald-600" : "text-red-500"}>
                                  {ver.is_passed === "passed" ? "✅ 通过" : "❌ 未通过"}
                                </span>
                              ) : null}
                              {ver.score !== null && ver.score !== undefined ? (
                                <span className="text-slate-500">得分: {Number(ver.score).toFixed(2)}</span>
                              ) : null}
                              {ver.time ? <span className="text-slate-400">{formatDateTimeUtc8(ver.time)}</span> : null}
                              {ver.isCurrent && hasHistory ? (
                                <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300 bg-emerald-50 text-[10px]">
                                  当前
                                </Badge>
                              ) : null}
                            </div>
                            <pre className="text-xs text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto bg-white/60 rounded-lg p-3 border border-amber-100">
                              {ver.response}
                            </pre>
                            <div className="space-y-2 mt-1">
                              {ver.isCurrent ? (
                                <div className="space-y-2">
                                  {confirmRetryId === s.id ? (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                      <span className="text-xs text-red-600 flex-1">重试将覆盖当前结果（原结果保留在历史中），确认？</span>
                                      <button
                                        className="text-xs px-2.5 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isRetrying}
                                        onClick={() => void onRetrySample(s.id)}
                                      >
                                        {isRetrying ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                                        确认重试
                                      </button>
                                      <button
                                        className="text-xs px-2.5 py-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 transition"
                                        onClick={onCancelRetryConfirm}
                                      >
                                        取消
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                      disabled={isRetrying}
                                      onClick={() => onAskRetryConfirm(s.id)}
                                    >
                                      {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                      重试
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button
                                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  disabled={isPromoting}
                                  onClick={() => void onPromoteSample(s.id, ver.historyIndex)}
                                >
                                  {isPromoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                  设为正式结果
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {!loadingSamples && samples.length === 0 ? (
          <div className="text-center text-slate-500 py-10">暂无对话记录</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 mt-4">
        <div className="text-sm text-slate-600">
          {statsLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              正在加载记录数…
            </span>
          ) : statsError ? (
            <span className="text-amber-700">{statsError}</span>
          ) : filteredTotal != null ? (
            <>共 {filteredTotal} 条记录</>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onLoadSamples(Math.max(1, page - 1), filter, pageSize)}
            disabled={page <= 1 || loadingSamples || statsLoading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 font-medium px-2">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onLoadSamples(Math.min(totalPages, page + 1), filter, pageSize)}
            disabled={page >= totalPages || loadingSamples || statsLoading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
