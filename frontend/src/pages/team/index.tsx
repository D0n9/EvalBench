import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Settings } from "lucide-react";
import { MemberTransfer } from "../admin/MemberTransfer";

interface Team {
  id: string;
  name: string;
  description: string | null;
  member_count?: number;
}

export default function MyTeam() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/teams/me");
      setTeam(res.data);
    } catch (error) {
      console.error("Failed to fetch team", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Users className="w-12 h-12 mb-4 text-slate-300" />
        <p>{t('admin.teams.error') || "Failed to load team data."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('layout.team_settings')}</h1>
        <p className="text-slate-500 mt-1">{t('layout.team_settings')} - {team.name}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#00629B]/10 flex items-center justify-center">
                <Settings className="w-6 h-6 text-[#00629B]" />
              </div>
              <div>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>{team.description || t('team.no_description')}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-5 h-5" />
                <span className="font-medium">{team.member_count}</span>
                <span className="text-slate-500">{t('team.members_count')}</span>
              </div>
            </div>
            {user?.role === 1 && (
              <Button
                onClick={() => setMembersDialogOpen(true)}
                className="bg-[#00629B] hover:bg-[#005a8e] text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                {t('admin.teams.btn_manage_members')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {membersDialogOpen && (
        <MemberTransfer
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
          teamId={team.id}
          teamName={team.name}
          onSuccess={fetchTeam}
          apiPrefix="/teams/me"
        />
      )}
    </div>
  );
}
