"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { useThemeColors, hexToRgba } from "@/lib/colors";
import { secondsToDuration, durationToSeconds } from "@/lib/duration";

interface CalendarStats {
  year: number;
  month: number;
  days: Record<number, "pushpull" | "armday" | "legsonly" | "homeday">;
  monthWorkoutCount: number;
  longestGapDays: number;
  allTimeWorkoutCount: number;
}

interface ApiSetDetail {
  id: number;
  exercise_id: number;
  exercise_name: string;
  category: "strength" | "cardio" | "bodyweight";
  muscle_group: string | null;
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

interface ApiWorkoutDetail {
  workout_day_id: number;
  date: string;
  location: string;
  note: string | null;
  sets: ApiSetDetail[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const { COLORS } = useThemeColors();
  const DAY_COLORS: Record<string, { bg: string; border: string }> = {
    pushpull: { bg: hexToRgba(COLORS.accent, 0.28), border: hexToRgba(COLORS.accent, 0.55) },
    armday: { bg: hexToRgba(COLORS.green, 0.28), border: hexToRgba(COLORS.green, 0.55) },
    legsonly: { bg: hexToRgba(COLORS.lavender, 0.22), border: hexToRgba(COLORS.lavender, 0.45) },
    homeday: { bg: hexToRgba(COLORS.amber, 0.3), border: hexToRgba(COLORS.amber, 0.6) },
  };

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  function refreshStats() {
    fetch(`/api/stats/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setStats);
  }

  useEffect(() => {
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sun

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function openDay(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  }

  return (
    <div>
      <PageHeader eyebrow="Consistency" title="Calendar" />

      <div className="mx-5 mb-5 bg-bg-raised border border-line rounded-2xl px-4.5 py-4 flex items-center justify-between">
        <div>
          <div className="font-display text-[34px] font-semibold leading-none text-accent">
            {stats?.allTimeWorkoutCount ?? "—"}
          </div>
          <div className="text-xs text-text-dim mt-0.5">Total workouts logged (all-time)</div>
        </div>
        <div className="text-2xl opacity-80">📅</div>
      </div>

      <div className="flex items-center justify-between px-5 mb-4">
        <button onClick={prevMonth} className="text-text-dim text-lg px-2.5 py-1">
          ‹
        </button>
        <span className="font-display text-xl font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} className="text-text-dim text-lg px-2.5 py-1">
          ›
        </button>
      </div>

      <div className="px-5 mb-4">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i} className="text-center text-[10px] text-text-dim">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const category = stats?.days[day];
            const colorSet = category ? DAY_COLORS[category] : null;
            const hasData = !!category;
            return (
              <button
                key={i}
                onClick={() => hasData && openDay(day)}
                disabled={!hasData}
                className="aspect-square rounded-lg flex items-center justify-center font-display font-semibold text-xs"
                style={{
                  background: colorSet?.bg ?? COLORS.bgInput,
                  border: `1px solid ${colorSet?.border ?? "transparent"}`,
                  color: colorSet ? COLORS.text : COLORS.textDim,
                  cursor: hasData ? "pointer" : "default",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-[11px] text-text-dim px-5 mb-4">
        Tap a colored day to view, edit, or delete that workout.
      </div>

      <div className="flex flex-col gap-2 px-5 mb-6">
        <LegendItem color={hexToRgba(COLORS.accent, 0.5)} label="Chest & Back day" />
        <LegendItem color={hexToRgba(COLORS.green, 0.5)} label="Bi's & Tri's day" />
        <LegendItem color={hexToRgba(COLORS.lavender, 0.4)} label="Legs / core only" />
        <LegendItem color={hexToRgba(COLORS.amber, 0.5)} label="Home workout" />
      </div>

      <div className="mx-5 mb-6 bg-bg-raised border border-line rounded-xl px-4 py-3.5 flex justify-around">
        <SummaryItem num={stats?.monthWorkoutCount ?? "—"} label="This month" />
        <SummaryItem num={stats?.longestGapDays ?? "—"} label="Longest gap (days)" />
      </div>

      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onChanged={refreshStats}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-dim">
      <span className="w-3.5 h-3.5 rounded-[4px] flex-shrink-0" style={{ background: color }} />
      {label}
    </div>
  );
}

function SummaryItem({ num, label }: { num: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-[22px] font-semibold">{num}</div>
      <div className="text-[10px] text-text-dim mt-0.5">{label}</div>
    </div>
  );
}

// ---------------- Day detail modal: view, edit, delete ----------------

interface EditableSet {
  id: number;
  exercise_id: number;
  exercise_name: string;
  category: "strength" | "cardio" | "bodyweight";
  muscle_group: string | null;
  weightLb: string;
  weightModifier: "each" | "both" | "";
  reps: string;
  sets: string;
  distanceMi: string;
  durationStr: string;
  floors: string;
  toFailure: boolean;
  note: string | null;
  dirty: boolean;
  saving: boolean;
}

function toEditable(s: ApiSetDetail): EditableSet {
  return {
    id: s.id,
    exercise_id: s.exercise_id,
    exercise_name: s.exercise_name,
    category: s.category,
    muscle_group: s.muscle_group,
    weightLb: s.weight_lb != null ? String(s.weight_lb) : "",
    weightModifier: (s.weight_modifier as "each" | "both" | null) ?? "",
    reps: s.reps != null ? String(s.reps) : "",
    sets: s.sets != null ? String(s.sets) : "",
    distanceMi: s.distance_mi != null ? String(s.distance_mi) : "",
    durationStr: secondsToDuration(s.duration_sec),
    floors: s.floors != null ? String(s.floors) : "",
    toFailure: s.to_failure,
    note: s.note,
    dirty: false,
    saving: false,
  };
}

function buildSetPayload(item: EditableSet) {
  if (item.category === "cardio") {
    if (item.exercise_name === "Stairmaster") {
      return {
        weight_lb: null,
        weight_modifier: null,
        reps: null,
        sets: null,
        distance_mi: null,
        duration_sec: durationToSeconds(item.durationStr),
        floors: item.floors ? parseInt(item.floors, 10) : null,
        to_failure: false,
        note: item.note,
      };
    }
    return {
      weight_lb: null,
      weight_modifier: null,
      reps: null,
      sets: null,
      distance_mi: item.distanceMi ? parseFloat(item.distanceMi) : null,
      duration_sec: durationToSeconds(item.durationStr),
      floors: null,
      to_failure: false,
      note: item.note,
    };
  }
  if (item.category === "bodyweight") {
    return {
      weight_lb: null,
      weight_modifier: null,
      reps: item.reps ? parseFloat(item.reps) : null,
      sets: item.sets ? parseInt(item.sets, 10) : null,
      distance_mi: null,
      duration_sec: null,
      floors: null,
      to_failure: false,
      note: item.note,
    };
  }
  return {
    weight_lb: item.weightLb ? parseFloat(item.weightLb) : null,
    weight_modifier: item.weightModifier || null,
    reps: item.reps ? parseFloat(item.reps) : null,
    sets: item.sets ? parseInt(item.sets, 10) : null,
    distance_mi: null,
    duration_sec: null,
    floors: null,
    to_failure: item.toFailure,
    note: item.note,
  };
}

function DayDetailModal({
  date,
  onClose,
  onChanged,
}: {
  date: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [workouts, setWorkouts] = useState<
    { workout_day_id: number; location: string; sets: EditableSet[] }[] | null
  >(null);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/entries/by-date?date=${date}`)
      .then((r) => r.json())
      .then((data: ApiWorkoutDetail[]) => {
        setWorkouts(
          data.map((w) => ({
            workout_day_id: w.workout_day_id,
            location: w.location,
            sets: w.sets.map(toEditable),
          }))
        );
      });
  }, [date]);

