export function secondsToDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function durationToSeconds(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // "MM:SS" e.g. "12:30"
  const mmss = trimmed.match(/^(\d{1,3}):(\d{2})$/);
  if (mmss) return parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);

  // Whole number of minutes, e.g. "12" -> 12:00. Also accepts a trailing
  // colon someone might type while starting "MM:SS", e.g. "12:".
  const wholeMinutes = trimmed.match(/^(\d{1,3}):?$/);
  if (wholeMinutes) return parseInt(wholeMinutes[1], 10) * 60;

  return null;
}
