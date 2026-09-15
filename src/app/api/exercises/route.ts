import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { Exercise } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const exercises = await query<Exercise>(
    `SELECT id, name, category, muscle_group, is_bench FROM exercises ORDER BY name ASC`
  );
  return NextResponse.json(exercises);
}
