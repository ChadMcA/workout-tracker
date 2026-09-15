import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mondayOf } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

interface Row {
  date: string;
  exercise_name: string;
  reps: number | null;
  sets: number | null;
}

const EXERCISE_LABELS: Record<string, string> = {
  "Leg raises": "core",
  Pushups: "pushups",
  "Pull-ups": "pullups",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weeks = Math.min(parseInt(searchParams.get("weeks") ?? "10", 10), 104);

  const rows = await query<Row>(
    `SELECT wd.date, e.name AS exercise_name, s.reps, s.sets
     FROM sets s
     JOIN exercises e ON e.id = s.exercise_id
     JOIN workout_days wd ON wd.id = s.workout_day_id
     WHERE e.category = 'bodyweight'`
  );

  const mostRecent = rows.reduce((max, r) => (r.date > max ? r.date : max), "0000-00-00");
  const anchorDate = mostRecent === "0000-00-00" ? new Date() : new Date(mostRecent + "T00:00:00Z");

  const weekStarts: string[] = [];
  const cursor = new Date(mondayOf(anchorDate.toISOString().slice(0, 10)) + "T00:00:00Z");
  for (let i = 0; i < weeks; i++) {
    weekStarts.unshift(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  const weekSet = new Set(weekStarts);

  const buckets: Record<"core" | "pushups" | "pullups", Map<string, number>> = {
    core: new Map(weekStarts.map((w) => [w, 0])),
    pushups: new Map(weekStarts.map((w) => [w, 0])),
    pullups: new Map(weekStarts.map((w) => [w, 0])),
  };

  for (const row of rows) {
    const label = EXERCISE_LABELS[row.exercise_name];
    if (!label || row.reps == null || row.sets == null) continue;
    const week = mondayOf(row.date);
    if (!weekSet.has(week)) continue;
    const map = buckets[label as "core" | "pushups" | "pullups"];
    map.set(week, (map.get(week) ?? 0) + row.reps * row.sets);
  }

  const core = weekStarts.map((w) => ({ week: w, reps: buckets.core.get(w) ?? 0 }));
  const pushups = weekStarts.map((w) => ({ week: w, reps: buckets.pushups.get(w) ?? 0 }));
  const pullups = weekStarts.map((w) => ({ week: w, reps: buckets.pullups.get(w) ?? 0 }));

  const hasPushupData = pushups.some((p) => p.reps > 0);
  const hasPullupData = pullups.some((p) => p.reps > 0);

  return NextResponse.json({ core, pushups, pullups, hasPushupData, hasPullupData });
}
