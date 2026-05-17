import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MemberTransfer } from "./MemberTransfer";

interface Team {
  id: string;
  name: string;
  description: string | null;
  member_count?: number;
}

export function TeamManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/teams");
      setTeams(res.data);
    } catch (error) {
      console.error("Failed to fetch teams", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = async () => {
    try {
      setSubmitting(true);
      await apiClient.post("/admin/teams", formData);
      toast({ title: t('admin.teams.create_success') });
      setCreateDialogOpen(false);
      setFormData({ name: "", description: "" });
      fetchTeams();
    } catch (error) {
       const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t('admin.teams.error'),
        description: err.response?.data?.detail || t('admin.teams.error'),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewMembers = (team: Team) => {
    setSelectedTeam(team);
    setMembersDialogOpen(true);
  };

  const handleDeleteTeam = async (team: Team) => {
    setSelectedTeam(team);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTeam) return;
    try {
      await apiClient.delete(`/admin/teams/${selectedTeam.id}`);
      toast({ title: t('admin.teams.delete_success') });
      setDeleteDialogOpen(false);
      fetchTeams();
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t('admin.teams.error'),
        description: err.response?.data?.detail || t('admin.teams.error'),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="bg-[#00629B] hover:bg-[#005a8e] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.teams.btn_add')}
        </Button>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-900">{t('admin.teams.table_name')}</TableHead>
              <TableHead className="font-semibold text-slate-900">{t('admin.teams.table_desc')}</TableHead>
              <TableHead className="font-semibold text-slate-900">{t('admin.teams.table_members')}</TableHead>
              <TableHead className="text-right font-semibold text-slate-900">{t('admin.teams.table_actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-medium text-slate-900">{team.name}</TableCell>
                <TableCell className="text-slate-600">{team.description || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {team.member_count || 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleViewMembers(team)}
                      className="text-[#00629B] hover:text-[#005a8e] hover:bg-[#00629B]/5"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {t('admin.teams.btn_manage_members')}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                      onClick={() => handleDeleteTeam(team)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.teams.dialog_create_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.teams.form_name')}</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Team A"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.teams.form_desc')}</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('tasks.cancel_btn')}</Button>
            <Button 
              onClick={handleCreateTeam} 
              disabled={submitting || !formData.name}
              className="bg-[#00629B] hover:bg-[#005a8e] text-white"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('models.save_btn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('admin.teams.confirm_delete')}
        description={t('admin.teams.confirm_delete_desc')}
        onConfirm={confirmDelete}
      />

      {selectedTeam && (
        <MemberTransfer
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          onSuccess={fetchTeams}
        />
      )}
    </div>
  );
}
