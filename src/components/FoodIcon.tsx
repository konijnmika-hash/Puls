// Eigen iconen per voedingscategorie, in de stijl van de andere iconen (24px, lijn 2).
import type { ReactElement } from 'react';
import type { Food } from '../data/foods';

type Cat = Food['cat'];

export const CAT_COLOR: Record<Cat, string> = {
  brood: '#c08032',
  beleg: '#cf9420',
  zuivel: '#3f8fd4',
  vlees: '#d4574a',
  vega: '#3e9a55',
  granen: '#b3862a',
  groente: '#2e9a5e',
  fruit: '#e2506f',
  snack: '#9a6a3c',
  zoet: '#c2559b',
  drank: '#2b97e6',
  gerecht: '#e07a2f',
  afhaal: '#d9962a',
  saus: '#7b9a2e',
  online: '#6b7a72',
  eigen: '#7867ee',
  recept: '#1d7a4c',
};

const P = ({ children }: { children: ReactElement | ReactElement[] }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const ICONS: Record<Cat, () => ReactElement> = {
  brood: () => <P><path d="M6 20.5V11.6A4 4 0 0 1 8 4h8a4 4 0 0 1 2 7.6v8.9z" /><path d="M10 12h.01M14 14.5h.01M12.5 9.5h.01" /></P>,
  beleg: () => <P><path d="M3 18v-4.6L14.8 6 21 10.4V18z" /><path d="M3 13.4h18" /><circle cx="8" cy="15.8" r=".9" /><circle cx="15.2" cy="15.6" r="1.1" /></P>,
  zuivel: () => <P><path d="M9.5 3h5v2.8l2.2 3.4V20a1 1 0 0 1-1 1H8.3a1 1 0 0 1-1-1V9.2l2.2-3.4z" /><path d="M7.3 12.5h9.4" /></P>,
  vlees: () => <P><ellipse cx="14.6" cy="9.4" rx="6.2" ry="4.8" transform="rotate(-45 14.6 9.4)" /><path d="M10.3 13.7 7 17" /><circle cx="5.2" cy="17.4" r="1.6" /><circle cx="6.6" cy="18.8" r="1.6" /></P>,
  vega: () => <P><path d="M4.5 19.5C4.5 10 10 4.5 19.5 4.5c0 9.5-5.5 15-15 15z" /><path d="M4.5 19.5 13.5 10.5" /></P>,
  granen: () => <P><path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" /><path d="M8.5 9h.01M12 8h.01M15.5 9h.01M10.2 5.8h.01M13.8 5.8h.01" /></P>,
  groente: () => <P><path d="M16.8 7.2c-1.9-1.9-4.9-1.6-6.4-.1L4 17.6c-.5.7.3 1.5 1 1l10.6-6.4c1.5-1.5 3.1-3.1 1.2-5z" /><path d="M16.8 7.2 20 4M16.8 7.2l.6-3.7M16.8 7.2l3.7-.6M9.5 12.5l1.6 1.6M12.2 9.8l1.4 1.4" /></P>,
  fruit: () => <P><path d="M12 7c-1.5-1-5-1.5-6.5 1.5S5 16 7 19c1.2 1.8 2.7 2 5 1 2.3 1 3.8.8 5-1 2-3 2.5-7.5 1.5-10.5S13.5 6 12 7z" /><path d="M12 7c0-2 1-3.5 3-4" /></P>,
  snack: () => <P><path d="M12 3.5c4 2.5 6 6.5 5 11-.8 3.4-3 5.5-5 6-2-.5-4.2-2.6-5-6-1-4.5 1-8.5 5-11z" /><path d="M12 7.5v9" /></P>,
  zoet: () => <P><circle cx="12" cy="12" r="8.5" /><path d="M9 9h.01M14.5 8.5h.01M15.5 13.5h.01M10 15h.01M12.5 11.8h.01" /></P>,
  drank: () => <P><path d="M6 7.5h12l-1.2 12.6a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9z" /><path d="M12.5 7.5 14 3h3M6.6 12.5h10.8" /></P>,
  gerecht: () => <P><path d="M4 11h16v5.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5z" /><path d="M2.5 11h19M9 7.5c0-1 .8-1.4.8-2.5M12.4 7.5c0-1 .8-1.4.8-2.5M15.8 7.5c0-1 .8-1.4.8-2.5" /></P>,
  afhaal: () => <P><path d="M4 11.5a8 6.5 0 0 1 16 0z" /><path d="M3.5 14.6h17" /><path d="M5 17.6h14a2.6 2.6 0 0 1-2.6 2.6H7.6A2.6 2.6 0 0 1 5 17.6z" /></P>,
  saus: () => <P><path d="M11 2.5h2v3h-2z" /><path d="M9 5.5h6l1 3.2V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8.7z" /><path d="M8 13.5h8" /></P>,
  online: () => <P><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" /></P>,
  eigen: () => <P><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13 7l4 4" /></P>,
  recept: () => <P><path d="M7 14.5V20h10v-5.5M7 14.5a4 4 0 0 1-.6-7.9A5 5 0 0 1 12 3a5 5 0 0 1 5.6 3.6 4 4 0 0 1-.6 7.9H7zM7 17h10" /></P>,
};

/** Rond-vierkant tegeltje met het icoon van de categorie in de eigen kleur. */
export function FoodIcon({ cat, size = 40 }: { cat: Cat; size?: number }) {
  const Icon = ICONS[cat] ?? ICONS.eigen;
  const c = CAT_COLOR[cat] ?? CAT_COLOR.eigen;
  return (
    <span className="foodicon" style={{ width: size, height: size, color: c, background: `color-mix(in srgb, ${c} 15%, transparent)` }}>
      <Icon />
    </span>
  );
}
