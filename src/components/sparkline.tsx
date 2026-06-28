import { HistoryPoint } from "@/lib/catalog-types";

// Compact monochrome price trend line. Marks the historic low with a filled dot.
// Renders nothing when there isn't enough history to draw a meaningful trend.
export function Sparkline({
  history,
  width = 96,
  height = 28,
  className = "",
}: {
  history?: HistoryPoint[] | null;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!history || history.length < 2) return null;

  const prices = history.map((point) => point.price).filter((value) => Number.isFinite(value) && value > 0);
  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pad = 3;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const stepX = innerW / (prices.length - 1);

  // y inverted: lowest price sits near the bottom of the box.
  const points = prices.map((price, index) => {
    const x = pad + index * stepX;
    const y = pad + (1 - (price - min) / span) * innerH;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const minIndex = prices.indexOf(min);
  const [lowX, lowY] = points[minIndex];
  const rising = prices[prices.length - 1] >= prices[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* area fill under the line */}
      <path
        d={`${path} L${(pad + innerW).toFixed(1)} ${(height - pad).toFixed(1)} L${pad} ${(height - pad).toFixed(1)} Z`}
        fill="currentColor"
        opacity="0.07"
      />
      <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity={rising ? 0.55 : 0.85} />
      {/* historic low marker */}
      <circle cx={lowX} cy={lowY} r="2.4" fill="currentColor" />
    </svg>
  );
}
