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

// Fixed pixel height — must match the container div's height.
// Using a number (not "100%") on ResponsiveContainer prevents the
// ResizeObserver feedback loop in Recharts 3 that hangs the browser tab.
const CHART_HEIGHT = 224;

export function PriceChart({ history }: { history: HistoryPoint[] }) {
  const data = prepareHistory(history);

  if (!data.length) {
    return (
      <div className="grid min-h-48 w-full place-items-center rounded-lg border border-gray-200 bg-white p-5 text-center text-sm text-gray-500">
        ფასის ისტორია ჯერ გროვდება.
      </div>
    );
  }

  const firstPoint = data[0];
  const latestPoint = data[data.length - 1];
  const minPrice = Math.min(...data.map((point) => point.price));
  const maxPrice = Math.max(...data.map((point) => point.price));

  // Guard: single point OR all timestamps identical → static display.
  // A zero-range time domain on the XAxis makes Recharts loop computing
  // tick positions, which hangs the browser tab.
  const hasTimeSpread = data.length >= 2 && latestPoint.timestamp > firstPoint.timestamp;

  if (!hasTimeSpread) {
    return (
      <div className="grid min-h-56 w-full gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <HistorySummary firstPoint={firstPoint} latestPoint={latestPoint} minPrice={minPrice} maxPrice={maxPrice} />
        <div className="relative grid min-h-24 place-items-center overflow-hidden rounded-md border border-dashed border-gray-200 bg-gray-50 px-5">
          <span className="absolute inset-x-6 top-1/2 border-t border-dashed border-gray-300" />
          <div className="relative grid gap-1.5 text-center">
            <span className="mx-auto size-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
            <strong className="text-xl font-bold text-gray-900">{formatGel(latestPoint.price)}</strong>
            <span className="text-xs text-gray-500">ისტორია ამ ფასით დაიწყო {formatUpdated(latestPoint.capturedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Explicit numeric domain so Recharts never receives a zero-range time scale.
  const tsDomain: [number, number] = [firstPoint.timestamp, latestPoint.timestamp];
  // Pre-compute up to 6 tick positions so D3's auto-tick algorithm never runs
  // (it can generate thousands of intermediate values for long time ranges).
  const xTicks = spreadTicks(data, 6);

  return (
    <div className="grid min-h-64 w-full gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <HistorySummary firstPoint={firstPoint} latestPoint={latestPoint} minPrice={minPrice} maxPrice={maxPrice} />
      <div className="w-full min-w-0 overflow-hidden" style={{ height: CHART_HEIGHT }}>
        {/* debounce throttles ResizeObserver callbacks; fixed height number
            avoids the height="100%" → container-resize → re-measure loop. */}
        <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={50}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={tsDomain}
              ticks={xTicks}
              tickFormatter={formatShortDate}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
            />
            <YAxis
              domain={priceDomain(data)}
              tickCount={6}
              tickFormatter={(value) => formatGel(Number(value))}
              width={80}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ stroke: "#15172b", strokeDasharray: "3 3" }}
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
              stroke="#4f46e5"
              strokeWidth={2}
              activeDot={{ r: 5, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 2 }}
              dot={data.length > 60 ? false : { r: 3, fill: "#4f46e5", stroke: "#4f46e5" }}
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
        <p className="eyebrow">დაკვირვების პერიოდი</p>
        <p className="mt-1 text-xs text-gray-500">
          {formatUpdated(firstPoint.capturedAt)} — {formatUpdated(latestPoint.capturedAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
        <span className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-green-700">მინ. {formatGel(minPrice)}</span>
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">მაქს. {formatGel(maxPrice)}</span>
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

// Returns at most `count` evenly-spaced timestamps from the dataset,
// always including the first and last points. Providing explicit ticks
// prevents Recharts from delegating to D3's time-scale auto-tick
// algorithm, which can generate thousands of intermediate values for
// long date ranges and stall the browser.
function spreadTicks(data: ChartPoint[], count: number): number[] {
  if (data.length <= count) return data.map((p) => p.timestamp);
  const result: number[] = [data[0].timestamp];
  for (let i = 1; i < count - 1; i++) {
    result.push(data[Math.round((i * (data.length - 1)) / (count - 1))].timestamp);
  }
  result.push(data[data.length - 1].timestamp);
  return [...new Set(result)];
}
