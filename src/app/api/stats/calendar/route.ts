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

  const groupsByDay = new Map<number, Set<string>>();
  for (const row of muscleRows) {
    if (!row.muscle_group) continue;
    if (!groupsByDay.has(row.workout_day_id)) groupsByDay.set(row.workout_day_id, new Set());
    groupsByDay.get(row.workout_day_id)!.add(row.muscle_group);
  }

  const dayCategories: Record<number, DayCategory> = {};
  for (const day of days) {
    if (day.location === "Home") {
      dayCategories[parseInt(day.date.slice(-2), 10)] = "homeday";
      continue;
    }
    const groups = groupsByDay.get(day.id) ?? new Set();
    let category: DayCategory;
    if (groups.has("Chest") || groups.has("Back")) category = "pushpull";
    else if (groups.has("Biceps") || groups.has("Triceps")) category = "armday";
    else category = "legsonly";
    dayCategories[parseInt(day.date.slice(-2), 10)] = category;
  }

  // Longest gap between consecutive workout days within this month.
  let longestGapDays = 0;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1].date + "T00:00:00Z");
    const curr = new Date(days[i].date + "T00:00:00Z");
    const gap = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (gap > longestGapDays) longestGapDays = gap;
  }

  const allTimeCountRow = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workout_days`
  );
  const allTimeWorkoutCount = parseInt(allTimeCountRow[0]?.count ?? "0", 10);

  return NextResponse.json({
    year,
    month,
    days: dayCategories,
    monthWorkoutCount: days.length,
    longestGapDays,
    allTimeWorkoutCount,
  });
}
