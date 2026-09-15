import type { ExerciseCategory, MuscleGroup } from "./muscleGroups";

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  muscle_group: MuscleGroup | null;
  is_bench: boolean;
}

export interface WorkoutDay {
  id: number;
  date: string; // YYYY-MM-DD
  location: "Home" | "Gym" | "Outdoor";
  note: string | null;
}

export interface SetRow {
  id: number;
  workout_day_id: number;
  exercise_id: number;
  exercise_name: string;
  category: ExerciseCategory;
  muscle_group: MuscleGroup | null;
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

export interface Template {
  id: number;
  name: string;
  icon: string | null;
  exercises: { exercise_id: number; name: string }[];
}

// Payload the Log form posts to create a new workout day + its sets.
export interface NewSetInput {
  exercise_id: number;
  weight_lb?: number | null;
  weight_modifier?: "each" | "both" | null;
  reps?: number | null;
  sets?: number | null;
  distance_mi?: number | null;
  duration_sec?: number | null;
  floors?: number | null;
  to_failure?: boolean;
  note?: string | null;
}

export interface NewWorkoutDayInput {
  date: string;
  location: "Home" | "Gym" | "Outdoor";
  note?: string | null;
  sets: NewSetInput[];
}
