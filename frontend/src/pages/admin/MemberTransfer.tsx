import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, ChevronRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface User {
  username: string;
  full_name: string | null;
  team_id: string | null;
}

interface MemberTransferProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onSuccess?: () => void;
  apiPrefix?: string;
}

export function MemberTransfer({ open, onOpenChange, teamId, teamName, onSuccess, apiPrefix = `/admin/teams/${teamId}` }: MemberTransferProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // 核心状态：暂存变更
  const [pendingAdditions, setPendingAdditions] = useState<Set<string>>(new Set());
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchUsers();
      setPendingAdditions(new Set());
      setPendingRemovals(new Set());
      setSearchQuery("");
    }
  }, [open, teamId]);

  const fetchUsers = async () => {
    try {
        const res = await apiClient.get("/users/");
        setAllUsers(res.data);
      } catch (error) {
        const err = error as { response?: { data?: { detail?: string } } };
        toast({
          title: t("admin.teams.error"),
          description: err.response?.data?.detail || "Failed to fetch users",
          variant: "destructive",
        });
    }
  };

  // --- 逻辑处理 ---

  // 左侧显示：非原成员 + 待移除的原成员
  const leftList = useMemo(() => {
    return allUsers.filter(u => {
      const isOriginalMember = u.team_id === teamId;
      const isPendingAdd = pendingAdditions.has(u.username);
      const isPendingRemove = pendingRemovals.has(u.username);
      
      // 不在右侧显示的都在左侧
      if (isOriginalMember) {
        return isPendingRemove; // 原成员只有在“待移除”时才在左侧
      } else {
        return !isPendingAdd; // 非成员只有在“未待添加”时才在左侧
      }
    });
  }, [allUsers, teamId, pendingAdditions, pendingRemovals]);

  // 右侧显示：原成员（非待移除）+ 待添加的非成员
  const rightList = useMemo(() => {
    return allUsers.filter(u => {
      const isOriginalMember = u.team_id === teamId;
      const isPendingAdd = pendingAdditions.has(u.username);
      const isPendingRemove = pendingRemovals.has(u.username);

      if (isOriginalMember) {
        return !isPendingRemove; // 原成员只要没被标记移除，就在右侧
      } else {
        return isPendingAdd; // 非成员只有标记了待添加，才在右侧
      }
    });
  }, [allUsers, teamId, pendingAdditions, pendingRemovals]);

  const handleToggleLeft = (username: string) => {
    const user = allUsers.find(u => u.username === username);
    if (!user) return;

    if (pendingRemovals.has(username)) {
      // 还原：从“待移除”中撤回，回到右侧
      const next = new Set(pendingRemovals);
      next.delete(username);
      setPendingRemovals(next);
    } else {
      // 添加：标记为“待添加”，移向右侧
      const next = new Set(pendingAdditions);
      next.add(username);
      setPendingAdditions(next);
    }
  };

  const handleToggleRight = (username: string) => {
    const user = allUsers.find(u => u.username === username);
    if (!user) return;

    if (pendingAdditions.has(username)) {
      // 还原：从“待添加”中撤回，回到左侧
      const next = new Set(pendingAdditions);
      next.delete(username);
      setPendingAdditions(next);
    } else {
      // 移除：标记为“待移除”，移向左侧
      const next = new Set(pendingRemovals);
      next.add(username);
      setPendingRemovals(next);
    }
  };

  const handleConfirm = async () => {
    const additions = Array.from(pendingAdditions);
    const removals = Array.from(pendingRemovals);
    
    try {
      setSubmitting(true);
      const promises = [];
      
      if (additions.length > 0) {
        promises.push(
          apiClient.post(`${apiPrefix}/members`, { usernames: additions })
        );
      }
      
      if (removals.length > 0) {
        promises.push(
          apiClient.delete(`${apiPrefix}/members`, { data: { usernames: removals } })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        toast({ title: t("admin.teams.update_success") });
        if (onSuccess) onSuccess();
        onOpenChange(false);
      } else {
        onOpenChange(false);
      }
    } catch {
      toast({ title: t("admin.teams.error"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // --- 搜索过滤 ---
  const filteredLeft = leftList.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRight = rightList.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasChanges = pendingAdditions.size > 0 || pendingRemovals.size > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !submitting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{t("admin.teams.members_title", { name: teamName })}</DialogTitle>
            {hasChanges && (
              <div className="flex gap-2">
                {pendingAdditions.size > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">+{pendingAdditions.size} 待添加</Badge>}
                {pendingRemovals.size > 0 && <Badge className="bg-red-50 text-red-700 border-red-200">-{pendingRemovals.size} 待移除</Badge>}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="p-4 border-b bg-slate-50 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* 左侧：待分配 */}
          <div className="flex-1 flex flex-col border-r min-w-0">
            <div className="px-4 py-2 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase">
              待分配 ({filteredLeft.length})
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredLeft.map(u => {
                  const isPendingRemove = pendingRemovals.has(u.username);
                  return (
                    <div
                      key={u.username}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-slate-100 ${isPendingRemove ? "bg-red-50/50" : ""}`}
                      onClick={() => handleToggleLeft(u.username)}
                    >
                      <Checkbox checked={isPendingRemove} onCheckedChange={() => handleToggleLeft(u.username)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {u.username}
                          {isPendingRemove && <Badge variant="outline" className="text-[10px] h-4 px-1 text-red-600 border-red-200">待移除</Badge>}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{u.full_name || "-"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* 中间：装饰性图标 */}
          <div className="w-12 flex flex-col items-center justify-center gap-4 bg-slate-50/50 border-r text-slate-300">
            <ChevronRight className="w-5 h-5" />
            <ChevronLeft className="w-5 h-5" />
          </div>

          {/* 右侧：当前成员 */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase">
              当前成员 ({filteredRight.length})
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredRight.map(u => {
                  const isPendingAdd = pendingAdditions.has(u.username);
                  return (
                    <div
                      key={u.username}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-slate-100 ${isPendingAdd ? "bg-emerald-50/50" : ""}`}
                      onClick={() => handleToggleRight(u.username)}
                    >
                      <Checkbox checked={isPendingAdd} onCheckedChange={() => handleToggleRight(u.username)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {u.username}
                          {isPendingAdd && <Badge variant="outline" className="text-[10px] h-4 px-1 text-emerald-600 border-emerald-200">待添加</Badge>}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{u.full_name || "-"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={submitting || !hasChanges}
            className="bg-[#00629B] hover:bg-[#005a8e] text-white min-w-[100px]"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认生效"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
