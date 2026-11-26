// Interactieve grafieken: tik of beweeg over een balk of punt om de waarde te zien.
// Dunne markeringen, afgeronde bovenkant op de nullijn, rustige rasterlijnen, één y-as.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { niceStep } from './ui';

/** Breedte van de container, zodat tekst in de grafiek altijd even groot blijft. */
function useWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, w] as const;
}

const tickText = (t: number) => (t >= 10000 ? `${(t / 1000).toLocaleString('nl-NL')}k` : t >= 1000 ? `${(t / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}k` : t.toLocaleString('nl-NL', { maximumFractionDigits: 1 }));

/** Balk met afgeronde bovenkant (4px) en een rechte onderkant op de nullijn. */
const barPath = (x: number, y: number, w: number, h: number, r = 4) => {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

export interface BarDatum {
  label: string;
  /** volledige omschrijving voor de uitleg, bijv. "maandag 23 nov" */
  title: string;
  value: number;
  /** extra regel onder de waarde, bijv. "3 dagen gelogd" */
  note?: string;
  /** toekomst of geen gegevens: lichter tekenen */
  empty?: boolean;
}

interface Readout {
  value: string;
  title: string;
  note?: string;
  extra?: ReactNode;
}

function ChartReadout({ r }: { r: Readout }) {
  return (
    <div className="readout" aria-live="polite">
      <b className="num">{r.value}</b>
      <span>{r.title}{r.note ? ` · ${r.note}` : ''}</span>
      {r.extra}
    </div>
  );
}

/** Kies standaard de laatste periode met gegevens. */
const lastFilled = (data: { empty?: boolean }[]) => {
  for (let i = data.length - 1; i >= 0; i--) if (!data[i].empty) return i;
  return data.length - 1;
};

function useSelection(n: number, initial: number) {
  const [sel, setSel] = useState(initial);
  useEffect(() => setSel(initial), [initial, n]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { setSel((s) => Math.max(0, s - 1)); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setSel((s) => Math.min(n - 1, s + 1)); e.preventDefault(); }
  };
  return [Math.min(sel, n - 1), setSel, onKey] as const;
}

export function BarChart2({
  data, color, target, format, height = 168, overColor, targetLabel, tick = tickText,
}: { data: BarDatum[]; color: string; target?: number; format: (v: number) => string; height?: number; overColor?: string; targetLabel?: string; tick?: (v: number) => string }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [sel, setSel, onKey] = useSelection(data.length, lastFilled(data));
  const H = height, padL = 36, padR = 4, padB = 22, padT = 8;
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value));
  const step = niceStep((max * 1.08) / 2);
  const top = step * 2;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const col = (W - padL - padR) / data.length;
  const bw = Math.max(6, Math.min(36, col * 0.62));
  const showEvery = data.length > 10 ? Math.ceil(data.length / 8) : 1;
  const d = data[sel];
  const over = (v: number) => overColor && target !== undefined && v > target * 1.1;
  return (
    <div className="chartbox" ref={ref}>
      {d && <ChartReadout r={{ value: d.empty && !d.value ? '–' : format(d.value), title: d.title, note: d.empty && !d.value ? 'niets bijgehouden' : d.note, extra: target !== undefined && d.value > 0 ? <span className="readout-goal">{Math.round((d.value / target) * 100)}% van {targetLabel ?? 'je doel'}</span> : undefined }} />}
      <svg width={W} height={H} className="chart2" role="group" aria-label="Grafiek, gebruik de pijltjestoetsen om een periode te kiezen" tabIndex={0} onKeyDown={onKey}>
        {[0, step, top].map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 7} y={y(t) + 3.5} textAnchor="end" className="tick">{tick(t)}</text>
          </g>
        ))}
        {data.map((v, i) => {
          const x = padL + i * col + (col - bw) / 2;
          const h = Math.max(0, H - padB - y(v.value));
          return (
            <g key={i} className={'barg' + (i === sel ? ' sel' : '')}>
              <path d={barPath(x, H - padB - h, bw, h)} fill={over(v.value) ? overColor : color} opacity={v.empty ? 0.3 : i === sel ? 1 : 0.78} />
              {i % showEvery === 0 && <text x={padL + i * col + col / 2} y={H - 6} textAnchor="middle" className={'tick' + (i === sel ? ' on' : '')}>{v.label}</text>}
              <rect x={padL + i * col} y={0} width={col} height={H} fill="transparent" onPointerEnter={() => setSel(i)} onClick={() => setSel(i)} aria-label={`${v.title}: ${format(v.value)}`} />
            </g>
          );
        })}
        {target !== undefined && (
          <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} className="target" />
        )}
      </svg>
    </div>
  );
}

