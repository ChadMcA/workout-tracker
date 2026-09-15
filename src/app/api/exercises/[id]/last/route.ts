import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exerciseId = parseInt(id, 10);
  if (Number.isNaN(exerciseId)) {
    return NextResponse.json({ error: "Invalid exercise id" }, { status: 400 });
  }

  const last = await queryOne<{
    weight_lb: number | null;
    weight_modifier: string | null;
    reps: number | null;
    sets: number | null;
    distance_mi: number | null;
    duration_sec: number | null;
    floors: number | null;
  }>(
    `SELECT s.weight_lb, s.weight_modifier, s.reps, s.sets, s.distance_mi, s.duration_sec, s.floors
     FROM sets s
     JOIN workout_days wd ON wd.id = s.workout_day_id
     WHERE s.exercise_id = $1
     ORDER BY wd.date DESC, s.id DESC
     LIMIT 1`,
    [exerciseId]
  );

  return NextResponse.json(last);
}
