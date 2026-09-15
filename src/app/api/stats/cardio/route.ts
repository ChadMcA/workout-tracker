import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mondayOf, yearMonthOf } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

interface Row {
  date: string;
  exercise_name: string;
  duration_sec: number | null;
  floors: number | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weeks = Math.min(parseInt(searchParams.get("weeks") ?? "10", 10), 104);
  const months = Math.min(parseInt(searchParams.get("months") ?? "7", 10), 24);

  const rows = await query<Row>(
    `SELECT wd.date, e.name AS exercise_name, s.duration_sec, s.floors
     FROM sets s
     JOIN exercises e ON e.id = s.exercise_id
     JOIN workout_days wd ON wd.id = s.workout_day_id
     WHERE e.category = 'cardio'
     ORDER BY wd.date ASC`
  );

  const mostRecent = rows.reduce((max, r) => (r.date > max ? r.date : max), "0000-00-00");
  const anchorDate = mostRecent === "0000-00-00" ? new Date() : new Date(mostRecent + "T00:00:00Z");

  // ---- Weekly cardio minutes, split Stairmaster vs Treadmill (Elliptical folded into Treadmill bucket) ----
  const weekStarts: string[] = [];
  const wCursor = new Date(mondayOf(anchorDate.toISOString().slice(0, 10)) + "T00:00:00Z");
  for (let i = 0; i < weeks; i++) {
    weekStarts.unshift(wCursor.toISOString().slice(0, 10));
    wCursor.setUTCDate(wCursor.getUTCDate() - 7);
  }
  const weekSet = new Set(weekStarts);
  const weeklyMinutes = new Map<string, { Stairmaster: number; Treadmill: number }>();
  for (const w of weekStarts) weeklyMinutes.set(w, { Stairmaster: 0, Treadmill: 0 });

  for (const row of rows) {
    if (row.duration_sec == null) continue;
    const week = mondayOf(row.date);
    if (!weekSet.has(week)) continue;
    const bucket = weeklyMinutes.get(week)!;
    const minutes = row.duration_sec / 60;
    if (row.exercise_name === "Stairmaster") bucket.Stairmaster += minutes;
    else bucket.Treadmill += minutes;
  }

  const weekly = weekStarts.map((w) => {
    const b = weeklyMinutes.get(w)!;
    return {
      week: w,
      Stairmaster: Math.round(b.Stairmaster),
      Treadmill: Math.round(b.Treadmill),
    };
  });

  // ---- Monthly Stairmaster floors ----
  const monthKeys: string[] = [];
  const mCursor = new Date(
    Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1)
  );
  for (let i = 0; i < months; i++) {
    monthKeys.unshift(mCursor.toISOString().slice(0, 7));
    mCursor.setUTCMonth(mCursor.getUTCMonth() - 1);
  }
  const monthSet = new Set(monthKeys);
  const monthlyFloors = new Map<string, number>();
  for (const m of monthKeys) monthlyFloors.set(m, 0);

  for (const row of rows) {
    if (row.exercise_name !== "Stairmaster" || row.floors == null) continue;
    const ym = yearMonthOf(row.date);
    if (monthSet.has(ym)) monthlyFloors.set(ym, (monthlyFloors.get(ym) ?? 0) + row.floors);
  }

  const monthlyFloorsList = monthKeys.map((m) => ({
    month: m,
    floors: monthlyFloors.get(m) ?? 0,
  }));

  return NextResponse.json({ weekly, monthlyFloors: monthlyFloorsList });
}
