import { useEffect, useState } from "react";
import { apiClient } from "@/api/client";
import { CreateModelDialog } from "./CreateModelDialog";
import { EditModelDialog } from "./EditModelDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Globe, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/store/auth";

interface ModelConfig {
  id: string;
  name: string;
  evalscope_model_id: string;
  api_url: string | null;
  api_protocol?: string;
  custom_api_config?: Record<string, unknown> | null;
  model_types: string[];
  is_public: boolean;
  is_readonly: boolean;
  team_id: string;
}

const MODEL_TYPE_LABELS: Record<string, string> = {
  LLM: "大语言模型",
  VLM: "多模态大模型",
  Embedding: "Embedding模型",
  CLIP: "CLIP模型",
};

export default function ModelsPage() {
  const { user } = useAuthStore();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const canModify = (model: ModelConfig) => {
    return user?.is_superuser || model.team_id === user?.team_id;
  };

  const fetchModels = async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get("/models/", { signal });
      setModels(res.data);
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to fetch models", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchModels(controller.signal);
    return () => controller.abort();
  }, []);

  const handleDelete = async (id: string) => {
    setModelToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return;
    try {
      await apiClient.delete(`/models/${modelToDelete}`);
      toast({ title: t('models.deleted'), description: t('models.deleted_desc') });
      fetchModels();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t('models.error'),
        description: err.response?.data?.detail || t('models.error_desc'),
        variant: "destructive"
      });
    }
  };

  const handleToggleVisibility = async (model: ModelConfig) => {
    if (togglingIds.has(model.id)) return;
    
    const newIsPublic = !model.is_public;
    setTogglingIds(prev => new Set(prev).add(model.id));

    // Optimistic update
    setModels(prev => prev.map(m => 
      m.id === model.id ? { ...m, is_public: newIsPublic } : m
    ));

    try {
      await apiClient.put(`/models/${model.id}`, {
        ...model,
        is_public: newIsPublic,
      });
      toast({
        title: t('models.visibility_updated'),
        description: newIsPublic ? t('models.visibility_public_desc') : t('models.visibility_team_desc')
      });
    } catch (error) {
      // Revert on error
      setModels(prev => prev.map(m => 
        m.id === model.id ? { ...m, is_public: model.is_public } : m
      ));
      
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t('models.error'),
        description: err.response?.data?.detail || t('models.visibility_error'),
        variant: "destructive"
      });
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(model.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('models.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('models.desc')}
          </p>
        </div>
        <CreateModelDialog onCreated={fetchModels} />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[200px]">{t('models.table_name')}</TableHead>
                <TableHead>{t('models.table_id')}</TableHead>
                <TableHead>模型类型</TableHead>
                <TableHead>{t('models.table_visibility')}</TableHead>
                <TableHead className="text-right">{t('models.table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    {t('models.loading')}
                  </TableCell>
                </TableRow>
              ) : models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    {t('models.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        {model.name}
                        {model.api_protocol === "custom" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600 bg-orange-50">
                            {t('models.custom_api') || "自定义"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">
                      {model.evalscope_model_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {model.model_types?.map(type => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {MODEL_TYPE_LABELS[type] || type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={model.is_public}
                          onCheckedChange={() => handleToggleVisibility(model)}
                          disabled={togglingIds.has(model.id) || !canModify(model)}
                        />
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          {model.is_public ? (
                            <>
                              <Globe className="w-3 h-3 text-blue-500" />
                              <span>{t('models.public')}</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-3 h-3" />
                              <span>{t('models.team_only')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canModify(model) ? (
                          <>
                            <EditModelDialog model={model} onUpdated={fetchModels} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(model.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200">
                            {t('common.readonly') || "只读"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('models.delete_confirm')}
        description={t('models.delete_confirm_desc')}
        confirmText={t('models.delete_btn')}
        cancelText={t('models.cancel_btn')}
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
}
