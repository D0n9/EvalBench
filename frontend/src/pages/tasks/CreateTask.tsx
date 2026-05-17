import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, X, RefreshCw, Settings2, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface DatasetGroup {
  category: string;
  datasets: Dataset[];
  count: number;
}

interface Dataset {
  id: string;
  name: string;
  standard_name?: string;
  tags?: string[];
  subsets?: string[] | null;
  link?: string;
  is_builtin: boolean;
}

interface ModelConfig {
  id: string;
  name: string;
  evalscope_model_id: string;
  api_url: string | null;
  api_key?: string | null;
  api_protocol?: string;
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

const ALL_TAGS = [
  "Knowledge", "Reasoning", "Math", "MCQ", "Commonsense", "Chinese",
  "Coding", "InstructionFollowing", "Arena", "MultiModal", "NER",
  "LongContext", "QA", "Yes/No", "Retrieval", "ReadingComprehension",
  "MultiLingual", "Medical", "Hallucination", "MachineTranslation", "MultiTurn",
  "Grounding", "ImageCaptioning", "Custom", "Other"
];

export default function CreateTask() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [datasetGroups, setDatasetGroups] = useState<DatasetGroup[]>([]);
  const [allDatasetsRaw, setAllDatasetsRaw] = useState<Dataset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState({
    generation: false,
    dataset: false,
    evaluation: false,
    judge: false,
    other: false,
  });
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const [selectedSubsets, setSelectedSubsets] = useState<Record<string, string[]>>({});
  const [subsetSearch, setSubsetSearch] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    task_type: "eval",
    selected_model: "",
    selected_datasets: [] as string[],
    limit: 10 as number | "",
    repeats: "" as number | "",
    dataset_hub: "",
    timeout: "" as number | "",
    retries: "" as number | "",
    retry_interval: "" as number | "",
    stream: false,
    max_tokens: "" as number | "",
    top_p: "" as number | "",
    temperature: "" as number | "",
    frequency_penalty: "" as number | "",
    presence_penalty: "" as number | "",
    logit_bias: "",
    seed: "" as number | "",
    do_sample: false,
    top_k: "" as number | "",
    logprobs: false,
    top_logprobs: "" as number | "",
    parallel_tool_calls: false,
    max_tool_output: "" as number | "",
    extra_body: "",
    extra_query: "",
    extra_headers: "",
    height: "" as number | "",
    width: "" as number | "",
    num_inference_steps: "" as number | "",
    guidance_scale: "" as number | "",
    review_timeout: "" as number | "",
    prompt_template: "",
    system_prompt: "",
    few_shot_num: "" as number | "",
    few_shot_random: false,
    shuffle: false,
    shuffle_choices: false,
    metric_list: "",
    aggregation: "",
    filters: "",
    force_redownload: false,
    extra_params: "",
    enable_judge: false,
    judge_model_id: "",
    judge_model_name: "",
    judge_api_url: "",
    judge_api_key: "",
    judge_model_revision: "",
    judge_strategy: "",
    judge_score_type: "",
    judge_score_pattern: "",
    judge_score_mapping: "",
    judge_system_prompt: "",
    judge_prompt_template: "",
    judge_temperature: "" as number | "",
    judge_max_tokens: "" as number | "",
    judge_top_p: "" as number | "",
    judge_seed: "" as number | "",
    judge_do_sample: false,
    judge_extra_gen_config: "",
    eval_type: "",
    eval_backend: "",
    eval_config: "",
    eval_batch_size: "" as number | "",
    analysis_report: false,
    rerun_review: false,
    use_cache: "",
    enable_progress_tracker: true,
    debug: false,
    ignore_errors: false,
    dry_run: false,
  });

  useEffect(() => {
    Promise.all([
      apiClient.get("/models/"),
      apiClient.get("/datasets/grouped"),
      apiClient.get("/datasets/")
    ]).then(([modelsRes, groupedRes, allRes]) => {
      setModels(modelsRes.data);
      setDatasetGroups(groupedRes.data);
      setAllDatasetsRaw(allRes.data);
    }).catch(err => {
      console.error(err);
      toast({ title: t('tasks.start_failed'), description: "Failed to load configuration options", variant: "destructive" });
    });
  }, [toast, t]);

  const refreshModels = () => {
    setModelsLoading(true);
    apiClient.get("/models/").then(res => {
      setModels(res.data);
      setModelsLoading(false);
    }).catch(() => {
      setModelsLoading(false);
    });
  };

  const allDatasets = useMemo(() => {
    const builtinDatasets = datasetGroups.flatMap(g => g.datasets);
    const customDatasets = allDatasetsRaw.filter(d => !d.is_builtin);
    const existingNames = new Set(builtinDatasets.map(d => d.name));
    const uniqueCustom = customDatasets.filter(d => !existingNames.has(d.name));
    return [...builtinDatasets, ...uniqueCustom];
  }, [datasetGroups, allDatasetsRaw]);

  const filteredDatasets = useMemo(() => {
    let result = allDatasets;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(query) ||
        (d.standard_name && d.standard_name.toLowerCase().includes(query))
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter(d => 
        d.tags && selectedTags.some(tag => d.tags!.includes(tag))
      );
    }
    return result;
  }, [allDatasets, searchQuery, selectedTags]);

  const hasQaDatasetSelected = useMemo(() => {
    return formData.selected_datasets.some(dsName => {
      const ds = allDatasets.find(d => d.name === dsName);
      return ds?.tags?.some(tag => tag.toUpperCase() === "QA");
    });
  }, [formData.selected_datasets, allDatasets]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  const parseJsonField = (value: string): Record<string, unknown> | undefined => {
    if (!value.trim()) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.selected_model || formData.selected_datasets.length === 0) {
      toast({ title: t('tasks.val_err'), description: t('tasks.val_err_desc'), variant: "destructive" });
      return;
    }

    if (formData.enable_judge && !formData.judge_model_id) {
      toast({ title: "校验错误", description: "请选择一个裁判模型", variant: "destructive" });
      return;
    }

    const emptySubsetDs = formData.selected_datasets.find(dsName => {
      const ds = allDatasets.find(d => d.name === dsName);
      if (ds?.subsets && ds.subsets.length > 1 && selectedSubsets[dsName]) {
        return selectedSubsets[dsName].length === 0;
      }
      return false;
    });
    if (emptySubsetDs) {
      const dsLabel = allDatasets.find(d => d.name === emptySubsetDs)?.standard_name || emptySubsetDs;
      toast({ title: "校验错误", description: `${dsLabel} 至少需要选择一个子集`, variant: "destructive" });
      return;
    }

    if (formData.extra_body.trim() || formData.extra_query.trim() || formData.extra_headers.trim() || formData.filters.trim() || formData.extra_params.trim()) {
      try {
        if (formData.extra_body.trim()) JSON.parse(formData.extra_body);
        if (formData.extra_query.trim()) JSON.parse(formData.extra_query);
        if (formData.extra_headers.trim()) JSON.parse(formData.extra_headers);
        if (formData.filters.trim()) JSON.parse(formData.filters);
        if (formData.extra_params.trim()) JSON.parse(formData.extra_params);
      } catch {
        toast({ title: "参数格式错误", description: "JSON 格式参数必须为有效的 JSON 格式", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    const modelObj = models.find(m => m.evalscope_model_id === formData.selected_model);

    let logitBiasDict: Record<string, number> | undefined = undefined;
    if (formData.logit_bias.trim()) {
      logitBiasDict = {};
      formData.logit_bias.split(',').forEach(item => {
        const [k, v] = item.split('=');
        if (k && v) logitBiasDict![k.trim()] = parseInt(v.trim());
      });
    }

    const metricList = formData.metric_list.trim() ? formData.metric_list.split(',').map(s => s.trim()) : undefined;

    const config: Record<string, unknown> = {
      model_id: modelObj?.id,
      model: formData.selected_model,
      datasets: formData.selected_datasets,
    };

    if (modelObj?.api_url) config.api_url = modelObj.api_url;
    if (formData.limit !== "") config.limit = formData.limit;
    if (formData.repeats !== "") config.repeats = formData.repeats;
    if (formData.dataset_hub) config.dataset_hub = formData.dataset_hub;

    const genConfig: Record<string, unknown> = {};
    if (formData.timeout !== "") genConfig.timeout = formData.timeout;
    if (formData.retries !== "") genConfig.retries = formData.retries;
    if (formData.retry_interval !== "") genConfig.retry_interval = formData.retry_interval;
    if (formData.stream) genConfig.stream = formData.stream;
    if (formData.max_tokens !== "") genConfig.max_tokens = formData.max_tokens;
    if (formData.top_p !== "") genConfig.top_p = formData.top_p;
    if (formData.temperature !== "") genConfig.temperature = formData.temperature;
    if (formData.frequency_penalty !== "") genConfig.frequency_penalty = formData.frequency_penalty;
    if (formData.presence_penalty !== "") genConfig.presence_penalty = formData.presence_penalty;
    if (logitBiasDict) genConfig.logit_bias = logitBiasDict;
    if (formData.seed !== "") genConfig.seed = formData.seed;
    if (formData.do_sample) genConfig.do_sample = formData.do_sample;
    if (formData.top_k !== "") genConfig.top_k = formData.top_k;
    if (formData.logprobs) genConfig.logprobs = formData.logprobs;
    if (formData.top_logprobs !== "") genConfig.top_logprobs = formData.top_logprobs;
    if (formData.parallel_tool_calls) genConfig.parallel_tool_calls = formData.parallel_tool_calls;
    if (formData.max_tool_output !== "") genConfig.max_tool_output = formData.max_tool_output;
    
    const extraBody = parseJsonField(formData.extra_body);
    if (extraBody) genConfig.extra_body = extraBody;
    const extraQuery = parseJsonField(formData.extra_query);
    if (extraQuery) genConfig.extra_query = extraQuery;
    const extraHeaders = parseJsonField(formData.extra_headers);
    if (extraHeaders) genConfig.extra_headers = extraHeaders;
    
    if (formData.height !== "") genConfig.height = formData.height;
    if (formData.width !== "") genConfig.width = formData.width;
    if (formData.num_inference_steps !== "") genConfig.num_inference_steps = formData.num_inference_steps;
    if (formData.guidance_scale !== "") genConfig.guidance_scale = formData.guidance_scale;

    if (Object.keys(genConfig).length > 0) {
      config.generation_config = genConfig;
    }

    const datasetArgs: Record<string, unknown> = {};
    if (formData.review_timeout !== "") datasetArgs.review_timeout = formData.review_timeout;
    if (formData.few_shot_num !== "") datasetArgs.few_shot_num = formData.few_shot_num;
    if (formData.few_shot_random) datasetArgs.few_shot_random = formData.few_shot_random;
    if (formData.shuffle) datasetArgs.shuffle = formData.shuffle;
    if (formData.shuffle_choices) datasetArgs.shuffle_choices = formData.shuffle_choices;
    if (formData.prompt_template) datasetArgs.prompt_template = formData.prompt_template;
    if (formData.system_prompt) datasetArgs.system_prompt = formData.system_prompt;
    if (metricList) datasetArgs.metric_list = metricList;
    if (formData.aggregation) datasetArgs.aggregation = formData.aggregation;
    
    const filters = parseJsonField(formData.filters);
    if (filters) datasetArgs.filters = filters;
    if (formData.force_redownload) datasetArgs.force_redownload = formData.force_redownload;
    const extraParams = parseJsonField(formData.extra_params);
    if (extraParams) datasetArgs.extra_params = extraParams;

    for (const dsName of formData.selected_datasets) {
      const dsObj = allDatasets.find(d => d.name === dsName);
      const dsSubsets = selectedSubsets[dsName];
      if (dsObj?.subsets && dsObj.subsets.length > 1 && dsSubsets && dsSubsets.length > 0 && dsSubsets.length < dsObj.subsets.length) {
        if (!datasetArgs[dsName]) datasetArgs[dsName] = {};
        (datasetArgs[dsName] as Record<string, unknown>).subset_list = dsSubsets;
      }
    }

    if (Object.keys(datasetArgs).length > 0) {
      config.dataset_args = datasetArgs;
    }

    // 评测参数
    if (formData.eval_type && formData.eval_type !== "auto") {
      config.eval_type = formData.eval_type;
    }
    if (formData.eval_backend && formData.eval_backend !== "Native") {
      config.eval_backend = formData.eval_backend;
    }
    if (formData.eval_batch_size !== "") {
      config.eval_batch_size = formData.eval_batch_size;
    }
    if (formData.eval_config.trim()) {
      config.eval_config = formData.eval_config;
    }

    if (formData.enable_judge && (formData.judge_model_id || formData.judge_model_name)) {
      if (formData.judge_strategy) config.judge_strategy = formData.judge_strategy;
      if (formData.analysis_report) config.analysis_report = formData.analysis_report;
      
      const judgeModelDict: Record<string, unknown> = {
        model_id: formData.judge_model_name,
        model_config_id: formData.judge_model_id, // 发送数据库 ID
      };
      
      if (formData.judge_model_revision) judgeModelDict.model_revision = formData.judge_model_revision;
      if (formData.judge_api_url) judgeModelDict.api_url = formData.judge_api_url.trim().replace(/^`|`$/g, '');
      if (formData.judge_api_key && formData.judge_api_key !== "EMPTY") judgeModelDict.api_key = formData.judge_api_key.trim();
      if (formData.judge_score_type) judgeModelDict.score_type = formData.judge_score_type;
      if (formData.judge_score_pattern) judgeModelDict.score_pattern = formData.judge_score_pattern;
      
      if (formData.judge_score_type === "pattern" && formData.judge_score_mapping.trim()) {
        try {
          judgeModelDict.score_mapping = JSON.parse(formData.judge_score_mapping);
        } catch {
          // ignore invalid JSON
        }
      }
      if (formData.judge_system_prompt.trim()) {
        judgeModelDict.system_prompt = formData.judge_system_prompt;
      }
      if (formData.judge_prompt_template.trim()) {
        judgeModelDict.prompt_template = formData.judge_prompt_template;
      }
      const judgeGenCfg: Record<string, unknown> = {};
      if (formData.judge_temperature !== "") judgeGenCfg.temperature = formData.judge_temperature;
      if (formData.judge_max_tokens !== "") judgeGenCfg.max_tokens = formData.judge_max_tokens;
      if (formData.judge_top_p !== "") judgeGenCfg.top_p = formData.judge_top_p;
      if (formData.judge_seed !== "") judgeGenCfg.seed = formData.judge_seed;
      if (formData.judge_do_sample) judgeGenCfg.do_sample = true;
      if (formData.judge_extra_gen_config.trim()) {
        try {
          const extra = JSON.parse(formData.judge_extra_gen_config);
          if (typeof extra === "object" && extra !== null) Object.assign(judgeGenCfg, extra);
        } catch { /* ignore */ }
      }
      if (Object.keys(judgeGenCfg).length > 0) {
        judgeModelDict.generation_config = judgeGenCfg;
      }
      config.judge_model = judgeModelDict;
    }

    // 其他参数
    if (formData.use_cache.trim()) {
      config.use_cache = formData.use_cache;
    }
    if (formData.rerun_review) {
      config.rerun_review = true;
    }
    if (formData.enable_progress_tracker) {
      config.enable_progress_tracker = true;
    }
    if (formData.debug) {
      config.debug = true;
    }
    if (formData.ignore_errors) {
      config.ignore_errors = true;
    }
    if (formData.dry_run) {
      config.dry_run = true;
    }

    try {
      const res = await apiClient.post("/tasks/", {
        name: formData.name,
        task_type: formData.task_type,
        config: config
      });
      toast({ title: t('tasks.start_success'), description: t('tasks.start_success_desc') });
      navigate(`/tasks/${res.data.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t('tasks.start_failed'),
        description: err.response?.data?.detail || t('tasks.start_failed_desc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetToggle = (datasetName: string) => {
    const dsObj = allDatasets.find(d => d.name === datasetName);
    setFormData(prev => {
      const current = prev.selected_datasets;
      const isRemoving = current.includes(datasetName);
      const newSelected = isRemoving
        ? current.filter(d => d !== datasetName)
        : [...current, datasetName];
      return { ...prev, selected_datasets: newSelected };
    });
    if (allDatasets.find(d => d.name === datasetName)?.subsets?.length) {
      if (!formData.selected_datasets.includes(datasetName)) {
        setSelectedSubsets(prev => ({
          ...prev,
          [datasetName]: [...(dsObj?.subsets || [])],
        }));
        setExpandedDatasets(prev => new Set(prev).add(datasetName));
      } else {
        setSelectedSubsets(prev => {
          const next = { ...prev };
          delete next[datasetName];
          return next;
        });
        setExpandedDatasets(prev => {
          const next = new Set(prev);
          next.delete(datasetName);
          return next;
        });
      }
    }
  };

  const toggleDatasetExpand = (datasetName: string) => {
    setExpandedDatasets(prev => {
      const next = new Set(prev);
      if (next.has(datasetName)) next.delete(datasetName);
      else next.add(datasetName);
      return next;
    });
  };

  const handleSubsetToggle = (datasetName: string, subsetName: string) => {
    setSelectedSubsets(prev => {
      const current = prev[datasetName] || [];
      const isSelected = current.includes(subsetName);
      return {
        ...prev,
        [datasetName]: isSelected
          ? current.filter(s => s !== subsetName)
          : [...current, subsetName],
      };
    });
  };

  const handleSubsetSelectAll = (datasetName: string, allSubsets: string[]) => {
    setSelectedSubsets(prev => {
      const current = prev[datasetName] || [];
      const allSelected = allSubsets.length === current.length;
      return {
        ...prev,
        [datasetName]: allSelected ? [] : [...allSubsets],
      };
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('tasks.create_title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('tasks.create_desc')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>任务名称</Label>
              <Input 
                placeholder="例如: Qwen2.5-72B GSM8K 评测" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                maxLength={24}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>目标模型</Label>
                  {models.length === 0 && (
                    <span className="text-xs text-orange-500">请先添加模型</span>
                  )}
                </div>
                <Select 
                  value={formData.selected_model} 
                  onValueChange={v => {
                    if (v === "__add_model__") {
                      window.open('/models', '_blank');
                    } else if (v === "__refresh__") {
                      refreshModels();
                    } else {
                      setFormData({...formData, selected_model: v});
                    }
                  }}
                >
                  <SelectTrigger className={models.length === 0 ? "border-orange-300 bg-orange-50" : ""}>
                    <SelectValue placeholder={models.length === 0 ? "暂无模型，点击添加" : "选择模型"} />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsLoading && (
                      <div className="flex items-center justify-center py-2 text-sm text-slate-400">刷新中...</div>
                    )}
                    {!modelsLoading && models.length === 0 && (
                      <SelectItem value="__add_model__" className="text-orange-600 font-medium">+ 添加模型</SelectItem>
                    )}
                    {!modelsLoading && models.map(m => (
                      <SelectItem key={m.id} value={m.evalscope_model_id}>
                        {m.name} ({m.evalscope_model_id})
                        {m.api_protocol === "custom" && (
                          <span className="ml-1 text-[10px] px-1 py-0 bg-orange-100 text-orange-600 rounded">自定义</span>
                        )}
                        {m.model_types?.length > 0 && (
                          <span className="ml-2 text-xs text-slate-400">
                            [{m.model_types.map(t => MODEL_TYPE_LABELS[t] || t).join(", ")}]
                          </span>
                        )}
                      </SelectItem>
                    ))}
                    {models.length > 0 && (
                      <SelectItem value="__add_model__" className="text-slate-500">+ 添加更多模型</SelectItem>
                    )}
                    <div 
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-500 cursor-pointer hover:bg-slate-100 rounded-sm mx-1 my-1"
                      onClick={(e) => { e.stopPropagation(); refreshModels(); }}
                    >
                      <RefreshCw className={`w-4 h-4 ${modelsLoading ? 'animate-spin' : ''}`} />
                      刷新模型列表
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>任务类型</Label>
                </div>
                <Select value={formData.task_type} onValueChange={v => setFormData({...formData, task_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eval">评测任务 (eval)</SelectItem>
                    <SelectItem value="perf" disabled>性能测试 (perf)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>样本数量限制</Label>
                <Input 
                  type="number" 
                  value={formData.limit}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    const hasLimit = !isNaN(v) && v > 0;
                    setFormData({...formData, limit: isNaN(v) ? "" : v, shuffle: hasLimit ? true : formData.shuffle});
                  }}
                  min={1}
                />
                <p className="text-xs text-slate-500">
                  留空或0表示评估全部样本{typeof formData.limit === "number" && formData.limit > 0 ? "（已自动开启「打乱数据」以随机选题）" : ""}
                </p>
              </div>
              <div className="space-y-2">
                <Label>裁判模型</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-white gap-3">
                  <Switch 
                    id="judge-toggle"
                    checked={formData.enable_judge}
                    onCheckedChange={v => setFormData({...formData, enable_judge: v})}
                  />
                  <Label htmlFor="judge-toggle" className="text-sm cursor-pointer select-none">启用 Judge as LLM</Label>
                </div>
              </div>
            </div>

            {formData.enable_judge && (
              <div className="border rounded-lg bg-slate-50 p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">裁判模型选择</Label>
                  <Select 
                    value={formData.judge_model_id} 
                    onValueChange={v => {
                      const m = models.find(mod => mod.id === v);
                      setFormData({
                        ...formData, 
                        judge_model_id: v,
                        judge_model_name: m?.evalscope_model_id || "",
                        judge_api_url: m?.api_url || "",
                        judge_api_key: (m?.api_key && m.api_key !== "EMPTY") ? m.api_key : ""
                      });
                    }}
                  >
                    <SelectTrigger className={!formData.judge_model_id ? "border-orange-300 bg-orange-50" : "h-9"}>
                      <SelectValue placeholder="选择裁判模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.evalscope_model_id})
                          {m.model_types?.length > 0 && (
                            <span className="ml-1 text-xs text-slate-400">
                              [{m.model_types.map(t => MODEL_TYPE_LABELS[t] || t).join(", ")}]
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">评判策略 (judge_strategy)</Label>
                    <Select value={formData.judge_strategy} onValueChange={v => setFormData({...formData, judge_strategy: v})}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="选择评判策略" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">自动 (auto)</SelectItem>
                        <SelectItem value="rule">规则评判 (rule)</SelectItem>
                        <SelectItem value="llm">裁判模型评判 (llm)</SelectItem>
                        <SelectItem value="llm_recall">规则优先 (llm_recall)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">模型版本 (model_revision)</Label>
                    <Input placeholder="master" value={formData.judge_model_revision} onChange={e => setFormData({...formData, judge_model_revision: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">评分类型 (score_type)</Label>
                    <Select value={formData.judge_score_type} onValueChange={v => setFormData({...formData, judge_score_type: v})}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="选择评分类型" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pattern">模式匹配 (pattern)</SelectItem>
                        <SelectItem value="numeric">数值评分 (numeric)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.judge_score_type === "pattern" ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">正则解析 (score_pattern)</Label>
                      <Input placeholder="(A|B)" value={formData.judge_score_pattern} onChange={e => setFormData({...formData, judge_score_pattern: e.target.value})} />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs">正则解析 (score_pattern)</Label>
                      <Input placeholder="\\[\\[(\\d+(?:\\.\\d+)?)\\]" value={formData.judge_score_pattern} onChange={e => setFormData({...formData, judge_score_pattern: e.target.value})} />
                    </div>
                  )}
                </div>

                {formData.judge_score_type === "pattern" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">分数映射 (score_mapping)</Label>
                    <Input placeholder='{"A": 1.0, "B": 0.0}' value={formData.judge_score_mapping} onChange={e => setFormData({...formData, judge_score_mapping: e.target.value})} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">系统提示词 (system_prompt)</Label>
                  <Input placeholder="可选：自定义系统提示词" value={formData.judge_system_prompt} onChange={e => setFormData({...formData, judge_system_prompt: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Prompt 模板 (prompt_template)</Label>
                  <Input placeholder="可选：自定义 Prompt 模板" value={formData.judge_prompt_template} onChange={e => setFormData({...formData, judge_prompt_template: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">生成参数 (generation_config)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">temperature</Label>
                      <Input type="number" step="0.01" min={0} max={2} placeholder="例: 0.0" value={formData.judge_temperature} onChange={e => setFormData({...formData, judge_temperature: e.target.value === "" ? "" : parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">max_tokens</Label>
                      <Input type="number" step={1} min={1} placeholder="例: 4096" value={formData.judge_max_tokens} onChange={e => setFormData({...formData, judge_max_tokens: e.target.value === "" ? "" : parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">top_p</Label>
                      <Input type="number" step="0.01" min={0} max={1} placeholder="例: 1.0" value={formData.judge_top_p} onChange={e => setFormData({...formData, judge_top_p: e.target.value === "" ? "" : parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">seed</Label>
                      <Input type="number" step={1} placeholder="可选" value={formData.judge_seed} onChange={e => setFormData({...formData, judge_seed: e.target.value === "" ? "" : parseInt(e.target.value)})} />
                    </div>
                    <div className="flex items-end pb-1.5 gap-2">
                      <Switch id="judge-do-sample" checked={formData.judge_do_sample} onCheckedChange={v => setFormData({...formData, judge_do_sample: v})} />
                      <Label htmlFor="judge-do-sample" className="text-xs cursor-pointer">do_sample</Label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">其他生成参数 (JSON)</Label>
                    <Input placeholder='如 {"frequency_penalty": 0.5}' value={formData.judge_extra_gen_config} onChange={e => setFormData({...formData, judge_extra_gen_config: e.target.value})} />
                    <p className="text-xs text-slate-500">不常用的参数可在此 JSON 补充，会与上方参数合并</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-xs font-medium text-slate-500 mb-3 block">开关选项</Label>
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="analysis-report" checked={formData.analysis_report} onCheckedChange={v => setFormData({...formData, analysis_report: v})} />
                    <Label htmlFor="analysis-report" className="text-xs cursor-pointer">生成分析报告 (analysis_report)</Label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 数据集选择 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">数据集</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg bg-slate-50">
              <div className="p-4 border-b bg-white rounded-t-lg space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="搜索测评集..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-slate-500 mr-1">任务类别:</span>
                  {ALL_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={`cursor-pointer text-xs px-2 py-0.5 transition-colors ${
                        selectedTags.includes(tag) ? 'bg-[#00629B] hover:bg-[#005080] text-white border-[#00629B]' : 'hover:bg-slate-100'
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {selectedTags.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-slate-500" onClick={clearTags}>
                      <X className="w-3 h-3 mr-1" />清除
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4 max-h-[480px] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredDatasets.map(dataset => {
                    const isSelected = formData.selected_datasets.includes(dataset.name);
                    const hasSubsets = dataset.subsets && dataset.subsets.length > 1;
                    const isExpanded = expandedDatasets.has(dataset.name);
                    const dsSelectedSubsets = selectedSubsets[dataset.name] || [];
                    return (
                      <div key={dataset.id} className="col-span-1">
                        <div
                          className={`flex items-start gap-2 p-2.5 rounded border transition-all cursor-pointer ${
                            isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white hover:bg-slate-50 hover:shadow-sm'
                          }`}
                        >
                          <Checkbox
                            id={`dataset-${dataset.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleDatasetToggle(dataset.name)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <label htmlFor={`dataset-${dataset.id}`} className="text-sm font-medium truncate cursor-pointer" title={dataset.standard_name || dataset.name}>
                                {dataset.standard_name || dataset.name}
                              </label>
                              {!dataset.is_builtin && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded shrink-0">自定义</span>
                              )}
                              {hasSubsets && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded shrink-0">{dataset.subsets!.length} 子集</span>
                              )}
                            </div>
                            {dataset.tags && dataset.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {dataset.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{tag}</span>
                                ))}
                                {dataset.tags.length > 3 && <span className="text-[10px] text-slate-400">+{dataset.tags.length - 3}</span>}
                              </div>
                            )}
                            {isSelected && hasSubsets && (
                              <button
                                type="button"
                                className="mt-1.5 text-[11px] text-[#00629B] hover:underline flex items-center gap-0.5"
                                onClick={(e) => { e.stopPropagation(); toggleDatasetExpand(dataset.name); }}
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isExpanded ? "收起子集" : `选择子集 (${dsSelectedSubsets.length}/${dataset.subsets!.length})`}
                              </button>
                            )}
                          </div>
                        </div>
                        {isSelected && hasSubsets && isExpanded && (
                          <div className="mt-1 ml-2 border border-blue-200 rounded bg-blue-50/50 p-2 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`subset-all-${dataset.name}`}
                                checked={dsSelectedSubsets.length === dataset.subsets!.length}
                                onCheckedChange={() => handleSubsetSelectAll(dataset.name, dataset.subsets!)}
                                className="h-3.5 w-3.5"
                              />
                              <label htmlFor={`subset-all-${dataset.name}`} className="text-[11px] font-medium text-slate-700 cursor-pointer">
                                全选 ({dataset.subsets!.length})
                              </label>
                            </div>
                            {dataset.subsets!.length > 10 && (
                              <Input
                                placeholder="搜索子集..."
                                className="h-7 text-[11px] bg-white"
                                value={subsetSearch[dataset.name] || ""}
                                onChange={e => setSubsetSearch(prev => ({ ...prev, [dataset.name]: e.target.value }))}
                              />
                            )}
                            <div className="max-h-40 overflow-y-auto space-y-0.5">
                              {(dataset.subsets || [])
                                .filter(s => !subsetSearch[dataset.name] || s.toLowerCase().includes((subsetSearch[dataset.name] || "").toLowerCase()))
                                .map(subset => (
                                <div key={subset} className="flex items-center gap-1.5">
                                  <Checkbox
                                    id={`subset-${dataset.name}-${subset}`}
                                    checked={dsSelectedSubsets.includes(subset)}
                                    onCheckedChange={() => handleSubsetToggle(dataset.name, subset)}
                                    className="h-3 w-3"
                                  />
                                  <label htmlFor={`subset-${dataset.name}-${subset}`} className="text-[11px] text-slate-600 cursor-pointer truncate" title={subset}>
                                    {subset}
                                  </label>
                                </div>
                              ))}
                            </div>
                            {dsSelectedSubsets.length === 0 && (
                              <p className="text-[10px] text-red-500">请至少选择一个子集</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {filteredDatasets.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    {searchQuery || selectedTags.length > 0 ? "没有找到匹配的测评集" : "暂无可用测评集"}
                  </div>
                )}
              </div>
              
              <div className="px-4 py-3 border-t bg-slate-50 rounded-b-lg">
                <span className="text-sm text-slate-600">
                  已选择 <span className="font-semibold text-[#00629B]">{formData.selected_datasets.length}</span> 个测评集，
                  当前筛选 <span className="font-medium">{filteredDatasets.length}</span> 个
                </span>
              </div>
            </div>
            {hasQaDatasetSelected && !formData.enable_judge && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <span>
                  您选择了 QA 类型的数据集但未启用 LLM Judge，系统将仅通过精确匹配判定答案正误，<strong>错误数可能偏高</strong>。如需语义评判，请在上方「裁判模型」处启用 Judge。
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 数据集参数 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 cursor-pointer select-none" onClick={() => setShowAdvanced(prev => ({ ...prev, dataset: !prev.dataset }))}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                数据集参数
              </CardTitle>
              {showAdvanced.dataset ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
            <CardDescription className="text-xs">控制数据集的使用方式和评测逻辑</CardDescription>
          </CardHeader>
          {showAdvanced.dataset && (
            <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">重复次数</Label>
                <Input type="number" value={formData.repeats || ""} onChange={e => setFormData({...formData, repeats: parseInt(e.target.value) || 0})} min={1} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">数据集源</Label>
                <Select value={formData.dataset_hub} onValueChange={v => setFormData({...formData, dataset_hub: v})}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择数据源" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modelscope">ModelScope</SelectItem>
                    <SelectItem value="huggingface">HuggingFace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Few-shot 数量</Label>
                <Input type="number" value={formData.few_shot_num || ""} onChange={e => setFormData({...formData, few_shot_num: parseInt(e.target.value) || 0})} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">样本超时 (秒)</Label>
                <Input type="number" step="0.5" value={formData.review_timeout || ""} onChange={e => setFormData({...formData, review_timeout: parseFloat(e.target.value) || 0})} min={0} />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-slate-500">开关选项</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center h-9 gap-2">
                  <Switch id="few-shot-random" checked={formData.few_shot_random} onCheckedChange={v => setFormData({...formData, few_shot_random: v})} />
                  <Label htmlFor="few-shot-random" className="text-xs cursor-pointer">随机 Few-shot</Label>
                </div>
                <div className="flex items-center h-9 gap-2">
                  <Switch id="shuffle" checked={formData.shuffle} onCheckedChange={v => setFormData({...formData, shuffle: v})} />
                  <Label htmlFor="shuffle" className="text-xs cursor-pointer">打乱数据</Label>
                </div>
                <div className="flex items-center h-9 gap-2">
                  <Switch id="shuffle-choices" checked={formData.shuffle_choices} onCheckedChange={v => setFormData({...formData, shuffle_choices: v})} />
                  <Label htmlFor="shuffle-choices" className="text-xs cursor-pointer">打乱选项</Label>
                </div>
                <div className="flex items-center h-9 gap-2">
                  <Switch id="force-redownload" checked={formData.force_redownload} onCheckedChange={v => setFormData({...formData, force_redownload: v})} />
                  <Label htmlFor="force-redownload" className="text-xs cursor-pointer">强制重新下载</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">子集选择摘要</Label>
                {Object.keys(selectedSubsets).length > 0 ? (
                  <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 space-y-1 max-h-24 overflow-y-auto border">
                    {Object.entries(selectedSubsets).map(([ds, subs]) => {
                      const dsObj = allDatasets.find(d => d.name === ds);
                      const total = dsObj?.subsets?.length || 0;
                      return (
                        <div key={ds} className="flex items-center gap-1">
                          <span className="font-medium">{dsObj?.standard_name || ds}:</span>
                          <span className={subs.length === 0 ? "text-red-500" : "text-slate-500"}>
                            {subs.length === total ? "全部" : `${subs.length}/${total}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-2">选择包含子集的数据集后，可在上方展开选择特定子集</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">聚合方式 (aggregation)</Label>
                <Select value={formData.aggregation} onValueChange={v => setFormData({...formData, aggregation: v})}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择聚合方式" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mean">均值 (mean)</SelectItem>
                    <SelectItem value="mean_and_pass_at_k">pass_at_k</SelectItem>
                    <SelectItem value="mean_and_vote_at_k">vote_at_k</SelectItem>
                    <SelectItem value="mean_and_pass_hat_k">pass_hat_k</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">系统提示词 (system_prompt)</Label>
                <Textarea placeholder="可选：覆盖默认的 System Prompt" value={formData.system_prompt} onChange={e => setFormData({...formData, system_prompt: e.target.value})} className="h-16 bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prompt 模板 (prompt_template)</Label>
                <Textarea placeholder="可选：使用 {query} 作为占位符" value={formData.prompt_template} onChange={e => setFormData({...formData, prompt_template: e.target.value})} className="h-16 bg-white" />
              </div>
            </div>

            {/* 过滤器与额外参数 */}
            <div className="border-t pt-4">
              <Label className="text-xs font-medium text-slate-500 mb-3 block">过滤器与额外参数</Label>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">输出过滤器 (filters)</Label>
                  <Input placeholder='{"remove_until": "...", "extract": "..."}' value={formData.filters} onChange={e => setFormData({...formData, filters: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">额外参数 (extra_params)</Label>
                  <Input placeholder='{"param_name": "value"}' value={formData.extra_params} onChange={e => setFormData({...formData, extra_params: e.target.value})} />
                </div>
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        {/* 模型推理参数 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 cursor-pointer select-none" onClick={() => setShowAdvanced(prev => ({ ...prev, generation: !prev.generation }))}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                模型推理参数
              </CardTitle>
              {showAdvanced.generation ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
            <CardDescription className="text-xs">控制模型生成回答时的行为和输出格式</CardDescription>
          </CardHeader>
          {showAdvanced.generation && (
            <CardContent className="space-y-6">
              {/* 基础生成参数 */}
              <div>
                <Label className="text-xs font-medium text-slate-500 mb-3 block">基础生成参数</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">最大 Token (max_tokens)</Label>
                    <Input type="number" value={formData.max_tokens || ""} onChange={e => setFormData({...formData, max_tokens: parseInt(e.target.value) || 0})} min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">温度 (temperature)</Label>
                    <Input type="number" step="0.1" value={formData.temperature || ""} onChange={e => setFormData({...formData, temperature: parseFloat(e.target.value) || 0})} min={0} max={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Top P (nucleus采样)</Label>
                    <Input type="number" step="0.1" value={formData.top_p || ""} onChange={e => setFormData({...formData, top_p: parseFloat(e.target.value) || 0})} min={0} max={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Top K</Label>
                    <Input type="number" value={formData.top_k || ""} onChange={e => setFormData({...formData, top_k: parseInt(e.target.value) || 0})} min={0} />
                  </div>
                </div>
              </div>

              {/* 采样与解码 */}
              <div className="border-t pt-4">
                <Label className="text-xs font-medium text-slate-500 mb-3 block">采样与解码</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="do-sample" checked={formData.do_sample} onCheckedChange={v => setFormData({...formData, do_sample: v})} />
                    <Label htmlFor="do-sample" className="text-xs cursor-pointer">启用采样 (do_sample)</Label>
                  </div>
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="stream" checked={formData.stream} onCheckedChange={v => setFormData({...formData, stream: v})} />
                    <Label htmlFor="stream" className="text-xs cursor-pointer">流式输出 (stream)</Label>
                  </div>
                </div>
              </div>

              {/* 惩罚参数 */}
              <div className="border-t pt-4">
                <Label className="text-xs font-medium text-slate-500 mb-3 block">惩罚参数</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">频率惩罚 (frequency_penalty)</Label>
                    <Input type="number" step="0.1" value={formData.frequency_penalty || ""} onChange={e => setFormData({...formData, frequency_penalty: parseFloat(e.target.value) || 0})} min={-2} max={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">存在惩罚 (presence_penalty)</Label>
                    <Input type="number" step="0.1" value={formData.presence_penalty || ""} onChange={e => setFormData({...formData, presence_penalty: parseFloat(e.target.value) || 0})} min={-2} max={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">随机种子 (seed)</Label>
                    <Input type="number" value={formData.seed || ""} onChange={e => setFormData({...formData, seed: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Logit Bias</Label>
                    <Input placeholder='42=10,43=-10' value={formData.logit_bias} onChange={e => setFormData({...formData, logit_bias: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* 请求控制 */}
              <div className="border-t pt-4">
                <Label className="text-xs font-medium text-slate-500 mb-3 block">请求控制</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">超时时间 (timeout)</Label>
                    <Input type="number" value={formData.timeout || ""} onChange={e => setFormData({...formData, timeout: parseInt(e.target.value) || 0})} min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">重试次数 (retries)</Label>
                    <Input type="number" value={formData.retries || ""} onChange={e => setFormData({...formData, retries: parseInt(e.target.value) || 0})} min={0} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">重试间隔 (retry_interval)</Label>
                    <Input type="number" value={formData.retry_interval || ""} onChange={e => setFormData({...formData, retry_interval: parseInt(e.target.value) || 0})} min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">最大工具输出字节</Label>
                    <Input type="number" value={formData.max_tool_output || ""} onChange={e => setFormData({...formData, max_tool_output: parseInt(e.target.value) || 0})} min={1} />
                  </div>
                </div>
              </div>

              {/* 输出控制 */}
              <div className="border-t pt-4">
                <Label className="text-xs font-medium text-slate-500 mb-3 block">输出控制</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="logprobs" checked={formData.logprobs} onCheckedChange={v => setFormData({...formData, logprobs: v})} />
                    <Label htmlFor="logprobs" className="text-xs cursor-pointer">返回对数概率 (logprobs)</Label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Top Logprobs 数量</Label>
                    <Input type="number" value={formData.top_logprobs || ""} onChange={e => setFormData({...formData, top_logprobs: parseInt(e.target.value) || 0})} min={0} max={20} />
                  </div>
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="parallel-tool" checked={formData.parallel_tool_calls} onCheckedChange={v => setFormData({...formData, parallel_tool_calls: v})} />
                    <Label htmlFor="parallel-tool" className="text-xs cursor-pointer">并行工具调用</Label>
                  </div>
                </div>
              </div>

              {/* 图像生成参数 */}
              <div className="border-t pt-4">
                <Label className="text-xs font-medium text-slate-500 mb-3 block">图像生成参数</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">图像高度 (height)</Label>
                    <Input type="number" value={formData.height || ""} onChange={e => setFormData({...formData, height: parseInt(e.target.value) || 0})} min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">图像宽度 (width)</Label>
                    <Input type="number" value={formData.width || ""} onChange={e => setFormData({...formData, width: parseInt(e.target.value) || 0})} min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">推理步数</Label>
                    <Input type="number" value={formData.num_inference_steps || ""} onChange={e => setFormData({...formData, num_inference_steps: parseInt(e.target.value) || 0})} min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">指导尺度 (guidance_scale)</Label>
                    <Input type="number" step="0.1" value={formData.guidance_scale || ""} onChange={e => setFormData({...formData, guidance_scale: parseFloat(e.target.value) || 0})} min={0} />
                  </div>
                </div>
              </div>

              {/* 额外参数 */}
              <div className="border-t pt-4">
                <Label className="text-xs font-medium text-slate-500 mb-3 block">额外参数</Label>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">额外请求体 (extra_body)</Label>
                    <Input placeholder='{"key": "value"}' value={formData.extra_body} onChange={e => setFormData({...formData, extra_body: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">额外查询参数 (extra_query)</Label>
                    <Input placeholder='{"key": "value"}' value={formData.extra_query} onChange={e => setFormData({...formData, extra_query: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">额外请求头 (extra_headers)</Label>
                    <Input placeholder='{"key": "value"}' value={formData.extra_headers} onChange={e => setFormData({...formData, extra_headers: e.target.value})} />
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 评测参数 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 cursor-pointer select-none" onClick={() => setShowAdvanced(prev => ({ ...prev, evaluation: !prev.evaluation }))}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                评测参数
              </CardTitle>
              {showAdvanced.evaluation ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
            <CardDescription className="text-xs">控制评测执行方式、后端和批次大小</CardDescription>
          </CardHeader>
          {showAdvanced.evaluation && (
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">评测类型 (eval_type)</Label>
                  <Select value={formData.eval_type} onValueChange={v => setFormData({...formData, eval_type: v})}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="自动检测" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">自动检测 (auto-detect)</SelectItem>
                      <SelectItem value="llm_ckpt">本地模型推理 (llm_ckpt)</SelectItem>
                      <SelectItem value="openai_api">OpenAI API</SelectItem>
                      <SelectItem value="anthropic_api">Anthropic API</SelectItem>
                      <SelectItem value="text2image">图像生成 (text2image)</SelectItem>
                      <SelectItem value="mock_llm">模拟推理 (mock_llm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">评测后端 (eval_backend)</Label>
                  <Select value={formData.eval_backend} onValueChange={v => setFormData({...formData, eval_backend: v})}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="选择后端" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Native">Native (默认)</SelectItem>
                      <SelectItem value="OpenCompass">OpenCompass</SelectItem>
                      <SelectItem value="VLMEvalKit">VLMEvalKit</SelectItem>
                      <SelectItem value="RAGEval">RAGEval</SelectItem>
                      <SelectItem value="ThirdParty">第三方 (ThirdParty)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">评测批次大小 (eval_batch_size)</Label>
                  <Input type="number" value={formData.eval_batch_size || ""} onChange={e => setFormData({...formData, eval_batch_size: parseInt(e.target.value) || 0})} min={1} />
                  <p className="text-xs text-slate-500">service mode 默认 8</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">评测配置文件 (eval_config)</Label>
                  <Input placeholder="/path/to/config.json" value={formData.eval_config} onChange={e => setFormData({...formData, eval_config: e.target.value})} />
                  <p className="text-xs text-slate-500">非 Native 后端的配置文件路径</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 其他参数 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 cursor-pointer select-none" onClick={() => setShowAdvanced(prev => ({ ...prev, other: !prev.other }))}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                其他参数
              </CardTitle>
              {showAdvanced.other ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
            <CardDescription className="text-xs">其他评测控制选项</CardDescription>
          </CardHeader>
          {showAdvanced.other && (
            <CardContent className="space-y-6">
              <div className="space-y-1.5 max-w-sm">
                <Label className="text-xs">缓存路径 (use_cache)</Label>
                <Input placeholder="复用已有结果的路径" value={formData.use_cache} onChange={e => setFormData({...formData, use_cache: e.target.value})} />
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs font-medium text-slate-500 mb-3 block">开关选项</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="rerun-review" checked={formData.rerun_review} onCheckedChange={v => setFormData({...formData, rerun_review: v})} />
                    <Label htmlFor="rerun-review" className="text-xs cursor-pointer">仅重新运行评测 (rerun_review)</Label>
                  </div>
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="enable-progress-tracker" checked={formData.enable_progress_tracker} onCheckedChange={v => setFormData({...formData, enable_progress_tracker: v})} />
                    <Label htmlFor="enable-progress-tracker" className="text-xs cursor-pointer">开启进度追踪</Label>
                  </div>
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="debug" checked={formData.debug} onCheckedChange={v => setFormData({...formData, debug: v})} />
                    <Label htmlFor="debug" className="text-xs cursor-pointer">调试模式 (debug)</Label>
                  </div>
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="dry-run" checked={formData.dry_run} onCheckedChange={v => setFormData({...formData, dry_run: v})} />
                    <Label htmlFor="dry-run" className="text-xs cursor-pointer">预检参数 (dry_run)</Label>
                  </div>
                  <div className="flex items-center h-9 gap-2">
                    <Switch id="ignore-errors" checked={formData.ignore_errors} onCheckedChange={v => setFormData({...formData, ignore_errors: v})} />
                    <Label htmlFor="ignore-errors" className="text-xs cursor-pointer">忽略生成错误</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate("/tasks")}>
            取消
          </Button>
          <Button type="submit" disabled={loading} className="bg-[#00629B] hover:bg-[#005080]">
            {loading ? "创建中..." : "创建任务"}
          </Button>
        </div>
      </form>
    </div>
  );
}
