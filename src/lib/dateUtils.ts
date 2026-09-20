/** Returns the Monday (YYYY-MM-DD) of the Mon-Sun week containing the given date string. */
export function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const daysSinceMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

/** Returns "YYYY-MM" for a date string. */
export function yearMonthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Returns an array of the last N Monday-anchored week-start strings, ending with the week containing `today`. */
export function lastNWeeks(n: number, today: Date = new Date()): string[] {
  // Local calendar date, not UTC (see the same fix in app/page.tsx's todayStr()).
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  const currentMonday = mondayOf(todayStr);
  const weeks: string[] = [];
  const cursor = new Date(currentMonday + "T00:00:00Z");
  for (let i = 0; i < n; i++) {
    weeks.unshift(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return weeks;
}
