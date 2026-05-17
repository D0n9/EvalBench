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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeUtc8 } from "@/lib/datetime";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, ChevronDown } from "lucide-react";

interface User {
  username: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  is_superuser: boolean;
  role: number | null;
  team_id: string | null;
  team_name: string | null;
  last_login: string | null;
}

export function UserManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: User) => {
    if (updatingIds.has(user.username)) return;
    
    setUpdatingIds(prev => new Set(prev).add(user.username));
    const newStatus = !user.is_active;

    try {
      await apiClient.put(`/admin/users/${user.username}`, {
        is_active: newStatus,
      });
      
      setUsers(prev => prev.map(u => 
        u.username === user.username ? { ...u, is_active: newStatus } : u
      ));

      toast({
        title: t('admin.users.update_success'),
      });
    } catch (error) {
      toast({
        title: t('admin.users.update_error'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(user.username);
        return next;
      });
    }
  };

  const handleRoleChange = async (user: User, newRole: number | 'super_admin') => {
    if (updatingIds.has(user.username)) return;
    
    setUpdatingIds(prev => new Set(prev).add(user.username));

    try {
      const updateData = newRole === 'super_admin' 
        ? { is_superuser: true, role: -1 }
        : { is_superuser: false, role: newRole as number };

      await apiClient.put(`/admin/users/${user.username}`, updateData);
      
      setUsers(prev => prev.map(u => 
        u.username === user.username ? { ...u, ...updateData } : u
      ));

      toast({
        title: t('admin.users.update_success'),
      });
    } catch (error) {
      toast({
        title: t('admin.users.update_error'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(user.username);
        return next;
      });
    }
  };

  const getRoleLabel = (user: User) => {
    if (user.is_superuser) return t('admin.users.role_admin');
    switch (user.role) {
      case 1: return t('admin.users.role_team_lead');
      case 2: return t('admin.users.role_member');
      default: return t('admin.users.role_none');
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
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="font-semibold text-slate-900">{t('admin.users.table_username')}</TableHead>
            <TableHead className="font-semibold text-slate-900">{t('admin.users.table_fullname')}</TableHead>
            <TableHead className="font-semibold text-slate-900">{t('admin.users.table_email')}</TableHead>
            <TableHead className="font-semibold text-slate-900">{t('admin.users.table_team')}</TableHead>
            <TableHead className="font-semibold text-slate-900">{t('admin.users.table_role')}</TableHead>
            <TableHead className="font-semibold text-slate-900">{t('admin.users.table_status')}</TableHead>
            <TableHead className="font-semibold text-slate-900">{t('admin.users.table_last_login')}</TableHead>
            <TableHead className="text-right font-semibold text-slate-900">{t('admin.users.table_actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.username} className="hover:bg-slate-50/50 transition-colors">
              <TableCell className="font-medium text-slate-900">{user.username}</TableCell>
              <TableCell className="text-slate-600">{user.full_name || "-"}</TableCell>
              <TableCell className="text-slate-600">{user.email || "-"}</TableCell>
              <TableCell className="text-slate-600 font-medium">{user.team_name || "-"}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 hover:opacity-80 transition-opacity outline-none">
                      <Badge 
                        variant="secondary" 
                        className={user.is_superuser ? "bg-[#00629B]/10 text-[#00629B] border-[#00629B]/20" : "bg-slate-100 text-slate-600"}
                      >
                        {getRoleLabel(user)}
                      </Badge>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleRoleChange(user, 'super_admin')}>
                      {t('admin.users.role_admin')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange(user, 1)}>
                      {t('admin.users.role_team_lead')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange(user, 2)}>
                      {t('admin.users.role_member')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange(user, -1)}>
                      {t('admin.users.role_none')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>
                <Badge 
                  className={user.is_active 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-red-50 text-red-700 border-red-200"
                  }
                  variant="outline"
                >
                  {user.is_active ? t('admin.users.status_active') : t('admin.users.status_disabled')}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-500 text-xs">
                {formatDateTimeUtc8(user.last_login, "-")}
              </TableCell>
              <TableCell className="text-right">
                {!user.is_superuser && (
                  <Button
                    variant={user.is_active ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(user)}
                    disabled={updatingIds.has(user.username)}
                    className={!user.is_active ? "bg-[#00629B] hover:bg-[#005a8e] text-white" : "text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"}
                  >
                    {updatingIds.has(user.username) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {user.is_active ? t('admin.users.btn_disable') : t('admin.users.btn_enable')}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
