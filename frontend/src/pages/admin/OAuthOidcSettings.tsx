import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "oauth2" | "oidc";

interface SSOForm {
  enabled: boolean;
  mode: AuthMode;
  provider_name: string;
  client_id: string;
  client_secret_configured: boolean;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  issuer: string;
  scope: string;
  username_claim: string;
  email_claim: string;
  full_name_claim: string;
  auto_create_users: boolean;
  always_update_user: boolean;
}

const DEFAULT_FORM: SSOForm = {
  enabled: false,
  mode: "oidc",
  provider_name: "SSO",
  client_id: "",
  client_secret_configured: false,
  authorization_endpoint: "",
  token_endpoint: "",
  userinfo_endpoint: "",
  jwks_uri: "",
  issuer: "",
  scope: "openid email profile",
  username_claim: "email",
  email_claim: "email",
  full_name_claim: "name",
  auto_create_users: true,
  always_update_user: true,
};

function ModeCard({
  value,
  current,
  label,
  hint,
  onSelect,
}: {
  value: AuthMode;
  current: AuthMode;
  label: string;
  hint: string;
  onSelect: (v: AuthMode) => void;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={[
        "w-full text-left rounded-lg border p-4 transition-colors",
        selected
          ? "border-[#00629B] bg-blue-50 ring-1 ring-[#00629B]"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <div
          className={[
            "h-4 w-4 rounded-full border-2 flex-shrink-0",
            selected ? "border-[#00629B] bg-[#00629B]" : "border-slate-300",
          ].join(" ")}
        />
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className="mt-1 pl-6 text-xs text-slate-500">{hint}</p>
    </button>
  );
}

export function OAuthOidcSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [form, setForm] = useState<SSOForm>(DEFAULT_FORM);

  const isOidc = form.mode === "oidc";

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/settings/oauth-oidc");
      const d = res.data;
      setForm({
        enabled: Boolean(d.enabled),
        mode: (d.mode === "oauth2" ? "oauth2" : "oidc") as AuthMode,
        provider_name: d.provider_name || "SSO",
        client_id: d.client_id || "",
        client_secret_configured: Boolean(d.client_secret_configured),
        authorization_endpoint: d.authorization_endpoint || "",
        token_endpoint: d.token_endpoint || "",
        userinfo_endpoint: d.userinfo_endpoint || "",
        jwks_uri: d.jwks_uri || "",
        issuer: d.issuer || "",
        scope: d.scope || (d.mode === "oauth2" ? "email profile" : "openid email profile"),
        username_claim: d.username_claim || "email",
        email_claim: d.email_claim || "email",
        full_name_claim: d.full_name_claim || "name",
        auto_create_users: Boolean(d.auto_create_users),
        always_update_user: Boolean(d.always_update_user),
      });
      setClientSecret("");
    } catch {
      toast({ title: t("admin.oauth.load_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleModeChange = (mode: AuthMode) => {
    setForm((prev) => ({
      ...prev,
      mode,
      scope:
        mode === "oidc"
          ? prev.scope.includes("openid")
            ? prev.scope
            : `openid ${prev.scope}`.trim()
          : prev.scope.replace(/\bopenid\b\s*/g, "").trim() || "email profile",
    }));
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      enabled: form.enabled,
      mode: form.mode,
      provider_name: form.provider_name.trim() || "SSO",
      client_id: form.client_id.trim(),
      authorization_endpoint: form.authorization_endpoint.trim(),
      token_endpoint: form.token_endpoint.trim(),
      userinfo_endpoint: form.userinfo_endpoint.trim(),
      jwks_uri: form.jwks_uri.trim(),
      issuer: form.issuer.trim(),
      scope: form.scope.trim() || (isOidc ? "openid email profile" : "email profile"),
      username_claim: form.username_claim.trim() || "email",
      email_claim: form.email_claim.trim() || "email",
      full_name_claim: form.full_name_claim.trim() || "name",
      auto_create_users: form.auto_create_users,
      always_update_user: form.always_update_user,
    };
    if (clientSecret !== "") {
      payload.client_secret = clientSecret;
    }

    try {
      setSaving(true);
      const res = await apiClient.put("/admin/settings/oauth-oidc", payload);
      setForm((prev) => ({
        ...prev,
        client_secret_configured: Boolean(res.data.client_secret_configured),
      }));
      setClientSecret("");
      toast({ title: t("admin.oauth.save_success") });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: t("admin.oauth.save_error"),
        description: err.response?.data?.detail,
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
        <CardTitle>{t("admin.oauth.title")}</CardTitle>
        <CardDescription>{t("admin.oauth.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <Label className="text-base">{t("admin.oauth.enabled")}</Label>
            <p className="text-sm text-slate-500 mt-1">{t("admin.oauth.enabled_hint")}</p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>

        {/* Mode selection */}
        <div className="space-y-2">
          <Label className="text-base">{t("admin.oauth.mode_label")}</Label>
          <div className="grid md:grid-cols-2 gap-3 mt-2">
            <ModeCard
              value="oidc"
              current={form.mode}
              label={t("admin.oauth.mode_oidc")}
              hint={t("admin.oauth.mode_oidc_hint")}
              onSelect={handleModeChange}
            />
            <ModeCard
              value="oauth2"
              current={form.mode}
              label={t("admin.oauth.mode_oauth2")}
              hint={t("admin.oauth.mode_oauth2_hint")}
              onSelect={handleModeChange}
            />
          </div>
        </div>

        {/* Basic fields */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t("admin.oauth.provider_name")}</Label>
            <Input
              value={form.provider_name}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.oauth.client_id")}</Label>
            <Input
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {t("admin.oauth.scope")}
              {isOidc && (
                <span className="ml-1 text-xs text-slate-400">
                  — {t("admin.oauth.scope_hint_oidc")}
                </span>
              )}
            </Label>
            <Input
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("admin.oauth.client_secret")}</Label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={
                  form.client_secret_configured
                    ? t("admin.oauth.client_secret_placeholder_set")
                    : t("admin.oauth.client_secret_placeholder")
                }
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">{t("admin.oauth.client_secret_hint")}</p>
            </div>
          </div>
        </div>

        {/* Common endpoints */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("admin.oauth.authorization_endpoint")}</Label>
            <Input
              placeholder="https://idp.example.com/oauth2/authorize"
              value={form.authorization_endpoint}
              onChange={(e) => setForm({ ...form, authorization_endpoint: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.oauth.token_endpoint")}</Label>
            <Input
              placeholder="https://idp.example.com/oauth2/token"
              value={form.token_endpoint}
              onChange={(e) => setForm({ ...form, token_endpoint: e.target.value })}
            />
          </div>
        </div>

        {/* UserInfo endpoint – required for OAuth2, optional for OIDC */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              {t("admin.oauth.userinfo_endpoint")}
              {!isOidc && <span className="ml-1 text-red-500">*</span>}
            </Label>
            <Input
              placeholder="https://idp.example.com/oauth2/userinfo"
              value={form.userinfo_endpoint}
              onChange={(e) => setForm({ ...form, userinfo_endpoint: e.target.value })}
            />
            <p className="text-xs text-slate-500">
              {isOidc
                ? t("admin.oauth.userinfo_endpoint_hint_oidc")
                : t("admin.oauth.userinfo_endpoint_hint_oauth2")}
            </p>
          </div>
        </div>

        {/* OIDC-only fields */}
        {isOidc && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              OIDC
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t("admin.oauth.jwks_uri")}
                  <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  placeholder="https://idp.example.com/.well-known/jwks.json"
                  value={form.jwks_uri}
                  onChange={(e) => setForm({ ...form, jwks_uri: e.target.value })}
                />
                <p className="text-xs text-slate-500">{t("admin.oauth.jwks_uri_hint")}</p>
              </div>
              <div className="space-y-2">
                <Label>
                  {t("admin.oauth.issuer")}
                  <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  placeholder="https://idp.example.com"
                  value={form.issuer}
                  onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                />
                <p className="text-xs text-slate-500">{t("admin.oauth.issuer_hint")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Claim mapping */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t("admin.oauth.username_claim")}</Label>
            <Input
              value={form.username_claim}
              onChange={(e) => setForm({ ...form, username_claim: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.oauth.email_claim")}</Label>
            <Input
              value={form.email_claim}
              onChange={(e) => setForm({ ...form, email_claim: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.oauth.full_name_claim")}</Label>
            <Input
              value={form.full_name_claim}
              onChange={(e) => setForm({ ...form, full_name_claim: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <Label>{t("admin.oauth.auto_create_users")}</Label>
            <p className="text-sm text-slate-500 mt-1">{t("admin.oauth.auto_create_users_hint")}</p>
          </div>
          <Switch
            checked={form.auto_create_users}
            onCheckedChange={(v) => setForm({ ...form, auto_create_users: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <Label>{t("admin.oauth.always_update_user")}</Label>
            <p className="text-sm text-slate-500 mt-1">{t("admin.oauth.always_update_user_hint")}</p>
          </div>
          <Switch
            checked={form.always_update_user}
            onCheckedChange={(v) => setForm({ ...form, always_update_user: v })}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-[#00629B] hover:bg-[#005080]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {t("admin.oauth.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
