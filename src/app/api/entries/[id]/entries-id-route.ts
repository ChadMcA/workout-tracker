import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workoutDayId = parseInt(id, 10);
  if (Number.isNaN(workoutDayId)) {
    return NextResponse.json({ error: "Invalid workout id" }, { status: 400 });
  }

  const existing = await queryOne<{ id: number }>(`SELECT id FROM workout_days WHERE id = $1`, [
    workoutDayId,
  ]);
  if (!existing) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  // sets rows for this workout_day are removed automatically via ON DELETE CASCADE.
  await query(`DELETE FROM workout_days WHERE id = $1`, [workoutDayId]);
  return NextResponse.json({ success: true });
}
