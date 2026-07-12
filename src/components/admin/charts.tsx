"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

// Lightweight SVG chart kit for the admin console, styled with The Brain
// Tea design language (DM Sans, ink/ink-muted text, recessive ocean-tinted
// grid). Categorical palette validated for CVD separation + contrast against
// the card surface (#FFFCF8): blue, ochre, rosewood, violet — assigned in
// fixed order per series, never cycled.

export const CHART_COLORS = {
  blue: "#2F6EA3",
  ochre: "#B8813A",
  rosewood: "#B5544D",
  violet: "#7460B8",
} as const;

const GRID = "rgba(93, 118, 139, 0.12)";
const AXIS_TEXT = "#5C6B74";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  /** Render a soft area fill under this line series. */
  area?: boolean;
}

export interface ChartDatum {
  key: string;
  label: string;
  [metric: string]: string | number;
}

interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = (
    event: { clientX: number; clientY: number },
    content: ReactNode,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      content,
    });
  };
  const hide = () => setTooltip(null);
  return { tooltip, show, hide, containerRef };
}

function Tooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-soft border border-ocean/15 bg-surface px-3 py-2 font-dmsans text-xs shadow-warm-soft"
      style={{
        left: Math.max(4, Math.min(state.x + 12, 999)),
        top: Math.max(4, state.y - 8),
        transform: state.x > 260 ? "translateX(calc(-100% - 24px))" : undefined,
      }}
    >
      {state.content}
    </div>
  );
}

