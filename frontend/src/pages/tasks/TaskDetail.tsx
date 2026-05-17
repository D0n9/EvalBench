import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2, RotateCcw, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeUtc8 } from "@/lib/datetime";

interface TaskConfig {
  model_id: string;
  model: string;
  datasets: string[];
  limit: number;
  [key: string]: unknown;
}

interface Task {
  id: string;
  name: string;
  status: string;
  task_type: string;
  created_at: string;
  config: TaskConfig;
}

interface ResultSummary {
  id: string;
  model_name: string;
  dataset_name: string;
  score: number;
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const fetchTask = useCallback(async (signal?: AbortSignal) => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/tasks/${id}`, { signal });
      setTask(res.data);
      
      if (res.data.status === "completed") {
        setLoadingResults(true);
        try {
          const resultsRes = await apiClient.get(`/results/task/${id}`, { signal });
          setResults(resultsRes.data);
        } catch (err) {
          if (signal?.aborted) return;
          console.error("Failed to fetch results", err);
        } finally {
          if (!signal?.aborted) {
            setLoadingResults(false);
          }
        }
      }
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to fetch task", error);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTask(controller.signal);
    return () => controller.abort();
  }, [fetchTask]);

  if (!task) return <div>{t('tasks.loading')}</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-4 h-4 mr-1"/> {t('tasks.status_completed')}</Badge>;
      case "running":
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Loader2 className="w-4 h-4 mr-1 animate-spin"/> {t('tasks.status_running')}</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1"/> {t('tasks.status_failed')}</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1"/> 已终止</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-4 h-4 mr-1"/> {t('tasks.status_pending')}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-4 h-4 mr-1"/> {status}</Badge>;
    }
  };

  const handleRerun = async () => {
    try {
      const res = await apiClient.post(`/tasks/${id}/rerun`);
      toast({
        title: "重新运行",
        description: "任务已成功重新启动",
      });
      navigate(`/tasks/${res.data.id}`);
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: "启动失败",
        description: err.response?.data?.detail || "无法重新运行任务",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('tasks.detail_title', { name: task.name })}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('tasks.detail_created', { date: formatDateTimeUtc8(task.created_at) })}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {getStatusBadge(task.status)}
          <Button variant="outline" onClick={handleRerun} title="重新运行">
            <RotateCcw className="w-4 h-4 mr-2" />
            重新运行
          </Button>
        </div>
      </div>

      {task.status === "completed" && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-lg flex items-center gap-2">
              评测结果摘要
              {loadingResults && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              {results.length > 0 ? "点击数据集查看详细分析与对话记录" : "暂无结果数据"}
            </CardDescription>
          </CardHeader>
          {results.length > 0 ? (
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>评测模型</TableHead>
                    <TableHead>数据集</TableHead>
                    <TableHead className="text-right">总得分</TableHead>
                    <TableHead className="w-[120px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">{res.model_name}</TableCell>
                      <TableCell>{res.dataset_name}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-600">
                        {res.score != null ? `${(res.score * 100).toFixed(2)}%` : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/results/${res.id}`)}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          ) : !loadingResults && (
            <CardContent className="py-8 text-center text-slate-500">
              {results.length === 0 ? "该任务暂无评测结果" : ""}
            </CardContent>
          )}
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t('tasks.config')}</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-50 p-4 rounded-md text-xs font-mono text-slate-700 overflow-x-auto border border-slate-200">
            {JSON.stringify(task.config, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
