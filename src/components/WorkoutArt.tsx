// Omslag van een workout: een getekend plaatje in de kleur van de categorie met het sportfiguurtje erop.
// Een echte foto (src/assets/workouts/<id>.webp) gaat voor; zie src/assets/workouts/README.md.
import { useState, type CSSProperties } from 'react';
import { EXERCISES } from '../data/exercises';
import { CAT_META, type WorkoutCat } from '../data/workouts';
import { Figure } from './Figure';

const PHOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/workouts/*.{webp,jpg,png}', { eager: true, query: '?url', import: 'default' })).map(
    ([path, url]) => [path.split('/').pop()!.replace(/\.(webp|jpg|png)$/, ''), url as string],
  ),
);
export const workoutPhoto = (id: string) => PHOTOS[id];

/** Vast patroon per workout, zodat elke kaart er net anders uitziet. */
function seeded(id: string) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function WorkoutArt({ id, cat, cover, animate = false, className = '' }: { id: string; cat: WorkoutCat; cover?: string; animate?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  const meta = CAT_META[cat];
  const photo = PHOTOS[id];
  const ex = EXERCISES[cover ?? ''] ?? EXERCISES.squat;
  const r = seeded(id);
  const big = { x: 70 + r() * 40, y: -10 + r() * 30, r: 38 + r() * 18 };
  const ring = { x: r() * 40, y: 60 + r() * 30, r: 16 + r() * 14 };
  const tilt = -35 + r() * 20;
  const style = { '--wa-from': meta.from, '--wa-to': meta.to } as CSSProperties;
  return (
    <div className={'woart ' + className} style={style}>
      {photo && !broken ? (
        <img src={photo} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : (
        <>
          <svg className="woart-bg" viewBox="0 0 120 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <defs>
              <linearGradient id={`wa-${id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={meta.from} />
                <stop offset="1" stopColor={meta.to} />
              </linearGradient>
            </defs>
            <rect width="120" height="100" fill={`url(#wa-${id})`} />
            <circle cx={big.x} cy={big.y} r={big.r} fill="#fff" opacity="0.08" />
            <circle cx={ring.x} cy={ring.y} r={ring.r} fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.12" />
            <g transform={`rotate(${tilt} 60 50)`} opacity="0.09">
              {[0, 1, 2].map((i) => <rect key={i} x={-20} y={62 + i * 9} width={160} height={3.5} fill="#fff" />)}
            </g>
            {Array.from({ length: 12 }, (_, i) => (
              <circle key={i} cx={8 + (i % 4) * 6} cy={8 + Math.floor(i / 4) * 6} r={0.9} fill="#fff" opacity="0.3" />
            ))}
          </svg>
          <div className="woart-fig"><Figure anim={ex.anim} still={!animate} /></div>
        </>
      )}
    </div>
  );
}
