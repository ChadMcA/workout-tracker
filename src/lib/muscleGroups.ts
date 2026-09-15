// Central place for the categorization rules discovered while importing historical data.
// If you add a new exercise, it needs an entry here (or a sensible default applies).

export type ExerciseCategory = "strength" | "cardio" | "bodyweight";

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Biceps",
  "Triceps",
  "Shoulders",
  "Legs",
  "Forearms",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Exercises whose load notation is bodyweight "reps-sets" rather than "weight-reps-sets"
// (e.g. Leg raises: "25-3" means 25 reps for 3 sets, not 25 lb for 3 reps).
export const BODYWEIGHT_EXERCISES = new Set([
  "Leg raises",
  "Body weight squats",
  "Pushups",
  "Pull-ups",
]);

// Exercises that get the "+20lb bar, weight-per-side x2" total-load treatment.
export const BENCH_EXERCISES = new Set(["Bench", "Bench incline", "Incline bench"]);
export const BENCH_BAR_LB = 20;

export const EXERCISE_MUSCLE_MAP: Record<string, MuscleGroup> = {
  // Chest
  Bench: "Chest",
  "Dumb bench": "Chest",
  "Incline bench": "Chest",
  "Bench incline": "Chest",
  "Pulley chest flies": "Chest",
  "Decline bench dumbbell": "Chest",
  "Tight grip bench press": "Chest",
  Pushups: "Chest",
  // Back
  "Seated row": "Back",
  "Lat pull down machine": "Back",
  "Bench rows": "Back",
  "Dumbbell row": "Back",
  "Pulley arm rotation (for back)": "Back",
  "Pull-ups": "Back",
  // Biceps
  "Barbell curl": "Biceps",
  "Bicep pulley": "Biceps",
  "Seated b curls": "Biceps",
  "Standing curls": "Biceps",
  "Standing b curls": "Biceps",
  "Steep incline seated curls": "Biceps",
  "Seated curl": "Biceps",
  "Reverse grip curl": "Biceps",
  "Reverse grip b curl": "Biceps",
  "D curl x forearm twists": "Biceps",
  // Forearms
  "Forearm swing backs": "Forearms",
  // Triceps
  "Tri overheard cable with ropes": "Triceps",
  Skullcrushers: "Triceps",
  // Shoulders
  "Reverse grip barbell raise": "Shoulders",
  "Shoulder press": "Shoulders",
  "Lateral raises": "Shoulders",
  "Pulley internal rotation": "Shoulders",
  "Pulley external rotation": "Shoulders",
  "Dumbbell arm rotation": "Shoulders",
  // Legs
  "Calf extension machine": "Legs",
  "Leg press machine": "Legs",
  Smith: "Legs",
  "Bar squat": "Legs",
  "Dumbbell squat": "Legs",
  "Incline smith": "Legs",
  "Body weight squats": "Legs",
};

export function muscleGroupFor(exerciseName: string): MuscleGroup | null {
  return EXERCISE_MUSCLE_MAP[exerciseName] ?? null;
}

export function isBodyweight(exerciseName: string): boolean {
  return BODYWEIGHT_EXERCISES.has(exerciseName);
}

export function isBenchExercise(exerciseName: string): boolean {
  return BENCH_EXERCISES.has(exerciseName);
}

/**
 * Computes total working weight for a strength set.
 * - Bench-type exercises: (weight_lb * 2) + 20lb bar, regardless of "each" marker
 *   (per user decision: these numbers are always per-side).
 * - "each"/"ea" modifier doubles the weight (both sides loaded).
 * - Bodyweight exercises have no weight and return null.
 */
export function computeEffectiveWeight(params: {
  exerciseName: string;
  weightLb: number | null;
  weightModifier: string | null;
}): number | null {
  const { exerciseName, weightLb, weightModifier } = params;
  if (isBodyweight(exerciseName) || weightLb == null) return null;
  if (isBenchExercise(exerciseName)) {
    return weightLb * 2 + BENCH_BAR_LB;
  }
  if (weightModifier === "each") {
    return weightLb * 2;
  }
  return weightLb;
}

export function computeVolume(params: {
  exerciseName: string;
  weightLb: number | null;
  weightModifier: string | null;
  reps: number | null;
  sets: number | null;
}): number | null {
  const { reps, sets } = params;
  if (isBodyweight(params.exerciseName) || reps == null || sets == null) return null;
  const effectiveWeight = computeEffectiveWeight(params);
  if (effectiveWeight == null) return null;
  return effectiveWeight * reps * sets;
}
