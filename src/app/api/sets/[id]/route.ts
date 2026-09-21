import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { isBenchExercise, BENCH_BAR_LB } from "@/lib/muscleGroups";

export const dynamic = "force-dynamic";

// Mirrors NewSetInput's shape. The edit UI always sends the complete current
// state of the set (every field, explicit nulls for anything empty) rather
// than a sparse patch, so this does a plain full-row update — no COALESCE,
// no ambiguity about whether an omitted field means "leave alone" or "clear."
interface SetUpdateInput {
  weight_lb: number | null;
  weight_modifier: "each" | "both" | null;
  reps: number | null;
  sets: number | null;
  distance_mi: number | null;
  duration_sec: number | null;
  floors: number | null;
  to_failure: boolean;
  note: string | null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const setId = parseInt(id, 10);
  if (Number.isNaN(setId)) {
    return NextResponse.json({ error: "Invalid set id" }, { status: 400 });
  }

  const body: SetUpdateInput = await request.json();

  const existing = await queryOne<{ exercise_id: number }>(
    `SELECT exercise_id FROM sets WHERE id = $1`,
    [setId]
  );
  if (!existing) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  const exerciseRow = await queryOne<{ name: string }>(
    `SELECT name FROM exercises WHERE id = $1`,
    [existing.exercise_id]
  );
  const exerciseName = exerciseRow?.name ?? "";

  const benchTotal =
    isBenchExercise(exerciseName) && body.weight_lb != null
      ? body.weight_lb * 2 + BENCH_BAR_LB
      : null;

  const updated = await queryOne(
    `UPDATE sets SET
       weight_lb = $1,
       weight_modifier = $2,
       reps = $3,
       sets = $4,
       bench_total_lb = $5,
       distance_mi = $6,
       duration_sec = $7,
       floors = $8,
       to_failure = $9,
       note = $10
     WHERE id = $11
     RETURNING *`,
    [
      body.weight_lb,
      body.weight_modifier,
      body.reps,
      body.sets,
      benchTotal,
      body.distance_mi,
      body.duration_sec,
      body.floors,
      body.to_failure ?? false,
      body.note,
      setId,
    ]
  );

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const setId = parseInt(id, 10);
  if (Number.isNaN(setId)) {
    return NextResponse.json({ error: "Invalid set id" }, { status: 400 });
  }

  await query(`DELETE FROM sets WHERE id = $1`, [setId]);
  return NextResponse.json({ success: true });
}
