import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { isBenchExercise, BENCH_BAR_LB } from "@/lib/muscleGroups";
import type { NewWorkoutDayInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 200);

  const days = await query<{
    id: number;
    date: string;
    location: string;
    note: string | null;
  }>(`SELECT id, date, location, note FROM workout_days ORDER BY date DESC LIMIT $1`, [limit]);

  return NextResponse.json(days);
}

export async function POST(request: Request) {
  const body: NewWorkoutDayInput = await request.json();

  if (!body.date || !body.location || !Array.isArray(body.sets)) {
    return NextResponse.json(
      { error: "date, location, and sets[] are required" },
      { status: 400 }
    );
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const dayResult = await client.query<{ id: number }>(
      `INSERT INTO workout_days (date, location, note) VALUES ($1, $2, $3) RETURNING id`,
      [body.date, body.location, body.note ?? null]
    );
    const workoutDayId = dayResult.rows[0].id;

    for (const s of body.sets) {
      const exRow = await client.query<{ name: string }>(
        `SELECT name FROM exercises WHERE id = $1`,
        [s.exercise_id]
      );
      const exerciseName = exRow.rows[0]?.name ?? "";

      let benchTotal: number | null = null;
      if (isBenchExercise(exerciseName) && s.weight_lb != null) {
        benchTotal = s.weight_lb * 2 + BENCH_BAR_LB;
      }

      await client.query(
        `INSERT INTO sets (
          workout_day_id, exercise_id, weight_lb, weight_modifier, reps, sets,
          bench_total_lb, distance_mi, duration_sec, floors, to_failure, note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          workoutDayId,
          s.exercise_id,
          s.weight_lb ?? null,
          s.weight_modifier ?? null,
          s.reps ?? null,
          s.sets ?? null,
          benchTotal,
          s.distance_mi ?? null,
          s.duration_sec ?? null,
          s.floors ?? null,
          s.to_failure ?? false,
          s.note ?? null,
        ]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ id: workoutDayId }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return NextResponse.json({ error: "Failed to save workout" }, { status: 500 });
  } finally {
    client.release();
  }
}
