import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, FileJson } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Dataset {
  id: string;
  name: string;
  category?: string;
  tags?: string[];
  is_public: boolean;
  file_path: string | null;
}

interface EditDatasetDialogProps {
  dataset: Dataset;
  onUpdated: () => void;
  trigger?: React.ReactNode;
}

export function EditDatasetDialog({ dataset, onUpdated, trigger }: EditDatasetDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(dataset.name);
  const [category, setCategory] = useState(dataset.category || "LLM评测集");
  const [datasetType, setDatasetType] = useState(dataset.tags?.[0] || "Other");
  const [customType, setCustomType] = useState("");
  const [isPublic, setIsPublic] = useState(dataset.is_public);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (dataset.tags?.[0] && !["MCQ", "QA"].includes(dataset.tags[0])) {
      setDatasetType("Other");
      setCustomType(dataset.tags[0]);
    }
  }, [dataset]);

  useEffect(() => {
    if (datasetType !== "Other") {
      setCustomType("");
    }
  }, [datasetType]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
    }
  }, [open]);

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    setFileUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    try {
      await apiClient.post(`/datasets/${dataset.id}/file`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast({ title: t('datasets.edit_file_success'), description: t('datasets.edit_file_success_desc') });
      setSelectedFile(null);
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t('datasets.edit_file_failed'),
        description: err.response?.data?.detail || t('datasets.edit_file_failed_desc'),
        variant: "destructive",
      });
    } finally {
      setFileUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tags = datasetType === "Other" ? [customType] : [datasetType];

    try {
      await apiClient.patch(`/datasets/${dataset.id}`, {
        name,
        category,
        tags,
        is_public: isPublic,
      });
      toast({ title: t('datasets.edit_success'), description: t('datasets.edit_success_desc') });
      
      if (selectedFile) {
        await handleFileUpload();
      }
      
      setOpen(false);
      onUpdated();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t('datasets.edit_failed'),
        description: err.response?.data?.detail || t('datasets.edit_failed_desc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('datasets.edit_dialog_title')}</DialogTitle>
            <DialogDescription>
              {t('datasets.edit_dialog_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('datasets.edit_name')}</Label>
              <Input 
                id="edit-name" 
                placeholder={t('datasets.edit_name_placeholder')}
                value={name}
                onChange={e => setName(e.target.value)}
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>{t('datasets.edit_category')}</Label>
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
                <Label>{t('datasets.edit_type')}</Label>
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
                    <SelectItem value="Other">{t('datasets.edit_custom_type')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {datasetType === "Other" ? (
                  <>
                    <Label className="invisible">{t('datasets.edit_custom_type')}</Label>
                    <Input 
                      placeholder={t('datasets.edit_custom_type_placeholder')}
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
              <Label htmlFor="edit-file">{t('datasets.edit_file')}</Label>
              {dataset.file_path && (
                <p className="text-xs text-slate-500 mb-1">
                  当前文件: {dataset.file_path.split('/').pop()}
                </p>
              )}
              <div className="flex items-center gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById('edit-file-upload')?.click()}
                  className="w-full border-dashed border-2 py-6 bg-slate-50 hover:bg-slate-100"
                >
                  <FileJson className="w-5 h-5 mr-2 text-slate-500" />
                  <span className="text-slate-600 font-normal">
                    {selectedFile ? selectedFile.name : t('datasets.edit_file_placeholder')}
                  </span>
                </Button>
                <input 
                  id="edit-file-upload" 
                  ref={fileInputRef}
                  type="file" 
                  accept=".jsonl,.csv,.tsv" 
                  className="hidden" 
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-blue-600 mt-1">
                  已选择新文件: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="edit-public" 
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked as boolean)}
              />
              <label htmlFor="edit-public" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('datasets.edit_public')}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('datasets.cancel_btn')}</Button>
            <Button type="submit" disabled={loading || fileUploading || !name} className="bg-[#00629B] hover:bg-[#005080]">
              {loading || fileUploading ? t('datasets.edit_saving_btn') : t('datasets.edit_save_btn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
