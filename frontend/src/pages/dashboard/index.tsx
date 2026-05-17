import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { Loader2, Activity, Database, Cpu, BarChart3, CheckCircle2, Clock, XCircle, ChevronRight, TrendingUp, PieChart, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStats {
  total_models: number;
  total_datasets: number;
  running_tasks: number;
  total_evaluations: number;
}

interface RecentActivity {
  task_id: string;
  task_name: string;
  model_name: string;
  dataset_name: string | null;
  score: number | null;
  status: string;
  created_at: string;
}

interface ModelRanking {
  model_name: string;
  avg_score: number;
  eval_count: number;
}

interface DatasetUsage {
  dataset_name: string;
  display_name: string | null;
  eval_count: number;
  avg_score: number | null;
}

interface PassRateStats {
  overall_pass_rate: number;
  total_samples: number;
  passed_samples: number;
  failed_samples: number;
}

interface DashboardData {
  stats: DashboardStats;
  recent_activity: RecentActivity[];
  model_ranking: ModelRanking[];
  dataset_usage: DatasetUsage[];
  pass_rate: PassRateStats;
}

function scoreColor(score: number): string {
  if (score >= 0.8) return "text-emerald-500";
  if (score >= 0.5) return "text-amber-500";
  return "text-red-500";
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchDashboardData = async () => {
      try {
        const response = await apiClient.get("/dashboard/", { signal: controller.signal });
        setData(response.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = data?.stats;
  const activities = data?.recent_activity || [];
  const modelRanking = data?.model_ranking || [];
  const datasetUsage = data?.dataset_usage || [];
  const passRate = data?.pass_rate;

  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.active_models')}</CardTitle>
            <Cpu className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_models || 0}</div>
            <p className="text-xs text-muted-foreground">已连接的 LLM 接口</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.datasets')}</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_datasets || 0}</div>
            <p className="text-xs text-muted-foreground">可用的评测数据集</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.tasks_running')}</CardTitle>
            <Activity className="w-4 h-4 text-primary animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.running_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">正在进行的异步评测</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.total_evaluations')}</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_evaluations || 0}</div>
            <p className="text-xs text-muted-foreground">累计完成的评测任务</p>
          </CardContent>
        </Card>
      </div>

      {/* 中间一行：欢迎卡片 + 近期活动 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-none bg-gradient-to-br from-[#00629B] to-[#0088CC] text-white shadow-lg flex flex-col h-[260px]">
          <CardHeader>
            <CardTitle className="text-2xl">{t('dashboard.welcome_back', { name: user?.full_name })}</CardTitle>
            <CardDescription className="text-white/80 mt-2 text-base">
              {t('dashboard.welcome_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 mt-auto">
            <div className="flex gap-3">
              <Link to="/tasks/create">
                <button className="px-4 py-2 bg-white text-[#00629B] font-semibold rounded-lg hover:bg-white/90 transition shadow-sm">
                  发起新评测
                </button>
              </Link>
              <Link to="/models">
                <button className="px-4 py-2 bg-white/15 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/25 transition">
                  管理模型
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[260px]">
          <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between pb-2">
            <CardTitle>{t('dashboard.recent_activity')}</CardTitle>
            <Link to="/tasks" className="text-xs text-[#00629B] hover:underline flex items-center">
              查看全部 <ChevronRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.slice(0, 5).map((activity) => (
                  <Link 
                    key={activity.task_id} 
                    to={`/tasks/${activity.task_id}`}
                    className="flex items-center p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition group"
                  >
                    <div className="mr-3 flex-shrink-0">
                      {activity.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : activity.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#00629B]">
                        {activity.task_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {activity.model_name} · {activity.dataset_name || 'N/A'}
                      </p>
                    </div>
                    {activity.score !== null && (
                      <div className="ml-2 text-right flex-shrink-0">
                        <div className="text-sm font-bold text-[#00629B]">
                          {activity.score.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">得分</div>
                      </div>
                    )}
                  </Link>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 italic text-sm">
                  暂无近期活动记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部一行：通过率 + 模型排行 + 数据集使用 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 通过率统计卡片 */}
        <Card className="flex flex-col max-h-[250px]">
          <CardHeader className="flex-shrink-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00629B]" />
              通过率统计
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4">
              <div className="text-center">
                <div className={`text-4xl font-bold ${scoreColor((passRate?.overall_pass_rate || 0) / 100)}`}>
                  {(passRate?.overall_pass_rate || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">整体通过率</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    通过样本
                  </span>
                  <span className="font-semibold text-emerald-600">{passRate?.passed_samples || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    未通过样本
                  </span>
                  <span className="font-semibold text-red-600">{passRate?.failed_samples || 0}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-600">总样本数</span>
                  <span className="font-semibold">{passRate?.total_samples || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 模型评分排行榜 */}
        <Card className="flex flex-col max-h-[250px]">
          <CardHeader className="flex-shrink-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#00629B]" />
              模型评分排行
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {modelRanking.length > 0 ? (
              <div className="space-y-3">
                {modelRanking.map((model, idx) => (
                  <div key={model.model_name} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{model.model_name}</p>
                      <p className="text-xs text-slate-400">{model.eval_count} 次评测</p>
                    </div>
                    <div className={`text-sm font-bold ${scoreColor(model.avg_score)}`}>
                      {model.avg_score.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                暂无评测数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 数据集使用统计 */}
        <Card className="flex flex-col max-h-[250px]">
          <CardHeader className="flex-shrink-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#00629B]" />
              数据集使用统计
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {datasetUsage.length > 0 ? (
              <div className="space-y-3">
                {datasetUsage.map((dataset) => (
                  <div key={dataset.dataset_name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">
                        {dataset.display_name || dataset.dataset_name}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{dataset.eval_count} 次</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#00629B] transition-all"
                          style={{ 
                            width: `${Math.min((dataset.eval_count / (datasetUsage[0]?.eval_count || 1)) * 100, 100)}%` 
                          }} 
                        />
                      </div>
                      {dataset.avg_score !== null && (
                        <span className={`text-xs font-bold ${scoreColor(dataset.avg_score)} w-12 text-right`}>
                          {dataset.avg_score.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                暂无评测数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
