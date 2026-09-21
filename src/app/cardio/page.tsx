"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PageHeader, SectionLabel, ChartCard, RangeTabs } from "@/components/ui";
import { useThemeColors } from "@/lib/colors";

interface CardioStats {
  weekly: { week: string; Stairmaster: number; Treadmill: number }[];
  monthlyFloors: { month: string; floors: number }[];
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
function formatMonthLabel(monthStr: string) {
  const [, m] = monthStr.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[parseInt(m, 10) - 1];
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

function CardioTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length || !label) return null;
  return (
    <div className="bg-bg-input border border-line rounded-lg px-3 py-2 text-xs">
      <div className="text-text-dim mb-1">{formatWeekLabel(label)}</div>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: p.fill }} />
            <span>
              {p.dataKey}: {p.value} min
            </span>
          </div>
        ))}
    </div>
  );
}

interface SingleValuePayloadEntry {
  value: number;
}
interface SingleValueTooltipProps {
  active?: boolean;
  payload?: SingleValuePayloadEntry[];
  label?: string;
}

function FloorsTooltip({ active, payload, label }: SingleValueTooltipProps) {
  if (!active || !payload || !payload.length || !label) return null;
  return (
    <div className="bg-bg-input border border-line rounded-lg px-3 py-2 text-xs">
      <div className="text-text-dim mb-1">{formatMonthLabel(label)}</div>
      <div>{payload[0].value} floors</div>
    </div>
  );
}

export default function CardioPage() {
  const { COLORS, CARDIO_COLORS } = useThemeColors();
  const [range, setRange] = useState("10");
  const [stats, setStats] = useState<CardioStats | null>(null);

  useEffect(() => {
    fetch(`/api/stats/cardio?weeks=${range}&months=7`)
      .then((r) => r.json())
      .then(setStats);
  }, [range]);

  const hasTreadmill = stats?.weekly.some((w) => w.Treadmill > 0) ?? false;

  return (
    <div>
      <PageHeader eyebrow="Progress" title="Cardio" />
      <RangeTabs options={RANGE_OPTIONS} value={range} onChange={setRange} />

      <SectionLabel>Total cardio time</SectionLabel>
      <ChartCard>
        <div className="flex gap-3.5 mb-2.5">
          <div className="flex items-center gap-1.5 text-[11.5px] text-text-dim">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: CARDIO_COLORS.Stairmaster }} />
            Stairmaster
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-text-dim">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: CARDIO_COLORS.Treadmill }} />
            Treadmill
          </div>
        </div>
        {!stats ? (
          <div className="h-[180px] flex items-center justify-center text-text-dim text-sm">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.weekly} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tickFormatter={formatWeekLabel}
                tick={{ fill: COLORS.textDim, fontSize: 9 }}
                axisLine={{ stroke: COLORS.line }}
                tickLine={false}
              />
              <Tooltip content={<CardioTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="Stairmaster" stackId="a" fill={CARDIO_COLORS.Stairmaster} isAnimationActive={false} />
              <Bar dataKey="Treadmill" stackId="a" fill={CARDIO_COLORS.Treadmill} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      {!hasTreadmill && stats && (
        <div className="text-[11.5px] text-text-dim px-5 mb-5 leading-relaxed">
          Treadmill hasn&apos;t been used in this window. Tap a bar segment to see its exact
          value.
        </div>
      )}

      <SectionLabel>Stairmaster floors climbed</SectionLabel>
      <ChartCard title="Monthly total" sub="Last 7 months" className="mb-6">
        {!stats ? (
          <div className="h-[120px] flex items-center justify-center text-text-dim text-sm">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={stats.monthlyFloors} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fill: COLORS.textDim, fontSize: 9 }}
                axisLine={{ stroke: COLORS.line }}
                tickLine={false}
              />
              <YAxis hide domain={[0, "dataMax + 100"]} />
              <Tooltip content={<FloorsTooltip />} cursor={{ stroke: COLORS.line }} />
              <Line
                type="monotone"
                dataKey="floors"
                stroke={COLORS.lavender}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: COLORS.lavender, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
