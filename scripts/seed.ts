import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { config } from "dotenv";
config({ path: join(process.cwd(), ".env.local") });
import { EXERCISE_MUSCLE_MAP, BODYWEIGHT_EXERCISES, BENCH_EXERCISES } from "../src/lib/muscleGroups";

interface ParsedEntry {
  date: string;
  location: "Home" | "Gym" | "Outdoor";
  exercise: string;
  category: "strength" | "cardio";
  distance_mi: number | null;
  weight_lb: number | null;
  weight_modifier: string | null;
  reps: number | null;
  sets: number | null;
  bench_total_lb: number | null;
  duration_raw: string | null;
  floors: number | null;
  to_failure: boolean;
  note: string | null;
  is_bodyweight: boolean;
}

interface DayNote {
  date: string;
  location: "Home" | "Gym" | "Outdoor";
  note: string;
}

function durationToSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  const entries: ParsedEntry[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "parsed_entries.json"), "utf-8")
  );
  const dayNotes: DayNote[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "day_notes.json"), "utf-8")
  );

  console.log(`Loaded ${entries.length} historical set entries, ${dayNotes.length} day notes.`);

  // ---- 1. Upsert exercises ----
  const exerciseNames = new Set<string>(entries.map((e) => e.exercise));
  // Also register the new bodyweight exercises even though they have no historical data yet.
  ["Pushups", "Pull-ups"].forEach((n) => exerciseNames.add(n));

  const exerciseIdByName = new Map<string, number>();
  for (const name of exerciseNames) {
    const isBodyweight = BODYWEIGHT_EXERCISES.has(name);
    const isBench = BENCH_EXERCISES.has(name);
    const historicalRow = entries.find((e) => e.exercise === name);
    const category = isBodyweight
      ? "bodyweight"
      : historicalRow?.category === "cardio"
        ? "cardio"
        : "strength";
    const muscleGroup = category === "strength" ? EXERCISE_MUSCLE_MAP[name] ?? null : null;

    const result = await pool.query<{ id: number }>(
      `INSERT INTO exercises (name, category, muscle_group, is_bench)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, muscle_group = EXCLUDED.muscle_group, is_bench = EXCLUDED.is_bench
       RETURNING id`,
      [name, category, muscleGroup, isBench]
    );
    exerciseIdByName.set(name, result.rows[0].id);
  }
  console.log(`Upserted ${exerciseIdByName.size} exercises.`);

  // ---- 2. Group entries by date to create workout_days, and merge in day_notes for freeform days ----
  const dateToLocation = new Map<string, "Home" | "Gym" | "Outdoor">();
  const dateToNote = new Map<string, string>();
  for (const dn of dayNotes) {
    dateToLocation.set(dn.date, dn.location);
    dateToNote.set(dn.date, dn.note);
  }
  for (const e of entries) {
    if (!dateToLocation.has(e.date)) dateToLocation.set(e.date, e.location);
  }

  const workoutDayIdByDate = new Map<string, number>();
  for (const [date, location] of dateToLocation.entries()) {
    const note = dateToNote.get(date) ?? null;
    const result = await pool.query<{ id: number }>(
      `INSERT INTO workout_days (date, location, note) VALUES ($1, $2, $3) RETURNING id`,
      [date, location, note]
    );
    workoutDayIdByDate.set(date, result.rows[0].id);
  }
  console.log(`Created ${workoutDayIdByDate.size} workout days.`);

  // ---- 3. Insert sets ----
  let insertedSets = 0;
  for (const e of entries) {
    const workoutDayId = workoutDayIdByDate.get(e.date);
    const exerciseId = exerciseIdByName.get(e.exercise);
    if (!workoutDayId || !exerciseId) continue;

    await pool.query(
      `INSERT INTO sets (
        workout_day_id, exercise_id, weight_lb, weight_modifier, reps, sets,
        bench_total_lb, distance_mi, duration_sec, floors, to_failure, note
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        workoutDayId,
        exerciseId,
        e.weight_lb,
        e.weight_modifier,
        e.reps,
        e.sets,
        e.bench_total_lb,
        e.distance_mi,
        durationToSeconds(e.duration_raw),
        e.floors,
        e.to_failure ?? false,
        e.note,
      ]
    );
    insertedSets++;
  }
  console.log(`Inserted ${insertedSets} sets.`);

  // ---- 4. Default templates, detected from historical co-occurrence patterns ----
  const templates: { name: string; icon: string; exerciseNames: string[] }[] = [
    {
      name: "Chest & Back",
      icon: "🏋️",
      exerciseNames: [
        "Bench",
        "Dumb bench",
        "Seated row",
        "Lat pull down machine",
        "Pulley chest flies",
        "Calf extension machine",
      ],
    },
    {
      name: "Bi's & Tri's",
      icon: "💪",
      exerciseNames: [
        "Barbell curl",
        "Bicep pulley",
        "Tri overheard cable with ropes",
        "Skullcrushers",
        "Leg raises",
        "Calf extension machine",
        "Leg press machine",
      ],
    },
    {
      name: "Back & Legs",
      icon: "🦵",
      exerciseNames: ["Seated row", "Smith", "Leg press machine", "Calf extension machine"],
    },
  ];

  for (const t of templates) {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO templates (name, icon) VALUES ($1, $2) RETURNING id`,
      [t.name, t.icon]
    );
    const templateId = result.rows[0].id;
    for (let i = 0; i < t.exerciseNames.length; i++) {
      const exerciseId = exerciseIdByName.get(t.exerciseNames[i]);
      if (!exerciseId) continue;
      await pool.query(
        `INSERT INTO template_exercises (template_id, exercise_id, order_index) VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING`,
        [templateId, exerciseId, i]
      );
    }
  }
  console.log(`Created ${templates.length} templates.`);

  await pool.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
