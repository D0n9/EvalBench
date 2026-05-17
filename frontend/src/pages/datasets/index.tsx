import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/api/client";
import { UploadDatasetDialog } from "./UploadDatasetDialog";
import { EditDatasetDialog } from "./EditDatasetDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Database, BookOpen, ExternalLink, Search, ChevronLeft, ChevronRight, Loader2, SquarePen, Globe, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/store/auth";

interface Dataset {
  id: string;
  name: string;
  standard_name?: string;
  tags?: string[];
  link?: string;
  is_builtin: boolean;
  is_public: boolean;
  file_path: string | null;
  team_id?: string;
  creator_name?: string;
  team_name?: string;
}

interface DatasetGroup {
  category: string;
  datasets: Dataset[];
  count: number;
}

export default function DatasetsPage() {
  const { user } = useAuthStore();
  const [allDatasets, setAllDatasets] = useState<Dataset[]>([]);
  const [datasetGroups, setDatasetGroups] = useState<DatasetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const canModify = (dataset: Dataset) => {
    return user?.is_superuser || dataset.team_id === user?.team_id;
  };

  const fetchDatasets = async (signal?: AbortSignal) => {
    try {
      const [allRes, groupedRes] = await Promise.all([
        apiClient.get("/datasets/", { signal }),
        apiClient.get("/datasets/grouped", { signal })
      ]);
      setAllDatasets(allRes.data);
      setDatasetGroups(groupedRes.data);
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to fetch datasets", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchDatasets(controller.signal);
    return () => controller.abort();
  }, []);

  const handleDelete = async (id: string) => {
    setDatasetToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!datasetToDelete) return;
    try {
      await apiClient.delete(`/datasets/${datasetToDelete}`);
      toast({ title: t('datasets.deleted'), description: t('datasets.deleted_desc') });
      fetchDatasets();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({ 
        title: t('datasets.error'), 
        description: err.response?.data?.detail || t('datasets.error_desc'), 
        variant: "destructive" 
      });
    }
  };

  const customs = allDatasets.filter(d => !d.is_builtin);
  const builtinDatasets = useMemo(() => {
    return datasetGroups.flatMap(g => g.datasets);
  }, [datasetGroups]);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const filteredBuiltins = useMemo(() => {
    if (!searchQuery.trim()) return builtinDatasets;
    const query = searchQuery.toLowerCase();
    return builtinDatasets.filter(d => 
      d.name.toLowerCase().includes(query) || 
      (d.standard_name && d.standard_name.toLowerCase().includes(query)) ||
      (d.tags && d.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }, [builtinDatasets, searchQuery]);

  const totalPages = Math.ceil(filteredBuiltins.length / itemsPerPage) || 1;

  const currentBuiltins = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBuiltins.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBuiltins, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#00629B]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('datasets.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('datasets.desc')}
          </p>
        </div>
        <UploadDatasetDialog onUploaded={fetchDatasets} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Built-in Datasets */}
        <Card className="border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#00629B]" />
                <CardTitle className="text-lg">{t('datasets.builtin_title')}</CardTitle>
                <Badge variant="secondary" className="ml-1">{builtinDatasets.length}</Badge>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            <CardDescription className="mt-1">{t('datasets.builtin_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="flex-1 overflow-auto min-h-[400px]">
              <Table>
                <TableBody>
                  {currentBuiltins.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-center py-10 text-slate-500 text-sm">
                        {searchQuery ? "No matching datasets found" : t('datasets.builtin_empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentBuiltins.map((dataset: Dataset) => (
                      <TableRow key={dataset.id}>
                        <TableCell>
                          <div className="font-medium text-slate-800 flex items-center gap-2">
                            {dataset.standard_name || dataset.name}
                            {dataset.link && (
                              <a href={dataset.link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#00629B]">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{dataset.name}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap gap-1 justify-end">
                            {dataset.tags?.map(tag => (
                              <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50">
              <div className="text-xs text-slate-500">
                Showing <span className="font-medium">{filteredBuiltins.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredBuiltins.length)}</span> of <span className="font-medium">{filteredBuiltins.length}</span> datasets
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-slate-600">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Datasets */}
        <Card className="border-slate-200 shadow-sm h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-lg">{t('datasets.custom_title')}</CardTitle>
              <Badge variant="outline" className="ml-1">{customs.length}</Badge>
            </div>
            <CardDescription>{t('datasets.custom_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>{t('datasets.table_name')}</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>上传人</TableHead>
                  <TableHead>上传团队</TableHead>
                  <TableHead>{t('datasets.table_visibility')}</TableHead>
                  <TableHead className="text-right">{t('datasets.table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-slate-500 text-sm">
                      {t('datasets.custom_empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  customs.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="font-medium text-slate-800">
                        {dataset.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {dataset.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {dataset.creator_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {dataset.team_name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          {dataset.is_public ? (
                            <>
                              <Globe className="w-3 h-3 text-blue-500" />
                              <span className="text-blue-600 font-medium">{t('datasets.public')}</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-3 h-3" />
                              <span>{t('datasets.team_only')}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canModify(dataset) ? (
                            <>
                              <EditDatasetDialog 
                                dataset={dataset} 
                                onUpdated={fetchDatasets}
                                trigger={
                                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8">
                                    <SquarePen className="w-4 h-4" />
                                  </Button>
                                }
                              />
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                onClick={() => handleDelete(dataset.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px]">
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
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('datasets.delete_confirm')}
        description={t('datasets.delete_confirm_desc')}
        confirmText={t('datasets.delete_btn')}
        cancelText={t('datasets.cancel_btn')}
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
}
