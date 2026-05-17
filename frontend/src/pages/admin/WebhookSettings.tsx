import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2, Send, Pencil } from "lucide-react";

import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type WebhookEvent = "task.started" | "task.completed" | "task.failed" | "task.cancelled";
const ALL_EVENTS: WebhookEvent[] = ["task.started", "task.completed", "task.failed", "task.cancelled"];

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
  secret_configured: boolean;
  created_at: string | null;
}

interface FormState {
  name: string;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
  secret: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  url: "",
  events: [...ALL_EVENTS],
  enabled: true,
  secret: "",
};

export function WebhookSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testEvent, setTestEvent] = useState<WebhookEvent>("task.completed");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const eventLabel = (e: WebhookEvent) => t(`admin.webhook.event_${e.replace(".", "_")}`);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/webhooks/");
      setWebhooks(res.data);
    } catch {
      toast({ title: t("admin.webhook.load_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (wh: Webhook) => {
    setEditingId(wh.id);
    setForm({ name: wh.name, url: wh.url, events: wh.events, enabled: wh.enabled, secret: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      url: form.url.trim(),
      events: form.events,
      enabled: form.enabled,
    };
    if (form.secret) payload.secret = form.secret;

    try {
      setSaving(true);
      if (editingId) {
        await apiClient.put(`/admin/webhooks/${editingId}`, payload);
      } else {
        await apiClient.post("/admin/webhooks/", payload);
      }
      toast({ title: t("admin.webhook.save_success") });
      setDialogOpen(false);
      void load();
    } catch {
      toast({ title: t("admin.webhook.save_error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const res = await apiClient.post(`/admin/webhooks/${id}/test`, { event: testEvent });
      if (res.data.success) {
        toast({ title: t("admin.webhook.test_success"), description: t("admin.webhook.test_success_desc", { status: res.data.status_code }) });
      } else {
        toast({ title: t("admin.webhook.test_failed"), description: t("admin.webhook.test_failed_desc", { error: res.data.error || res.data.status_code }), variant: "destructive" });
      }
    } catch {
      toast({ title: t("admin.webhook.test_failed"), variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await apiClient.delete(`/admin/webhooks/${deleteId}`);
      toast({ title: t("admin.webhook.deleted") });
      void load();
    } catch {
      toast({ title: t("admin.webhook.save_error"), variant: "destructive" });
    } finally {
      setDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const toggleEvent = (e: WebhookEvent) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(e) ? prev.events.filter(x => x !== e) : [...prev.events, e],
    }));
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("admin.webhook.title")}</CardTitle>
            <CardDescription className="mt-1">{t("admin.webhook.desc")}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600 whitespace-nowrap">{t("admin.webhook.test_event_label")}</Label>
              <Select value={testEvent} onValueChange={(v) => setTestEvent(v as WebhookEvent)}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_EVENTS.map(e => <SelectItem key={e} value={e} className="text-xs">{eventLabel(e)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate} className="bg-[#00629B] hover:bg-[#005080]" size="sm">
              <Plus className="w-4 h-4 mr-2" />{t("admin.webhook.add_btn")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">{t("admin.webhook.empty")}</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left font-semibold text-slate-700 px-4 py-3">{t("admin.webhook.col_name")}</th>
                    <th className="text-left font-semibold text-slate-700 px-4 py-3">{t("admin.webhook.col_url")}</th>
                    <th className="text-left font-semibold text-slate-700 px-4 py-3">{t("admin.webhook.col_events")}</th>
                    <th className="text-left font-semibold text-slate-700 px-4 py-3">{t("admin.webhook.col_status")}</th>
                    <th className="text-right font-semibold text-slate-700 px-4 py-3">{t("admin.webhook.col_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {webhooks.map(wh => (
                    <tr key={wh.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{wh.name}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate font-mono text-xs" title={wh.url}>{wh.url}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {wh.events.map(e => (
                            <Badge key={e} variant="outline" className="text-xs font-normal">{eventLabel(e)}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={wh.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}>
                          {wh.enabled ? t("admin.webhook.status_enabled") : t("admin.webhook.status_disabled")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7" title={t("admin.webhook.test_btn")}
                            onClick={() => handleTest(wh.id)} disabled={testing === wh.id}>
                            {testing === wh.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(wh)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:border-red-300"
                            onClick={() => { setDeleteId(wh.id); setDeleteOpen(true); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t("admin.webhook.dialog_edit_title") : t("admin.webhook.dialog_create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("admin.webhook.form_name")}</Label>
              <Input placeholder={t("admin.webhook.form_name_placeholder")} value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.webhook.form_url")}</Label>
              <Input placeholder={t("admin.webhook.form_url_placeholder")} value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.webhook.form_events")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_EVENTS.map(e => (
                  <label key={e} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.events.includes(e)} onCheckedChange={() => toggleEvent(e)} />
                    <span className="text-sm">{eventLabel(e)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("admin.webhook.form_secret")}</Label>
              <Input type="password" autoComplete="new-password"
                placeholder={editingId ? t("admin.webhook.form_secret_placeholder_set") : t("admin.webhook.form_secret_placeholder")}
                value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} />
              <p className="text-xs text-slate-500">{t("admin.webhook.form_secret_hint")}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <Label>{t("admin.webhook.form_enabled")}</Label>
              <Switch checked={form.enabled} onCheckedChange={v => setForm({ ...form, enabled: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("tasks.cancel_btn")}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.url.trim()} className="bg-[#00629B] hover:bg-[#005080]">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("models.save_btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen}
        title={t("admin.webhook.delete_confirm")} description={t("admin.webhook.delete_confirm_desc")}
        confirmText={t("admin.webhook.delete_btn")} cancelText={t("tasks.cancel_btn")}
        onConfirm={handleDeleteConfirm} variant="danger" />
    </>
  );
}