export interface StackSeries {
  key: string;
  label: string;
  color: string;
}

/** Gestapelde balken (bijv. energie uit eiwit, koolhydraten en vet), met 2px ruimte tussen de delen. */
export function StackedBars({
  data, series, format, height = 168, unit,
}: { data: (Omit<BarDatum, 'value'> & { values: Record<string, number> })[]; series: StackSeries[]; format: (v: number) => string; height?: number; unit: string }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [sel, setSel, onKey] = useSelection(data.length, lastFilled(data));
  const H = height, padL = 36, padR = 4, padB = 22, padT = 8;
  const totals = data.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0));
  const step = niceStep((Math.max(1, ...totals) * 1.08) / 2);
  const top = step * 2;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const scale = (H - padT - padB) / top;
  const col = (W - padL - padR) / data.length;
  const bw = Math.max(6, Math.min(36, col * 0.62));
  const showEvery = data.length > 10 ? Math.ceil(data.length / 8) : 1;
  const d = data[sel];
  return (
    <div className="chartbox" ref={ref}>
      {d && (
        <div className="readout" aria-live="polite">
          <b className="num">{totals[sel] ? format(totals[sel]) : '–'}</b>
          <span>{d.title}{d.note ? ` · ${d.note}` : ''}</span>
          {totals[sel] > 0 && (
            <span className="readout-rows">
              {series.map((s) => (
                <span key={s.key}><i style={{ background: s.color }} />{s.label} <b className="num">{format(d.values[s.key] ?? 0)}</b> <em className="num">{Math.round(((d.values[s.key] ?? 0) / totals[sel]) * 100)}%</em></span>
              ))}
            </span>
          )}
        </div>
      )}
      <svg width={W} height={H} className="chart2" role="group" aria-label={`Gestapelde grafiek in ${unit}`} tabIndex={0} onKeyDown={onKey}>
        {[0, step, top].map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 7} y={y(t) + 3.5} textAnchor="end" className="tick">{tickText(t)}</text>
          </g>
        ))}
        {data.map((v, i) => {
          const x = padL + i * col + (col - bw) / 2;
          let base = H - padB;
          const segs = series.map((s, si) => {
            const h = (v.values[s.key] ?? 0) * scale;
            if (h <= 0) return null;
            const isTop = series.slice(si + 1).every((n) => !(v.values[n.key] > 0));
            const yTop = base - h;
            const gap = isTop ? 0 : 2;
            const el = isTop
              ? <path key={s.key} d={barPath(x, yTop, bw, h)} fill={s.color} />
              : <rect key={s.key} x={x} y={yTop + gap} width={bw} height={Math.max(0, h - gap)} fill={s.color} />;
            base = yTop;
            return el;
          });
          return (
            <g key={i} className={'barg' + (i === sel ? ' sel' : '')} opacity={v.empty ? 0.3 : i === sel ? 1 : 0.78}>
              {segs}
              {i % showEvery === 0 && <text x={padL + i * col + col / 2} y={H - 6} textAnchor="middle" className={'tick' + (i === sel ? ' on' : '')}>{v.label}</text>}
              <rect x={padL + i * col} y={0} width={col} height={H} fill="transparent" onPointerEnter={() => setSel(i)} onClick={() => setSel(i)} aria-label={`${v.title}: ${format(totals[i])}`} />
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  );
}

export interface LinePoint {
  label: string;
  title: string;
  value: number | null;
  /** gemeten waarde (puntje), naast de gladde lijn */
  raw?: number | null;
}

/** Lijn met dradenkruis: beweeg of tik ergens in de grafiek, de dichtstbijzijnde datum wordt gekozen. */
export function TrendLine({ points, color = 'var(--brand)', goal, format, height = 170, goalLabel }: { points: LinePoint[]; color?: string; goal?: number; format: (v: number) => string; height?: number; goalLabel?: string }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const filled = points.map((p, i) => ({ ...p, i })).filter((p) => p.value !== null);
  const initial = filled.length ? filled[filled.length - 1].i : 0;
  const [sel, setSel, onKey] = useSelection(points.length, initial);
  const H = height, padL = 36, padR = 10, padB = 22, padT = 12;
  const vals = filled.map((p) => p.value as number).concat(filled.map((p) => p.raw ?? NaN).filter(Number.isFinite), goal !== undefined ? [goal] : []);
  if (!vals.length) return null;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 2) { lo -= 1; hi += 1; }
  const stepV = niceStep((hi - lo) / 2);
  lo = Math.floor(lo / stepV) * stepV;
  hi = Math.ceil(hi / stepV) * stepV;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += stepV) ticks.push(t);
  const x = (i: number) => padL + 8 + (points.length === 1 ? (W - padL - padR - 16) / 2 : (i * (W - padL - padR - 16)) / (points.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));
  const path = filled.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.value as number).toFixed(1)}`).join(' ');
  const showEvery = Math.max(1, Math.ceil(points.length / 7));
  const near = (px: number) => {
    let best = filled[0]?.i ?? 0;
    for (const p of filled) if (Math.abs(x(p.i) - px) < Math.abs(x(best) - px)) best = p.i;
    return best;
  };
  const cur = points[sel];
  return (
    <div className="chartbox" ref={ref}>
      {cur && <ChartReadout r={{ value: cur.value === null ? '–' : format(cur.value), title: cur.title, note: cur.raw != null && cur.value !== null && Math.abs(cur.raw - cur.value) >= 0.05 ? `gewogen ${format(cur.raw)}` : undefined }} />}
      <svg
        width={W} height={H} className="chart2" role="group" aria-label="Lijngrafiek, gebruik de pijltjestoetsen" tabIndex={0} onKeyDown={onKey}
        onPointerMove={(e) => setSel(near(e.clientX - e.currentTarget.getBoundingClientRect().left))}
        onClick={(e) => setSel(near(e.clientX - e.currentTarget.getBoundingClientRect().left))}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 7} y={y(t) + 3.5} textAnchor="end" className="tick">{tickText(t)}</text>
          </g>
        ))}
        {goal !== undefined && (
          <>
            <line x1={padL} x2={W - padR} y1={y(goal)} y2={y(goal)} className="target goal" />
            <text x={W - padR} y={y(goal) - 5} textAnchor="end" className="tick">{goalLabel ?? 'doel'}</text>
          </>
        )}
        {points.map((p, i) => p.raw != null && <circle key={'r' + i} cx={x(i)} cy={y(p.raw)} r={2.6} className="rawdot" />)}
        <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => i % showEvery === 0 && <text key={'l' + i} x={x(i)} y={H - 6} textAnchor="middle" className={'tick' + (i === sel ? ' on' : '')}>{p.label}</text>)}
        {cur && cur.value !== null && (
          <>
            <line x1={x(sel)} x2={x(sel)} y1={padT} y2={H - padB} className="crosshair" />
            <circle cx={x(sel)} cy={y(cur.value)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
      </svg>
    </div>
  );
}

/** Kleine rij balkjes zonder assen, bijv. water per dag in een venster. */
export function MiniBars({ data, color, target, format }: { data: BarDatum[]; color: string; target?: number; format: (v: number) => string }) {
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value));
  return (
    <div className="minibars" role="list">
      {data.map((d, i) => (
        <div key={i} className="minibar" role="listitem" aria-label={`${d.title}: ${format(d.value)}`}>
          <span className="minibar-v num">{d.value ? format(d.value) : '–'}</span>
          <span className="minibar-track">
            {target !== undefined && <i className="minibar-goal" style={{ bottom: `${(target / max) * 100}%` }} />}
            <b style={{ height: `${(d.value / max) * 100}%`, background: color, opacity: target !== undefined && d.value >= target ? 1 : 0.7 }} />
          </span>
          <span className="minibar-l">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
