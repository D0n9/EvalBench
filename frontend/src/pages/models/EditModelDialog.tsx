import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/client";
import { pollJob } from "@/api/pollJob";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SquarePen, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const MODEL_TYPES = [
  { value: "LLM", label: "大语言模型" },
  { value: "VLM", label: "多模态大模型" },
  { value: "Embedding", label: "Embedding模型" },
  { value: "CLIP", label: "CLIP模型" },
];

const DEFAULT_BODY_TEMPLATE = `{
  "prompt": "{{ prompt }}",
  "model": "{{ model }}",
  "max_tokens": {{ max_tokens | default(1024) }},
  "temperature": {{ temperature | default(0.7) }}
}`;

interface ModelConfig {
  id: string;
  name: string;
  evalscope_model_id: string;
  api_url: string | null;
  api_key?: string | null;
  api_protocol?: string;
  custom_api_config?: Record<string, unknown> | null;
  model_types: string[];
  is_public: boolean;
  is_readonly: boolean;
  team_id: string;
}

interface EditModelDialogProps {
  model: ModelConfig;
  onUpdated: () => void;
}

export function EditModelDialog({ model, onUpdated }: EditModelDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const extractCustomField = (field: string, fallback: string) => {
    const cfg = model.custom_api_config;
    if (!cfg) return fallback;
    return (cfg[field] as string) ?? fallback;
  };

  const extractMappingField = (field: string, fallback: string) => {
    const cfg = model.custom_api_config;
    if (!cfg) return fallback;
    const mapping = cfg.message_mapping as Record<string, unknown> | undefined;
    if (!mapping) return fallback;
    return (mapping[field] as string) ?? fallback;
  };

  const extractRoleMapping = (role: string, fallback: string) => {
    const cfg = model.custom_api_config;
    if (!cfg) return fallback;
    const mapping = cfg.message_mapping as Record<string, unknown> | undefined;
    if (!mapping) return fallback;
    const rm = mapping.role_mapping as Record<string, string> | undefined;
    if (!rm) return fallback;
    return rm[role] ?? fallback;
  };

  const buildFormFromModel = () => ({
    name: model.name,
    evalscope_model_id: model.evalscope_model_id,
    api_url: model.api_url || "",
    api_key: "",
    api_protocol: (model.api_protocol || "openai") as "openai" | "custom",
    model_types: model.model_types || ["LLM"],
    is_public: model.is_public,
    request_method: extractCustomField("request_method", "POST"),
    auth_type: extractCustomField("auth_type", "bearer"),
    auth_header_name: extractCustomField("auth_header_name", "X-Api-Key"),
    auth_query_param_name: extractCustomField("auth_query_param_name", "key"),
    input_format: extractCustomField("input_format", "prompt"),
    request_body_template: extractCustomField("request_body_template", DEFAULT_BODY_TEMPLATE),
    request_headers: model.custom_api_config?.request_headers ? JSON.stringify(model.custom_api_config.request_headers) : "",
    response_type: extractCustomField("response_type", "json"),
    response_content_path: extractCustomField("response_content_path", ""),
    message_separator: extractCustomField("message_separator", "\\n"),
    role_field: extractMappingField("role_field", "role"),
    content_field: extractMappingField("content_field", "content"),
    role_mapping_system: extractRoleMapping("system", "system"),
    role_mapping_user: extractRoleMapping("user", "user"),
    role_mapping_assistant: extractRoleMapping("assistant", "assistant"),
  });

  const [formData, setFormData] = useState(buildFormFromModel());

  useEffect(() => {
    if (open) {
      setFormData(buildFormFromModel());
      setTestResult(null);
      setShowAdvanced(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, model]);

  const buildCustomApiConfig = () => {
    const cfg: Record<string, unknown> = {
      request_method: formData.request_method,
      auth_type: formData.auth_type,
      input_format: formData.input_format,
      request_body_template: formData.request_body_template,
      response_type: formData.response_type,
      response_content_path: formData.response_content_path,
      message_separator: formData.message_separator,
    };
    if (formData.auth_type === "custom_header") cfg.auth_header_name = formData.auth_header_name;
    if (formData.auth_type === "query_param") cfg.auth_query_param_name = formData.auth_query_param_name;
    if (formData.request_headers.trim()) {
      try { cfg.request_headers = JSON.parse(formData.request_headers); } catch { /* skip */ }
    }
    if (formData.input_format === "messages") {
      cfg.message_mapping = {
        role_field: formData.role_field,
        content_field: formData.content_field,
        role_mapping: {
          system: formData.role_mapping_system,
          user: formData.role_mapping_user,
          assistant: formData.role_mapping_assistant,
        },
      };
    }
    return cfg;
  };

  const handleModelTypeToggle = (type: string) => {
    setFormData(prev => {
      const current = prev.model_types;
      if (current.includes(type)) {
        if (current.length === 1) return prev;
        return { ...prev, model_types: current.filter(t => t !== type) };
      } else {
        return { ...prev, model_types: [...current, type] };
      }
    });
  };

  const handleTestConnection = async () => {
    if (!formData.api_url) {
      toast({ title: t('models.error'), description: t('models.test_req_url'), variant: "destructive" });
      return;
    }
    if (formData.api_protocol === "openai" && !formData.evalscope_model_id) {
      toast({ title: t('models.error'), description: "请先填写模型 ID 再测试连接", variant: "destructive" });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const payload: Record<string, unknown> = {
        api_url: formData.api_url,
        api_key: formData.api_key || undefined,
        model_id: formData.evalscope_model_id,
        api_protocol: formData.api_protocol,
      };
      if (formData.api_protocol === "custom") {
        payload.custom_api_config = buildCustomApiConfig();
      }
      const submitRes = await apiClient.post("/models/test-connection", payload);
      const jobId: string = submitRes.data?.job_id;
      if (!jobId) throw new Error("未获取到 job_id");
      const jobResult = await pollJob<{ status: string; message: string }>(jobId, 1000, 60_000);
      if (jobResult.status === "completed" && jobResult.result) {
        if (jobResult.result.status === "success") {
          setTestResult("success");
          toast({ title: t('models.test_success'), description: jobResult.result.message || t('models.test_success_desc') });
        } else {
          setTestResult("error");
          toast({ title: t('models.test_failed'), description: jobResult.result.message, variant: "destructive" });
        }
      } else {
        setTestResult("error");
        toast({ title: t('models.test_failed'), description: jobResult.error || t('models.test_failed'), variant: "destructive" });
      }
    } catch (error) {
      setTestResult("error");
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: t('models.error'), description: err.response?.data?.message || t('models.test_failed'), variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        evalscope_model_id: formData.evalscope_model_id,
        api_url: formData.api_url || null,
        api_protocol: formData.api_protocol,
        model_types: formData.model_types,
        is_public: formData.is_public,
        is_readonly: model.is_readonly,
      };
      if (formData.api_key) updateData.api_key = formData.api_key;
      if (formData.api_protocol === "custom") {
        updateData.custom_api_config = buildCustomApiConfig();
      } else {
        updateData.custom_api_config = null;
      }
      await apiClient.put(`/models/${model.id}`, updateData);
      toast({ title: t('models.update_success'), description: t('models.update_success_desc') });
      setOpen(false);
      onUpdated();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({ title: t('models.update_error'), description: err?.response?.data?.detail || t('models.update_error_desc'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}
        className="text-slate-400 hover:text-[#00629B] hover:bg-blue-50">
        <SquarePen className="w-4 h-4" />
      </Button>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('models.edit_title')}</DialogTitle>
            <DialogDescription>{t('models.edit_desc')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('models.form_name')}</Label>
              <Input id="edit-name" value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model-id">{t('models.form_id')}</Label>
              <Input id="edit-model-id" value={formData.evalscope_model_id}
                onChange={e => setFormData({...formData, evalscope_model_id: e.target.value})} required />
            </div>

            <div className="space-y-3">
              <Label>{t('models.form_model_types') || "模型类型（可多选）"}</Label>
              <div className="flex flex-wrap gap-3">
                {MODEL_TYPES.map(type => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox id={`edit-model-type-${type.value}`}
                      checked={formData.model_types.includes(type.value)}
                      onCheckedChange={() => handleModelTypeToggle(type.value)} />
                    <Label htmlFor={`edit-model-type-${type.value}`} className="text-sm font-medium cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Protocol tabs */}
            <Tabs value={formData.api_protocol} onValueChange={v => setFormData({...formData, api_protocol: v as "openai" | "custom"})}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="openai">OpenAI API</TabsTrigger>
                <TabsTrigger value="custom">{t('models.custom_api') || "自定义 API"}</TabsTrigger>
              </TabsList>

              <TabsContent value="openai" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-api-url">{t('models.form_url')}</Label>
                  <Input id="edit-api-url" value={formData.api_url}
                    onChange={e => setFormData({...formData, api_url: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-api-key">{t('models.form_key')}</Label>
                  <div className="relative">
                    <Input id="edit-api-key" type={showKey ? "text" : "password"} placeholder={t('models.form_key_placeholder')}
                      className="pr-10"
                      value={formData.api_key} onChange={e => setFormData({...formData, api_key: e.target.value})} />
                    <button type="button" onClick={() => setShowKey(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">{t('models.form_key_hint')}</p>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t('models.custom_request_url') || "请求 URL"}</Label>
                  <Input placeholder="https://api.example.com/generate"
                    value={formData.api_url} onChange={e => setFormData({...formData, api_url: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('models.custom_request_method') || "请求方法"}</Label>
                    <Select value={formData.request_method} onValueChange={v => setFormData({...formData, request_method: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('models.custom_auth_type') || "认证方式"}</Label>
                    <Select value={formData.auth_type} onValueChange={v => setFormData({...formData, auth_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="custom_header">{t('models.custom_auth_header') || "自定义请求头"}</SelectItem>
                        <SelectItem value="query_param">Query 参数</SelectItem>
                        <SelectItem value="none">{t('models.custom_auth_none') || "无认证"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.auth_type !== "none" && (
                  <div className="space-y-2">
                    <Label>{t('models.form_key')}</Label>
                    <div className="relative">
                      <Input type={showKey ? "text" : "password"} placeholder={t('models.form_key_placeholder')}
                        className="pr-10"
                        value={formData.api_key} onChange={e => setFormData({...formData, api_key: e.target.value})} />
                      <button type="button" onClick={() => setShowKey(v => !v)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{t('models.form_key_hint')}</p>
                  </div>
                )}

                {formData.auth_type === "custom_header" && (
                  <div className="space-y-2">
                    <Label>{t('models.custom_auth_header_name') || "认证头名称"}</Label>
                    <Input placeholder="X-Api-Key" value={formData.auth_header_name}
                      onChange={e => setFormData({...formData, auth_header_name: e.target.value})} />
                  </div>
                )}

                {formData.auth_type === "query_param" && (
                  <div className="space-y-2">
                    <Label>{t('models.custom_auth_query_name') || "Query 参数名"}</Label>
                    <Input placeholder="key" value={formData.auth_query_param_name}
                      onChange={e => setFormData({...formData, auth_query_param_name: e.target.value})} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t('models.custom_input_format') || "输入格式"}</Label>
                  <Select value={formData.input_format} onValueChange={v => setFormData({...formData, input_format: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prompt">{t('models.custom_input_prompt') || "纯文本 Prompt"}</SelectItem>
                      <SelectItem value="messages">{t('models.custom_input_messages') || "消息数组 Messages"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('models.custom_body_template') || "请求体模板"}</Label>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Jinja2</span>
                  </div>
                  <Textarea className="font-mono text-xs h-32"
                    value={formData.request_body_template}
                    onChange={e => setFormData({...formData, request_body_template: e.target.value})} />
                  <p className="text-xs text-slate-500">
                    {t('models.custom_body_template_hint') || "可用变量：{{ prompt }}, {{ system_prompt }}, {{ user_prompt }}, {{ messages_json }}, {{ model }}, {{ max_tokens }}, {{ temperature }}, {{ top_p }}"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('models.custom_response_type') || "响应类型"}</Label>
                    <Select value={formData.response_type} onValueChange={v => setFormData({...formData, response_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="text">{t('models.custom_response_text') || "纯文本"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('models.custom_response_path') || "响应文本路径"}</Label>
                    <Input placeholder="data.result.text"
                      value={formData.response_content_path}
                      onChange={e => setFormData({...formData, response_content_path: e.target.value})} />
                  </div>
                </div>

                {/* Advanced */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setShowAdvanced(!showAdvanced)}>
                    <span className="text-xs font-medium text-slate-500">{t('models.custom_advanced') || "高级配置"}</span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                  {showAdvanced && (
                    <div className="space-y-4 mt-3">
                      <div className="space-y-2">
                        <Label className="text-xs">{t('models.custom_extra_headers') || "额外请求头 (JSON)"}</Label>
                        <Input placeholder='{"X-Custom-Header": "value"}'
                          value={formData.request_headers}
                          onChange={e => setFormData({...formData, request_headers: e.target.value})} />
                      </div>
                      {formData.input_format === "messages" && (
                        <div className="border rounded-lg p-3 bg-slate-50 space-y-3">
                          <Label className="text-xs font-medium">{t('models.custom_message_mapping') || "消息字段映射"}</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">{t('models.custom_role_field') || "角色字段名"}</Label>
                              <Input className="h-8 text-xs" value={formData.role_field}
                                onChange={e => setFormData({...formData, role_field: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t('models.custom_content_field') || "内容字段名"}</Label>
                              <Input className="h-8 text-xs" value={formData.content_field}
                                onChange={e => setFormData({...formData, content_field: e.target.value})} />
                            </div>
                          </div>
                          <Label className="text-xs">{t('models.custom_role_mapping') || "角色名映射"}</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-slate-400">system →</Label>
                              <Input className="h-7 text-xs" value={formData.role_mapping_system}
                                onChange={e => setFormData({...formData, role_mapping_system: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-slate-400">user →</Label>
                              <Input className="h-7 text-xs" value={formData.role_mapping_user}
                                onChange={e => setFormData({...formData, role_mapping_user: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-slate-400">assistant →</Label>
                              <Input className="h-7 text-xs" value={formData.role_mapping_assistant}
                                onChange={e => setFormData({...formData, role_mapping_assistant: e.target.value})} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="edit-is-public" checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({...formData, is_public: checked as boolean})} />
              <Label htmlFor="edit-is-public" className="text-sm font-medium leading-none cursor-pointer">
                {t('datasets.form_public') || "公开"}
              </Label>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleTestConnection}
                disabled={testing || !formData.api_url || (formData.api_protocol === "openai" && !formData.evalscope_model_id)}>
                {testing ? t('models.testing_btn') : t('models.test_btn')}
              </Button>
              {testResult === 'success' && <span className="text-green-500 text-sm">✓</span>}
              {testResult === 'error' && <span className="text-red-500 text-sm">✗</span>}
            </div>
            <Button type="submit" disabled={loading} className="bg-[#00629B] hover:bg-[#005080]">
              {loading ? t('models.saving_btn') : t('models.save_btn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
