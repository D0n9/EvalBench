import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LdapSettingsForm {
  enabled: boolean;
  server_uri: string;
  user_search_base: string;
  user_search_filter: string;
  user_attr_map: string;
  always_update_user: boolean;
  cache_timeout: number;
  bind_dn: string;
  bind_password_configured: boolean;
}

const DEFAULT_ATTR_MAP_JSON = JSON.stringify(
  { nickname: "givenName", uid: "cn", mail: "mail" },
  null,
  2,
);

export function LdapSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bindPassword, setBindPassword] = useState("");
  const [form, setForm] = useState<LdapSettingsForm>({
    enabled: false,
    server_uri: "",
    user_search_base: "",
    user_search_filter: "(uid=%(user)s)",
    user_attr_map: DEFAULT_ATTR_MAP_JSON,
    always_update_user: true,
    cache_timeout: 600,
    bind_dn: "",
    bind_password_configured: false,
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/settings/ldap");
      const data = res.data;
      setForm({
        enabled: Boolean(data.enabled),
        server_uri: data.server_uri || "",
        user_search_base: data.user_search_base || "",
        user_search_filter: data.user_search_filter || "(uid=%(user)s)",
        user_attr_map: JSON.stringify(data.user_attr_map || {}, null, 2),
        always_update_user: Boolean(data.always_update_user),
        cache_timeout: Number(data.cache_timeout) || 600,
        bind_dn: data.bind_dn || "",
        bind_password_configured: Boolean(data.bind_password_configured),
      });
      setBindPassword("");
    } catch {
      toast({
        title: t("admin.ldap.load_error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    let userAttrMap: Record<string, string>;
    try {
      const parsed = JSON.parse(form.user_attr_map);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("invalid");
      }
      userAttrMap = parsed as Record<string, string>;
    } catch {
      toast({
        title: t("admin.ldap.attr_map_invalid"),
        variant: "destructive",
      });
      return;
    }

    const payload: Record<string, unknown> = {
      enabled: form.enabled,
      server_uri: form.server_uri.trim(),
      user_search_base: form.user_search_base.trim(),
      user_search_filter: form.user_search_filter.trim(),
      user_attr_map: userAttrMap,
      always_update_user: form.always_update_user,
      cache_timeout: form.cache_timeout,
      bind_dn: form.bind_dn.trim() || null,
    };
    if (bindPassword !== "") {
      payload.bind_password = bindPassword;
    }

    try {
      setSaving(true);
      const res = await apiClient.put("/admin/settings/ldap", payload);
      setForm((prev) => ({
        ...prev,
        bind_password_configured: Boolean(res.data.bind_password_configured),
      }));
      setBindPassword("");
      toast({ title: t("admin.ldap.save_success") });
    } catch {
      toast({
        title: t("admin.ldap.save_error"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>{t("admin.ldap.title")}</CardTitle>
        <CardDescription>{t("admin.ldap.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <Label className="text-base">{t("admin.ldap.enabled")}</Label>
            <p className="text-sm text-slate-500 mt-1">{t("admin.ldap.enabled_hint")}</p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="ldap-server-uri">{t("admin.ldap.server_uri")}</Label>
            <Input
              id="ldap-server-uri"
              placeholder="ldap://ldap.example.com:389"
              value={form.server_uri}
              onChange={(e) => setForm({ ...form, server_uri: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ldap-cache-timeout">{t("admin.ldap.cache_timeout")}</Label>
            <Input
              id="ldap-cache-timeout"
              type="number"
              min={60}
              max={86400}
              value={form.cache_timeout}
              onChange={(e) =>
                setForm({ ...form, cache_timeout: Number(e.target.value) || 600 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ldap-search-base">{t("admin.ldap.user_search_base")}</Label>
            <Input
              id="ldap-search-base"
              placeholder="ou=People,dc=example,dc=com"
              value={form.user_search_base}
              onChange={(e) => setForm({ ...form, user_search_base: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ldap-search-filter">{t("admin.ldap.user_search_filter")}</Label>
            <Input
              id="ldap-search-filter"
              value={form.user_search_filter}
              onChange={(e) => setForm({ ...form, user_search_filter: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ldap-attr-map">{t("admin.ldap.user_attr_map")}</Label>
          <Textarea
            id="ldap-attr-map"
            className="font-mono text-xs min-h-[120px]"
            value={form.user_attr_map}
            onChange={(e) => setForm({ ...form, user_attr_map: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <Label>{t("admin.ldap.always_update_user")}</Label>
            <p className="text-sm text-slate-500 mt-1">{t("admin.ldap.always_update_user_hint")}</p>
          </div>
          <Switch
            checked={form.always_update_user}
            onCheckedChange={(v) => setForm({ ...form, always_update_user: v })}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700">{t("admin.ldap.bind_section")}</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ldap-bind-dn">{t("admin.ldap.bind_dn")}</Label>
              <Input
                id="ldap-bind-dn"
                placeholder="cn=admin,dc=example,dc=com"
                value={form.bind_dn}
                onChange={(e) => setForm({ ...form, bind_dn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ldap-bind-password">{t("admin.ldap.bind_password")}</Label>
              <Input
                id="ldap-bind-password"
                type="password"
                autoComplete="new-password"
                placeholder={
                  form.bind_password_configured
                    ? t("admin.ldap.bind_password_placeholder_set")
                    : t("admin.ldap.bind_password_placeholder")
                }
                value={bindPassword}
                onChange={(e) => setBindPassword(e.target.value)}
              />
              <p className="text-xs text-slate-500">{t("admin.ldap.bind_password_hint")}</p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-[#00629B] hover:bg-[#005080]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {t("admin.ldap.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
