const kstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toKstDateKey(date: Date): string {
  return kstDateFormatter.format(date);
}
