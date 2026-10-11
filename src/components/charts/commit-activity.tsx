"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface CommitActivityChartProps {
  data: Array<{ week: string; commits: number }>;
}

export function CommitActivityChart({ data }: CommitActivityChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.commits, 0);

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="openpath-commits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18CCFC" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#18CCFC" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => value.slice(5)}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.12)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(18,18,18,0.94)",
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.5)" }}
            itemStyle={{ color: "#18CCFC" }}
            formatter={(value) => [`${String(value)} commits`, "Commits"]}
          />
          <Area
            type="monotone"
            dataKey="commits"
            stroke="#18CCFC"
            strokeWidth={1.5}
            fill="url(#openpath-commits)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: "#18CCFC" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {total === 0 ? (
        <p className="mt-2 text-center text-[11px] text-white/30">
          No commits recorded in the last 13 weeks.
        </p>
      ) : null}
    </div>
  );
}
