import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await query<{ id: number; name: string; icon: string | null }>(
    `SELECT id, name, icon FROM templates ORDER BY id ASC`
  );

  const templateExercises = await query<{
    template_id: number;
    exercise_id: number;
    name: string;
  }>(
    `SELECT te.template_id, te.exercise_id, e.name
     FROM template_exercises te
     JOIN exercises e ON e.id = te.exercise_id
     ORDER BY te.template_id, te.order_index`
  );

  // Count how many historical days used each template's exercise set (rough "days logged" stat).
  const dayCounts = await query<{ exercise_id: number; day_count: number }>(
    `SELECT exercise_id, COUNT(DISTINCT workout_day_id)::int AS day_count
     FROM sets GROUP BY exercise_id`
  );
  const dayCountByExercise = new Map(dayCounts.map((d) => [d.exercise_id, d.day_count]));

  const result = templates.map((t) => {
    const exercises = templateExercises.filter((te) => te.template_id === t.id);
    const maxDays = Math.max(0, ...exercises.map((e) => dayCountByExercise.get(e.exercise_id) ?? 0));
    return {
      id: t.id,
      name: t.name,
      icon: t.icon,
      exercises: exercises.map((e) => ({ exercise_id: e.exercise_id, name: e.name })),
      days_logged: maxDays,
    };
  });

  return NextResponse.json(result);
}