function Legend({ series }: { series: SeriesDef[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((s) => (
        <span
          key={s.key}
          className="inline-flex items-center gap-1.5 font-dmsans text-[11px] font-medium text-ink-muted"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

const W = 560;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 46 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

function xTickIndexes(count: number, maxTicks = 7): number[] {
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i);
  const step = Math.ceil(count / maxTicks);
  const ticks: number[] = [];
  for (let i = 0; i < count; i += step) ticks.push(i);
  if (ticks[ticks.length - 1] !== count - 1) ticks.push(count - 1);
  return ticks;
}

/** Multi-series line/area chart with crosshair + shared tooltip. */
export function LineAreaChart({
  data,
  series,
  valueFormat = (v: number) => String(v),
}: {
  data: ChartDatum[];
  series: SeriesDef[];
  valueFormat?: (value: number) => string;
}) {
  const { tooltip, show, hide, containerRef } = useTooltip();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const max = useMemo(
    () =>
      niceMax(
        Math.max(
          1,
          ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)),
        ),
      ),
    [data, series],
  );

  if (data.length === 0) return <ChartEmpty />;

  const xFor = (i: number) =>
    PAD.left +
    (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yFor = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.left) / plotW) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setActiveIndex(clamped);
    const d = data[clamped];
    show(
      event,
      <div className="space-y-0.5">
        <div className="font-semibold text-ocean-deep">{d.label}</div>
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-ink-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}:{" "}
            <span className="font-semibold text-ink tabular-nums">
              {valueFormat(Number(d[s.key]) || 0)}
            </span>
          </div>
        ))}
      </div>,
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        onMouseMove={handleMove}
        onMouseLeave={() => {
          hide();
          setActiveIndex(null);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={GRID}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={yFor(t) + 3}
              textAnchor="end"
              fontSize={9}
              fill={AXIS_TEXT}
              fontFamily="var(--font-dm-sans)"
            >
              {valueFormat(t)}
            </text>
          </g>
        ))}
        {xTickIndexes(data.length).map((i) => (
          <text
            key={i}
            x={xFor(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={9}
            fill={AXIS_TEXT}
            fontFamily="var(--font-dm-sans)"
          >
            {data[i].label}
          </text>
        ))}

        {series.map((s) => {
          const points = data.map(
            (d, i) => `${xFor(i)},${yFor(Number(d[s.key]) || 0)}`,
          );
          return (
            <g key={s.key}>
              {s.area && data.length > 1 && (
                <polygon
                  points={`${PAD.left},${yFor(0)} ${points.join(" ")} ${xFor(data.length - 1)},${yFor(0)}`}
                  fill={s.color}
                  opacity={0.12}
                />
              )}
              <polyline
                points={points.join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {activeIndex !== null && (
          <g>
            <line
              x1={xFor(activeIndex)}
              x2={xFor(activeIndex)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="rgba(93,118,139,0.35)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {series.map((s) => (
              <circle
                key={s.key}
                cx={xFor(activeIndex)}
                cy={yFor(Number(data[activeIndex][s.key]) || 0)}
                r={4}
                fill={s.color}
                stroke="#FFFCF8"
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>
      <Tooltip state={tooltip} />
      <Legend series={series} />
    </div>
  );
}

/** Grouped vertical bar chart with per-group hover tooltip. */
export function BarChart({
  data,
  series,
  valueFormat = (v: number) => String(v),
}: {
  data: ChartDatum[];
  series: SeriesDef[];
  valueFormat?: (value: number) => string;
}) {
  const { tooltip, show, hide, containerRef } = useTooltip();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const max = useMemo(
    () =>
      niceMax(
        Math.max(
          1,
          ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)),
        ),
      ),
    [data, series],
  );
  if (data.length === 0) return <ChartEmpty />;

  const groupW = plotW / data.length;
  const barW = Math.min(18, Math.max(3, (groupW - 4) / series.length - 2));
  const yFor = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.5, 1].map((f) => f * max);

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        onMouseLeave={() => {
          hide();
          setActiveIndex(null);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={GRID}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={yFor(t) + 3}
              textAnchor="end"
              fontSize={9}
              fill={AXIS_TEXT}
              fontFamily="var(--font-dm-sans)"
            >
              {valueFormat(t)}
            </text>
          </g>
        ))}
        {xTickIndexes(data.length).map((i) => (
          <text
            key={i}
            x={PAD.left + i * groupW + groupW / 2}
            y={H - 8}
            textAnchor="middle"
            fontSize={9}
            fill={AXIS_TEXT}
            fontFamily="var(--font-dm-sans)"
          >
            {data[i].label}
          </text>
        ))}

        {data.map((d, i) => {
          const groupX = PAD.left + i * groupW;
          const totalBarsWidth = series.length * barW + (series.length - 1) * 2;
          const start = groupX + (groupW - totalBarsWidth) / 2;
          return (
            <g
              key={d.key}
              onMouseMove={(e) => {
                setActiveIndex(i);
                show(
                  e,
                  <div className="space-y-0.5">
                    <div className="font-semibold text-ocean-deep">
                      {d.label}
                    </div>
                    {series.map((s) => (
                      <div
                        key={s.key}
                        className="flex items-center gap-1.5 text-ink-muted"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.label}:{" "}
                        <span className="font-semibold text-ink tabular-nums">
                          {valueFormat(Number(d[s.key]) || 0)}
                        </span>
                      </div>
                    ))}
                  </div>,
                );
              }}
            >
              {/* generous invisible hit target */}
              <rect
                x={groupX}
                y={PAD.top}
                width={groupW}
                height={plotH}
                fill="transparent"
              />
              {activeIndex === i && (
                <rect
                  x={groupX}
                  y={PAD.top}
                  width={groupW}
                  height={plotH}
                  fill="rgba(93,118,139,0.06)"
                  rx={4}
                />
              )}
              {series.map((s, si) => {
                const v = Number(d[s.key]) || 0;
                const h = Math.max(v > 0 ? 2 : 0, (v / max) * plotH);
                return (
                  <rect
                    key={s.key}
                    x={start + si * (barW + 2)}
                    y={yFor(0) - h}
                    width={barW}
                    height={h}
                    fill={s.color}
                    rx={Math.min(4, barW / 2)}
                  />
                );
              })}
            </g>
          );
        })}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yFor(0)}
          y2={yFor(0)}
          stroke="rgba(93,118,139,0.3)"
          strokeWidth={1}
        />
      </svg>
      <Tooltip state={tooltip} />
      <Legend series={series} />
    </div>
  );
}

/** Horizontal bar list — for entity comparisons (e.g. consultant performance). */
export function HBarList({
  items,
  valueFormat = (v: number) => String(v),
  color = CHART_COLORS.blue,
}: {
  items: { label: string; value: number; secondary?: string }[];
  valueFormat?: (value: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0) return <ChartEmpty />;
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="font-dmsans">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="font-semibold text-ocean-deep">{item.label}</span>
            <span className="shrink-0 tabular-nums font-semibold text-ink">
              {valueFormat(item.value)}
              {item.secondary && (
                <span className="ml-2 font-normal text-ink-muted">
                  {item.secondary}
                </span>
              )}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full surface-inset">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out-soft"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: color,
                minWidth: item.value > 0 ? 4 : 0,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Donut with hover, center stat and side legend. Slice colors follow the entity. */
export function DonutChart({
  slices,
  centerLabel,
  valueFormat = (v: number) => String(v),
}: {
  slices: { label: string; value: number; color: string }[];
  centerLabel: string;
  valueFormat?: (value: number) => string;
}) {
  const { tooltip, show, hide, containerRef } = useTooltip();
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <ChartEmpty />;

  const R = 70;
  const STROKE = 26;
  const C = 2 * Math.PI * R;
  // Cumulative arc offset (start position) for each slice, precomputed so the
  // render stays pure — no variable reassignment during JSX evaluation.
  const offsets = slices.map((_, i) =>
    slices.slice(0, i).reduce((sum, s) => sum + (s.value / total) * C, 0),
  );

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center gap-5 sm:flex-row"
    >
      <svg
        viewBox="0 0 180 180"
        className="w-44 shrink-0"
        role="img"
        onMouseLeave={() => {
          hide();
          setActive(null);
        }}
      >
        <g transform="rotate(-90 90 90)">
          {slices.map((s, i) => {
            const frac = s.value / total;
            const dash = Math.max(0, frac * C - 2); // 2px surface gap between segments
            return (
              <circle
                key={s.label}
                cx={90}
                cy={90}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={active === i ? STROKE + 4 : STROKE}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offsets[i]}
                className="transition-all duration-150"
                onMouseMove={(e) => {
                  setActive(i);
                  show(
                    e,
                    <div>
                      <div className="font-semibold text-ocean-deep">
                        {s.label}
                      </div>
                      <div className="text-ink-muted">
                        <span className="font-semibold text-ink tabular-nums">
                          {valueFormat(s.value)}
                        </span>
                        {" · "}
                        {Math.round(frac * 100)}%
                      </div>
                    </div>,
                  );
                }}
              />
            );
          })}
        </g>
        <text
          x={90}
          y={86}
          textAnchor="middle"
          fontSize={22}
          fontWeight={700}
          fill="#26333D"
          fontFamily="var(--font-dm-sans)"
        >
          {valueFormat(total)}
        </text>
        <text
          x={90}
          y={104}
          textAnchor="middle"
          fontSize={9}
          fill={AXIS_TEXT}
          fontFamily="var(--font-dm-sans)"
          style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
        >
          {centerLabel}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {slices.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-2 rounded-full px-2 py-0.5 font-dmsans text-xs transition-colors ${active === i ? "bg-surface-sunken" : ""}`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-medium text-ink-muted">{s.label}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">
              {valueFormat(s.value)}
            </span>
          </div>
        ))}
      </div>
      <Tooltip state={tooltip} />
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-40 items-center justify-center font-dmsans text-xs italic text-ink-muted">
      No data for the selected period.
    </div>
  );
}
