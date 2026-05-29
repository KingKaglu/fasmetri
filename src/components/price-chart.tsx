"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HistoryPoint } from "@/lib/catalog-types";
import { formatGel, formatUpdated } from "@/lib/format";

type ChartPoint = HistoryPoint & {
  timestamp: number;
};

const shortDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tbilisi",
  day: "2-digit",
  month: "2-digit",
});

export function PriceChart({ history }: { history: HistoryPoint[] }) {
  const data = prepareHistory(history);

  if (!data.length) {
    return (
      <div className="surface-flat grid min-h-48 w-full place-items-center p-5 text-center text-sm font-bold text-[#64748b]">
        ფასის ისტორია ჯერ გროვდება.
      </div>
    );
  }

  const firstPoint = data[0];
  const latestPoint = data[data.length - 1];
  const minPrice = Math.min(...data.map((point) => point.price));
  const maxPrice = Math.max(...data.map((point) => point.price));

  if (data.length === 1) {
    return (
      <div className="surface-flat grid min-h-56 w-full gap-4 p-4 sm:p-5">
        <HistorySummary firstPoint={firstPoint} latestPoint={latestPoint} minPrice={minPrice} maxPrice={maxPrice} />
        <div className="relative grid min-h-24 place-items-center overflow-hidden rounded-md border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-5">
          <span className="absolute inset-x-6 top-1/2 border-t border-dashed border-[#cbd5e1]" />
          <div className="relative grid gap-1.5 text-center">
            <span className="mx-auto size-3 rounded-full bg-[#84cc16] ring-4 ring-[#ecfccb]" />
            <strong className="text-xl font-black text-[#0f172a]">{formatGel(latestPoint.price)}</strong>
            <span className="text-xs font-bold text-[#64748b]">ისტორია ამ ფასით დაიწყო {formatUpdated(latestPoint.capturedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-flat grid min-h-64 w-full gap-4 p-4 sm:p-5">
      <HistorySummary firstPoint={firstPoint} latestPoint={latestPoint} minPrice={minPrice} maxPrice={maxPrice} />
      <div className="h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 720, height: 224 }}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              minTickGap={24}
              tickFormatter={formatShortDate}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
            />
            <YAxis
              domain={priceDomain(data)}
              tickFormatter={(value) => formatGel(Number(value))}
              width={80}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ stroke: "#0f172a", strokeDasharray: "3 3" }}
              formatter={(value) => [formatGel(Number(value)), "ფასი"]}
              labelFormatter={(_, payload) => {
                const timestamp = Number(payload?.[0]?.payload?.timestamp);
                return Number.isFinite(timestamp) ? formatUpdated(new Date(timestamp)) : "";
              }}
              contentStyle={{
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                boxShadow: "0 8px 24px rgba(15,23,42,.08)",
                fontWeight: 700,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#0f172a"
              strokeWidth={2}
              activeDot={{ r: 5, fill: "#84cc16", stroke: "#0f172a", strokeWidth: 2 }}
              dot={{ r: 3, fill: "#0f172a", stroke: "#0f172a" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HistorySummary({
  firstPoint,
  latestPoint,
  minPrice,
  maxPrice,
}: {
  firstPoint: ChartPoint;
  latestPoint: ChartPoint;
  minPrice: number;
  maxPrice: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow text-[#65a30d]">დაკვირვების პერიოდი</p>
        <p className="mt-1 text-xs font-bold text-[#64748b]">
          {formatUpdated(firstPoint.capturedAt)} — {formatUpdated(latestPoint.capturedAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs font-black">
        <span className="rounded-sm border border-[#bbf7d0] bg-[#ecfdf5] px-2 py-1 text-[#15803d]">მინ. {formatGel(minPrice)}</span>
        <span className="rounded-sm border border-[#fed7aa] bg-[#fff7ed] px-2 py-1 text-[#c2410c]">მაქს. {formatGel(maxPrice)}</span>
      </div>
    </div>
  );
}

function prepareHistory(history: HistoryPoint[]) {
  return history
    .map((point) => ({
      ...point,
      timestamp: new Date(point.capturedAt).getTime(),
    }))
    .filter((point): point is ChartPoint => Number.isFinite(point.timestamp) && Number.isFinite(point.price) && point.price >= 0)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function formatShortDate(timestamp: number) {
  return shortDate.format(new Date(timestamp));
}

function priceDomain(data: ChartPoint[]): [number, number] {
  const prices = data.map((point) => point.price);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const padding = Math.max((maximum - minimum) * 0.16, maximum * 0.04, 1);

  return [Math.max(0, Math.floor(minimum - padding)), Math.ceil(maximum + padding)];
}
