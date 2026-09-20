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
  edited: boolean; // false = pending/pre-filled, not yet reviewed for this workout
}

interface DraftShape {
  date: string;
  location: "Home" | "Gym" | "Outdoor";
  selectedTemplateId: number | "blank" | null;
  items: LoggedItem[];
}

const DRAFT_KEY = "workout-log-draft";

function secondsToDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function durationToSeconds(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // "MM:SS" e.g. "12:30"
  const mmss = trimmed.match(/^(\d{1,3}):(\d{2})$/);
  if (mmss) return parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);

  // Whole number of minutes, e.g. "12" -> 12:00. Also accepts a trailing
  // colon someone might type while starting "MM:SS", e.g. "12:".
  const wholeMinutes = trimmed.match(/^(\d{1,3}):?$/);
  if (wholeMinutes) return parseInt(wholeMinutes[1], 10) * 60;

  return null;
}

function todayStr(): string {
  // Use local calendar date, not UTC — toISOString() converts to UTC, which
  // rolls over to "tomorrow" in the evening for anyone west of Greenwich
  // (most of the Americas), showing a date ahead of the real local date.
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadDraft(): DraftShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftShape;
  } catch {
    return null;
  }
}

export default function LogPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([]);

  // Restore an in-progress workout, if one was left off (e.g. switched tabs
  // mid-log). Reading it via lazy useState initializers (rather than in an
  // effect) means the component's very first render already reflects the
  // draft, with no flash of empty state in between.
  const [draft] = useState<DraftShape | null>(loadDraft);
  const hasDraft = !!draft && draft.items.length > 0;

  const [date, setDate] = useState(() => (hasDraft ? draft!.date : todayStr()));
  const [location, setLocation] = useState<"Home" | "Gym" | "Outdoor">(() =>
    hasDraft ? draft!.location : "Gym"
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "blank" | null>(() =>
    hasDraft ? draft!.selectedTemplateId : null
  );
  const [items, setItems] = useState<LoggedItem[]>(() => (hasDraft ? draft!.items : []));

  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const tempIdCounter = useRef(0);

  useEffect(() => {
    fetch("/api/exercises").then((r) => r.json()).then(setExercises);
    fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  }, []);

  // Auto-persist the in-progress workout any time it changes, so it survives
  // navigating to another tab or closing the app mid-workout.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (items.length === 0) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const nextDraft: DraftShape = { date, location, selectedTemplateId, items };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft));
  }, [date, location, selectedTemplateId, items]);

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
      edited: false,
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

  // Adds a second (third, etc.) entry for the same exercise right after the
  // one that was duplicated — e.g. a heavier or lighter set of Bench later
  // in the same workout. Starts as "pending" so it's clear it still needs review.
  function duplicateItem(source: LoggedItem) {
    const newItem: LoggedItem = {
      ...source,
      tempId: `${source.exercise.id}-${tempIdCounter.current++}`,
      edited: false,
    };
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.tempId === source.tempId);
      const next = [...prev];
      next.splice(idx + 1, 0, newItem);
      return next;
    });
  }

  // Any real field edit both updates the value and marks the card "done" (green).
  function updateItem(tempId: string, patch: Partial<LoggedItem>) {
    setItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, ...patch, edited: true } : i))
    );
  }

  function handleSaveDraft() {
    if (items.length === 0) return;
    const draft: DraftShape = { date, location, selectedTemplateId, items };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSavedMsg(true);
    setTimeout(() => setDraftSavedMsg(false), 2000);
  }

  function buildPayload() {
    return {
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
  }

  async function handleConfirmSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error("Save failed");
      window.localStorage.removeItem(DRAFT_KEY);
      setItems([]);
      setSelectedTemplateId(null);
      setShowConfirm(false);
      setSubmittedMsg(true);
      setTimeout(() => setSubmittedMsg(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Couldn't submit this workout. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = items.filter((i) => !i.edited).length;

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
            <div className={`text-[11px] ${selectedTemplateId === t.id ? "text-accent" : "text-text-dim"}`}>
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
            {filteredExercises.map((ex) => {
              const alreadyAddedCount = items.filter((i) => i.exercise.id === ex.id).length;
              return (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-bg-input border-b border-line last:border-b-0"
                >
                  {ex.name}
                  <span className="text-text-dim text-xs ml-2">
                    {ex.muscle_group ?? ex.category}
                  </span>
                  {alreadyAddedCount > 0 && (
                    <span className="text-accent text-xs ml-2">
                      + add another (already have {alreadyAddedCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="text-[11.5px] text-text-dim px-5 mb-3 leading-relaxed">
          Grey cards are pre-filled but not yet reviewed. Edit any field to mark that exercise
          done (green) for this workout.
        </div>
      )}

      {items.map((item) => {
        const sameExercise = items.filter((i) => i.exercise.id === item.exercise.id);
        const occurrenceLabel =
          sameExercise.length > 1
            ? `${sameExercise.findIndex((i) => i.tempId === item.tempId) + 1} of ${sameExercise.length}`
            : null;
        return (
          <ExerciseCard
            key={item.tempId}
            item={item}
            occurrenceLabel={occurrenceLabel}
            onChange={updateItem}
            onRemove={removeItem}
            onDuplicate={() => duplicateItem(item)}
          />
        );
      })}

      {items.length === 0 && (
        <div className="mx-5 mb-6 border border-dashed border-line rounded-xl px-4 py-6 text-center text-text-dim text-sm">
          Pick a quick-start template or search for an exercise to begin.
        </div>
      )}

      {items.length > 0 && (
        <div className="mx-5 mb-3 flex gap-2.5">
          <button
            onClick={handleSaveDraft}
            className="flex-1 border border-line text-text text-center py-3.5 rounded-xl font-semibold text-[14px]"
          >
            Save
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-1 bg-accent text-accent-fg text-center py-3.5 rounded-xl font-semibold text-[14px]"
          >
            Submit workout
          </button>
        </div>
      )}

      <div className="px-5 mb-6 text-center text-xs">
        {draftSavedMsg && <div className="text-text-dim">Draft saved — safe to switch tabs ✓</div>}
        {submittedMsg && <div className="text-green">Workout submitted ✓</div>}
      </div>

      {showConfirm && (
        <ConfirmSubmitDialog
          date={date}
          location={location}
          exerciseCount={items.length}
          pendingCount={pendingCount}
          submitting={submitting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
}

function ConfirmSubmitDialog({
  date,
  location,
  exerciseCount,
  pendingCount,
  submitting,
  onCancel,
  onConfirm,
}: {
  date: string;
  location: string;
  exerciseCount: number;
  pendingCount: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-[320px] bg-bg-raised border border-line rounded-2xl p-5">
        <div className="font-display font-semibold text-lg mb-1.5">Submit this workout?</div>
        <div className="text-sm text-text-dim mb-1 leading-relaxed">
          {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"} for {date} · {location}
        </div>
        {pendingCount > 0 && (
          <div className="text-sm text-amber mb-3 leading-relaxed">
            {pendingCount} exercise{pendingCount === 1 ? "" : "s"} still {pendingCount === 1 ? "shows" : "show"}{" "}
            as grey/pre-filled — double check those before submitting.
          </div>
        )}
        <div className="text-xs text-text-dim mb-4 leading-relaxed">
          This saves the workout to your history. You can still edit or delete it later from the
          database if needed, but there is no undo button in the app itself yet.
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 border border-line text-text py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 bg-accent text-accent-fg py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({
  item,
  occurrenceLabel,
  onChange,
  onRemove,
  onDuplicate,
}: {
  item: LoggedItem;
  occurrenceLabel: string | null;
  onChange: (tempId: string, patch: Partial<LoggedItem>) => void;
  onRemove: (tempId: string) => void;
  onDuplicate: () => void;
}) {
  const { exercise } = item;
  const tagLabel =
    exercise.category === "strength"
      ? exercise.muscle_group ?? "STRENGTH"
      : exercise.category === "cardio"
        ? "CARDIO"
        : "BODYWEIGHT";

  const cardStyle = item.edited
    ? { background: "var(--done-bg)", borderColor: "var(--done-border)" }
    : { background: "var(--pending-bg)", borderColor: "var(--pending-border)" };

  return (
    <div className="mx-5 mb-3 border rounded-xl px-4 py-3.5" style={cardStyle}>
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px]">{exercise.name}</span>
          {occurrenceLabel && (
            <span className="text-[9px] text-accent border border-accent rounded px-1.5 py-0.5">
              {occurrenceLabel}
            </span>
          )}
          {!item.edited && (
            <span className="text-[9px] text-text-dim border border-line rounded px-1.5 py-0.5 uppercase">
              pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-dim border border-line rounded px-1.5 py-0.5 uppercase">
            {tagLabel}
          </span>
          <button
            onClick={onDuplicate}
            aria-label={`Log another ${exercise.name} entry`}
            title="Log this exercise again at a different weight"
            className="text-text-dim text-sm px-1"
          >
            ⧉
          </button>
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
            placeholder="MM:SS or min"
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
            placeholder="MM:SS or min"
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
