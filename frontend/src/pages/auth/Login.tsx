import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<{ enabled: boolean; provider_name: string } | null>(null);
  const navigate = useNavigate();
  const { setToken, fetchUser, token } = useAuthStore();
  const { toast } = useToast();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    if (token) {
      navigate("/dashboard", { replace: true });
      return;
    }
    void apiClient
      .get("/login/oauth2/provider")
      .then((res) => setOauthProvider(res.data))
      .catch(() => setOauthProvider(null));
  }, [token, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await apiClient.post("/login/access-token", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      setToken(response.data.access_token);
      await fetchUser();
      
      toast({
        title: t('login.login_success_title'),
        description: t('login.login_success_desc'),
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('login.login_failed_title'),
        description: error.response?.data?.detail || t('login.login_failed_desc'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = async () => {
    setSsoLoading(true);
    try {
      const redirectUri = `${window.location.origin}/login/oauth2/callback`;
      const res = await apiClient.post("/login/oauth2/authorize", { redirect_uri: redirectUri });
      window.location.href = res.data.authorization_url;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("login.oauth_failed_title"),
        description: error.response?.data?.detail || t("login.oauth_failed_desc"),
      });
      setSsoLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      {/* Language Switcher */}
      <div className="fixed top-4 right-4 flex items-center gap-1 bg-white p-1 rounded-md shadow-sm border border-slate-200">
        <Button 
          variant="ghost" 
          size="sm"
          className={`h-7 px-3 text-xs ${!i18n.language.startsWith('zh') ? 'bg-slate-100 shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => changeLanguage('en')}
        >
          EN
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className={`h-7 px-3 text-xs ${i18n.language.startsWith('zh') ? 'bg-slate-100 shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => changeLanguage('zh')}
        >
          中文
        </Button>
      </div>

      <Card className="w-[400px] shadow-sm border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">{t('login.title')}</CardTitle>
          <CardDescription>
            {t('login.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('login.username_label')}</Label>
              <Input 
                id="username" 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password_label')}</Label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button className="w-full bg-[#00629B] hover:bg-[#005080]" type="submit" disabled={loading}>
              {loading ? t('login.signing_in_btn') : t('login.sign_in_btn')}
            </Button>
          </form>
          {oauthProvider?.enabled ? (
            <div className="mt-4 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">{t("login.or")}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSsoLogin}
                disabled={ssoLoading}
              >
                {ssoLoading
                  ? t("login.oauth_signing_in")
                  : t("login.oauth_sign_in", { provider: oauthProvider.provider_name })}
              </Button>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-slate-500">
          {t('login.powered_by')}
        </CardFooter>
      </Card>
    </div>
  );
}
