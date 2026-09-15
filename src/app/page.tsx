"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui";
import type { Exercise } from "@/lib/types";

interface TemplateWithExercises {
  id: number;
  name: string;
  icon: string | null;
  exercises: { exercise_id: number; name: string }[];
  days_logged: number;
}

interface LastValues {
  weight_lb: number | null;
  weight_modifier: string | null;
  reps: number | null;
  sets: number | null;
  distance_mi: number | null;
  duration_sec: number | null;
  floors: number | null;
}

interface LoggedItem {
  tempId: string;
  exercise: Exercise;
  weightLb: string;
  weightModifier: "each" | "both" | "";
  reps: string;
  sets: string;
  distanceMi: string;
  durationStr: string; // "MM:SS"
  floors: string;
}

function secondsToDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function durationToSeconds(str: string): number | null {
  const m = str.match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function LogPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([]);
  const [date, setDate] = useState(todayStr());
  const [location, setLocation] = useState<"Home" | "Gym" | "Outdoor">("Gym");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "blank" | null>(null);
  const [items, setItems] = useState<LoggedItem[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const tempIdCounter = useRef(0);

  useEffect(() => {
    fetch("/api/exercises").then((r) => r.json()).then(setExercises);
    fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  }, []);

  const filteredExercises = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);
  }, [search, exercises]);

  async function addExercise(exercise: Exercise) {
    const last: LastValues | null = await fetch(`/api/exercises/${exercise.id}/last`).then((r) =>
      r.json()
    );
    const item: LoggedItem = {
      tempId: `${exercise.id}-${tempIdCounter.current++}`,
      exercise,
      weightLb: last?.weight_lb != null ? String(last.weight_lb) : "",
      weightModifier: (last?.weight_modifier as "each" | "both" | null) ?? "",
      reps: last?.reps != null ? String(last.reps) : "",
      sets: last?.sets != null ? String(last.sets) : "",
      distanceMi: last?.distance_mi != null ? String(last.distance_mi) : "",
      durationStr: secondsToDuration(last?.duration_sec ?? null),
      floors: last?.floors != null ? String(last.floors) : "",
    };
    setItems((prev) => [...prev, item]);
    setSearch("");
  }

  async function applyTemplate(template: TemplateWithExercises) {
    setSelectedTemplateId(template.id);
    setItems([]);
    for (const te of template.exercises) {
      const exercise = exercises.find((e) => e.id === te.exercise_id);
      if (exercise) await addExercise(exercise);
    }
  }

  function startBlank() {
    setSelectedTemplateId("blank");
    setItems([]);
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  }

  function updateItem(tempId: string, patch: Partial<LoggedItem>) {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, ...patch } : i)));
  }

  async function handleSave() {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        date,
        location,
        sets: items.map((i) => {
          if (i.exercise.category === "cardio") {
            if (i.exercise.name === "Stairmaster") {
              return {
                exercise_id: i.exercise.id,
                duration_sec: durationToSeconds(i.durationStr),
                floors: i.floors ? parseInt(i.floors, 10) : null,
              };
            }
            return {
              exercise_id: i.exercise.id,
              distance_mi: i.distanceMi ? parseFloat(i.distanceMi) : null,
              duration_sec: durationToSeconds(i.durationStr),
            };
          }
          if (i.exercise.category === "bodyweight") {
            return {
              exercise_id: i.exercise.id,
              reps: i.reps ? parseFloat(i.reps) : null,
              sets: i.sets ? parseInt(i.sets, 10) : null,
            };
          }
          return {
            exercise_id: i.exercise.id,
            weight_lb: i.weightLb ? parseFloat(i.weightLb) : null,
            weight_modifier: i.weightModifier || null,
            reps: i.reps ? parseFloat(i.reps) : null,
            sets: i.sets ? parseInt(i.sets, 10) : null,
          };
        }),
      };
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setItems([]);
      setSelectedTemplateId(null);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Couldn't save this workout. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="New entry" title="Log workout" />

      <div className="flex gap-2.5 px-5 mb-4.5">
        <div className="flex-1 bg-bg-raised border border-line rounded-[10px] px-3.5 py-2.5">
          <label className="text-xs text-text-dim block mb-0.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-[15px] w-full outline-none"
          />
        </div>
        <div className="flex bg-bg-input rounded-[10px] p-[3px] flex-1">
          {(["Home", "Gym", "Outdoor"] as const).map((loc) => (
            <button
              key={loc}
              onClick={() => setLocation(loc)}
              className={`flex-1 text-center py-2 rounded-lg text-sm ${
                location === loc ? "bg-accent-dim text-text font-semibold" : "text-text-dim"
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      <div className="font-display font-semibold text-lg px-5 mb-1 mt-1.5">Quick start</div>
      <div className="text-xs text-text-dim px-5 -mt-1 mb-3">
        Detected from your history — tap to pre-fill
      </div>
      <div className="flex gap-2.5 px-5 mb-5 overflow-x-auto">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => applyTemplate(t)}
            className={`flex-shrink-0 w-[136px] text-left rounded-[14px] p-3.5 border ${
              selectedTemplateId === t.id
                ? "border-accent bg-accent-dim"
                : "border-line bg-bg-raised"
            }`}
          >
            <div className="text-xl mb-2">{t.icon}</div>
            <div className="font-display font-semibold text-[15px] mb-1">{t.name}</div>
            <div className={`text-[11px] ${selectedTemplateId === t.id ? "text-[#D6E2ED]" : "text-text-dim"}`}>
              {t.exercises.length} exercises · {t.days_logged} days logged
            </div>
          </button>
        ))}
        <button
          onClick={startBlank}
          className={`flex-shrink-0 w-[136px] text-left rounded-[14px] p-3.5 border ${
            selectedTemplateId === "blank" ? "border-accent bg-accent-dim" : "border-line bg-bg-raised"
          }`}
        >
          <div className="text-xl mb-2">✏️</div>
          <div className="font-display font-semibold text-[15px] mb-1">Start blank</div>
          <div className="text-[11px] text-text-dim">No pre-fill</div>
        </button>
      </div>

      <div className="h-px bg-line mx-5 mb-5" />

      <div className="relative mx-5 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Search saved exercises…"
          className="w-full bg-bg-input border border-line rounded-[10px] px-3.5 py-3 text-[15px] outline-none placeholder:text-text-dim"
        />
        {filteredExercises.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-bg-raised border border-line rounded-lg overflow-hidden">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex)}
                className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-bg-input border-b border-line last:border-b-0"
              >
                {ex.name}
                <span className="text-text-dim text-xs ml-2">
                  {ex.muscle_group ?? ex.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.map((item) => (
        <ExerciseCard key={item.tempId} item={item} onChange={updateItem} onRemove={removeItem} />
      ))}

      {items.length === 0 && (
        <div className="mx-5 mb-6 border border-dashed border-line rounded-xl px-4 py-6 text-center text-text-dim text-sm">
          Pick a quick-start template or search for an exercise to begin.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={items.length === 0 || saving}
        className="mx-5 mb-6 block w-[calc(100%-40px)] bg-accent text-[#12181D] text-center py-4 rounded-xl font-semibold text-[15px] disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save workout"}
      </button>

      {savedMsg && (
        <div className="mx-5 mb-6 text-center text-green text-sm">Workout saved ✓</div>
      )}
    </div>
  );
}

function ExerciseCard({
  item,
  onChange,
  onRemove,
}: {
  item: LoggedItem;
  onChange: (tempId: string, patch: Partial<LoggedItem>) => void;
  onRemove: (tempId: string) => void;
}) {
  const { exercise } = item;
  const tagLabel =
    exercise.category === "strength"
      ? exercise.muscle_group ?? "STRENGTH"
      : exercise.category === "cardio"
        ? "CARDIO"
        : "BODYWEIGHT";

  return (
    <div className="mx-5 mb-3 bg-bg-raised border border-line rounded-xl px-4 py-3.5">
      <div className="flex justify-between items-center mb-2.5">
        <span className="font-semibold text-[15px]">{exercise.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-dim border border-line rounded px-1.5 py-0.5 uppercase">
            {tagLabel}
          </span>
          <button
            onClick={() => onRemove(item.tempId)}
            aria-label={`Remove ${exercise.name}`}
            className="text-text-dim text-sm px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {exercise.category === "strength" && (
        <div className="flex gap-2">
          <NumberField
            value={item.weightLb}
            onChange={(v) => onChange(item.tempId, { weightLb: v })}
            placeholder="lb"
          />
          <select
            value={item.weightModifier}
            onChange={(e) =>
              onChange(item.tempId, { weightModifier: e.target.value as "each" | "both" | "" })
            }
            className="flex-1 bg-bg-input border border-line rounded-lg px-2 py-2 text-sm font-display text-center outline-none"
          >
            <option value="">total</option>
            <option value="each">each side</option>
            <option value="both">both</option>
          </select>
          <NumberField
            value={item.reps}
            onChange={(v) => onChange(item.tempId, { reps: v })}
            placeholder="reps"
          />
          <NumberField
            value={item.sets}
            onChange={(v) => onChange(item.tempId, { sets: v })}
            placeholder="sets"
          />
        </div>
      )}

      {exercise.category === "bodyweight" && (
        <div className="flex gap-2">
          <NumberField
            value={item.reps}
            onChange={(v) => onChange(item.tempId, { reps: v })}
            placeholder="reps"
          />
          <NumberField
            value={item.sets}
            onChange={(v) => onChange(item.tempId, { sets: v })}
            placeholder="sets"
          />
        </div>
      )}

      {exercise.category === "cardio" && exercise.name === "Stairmaster" && (
        <div className="flex gap-2">
          <TextField
            value={item.durationStr}
            onChange={(v) => onChange(item.tempId, { durationStr: v })}
            placeholder="MM:SS"
          />
          <NumberField
            value={item.floors}
            onChange={(v) => onChange(item.tempId, { floors: v })}
            placeholder="floors"
          />
        </div>
      )}

      {exercise.category === "cardio" && exercise.name !== "Stairmaster" && (
        <div className="flex gap-2">
          <NumberField
            value={item.distanceMi}
            onChange={(v) => onChange(item.tempId, { distanceMi: v })}
            placeholder="mi"
          />
          <TextField
            value={item.durationStr}
            onChange={(v) => onChange(item.tempId, { durationStr: v })}
            placeholder="MM:SS"
          />
        </div>
      )}
    </div>
  );
}

function NumberField({
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
      className="flex-1 bg-bg-input border border-line rounded-lg px-2.5 py-2 text-sm text-center font-display outline-none placeholder:text-text-dim w-0"
    />
  );
}

function TextField({
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
      className="flex-1 bg-bg-input border border-line rounded-lg px-2.5 py-2 text-sm text-center font-display outline-none placeholder:text-text-dim w-0"
    />
  );
}
