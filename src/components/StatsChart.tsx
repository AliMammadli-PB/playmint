"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export type ChartPoint = { day: string; plays: number; minutes: number; premiumMinutes: number };

export function StatsChart({ data, labels }: { data: ChartPoint[]; labels: { plays: string; minutes: string; premium: string } }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gPlays" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3dffb0" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3dffb0" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gMin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7cc8ff" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7cc8ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(214 255 236 / 0.07)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} stroke="#5f776b" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis yAxisId="l" stroke="#5f776b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis yAxisId="r" orientation="right" stroke="#5f776b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#0f1f1a", border: "1px solid rgb(214 255 236 / 0.18)", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#edf5f0" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area yAxisId="l" type="monotone" dataKey="plays" name={labels.plays} stroke="#3dffb0" strokeWidth={2} fill="url(#gPlays)" />
          <Area yAxisId="r" type="monotone" dataKey="minutes" name={labels.minutes} stroke="#7cc8ff" strokeWidth={2} fill="url(#gMin)" />
          <Area yAxisId="r" type="monotone" dataKey="premiumMinutes" name={labels.premium} stroke="#ffc857" strokeWidth={2} fill="none" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
