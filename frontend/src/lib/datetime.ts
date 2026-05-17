const SHANGHAI_TIMEZONE = "Asia/Shanghai";

const zhCnDateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: SHANGHAI_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const zhCnDateOnlyFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: SHANGHAI_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateTimeUtc8(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  if (value == null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return zhCnDateTimeFormatter.format(date);
}

/** Year/month/day only (UTC+8 / Asia/Shanghai), e.g. 2026/04/15 */
export function formatDateUtc8(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  if (value == null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return zhCnDateOnlyFormatter.format(date);
}
