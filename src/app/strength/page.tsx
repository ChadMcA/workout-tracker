"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PageHeader, SectionLabel, ChartCard, RangeTabs } from "@/components/ui";
import { MUSCLE_GROUP_COLORS, COLORS } from "@/lib/colors";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscleGroups";

interface WeeklyRow {
  week: string;
  [group: string]: number | string;
}
interface AllTimeItem {
  name: string;
  value: number;
}
interface StrengthStats {
  weekly: WeeklyRow[];
  allTime: AllTimeItem[];
}

const RANGE_OPTIONS = [
  { label: "4 wks", value: "4" },
  { label: "10 wks", value: "10" },
  { label: "Year", value: "52" },
];

function formatWeekLabel(weekStr: string) {
  const d = new Date(weekStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  fill: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length || !label) return null;
  return (
    <div className="bg-bg-input border border-line rounded-lg px-3 py-2 text-xs">
      <div className="text-text-dim mb-1">{formatWeekLabel(label)}</div>
      {payload
        .filter((p) => p.value > 0)
        .reverse()
        .map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-sm inline-block"
              style={{ background: p.fill }}
            />
            <span>
              {p.dataKey}: {p.value}k lb
            </span>
          </div>
        ))}
    </div>
  );
}

export default function StrengthPage() {
  const [range, setRange] = useState("10");
  const [stats, setStats] = useState<StrengthStats | null>(null);
  const [activeGroups, setActiveGroups] = useState<Set<MuscleGroup>>(
    new Set(MUSCLE_GROUPS)
  );

  useEffect(() => {
    fetch(`/api/stats/strength?weeks=${range}`)
      .then((r) => r.json())
      .then(setStats);
  }, [range]);

  function toggleGroup(g: MuscleGroup) {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) {
        if (next.size === 1) return next; // keep at least one active
        next.delete(g);
      } else {
        next.add(g);
      }
      return next;
    });
  }

  const visibleAllTime = useMemo(() => {
    if (!stats) return [];
    return stats.allTime.filter((t) => activeGroups.has(t.name as MuscleGroup));
  }, [stats, activeGroups]);
  const maxVisible = Math.max(1, ...visibleAllTime.map((t) => t.value));

  return (
    <div>
      <PageHeader eyebrow="Progress" title="Strength" />
      <RangeTabs options={RANGE_OPTIONS} value={range} onChange={setRange} />

      <SectionLabel>Weekly volume by group</SectionLabel>
      <ChartCard>
        {!stats ? (
          <div className="h-[180px] flex items-center justify-center text-text-dim text-sm">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weekly} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tickFormatter={formatWeekLabel}
                tick={{ fill: COLORS.textDim, fontSize: 9 }}
                axisLine={{ stroke: COLORS.line }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              {[...MUSCLE_GROUPS].reverse().map((g) =>
                activeGroups.has(g) ? (
                  <Bar
                    key={g}
                    dataKey={g}
                    stackId="a"
                    fill={MUSCLE_GROUP_COLORS[g]}
                    radius={0}
                    isAnimationActive={false}
                  />
                ) : null
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      <div className="text-[11.5px] text-text-dim px-5 mb-5 leading-relaxed">
        Tap a group below to show/hide it — deselect Legs to see the others at real scale. Tap a
        bar to see its exact value.
      </div>

      <div className="flex flex-wrap gap-2 px-5 mb-6">
        {MUSCLE_GROUPS.map((g) => {
          const active = activeGroups.has(g);
          return (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] border ${
                active ? "text-text" : "text-text-dim opacity-45"
              }`}
              style={{
                background: active ? `${MUSCLE_GROUP_COLORS[g]}22` : COLORS.bgInput,
                borderColor: active ? MUSCLE_GROUP_COLORS[g] : COLORS.line,
              }}
            >
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{ background: MUSCLE_GROUP_COLORS[g] }}
              />
              {g}
            </button>
          );
        })}
      </div>

      <SectionLabel>All-time total (lb moved)</SectionLabel>
      <div className="mb-6">
        {stats?.allTime.map((t) => {
          const active = activeGroups.has(t.name as MuscleGroup);
          const pct = active ? (t.value / maxVisible) * 100 : 2;
          const display =
            t.value >= 1_000_000
              ? `${(t.value / 1_000_000).toFixed(2)}M`
              : `${Math.round(t.value / 1000)}k`;
          return (
            <div
              key={t.name}
              className={`mx-5 mb-2 flex items-center gap-2.5 transition-opacity ${
                active ? "" : "opacity-30"
              }`}
            >
              <span className="text-[13px] w-[70px] flex-shrink-0">{t.name}</span>
              <span className="flex-1 h-2 bg-bg-input rounded-full overflow-hidden">
                <span
                  className="block h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: MUSCLE_GROUP_COLORS[t.name],
                  }}
                />
              </span>
              <span className="text-xs text-text-dim w-14 text-right flex-shrink-0">
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
