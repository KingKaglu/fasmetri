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
      <div className="grid min-h-64 w-full place-items-center rounded-lg border bg-white p-5 text-center text-sm font-bold text-[#53656e]">
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
      <div className="grid min-h-64 w-full gap-5 rounded-lg border bg-white p-5 sm:p-6">
        <HistorySummary firstPoint={firstPoint} latestPoint={latestPoint} minPrice={minPrice} maxPrice={maxPrice} />
        <div className="relative grid min-h-28 place-items-center overflow-hidden rounded-lg border border-dashed bg-[#f8fafc] px-5">
          <span className="absolute inset-x-6 top-1/2 border-t border-dashed border-[#bdd4d0]" />
          <div className="relative grid gap-2 text-center">
            <span className="mx-auto size-4 rounded-full border-[3px] border-[#087d6b] bg-[#f5b63c] shadow-[0_0_0_6px_rgba(8,125,107,.12)]" />
            <strong className="text-2xl font-black">{formatGel(latestPoint.price)}</strong>
            <span className="text-sm font-bold text-[#53656e]">ისტორია ამ ფასით დაიწყო {formatUpdated(latestPoint.capturedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-72 w-full gap-5 rounded-lg border bg-white p-5 sm:p-6">
      <HistorySummary firstPoint={firstPoint} latestPoint={latestPoint} minPrice={minPrice} maxPrice={maxPrice} />
      <div className="h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 720, height: 224 }}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke="#dbe7e5" strokeDasharray="4 4" />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              minTickGap={24}
              tickFormatter={formatShortDate}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#53656e", fontSize: 12, fontWeight: 700 }}
            />
            <YAxis
              domain={priceDomain(data)}
              tickFormatter={(value) => formatGel(Number(value))}
              width={88}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#53656e", fontSize: 12, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ stroke: "#8ebbb3", strokeDasharray: "4 4" }}
              formatter={(value) => [formatGel(Number(value)), "ფასი"]}
              labelFormatter={(_, payload) => {
                const timestamp = Number(payload?.[0]?.payload?.timestamp);
                return Number.isFinite(timestamp) ? formatUpdated(new Date(timestamp)) : "";
              }}
              contentStyle={{
                borderColor: "#d3e2df",
                borderRadius: 8,
                boxShadow: "0 16px 40px rgba(16,33,41,.14)",
                fontWeight: 700,
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#087d6b"
              strokeWidth={3}
              activeDot={{ r: 6, fill: "#f5b63c", stroke: "#087d6b", strokeWidth: 3 }}
              dot={{ r: 4, fill: "#f5b63c", stroke: "#087d6b", strokeWidth: 2 }}
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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0054d2]">დაკვირვების პერიოდი</p>
        <p className="mt-1 text-sm font-bold text-[#53656e]">
          {formatUpdated(firstPoint.capturedAt)} - {formatUpdated(latestPoint.capturedAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm font-black">
        <span className="rounded-md bg-[#edf5f3] px-3 py-2 text-[#003f9f]">მინ. {formatGel(minPrice)}</span>
        <span className="rounded-md bg-[#fff4dd] px-3 py-2 text-[#7b4e00]">მაქს. {formatGel(maxPrice)}</span>
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
