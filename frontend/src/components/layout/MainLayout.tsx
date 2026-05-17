import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/api/client";
import { formatDateUtc8 } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Box,
  Database,
  PlaySquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MainLayout() {
  const { isAuthenticated, user, fetchUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [evalMeta, setEvalMeta] = useState<{ evalscope_version: string; engine_updated_at: string | null } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else if (!user) {
      fetchUser();
    }
  }, [isAuthenticated, user, navigate, fetchUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      setEvalMeta(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient.get<{ evalscope_version: string; engine_updated_at: string | null }>(
          "/system/evalscope",
        );
        if (!cancelled) setEvalMeta(res.data);
      } catch {
        if (!cancelled) setEvalMeta(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const navItems = [
    { name: t('layout.dashboard'), path: "/dashboard", icon: LayoutDashboard },
    { name: t('layout.models'), path: "/models", icon: Box },
    { name: t('layout.datasets'), path: "/datasets", icon: Database },
    { name: t('layout.tasks'), path: "/tasks", icon: PlaySquare },
    ...(user?.role === 1 ? [{ name: t('layout.team_settings'), path: "/team", icon: Users }] : []),
    ...(user?.is_superuser ? [{ name: t('layout.platform_settings'), path: "/admin", icon: Settings }] : []),
  ];

  const sidebarWidth = isCollapsed ? "w-14" : "w-48";

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarWidth} bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <div className="h-16 flex items-center px-4 bg-slate-950 font-serif font-bold text-white text-lg tracking-wide border-b border-slate-800">
          {!isCollapsed && <span className="truncate">{t('layout.title')}</span>}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-[#00629B] text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* EvalScope meta + collapse toggle */}
        <div
          className={`p-2 border-t border-slate-800 flex gap-2 ${isCollapsed ? "flex-col items-center" : "flex-row items-start"}`}
        >
          {!isCollapsed && evalMeta ? (
            <div className="flex-1 min-w-0 pt-0.5 pr-1">
              <p className="text-[10px] leading-snug text-slate-500">
                {t("layout.evalscope_version")}:{" "}
                <span className="text-slate-400 font-mono">{evalMeta.evalscope_version}</span>
              </p>
              <p className="text-[10px] leading-snug text-slate-500 mt-1">
                {t("layout.engine_last_updated")}:{" "}
                <span className="text-slate-400">
                  {evalMeta.engine_updated_at
                    ? formatDateUtc8(evalMeta.engine_updated_at)
                    : "—"}
                </span>
              </p>
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 shrink-0 text-slate-400 hover:text-white hover:bg-slate-800 ${isCollapsed ? "" : "mt-0.5"}`}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={
              evalMeta
                ? `EvalScope ${evalMeta.evalscope_version}${evalMeta.engine_updated_at ? ` · ${formatDateUtc8(evalMeta.engine_updated_at)}` : ""}`
                : undefined
            }
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
          {isCollapsed && evalMeta ? (
            <p
              className="text-[9px] leading-tight text-slate-500 text-center max-w-full px-0.5 line-clamp-3 break-all"
              title={`EvalScope ${evalMeta.evalscope_version}${evalMeta.engine_updated_at ? ` · ${formatDateUtc8(evalMeta.engine_updated_at)}` : ""}`}
            >
              <span className="font-mono text-slate-400">{evalMeta.evalscope_version}</span>
              {evalMeta.engine_updated_at ? (
                <>
                  <br />
                  <span className="text-slate-500">{formatDateUtc8(evalMeta.engine_updated_at)}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-slate-800">
            {navItems.find(i => location.pathname.startsWith(i.path))?.name || t('layout.dashboard')}
          </h1>
          
          {/* Header Right Actions */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
              <Button 
                variant="ghost" 
                size="sm"
                className={`h-7 px-3 text-xs ${!i18n.language.startsWith('zh') ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => changeLanguage('en')}
              >
                EN
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className={`h-7 px-3 text-xs ${i18n.language.startsWith('zh') ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => changeLanguage('zh')}
              >
                中文
              </Button>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">
                    {user?.full_name?.charAt(0) || "U"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{t('layout.team_settings')}: {user?.team_name || '-'}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('layout.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8" style={{ overscrollBehavior: 'none' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