  function updateSet(workoutDayId: number, setId: number, patch: Partial<EditableSet>) {
    setWorkouts((prev) =>
      prev
        ? prev.map((w) =>
            w.workout_day_id !== workoutDayId
              ? w
              : {
                  ...w,
                  sets: w.sets.map((s) => (s.id === setId ? { ...s, ...patch, dirty: true } : s)),
                }
          )
        : prev
    );
  }

  async function saveSet(workoutDayId: number, set: EditableSet) {
    updateSet(workoutDayId, set.id, { saving: true });
    try {
      const res = await fetch(`/api/sets/${set.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSetPayload(set)),
      });
      if (!res.ok) throw new Error("Save failed");
      updateSet(workoutDayId, set.id, { dirty: false, saving: false });
      onChanged();
    } catch (err) {
      console.error(err);
      alert("Couldn't save that change. Check your connection and try again.");
      updateSet(workoutDayId, set.id, { saving: false });
    }
  }

  async function deleteSet(workoutDayId: number, setId: number) {
    if (!window.confirm("Delete this exercise entry? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/sets/${setId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setWorkouts((prev) =>
        prev
          ? prev.map((w) =>
              w.workout_day_id !== workoutDayId
                ? w
                : { ...w, sets: w.sets.filter((s) => s.id !== setId) }
            )
          : prev
      );
      onChanged();
    } catch (err) {
      console.error(err);
      alert("Couldn't delete that entry. Check your connection and try again.");
    }
  }

  async function deleteWorkout(workoutDayId: number) {
    if (
      !window.confirm(
        "Delete this entire workout and all its exercises? This can't be undone."
      )
    )
      return;
    setDeletingWorkoutId(workoutDayId);
    try {
      const res = await fetch(`/api/entries/${workoutDayId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setWorkouts((prev) => (prev ? prev.filter((w) => w.workout_day_id !== workoutDayId) : prev));
      onChanged();
    } catch (err) {
      console.error(err);
      alert("Couldn't delete that workout. Check your connection and try again.");
    } finally {
      setDeletingWorkoutId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-6">
      <div className="w-full sm:max-w-[420px] max-h-[85vh] overflow-y-auto bg-bg-raised border border-line rounded-t-2xl sm:rounded-2xl p-5 pb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="font-display font-semibold text-lg">{formatDateLong(date)}</div>
          <button onClick={onClose} className="text-text-dim text-lg px-1">
            ✕
          </button>
        </div>

        {!workouts && <div className="text-text-dim text-sm py-6 text-center">Loading…</div>}

        {workouts && workouts.length === 0 && (
          <div className="text-text-dim text-sm py-6 text-center">
            No exercises logged for this day.
          </div>
        )}

        {workouts?.map((w) => (
          <div key={w.workout_day_id} className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs text-text-dim border border-line rounded px-2 py-0.5 uppercase">
                {w.location}
              </span>
              <button
                onClick={() => deleteWorkout(w.workout_day_id)}
                disabled={deletingWorkoutId === w.workout_day_id}
                className="text-[11px] text-terracotta disabled:opacity-40"
              >
                {deletingWorkoutId === w.workout_day_id ? "Deleting…" : "Delete entire workout"}
              </button>
            </div>

            {w.sets.length === 0 && (
              <div className="text-text-dim text-xs mb-3">No exercises in this workout.</div>
            )}

            {w.sets.map((set) => (
              <div
                key={set.id}
                className="mb-2.5 border border-line rounded-xl px-3.5 py-3 bg-bg-input"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm">{set.exercise_name}</span>
                  <div className="flex items-center gap-2">
                    {set.dirty && !set.saving && (
                      <button
                        onClick={() => saveSet(w.workout_day_id, set)}
                        className="text-[11px] text-accent font-semibold"
                      >
                        Save
                      </button>
                    )}
                    {set.saving && <span className="text-[11px] text-text-dim">Saving…</span>}
                    <button
                      onClick={() => deleteSet(w.workout_day_id, set.id)}
                      aria-label={`Remove ${set.exercise_name}`}
                      className="text-text-dim text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {set.category === "strength" && (
                  <div className="flex gap-1.5">
                    <SmallNumberField
                      value={set.weightLb}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { weightLb: v })}
                      placeholder="lb"
                    />
                    <select
                      value={set.weightModifier}
                      onChange={(e) =>
                        updateSet(w.workout_day_id, set.id, {
                          weightModifier: e.target.value as "each" | "both" | "",
                        })
                      }
                      className="flex-1 bg-bg-raised border border-line rounded-lg px-1 py-1.5 text-xs font-display text-center outline-none"
                    >
                      <option value="">total</option>
                      <option value="each">each</option>
                      <option value="both">both</option>
                    </select>
                    <SmallNumberField
                      value={set.reps}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { reps: v })}
                      placeholder="reps"
                    />
                    <SmallNumberField
                      value={set.sets}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { sets: v })}
                      placeholder="sets"
                    />
                  </div>
                )}

                {set.category === "bodyweight" && (
                  <div className="flex gap-1.5">
                    <SmallNumberField
                      value={set.reps}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { reps: v })}
                      placeholder="reps"
                    />
                    <SmallNumberField
                      value={set.sets}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { sets: v })}
                      placeholder="sets"
                    />
                  </div>
                )}

                {set.category === "cardio" && set.exercise_name === "Stairmaster" && (
                  <div className="flex gap-1.5">
                    <SmallTextField
                      value={set.durationStr}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { durationStr: v })}
                      placeholder="MM:SS or min"
                    />
                    <SmallNumberField
                      value={set.floors}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { floors: v })}
                      placeholder="floors"
                    />
                  </div>
                )}

                {set.category === "cardio" && set.exercise_name !== "Stairmaster" && (
                  <div className="flex gap-1.5">
                    <SmallNumberField
                      value={set.distanceMi}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { distanceMi: v })}
                      placeholder="mi"
                    />
                    <SmallTextField
                      value={set.durationStr}
                      onChange={(v) => updateSet(w.workout_day_id, set.id, { durationStr: v })}
                      placeholder="MM:SS or min"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SmallNumberField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-bg-raised border border-line rounded-lg px-2 py-1.5 text-xs text-center font-display outline-none placeholder:text-text-dim w-0"
    />
  );
}

function SmallTextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-bg-raised border border-line rounded-lg px-2 py-1.5 text-xs text-center font-display outline-none placeholder:text-text-dim w-0"
    />
  );
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
