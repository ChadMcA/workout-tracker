import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type DayCategory = "pushpull" | "armday" | "legsonly" | "homeday";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10); // 1-12

  if (!year || !month) {
    return NextResponse.json({ error: "year and month query params are required" }, { status: 400 });
  }

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const days = await query<{ id: number; date: string; location: string }>(
    `SELECT id, date, location FROM workout_days WHERE to_char(date, 'YYYY-MM') = $1 ORDER BY date ASC`,
    [monthStr]
  );

  const muscleRows = await query<{ workout_day_id: number; muscle_group: string | null }>(
    `SELECT s.workout_day_id, e.muscle_group
     FROM sets s
     JOIN exercises e ON e.id = s.exercise_id
     WHERE e.category = 'strength' AND s.workout_day_id = ANY($1::int[])`,
    [days.map((d) => d.id)]
  );

  const groupsByWorkoutDay = new Map<number, Set<string>>();
  for (const row of muscleRows) {
    if (!row.muscle_group) continue;
    if (!groupsByWorkoutDay.has(row.workout_day_id)) groupsByWorkoutDay.set(row.workout_day_id, new Set());
    groupsByWorkoutDay.get(row.workout_day_id)!.add(row.muscle_group);
  }

  // Multiple workout_days rows can share the same calendar date (two sessions
  // in one day, or a duplicate submission) — merge them by date instead of
  // letting whichever row is processed last silently win.
  interface DateAgg {
    anyHome: boolean;
    groups: Set<string>;
  }
  const byDate = new Map<string, DateAgg>();
  for (const day of days) {
    if (!byDate.has(day.date)) byDate.set(day.date, { anyHome: false, groups: new Set() });
    const agg = byDate.get(day.date)!;
    if (day.location === "Home") agg.anyHome = true;
    const groups = groupsByWorkoutDay.get(day.id);
    if (groups) for (const g of groups) agg.groups.add(g);
  }

  const dayCategories: Record<number, DayCategory> = {};
  for (const [dateStr, agg] of byDate.entries()) {
    const dayOfMonth = parseInt(dateStr.slice(-2), 10);
    let category: DayCategory;
    if (agg.anyHome) category = "homeday";
    else if (agg.groups.has("Chest") || agg.groups.has("Back")) category = "pushpull";
    else if (agg.groups.has("Biceps") || agg.groups.has("Triceps")) category = "armday";
    else category = "legsonly";
    dayCategories[dayOfMonth] = category;
  }

  // Longest gap between consecutive *distinct* workout dates within this month.
  const distinctDates = [...byDate.keys()].sort();
  let longestGapDays = 0;
  for (let i = 1; i < distinctDates.length; i++) {
    const prev = new Date(distinctDates[i - 1] + "T00:00:00Z");
    const curr = new Date(distinctDates[i] + "T00:00:00Z");
    const gap = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (gap > longestGapDays) longestGapDays = gap;
  }

  const allTimeCountRow = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT date)::text AS count FROM workout_days`
  );
  const allTimeWorkoutCount = parseInt(allTimeCountRow[0]?.count ?? "0", 10);

  return NextResponse.json({
    year,
    month,
    days: dayCategories,
    monthWorkoutCount: distinctDates.length,
    longestGapDays,
    allTimeWorkoutCount,
  });
}
