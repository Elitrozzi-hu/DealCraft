interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  color = "#2c5af6",
  formatValue,
}: {
  data: BarDatum[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0) || 1;

  return (
    <div className="flex flex-col gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <div className="w-[88px] shrink-0 truncate text-[11px] text-cold" title={d.label}>
            {d.label}
          </div>
          <div className="relative h-5 flex-1 overflow-hidden rounded bg-surface">
            <div
              className="h-full rounded"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
          <div className="w-[56px] shrink-0 text-right text-[11px] font-semibold text-ink">
            {formatValue ? formatValue(d.value) : d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

interface LinePoint {
  bucket: string;
  count: number;
}

export function LineChart({ data }: { data: LinePoint[] }) {
  const max = Math.max(...data.map((d) => d.count), 0) || 1;
  const W = 100;
  const H = 100;
  const pad = 4;

  const points = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad),
    y: H - pad - (d.count / max) * (H - 2 * pad),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `M ${points[0].x} ${H - pad} ` +
        points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
        ` L ${points[points.length - 1].x} ${H - pad} Z`
      : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => H - pad - t * (H - 2 * pad));
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="flex flex-col">
      <div className="h-[220px] w-full">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
          {gridLines.map((y, i) => (
            <line
              key={i}
              x1={pad}
              y1={y}
              x2={W - pad}
              y2={y}
              stroke="#e6e9f2"
              strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {areaPath && <path d={areaPath} fill="rgba(44,90,246,0.06)" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#2c5af6"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
      <div className="mt-1 flex justify-between px-1">
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <span key={i} className="text-[10px] text-cold">
              {d.bucket}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
