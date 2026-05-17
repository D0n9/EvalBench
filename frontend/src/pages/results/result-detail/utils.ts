import type { JsonValue, MetricDetail, SampleResult } from "./types";

export function asObject(v: JsonValue | undefined): Record<string, JsonValue> | null {
  if (!v) return null;
  if (typeof v !== "object") return null;
  if (Array.isArray(v)) return null;
  return v as Record<string, JsonValue>;
}

export function asArray(v: JsonValue | undefined): JsonValue[] | null {
  if (!v) return null;
  if (!Array.isArray(v)) return null;
  return v;
}

export function parseSystemAndUser(input: string): { system: string; user: string } {
  const m = input.match(/\*\*System\*\*:\s*([\s\S]*?)\*\*User\*\*:\s*([\s\S]*)$/);
  if (m) {
    return { system: (m[1] || "").trim(), user: (m[2] || "").trim() };
  }
  return { system: "", user: input.trim() };
}

function messageContent(msg: Record<string, JsonValue>): string {
  const content = msg.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const p = asObject(part);
        if (!p) return "";
        if (p.type === "text" && typeof p.text === "string") return p.text;
        if (typeof p.text === "string") return p.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content == null) return "";
  return String(content);
}

function formatMessagesAsPrompt(messages: JsonValue[]): string {
  const systemParts: string[] = [];
  const userParts: string[] = [];
  for (const item of messages) {
    const m = asObject(item);
    if (!m) continue;
    const role = String(m.role ?? "").toLowerCase();
    const text = messageContent(m).trim();
    if (!text) continue;
    if (role === "system") systemParts.push(text);
    else if (role === "user") userParts.push(text);
  }
  if (systemParts.length && userParts.length) {
    return `**System**: ${systemParts.join("\n\n")}\n\n**User**: ${userParts.join("\n\n")}`;
  }
  if (userParts.length) return userParts.join("\n\n");
  if (systemParts.length) return systemParts.join("\n\n");
  return "";
}

/** Resolve prompt for display when DB prompt is empty (EvalScope 1.6+ predictions jsonl). */
export function resolvePromptForDisplay(sample: SampleResult): string {
  if (sample.prompt?.trim()) return sample.prompt;
  const raw = asObject(sample.raw_data);
  if (!raw) return "";
  const input = raw.input;
  if (typeof input === "string" && input.trim()) return input;
  if (Array.isArray(input) && input.length) return formatMessagesAsPrompt(input);
  const messages = asArray(raw.messages);
  if (messages?.length) return formatMessagesAsPrompt(messages);
  return "";
}

export function extractYamlScalar(yamlText: string, key: string): string | null {
  const m = yamlText.match(new RegExp(`^\\s*${key}\\s*:\\s*(.*)\\s*$`, "m"));
  if (!m) return null;
  const v = (m[1] || "").trim();
  if (!v || v === "null") return null;
  return v.replace(/^['"]|['"]$/g, "");
}

export function extractYamlList(yamlText: string, key: string): string[] | null {
  const lines = yamlText.split("\n");
  let inList = false;
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === `${key}:` || trimmed.startsWith(`${key}:`)) {
      inList = true;
      continue;
    }
    if (inList) {
      if (trimmed.startsWith("- ")) {
        items.push(trimmed.substring(2).trim());
      } else if (trimmed && !trimmed.startsWith("#") && !trimmed.includes(":")) {
        const m = trimmed.match(/^['"]?(.+?)['"]?\s*$/);
        if (m) {
          items.push(m[1]);
        }
      } else if (trimmed.includes(":") || trimmed.startsWith("-")) {
        break;
      } else if (trimmed && !trimmed.startsWith("[")) {
        items.push(trimmed.replace(/^['"]|['"]$/g, ""));
      } else {
        break;
      }
    }
  }

  return items.length > 0 ? items : null;
}

function categoryPretty(category?: string): string {
  if (!category) return "default";
  if (category === "contraindication_bypass") return "禁忌症绕过";
  return category;
}

export function buildCaseTitle(sample: SampleResult): string {
  const userText = parseSystemAndUser(resolvePromptForDisplay(sample)).user;
  const diseaseMatch = userText.match(/"([^"]{2,30})"/);
  const disease = diseaseMatch?.[1];
  const activities = ["HIIT", "游泳", "举重", "深蹲", "硬拉", "跑步", "力量训练"];
  const activity = activities.find((a) => userText.includes(a));
  const base = categoryPretty(sample.category);
  if (disease && activity) return `${base} - ${disease} + ${activity}`;
  if (disease) return `${base} - ${disease}`;
  if (activity) return `${base} - ${activity}`;
  const short = userText.replace(/\s+/g, " ").slice(0, 18);
  return `${base} - ${short}${userText.length > 18 ? "…" : ""}`;
}

export function scoreBarColor(score: number): string {
  if (score >= 0.8) return "#22c55e";
  if (score >= 0.5) return "#f59e0b";
  return "#ef4444";
}

export function buildMetricsDetails(metricsObj: Record<string, JsonValue> | null): MetricDetail[] {
  const metricsArr = asArray(metricsObj?.metrics);
  const metricsDetails: MetricDetail[] = [];

  (metricsArr || []).forEach((m) => {
    const metric = asObject(m);
    if (!metric) return;

    const mName = String(metric.name || "");
    const mScore = Number(metric.score ?? 0);
    const mNum = Number(metric.num ?? 0);

    const categories = asArray(metric.categories);
    if (!categories || categories.length === 0) {
      metricsDetails.push({
        metricName: mName,
        score: mScore,
        num: mNum,
        category: "default",
        subset: "all",
        isMain: true,
      });
      return;
    }

    categories.forEach((c) => {
      const cat = asObject(c);
      if (!cat) return;

      const catNameArr = asArray(cat.name);
      const catName = catNameArr?.[0] ? String(catNameArr[0]) : "default";
      const catScore = Number(cat.score ?? 0);
      const catNum = Number(cat.num ?? 0);

      const subsets = asArray(cat.subsets);
      if (!subsets || subsets.length === 0) {
        metricsDetails.push({
          metricName: mName,
          score: catScore,
          num: catNum,
          category: catName,
          subset: "all",
          isMain: false,
        });
        return;
      }

      subsets.forEach((s) => {
        const sub = asObject(s);
        if (!sub) return;
        metricsDetails.push({
          metricName: mName,
          score: Number(sub.score ?? 0),
          num: Number(sub.num ?? 0),
          category: catName,
          subset: String(sub.name || "all"),
          isMain: false,
        });
      });
    });
  });

  return metricsDetails;
}
