import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "./UserManagement";
import { TeamManagement } from "./TeamManagement";
import { LdapSettings } from "./LdapSettings";
import { OAuthOidcSettings } from "./OAuthOidcSettings";
import { WebhookSettings } from "./WebhookSettings";

export default function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    if (user && !user.is_superuser) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (!user?.is_superuser) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin.title')}</h2>
        <p className="text-slate-500 text-lg">
          {t('admin.desc')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#00629B] data-[state=active]:shadow-sm px-6"
          >
            {t('admin.tabs.users')}
          </TabsTrigger>
          <TabsTrigger 
            value="teams" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#00629B] data-[state=active]:shadow-sm px-6"
          >
            {t('admin.tabs.teams')}
          </TabsTrigger>
          <TabsTrigger
            value="ldap"
            className="data-[state=active]:bg-white data-[state=active]:text-[#00629B] data-[state=active]:shadow-sm px-6"
          >
            {t('admin.tabs.ldap')}
          </TabsTrigger>
          <TabsTrigger
            value="oauth"
            className="data-[state=active]:bg-white data-[state=active]:text-[#00629B] data-[state=active]:shadow-sm px-6"
          >
            {t('admin.tabs.oauth')}
          </TabsTrigger>
          <TabsTrigger
            value="webhooks"
            className="data-[state=active]:bg-white data-[state=active]:text-[#00629B] data-[state=active]:shadow-sm px-6"
          >
            {t('admin.tabs.webhooks')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-0 focus-visible:outline-none">
          <UserManagement />
        </TabsContent>
        <TabsContent value="teams" className="mt-0 focus-visible:outline-none">
          <TeamManagement />
        </TabsContent>
        <TabsContent value="ldap" className="mt-0 focus-visible:outline-none">
          <LdapSettings />
        </TabsContent>
        <TabsContent value="oauth" className="mt-0 focus-visible:outline-none">
          <OAuthOidcSettings />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-0 focus-visible:outline-none">
          <WebhookSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
