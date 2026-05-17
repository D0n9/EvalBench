import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileJson } from "lucide-react";
import { useTranslation } from "react-i18next";

export function UploadDatasetDialog({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("LLM评测集");
  const [datasetType, setDatasetType] = useState("MCQ");
  const [customType, setCustomType] = useState("");

  useEffect(() => {
    setCustomType("");
  }, [category, datasetType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: t('datasets.val_err'), description: t('datasets.val_err_file'), variant: "destructive" });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("file", file);
    formData.append("category", category);
    formData.append("tags", JSON.stringify([datasetType === "Other" ? customType : datasetType]));
    formData.append("is_readonly", "false");

    try {
      await apiClient.post("/datasets/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast({ title: t('datasets.upload_success'), description: t('datasets.upload_success_desc') });
      setOpen(false);
      setName("");
      setFile(null);
      setCategory("LLM评测集");
      setDatasetType("MCQ");
      setCustomType("");
      onUploaded();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t('datasets.upload_failed'),
        description: err.response?.data?.detail || t('datasets.upload_failed_desc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00629B] hover:bg-[#005080]">
          <Upload className="w-4 h-4 mr-2" />
          {t('datasets.upload_btn')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('datasets.dialog_title')}</DialogTitle>
            <DialogDescription>
              {t('datasets.dialog_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('datasets.form_name')}</Label>
              <Input 
                id="name" 
                placeholder={t('datasets.form_name_placeholder')} 
                value={name}
                onChange={e => setName(e.target.value)}
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>{t('datasets.form_category') || "数据集分类"}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLM评测集">LLM评测集</SelectItem>
                  <SelectItem value="VLM评测集">VLM评测集</SelectItem>
                  <SelectItem value="AIGC评测集">AIGC评测集</SelectItem>
                  <SelectItem value="其他数据集">其他数据集</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>数据集类型</Label>
                <Select 
                  value={datasetType} 
                  onValueChange={setDatasetType}
                  disabled={category !== "LLM评测集"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">选择题 (MCQ)</SelectItem>
                    <SelectItem value="QA">问答题 (QA)</SelectItem>
                    <SelectItem value="Other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {datasetType === "Other" ? (
                  <>
                    <Label className="invisible">自定义类型</Label>
                    <Input 
                      placeholder="请输入自定义数据集类型"
                      value={customType}
                      onChange={e => setCustomType(e.target.value)}
                    />
                  </>
                ) : (
                  <div className="h-9" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="file">{t('datasets.form_file')}</Label>
              <div className="flex items-center gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="w-full border-dashed border-2 py-8 bg-slate-50 hover:bg-slate-100"
                >
                  <FileJson className="w-5 h-5 mr-2 text-slate-500" />
                  <span className="text-slate-600 font-normal">
                    {file ? file.name : t('datasets.form_file_placeholder')}
                  </span>
                </Button>
                <input 
                  id="file-upload" 
                  type="file" 
                  accept=".jsonl,.csv,.tsv" 
                  className="hidden" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('datasets.cancel_btn')}</Button>
            <Button type="submit" disabled={loading || !file || !name} className="bg-[#00629B] hover:bg-[#005080]">
              {loading ? t('datasets.submitting_btn') : t('datasets.submit_btn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
