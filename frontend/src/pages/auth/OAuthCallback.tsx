import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { apiClient } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";

export default function OAuthCallback() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setToken, fetchUser } = useAuthStore();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      toast({ title: t("login.oauth_failed_title"), variant: "destructive" });
      navigate("/login", { replace: true });
      return;
    }

    void (async () => {
      try {
        const response = await apiClient.post("/login/oauth2/callback", { code, state });
        setToken(response.data.access_token);
        await fetchUser();
        toast({
          title: t("login.login_success_title"),
          description: t("login.login_success_desc"),
        });
        navigate("/dashboard", { replace: true });
      } catch (error: any) {
        toast({
          title: t("login.oauth_failed_title"),
          description: error.response?.data?.detail || t("login.oauth_failed_desc"),
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      }
    })();
  }, [fetchUser, navigate, searchParams, setToken, t, toast]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{t("login.oauth_callback_loading")}</span>
      </div>
    </div>
  );
}
