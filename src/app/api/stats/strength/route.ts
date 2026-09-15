import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mondayOf } from "@/lib/dateUtils";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscleGroups";

export const dynamic = "force-dynamic";

interface Row {
  date: string;
  muscle_group: MuscleGroup | null;
  weight_lb: number | null;
  weight_modifier: string | null;
  reps: number | null;
  sets: number | null;
  bench_total_lb: number | null;
}

function rowVolume(row: Row): number | null {
  if (!row.muscle_group || row.reps == null || row.sets == null) return null;
  let effective: number | null;
  if (row.bench_total_lb != null) {
    effective = row.bench_total_lb;
  } else if (row.weight_modifier === "each" && row.weight_lb != null) {
    effective = row.weight_lb * 2;
  } else {
    effective = row.weight_lb;
  }
  if (effective == null) return null;
  return effective * row.reps * row.sets;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weeks = Math.min(parseInt(searchParams.get("weeks") ?? "10", 10), 104);

  const rows = await query<Row>(
    `SELECT wd.date, e.muscle_group, s.weight_lb, s.weight_modifier, s.reps, s.sets, s.bench_total_lb
     FROM sets s
     JOIN exercises e ON e.id = s.exercise_id
     JOIN workout_days wd ON wd.id = s.workout_day_id
     WHERE e.category = 'strength'`
  );

  // Anchor "last N weeks" to the most recent logged date, so the chart is
  // meaningful even if the person hasn't opened the app in a while.
  const mostRecent = rows.reduce((max, r) => (r.date > max ? r.date : max), "0000-00-00");
  const anchor = mostRecent === "0000-00-00" ? new Date() : new Date(mostRecent + "T00:00:00Z");

  const weekStarts: string[] = [];
  const cursor = new Date(mondayOf(anchor.toISOString().slice(0, 10)) + "T00:00:00Z");
  for (let i = 0; i < weeks; i++) {
    weekStarts.unshift(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  const weekSet = new Set(weekStarts);

  const weeklyMap = new Map<string, Record<MuscleGroup, number>>();
  for (const w of weekStarts) {
    weeklyMap.set(
      w,
      Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>
    );
  }

  const allTime = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<
    MuscleGroup,
    number
  >;

  for (const row of rows) {
    const vol = rowVolume(row);
    if (vol == null || !row.muscle_group) continue;
    allTime[row.muscle_group] += vol;

    const week = mondayOf(row.date);
    if (weekSet.has(week)) {
      const bucket = weeklyMap.get(week)!;
      bucket[row.muscle_group] += vol;
    }
  }

  const weekly = weekStarts.map((w) => {
    const bucket = weeklyMap.get(w)!;
    const entry: Record<string, string | number> = { week: w };
    for (const g of MUSCLE_GROUPS) {
      entry[g] = Math.round((bucket[g] / 1000) * 10) / 10; // thousands of lb, 1 decimal
    }
    return entry;
  });

  const allTimeList = MUSCLE_GROUPS.map((g) => ({ name: g, value: Math.round(allTime[g]) })).sort(
    (a, b) => b.value - a.value
  );

  return NextResponse.json({ weekly, allTime: allTimeList });
}
