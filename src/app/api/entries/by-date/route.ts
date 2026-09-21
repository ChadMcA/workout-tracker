import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SetDetail {
  id: number;
  workout_day_id: number;
  exercise_id: number;
  exercise_name: string;
  category: string;
  muscle_group: string | null;
  weight_lb: number | null;
  weight_modifier: string | null;
  reps: number | null;
  sets: number | null;
  bench_total_lb: number | null;
  distance_mi: number | null;
  duration_sec: number | null;
  floors: number | null;
  to_failure: boolean;
  note: string | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const workoutDays = await query<{ id: number; date: string; location: string; note: string | null }>(
    `SELECT id, date, location, note FROM workout_days WHERE date = $1 ORDER BY id ASC`,
    [date]
  );

  if (workoutDays.length === 0) {
    return NextResponse.json([]);
  }

  const sets = await query<SetDetail>(
    `SELECT s.id, s.exercise_id, e.name AS exercise_name, e.category, e.muscle_group,
            s.weight_lb, s.weight_modifier, s.reps, s.sets, s.bench_total_lb,
            s.distance_mi, s.duration_sec, s.floors, s.to_failure, s.note,
            s.workout_day_id
     FROM sets s
     JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_day_id = ANY($1::int[])
     ORDER BY s.id ASC`,
    [workoutDays.map((d) => d.id)]
  );

  const result = workoutDays.map((wd) => ({
    workout_day_id: wd.id,
    date: wd.date,
    location: wd.location,
    note: wd.note,
    sets: sets.filter((s) => s.workout_day_id === wd.id),
  }));

  return NextResponse.json(result);
}
