-- Workout Tracker schema
-- Run with: npm run db:migrate  (see scripts/migrate.ts)

CREATE TABLE IF NOT EXISTS exercises (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'bodyweight')),
  muscle_group  TEXT,              -- only meaningful for category='strength' (Chest, Back, Biceps, Triceps, Shoulders, Legs, Forearms)
  is_bench      BOOLEAN NOT NULL DEFAULT FALSE,  -- true for Bench / Bench incline / Incline bench -> gets +20lb bar & x2 "each" math
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_days (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  location    TEXT NOT NULL CHECK (location IN ('Home', 'Gym', 'Outdoor')),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_days_date ON workout_days(date);

CREATE TABLE IF NOT EXISTS sets (
  id               SERIAL PRIMARY KEY,
  workout_day_id   INTEGER NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id      INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  weight_lb        NUMERIC,           -- per-side or straight weight, see weight_modifier
  weight_modifier  TEXT,              -- 'each' | 'both' | null
  reps             NUMERIC,           -- numeric to allow bodyweight "25 reps" style values
  sets             INTEGER,
  bench_total_lb   NUMERIC,           -- computed: (weight_lb * 2) + 20 for bench-type exercises
  distance_mi      NUMERIC,
  duration_sec     INTEGER,
  floors           INTEGER,
  to_failure       BOOLEAN NOT NULL DEFAULT FALSE,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sets_workout_day ON sets(workout_day_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id);

CREATE TABLE IF NOT EXISTS templates (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_exercises (
  template_id   INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  exercise_id   INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (template_id, exercise_id)
);
