"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { COLORS } from "@/lib/colors";

interface CalendarStats {
  year: number;
  month: number;
  days: Record<number, "pushpull" | "armday" | "legsonly" | "homeday">;
  monthWorkoutCount: number;
  longestGapDays: number;
  allTimeWorkoutCount: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_COLORS: Record<string, { bg: string; border: string }> = {
  pushpull: { bg: "rgba(91,127,163,0.28)", border: "rgba(91,127,163,0.5)" },
  armday: { bg: "rgba(110,156,110,0.28)", border: "rgba(110,156,110,0.5)" },
  legsonly: { bg: "rgba(139,111,168,0.22)", border: "rgba(139,111,168,0.4)" },
  homeday: { bg: "rgba(184,134,59,0.30)", border: "rgba(184,134,59,0.6)" },
};

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [stats, setStats] = useState<CalendarStats | null>(null);

  useEffect(() => {
    fetch(`/api/stats/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setStats);
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
            return (
              <div
                key={i}
                className="aspect-square rounded-lg flex items-center justify-center font-display font-semibold text-xs"
                style={{
                  background: colorSet?.bg ?? COLORS.bgInput,
                  border: `1px solid ${colorSet?.border ?? "transparent"}`,
                  color: colorSet ? COLORS.text : COLORS.textDim,
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 mb-6">
        <LegendItem color="rgba(91,127,163,0.5)" label="Chest & Back day" />
        <LegendItem color="rgba(110,156,110,0.5)" label="Bi's & Tri's day" />
        <LegendItem color="rgba(139,111,168,0.4)" label="Legs / core only" />
        <LegendItem color="rgba(184,134,59,0.5)" label="Home workout" />
      </div>

      <div className="mx-5 mb-6 bg-bg-raised border border-line rounded-xl px-4 py-3.5 flex justify-around">
        <SummaryItem num={stats?.monthWorkoutCount ?? "—"} label="This month" />
        <SummaryItem num={stats?.longestGapDays ?? "—"} label="Longest gap (days)" />
      </div>
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
