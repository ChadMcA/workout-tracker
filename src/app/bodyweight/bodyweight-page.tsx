"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { PageHeader, SectionLabel, ChartCard, RangeTabs, EmptyChartState } from "@/components/ui";
import { useThemeColors } from "@/lib/colors";

interface BodyweightStats {
  core: { week: string; reps: number }[];
  pushups: { week: string; reps: number }[];
  pullups: { week: string; reps: number }[];
  hasPushupData: boolean;
  hasPullupData: boolean;
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

interface SingleValuePayloadEntry {
  value: number;
}
interface RepsTooltipProps {
  active?: boolean;
  payload?: SingleValuePayloadEntry[];
  label?: string;
}

function RepsTooltip({ active, payload, label }: RepsTooltipProps) {
  if (!active || !payload || !payload.length || !label) return null;
  return (
    <div className="bg-bg-input border border-line rounded-lg px-3 py-2 text-xs">
      <div className="text-text-dim mb-1">{formatWeekLabel(label)}</div>
      <div>{payload[0].value} reps</div>
    </div>
  );
}

function RepsLineChart({ data, color }: { data: { week: string; reps: number }[]; color: string }) {
  const { COLORS } = useThemeColors();
  return (
    <ResponsiveContainer width="100%" height={130}>
      <LineChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.line} vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={formatWeekLabel}
          tick={{ fill: COLORS.textDim, fontSize: 9 }}
          axisLine={{ stroke: COLORS.line }}
          tickLine={false}
        />
        <YAxis hide domain={[0, "dataMax + 20"]} />
        <Tooltip content={<RepsTooltip />} cursor={{ stroke: COLORS.line }} />
        <Line
          type="monotone"
          dataKey="reps"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function BodyweightPage() {
  const { COLORS } = useThemeColors();
  const [range, setRange] = useState("10");
  const [stats, setStats] = useState<BodyweightStats | null>(null);

  useEffect(() => {
    fetch(`/api/stats/bodyweight?weeks=${range}`)
      .then((r) => r.json())
      .then(setStats);
  }, [range]);

  return (
    <div>
      <PageHeader eyebrow="Progress" title="Bodyweight" />
      <RangeTabs options={RANGE_OPTIONS} value={range} onChange={setRange} />

      <SectionLabel>Core reps over time</SectionLabel>
      <ChartCard title="Weekly total reps (Leg raises)" sub={`Last ${range} weeks`}>
        {!stats ? (
          <div className="h-[130px] flex items-center justify-center text-text-dim text-sm">
            Loading…
          </div>
        ) : (
          <RepsLineChart data={stats.core} color={COLORS.green} />
        )}
      </ChartCard>

      <SectionLabel>Pushup reps over time</SectionLabel>
      <ChartCard title="Weekly total reps" sub={stats?.hasPushupData ? `Last ${range} weeks` : "No data yet"}>
        {!stats ? (
          <div className="h-[130px] flex items-center justify-center text-text-dim text-sm">
            Loading…
          </div>
        ) : stats.hasPushupData ? (
          <RepsLineChart data={stats.pushups} color={COLORS.terracotta} />
        ) : (
          <EmptyChartState
            icon="💪"
            message="Pushups are now trackable — log a set from the Log tab and your reps will start showing up here."
          />
        )}
      </ChartCard>

      <SectionLabel>Pull-up reps over time</SectionLabel>
      <ChartCard
        title="Weekly total reps"
        sub={stats?.hasPullupData ? `Last ${range} weeks` : "No data yet"}
        className="mb-6"
      >
        {!stats ? (
          <div className="h-[130px] flex items-center justify-center text-text-dim text-sm">
            Loading…
          </div>
        ) : stats.hasPullupData ? (
          <RepsLineChart data={stats.pullups} color={COLORS.accent} />
        ) : (
          <EmptyChartState
            icon="🧗"
            message="Pull-ups are now trackable — log a set from the Log tab and your reps will start showing up here."
          />
        )}
      </ChartCard>
    </div>
  );
}
