import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY_LABEL, CATEGORY_ORDER, FOODS, searchFoods, sortForCategory, type Food, type FoodCategory } from '../data/foods';
import { energySplit, skipsMeal } from '../lib/calc';
import { fmt } from '../lib/date';
import { dayTotals, useDay, useTargets } from '../lib/hooks';
import { lookupBarcode, searchOff } from '../lib/openfoodfacts';
import { CAMERA_HELP, cameraAllowedHere, cameraProblem, decodeFile, getDecoder, inFrame, type CameraProblem } from '../lib/barcode';
import { recipeFoods } from '../lib/recipes';
import { newId, useStore, type SavedMeal } from '../lib/store';
import { useUI } from '../lib/ui';
import { MEALS, type FoodEntry, type MealKey } from '../lib/types';
import { MEAL_META } from '../screens/Today';
import { FoodIcon } from './FoodIcon';
import { I, NumField, Sheet, toast } from './ui';

type View = { kind: 'search' } | { kind: 'detail'; food: Food } | { kind: 'quick' } | { kind: 'custom' } | { kind: 'scan' };

interface Added {
  id: string;
  meal: MealKey;
  name: string;
  kcal: number;
}

/** Eerste portie van een product, of 100 g/ml als er geen portie is. */
const firstPortion = (f: Food) => {
  const p = f.portions[0];
  return p ? { grams: p.g, label: `1 ${p.label}` } : { grams: 100, label: `100 ${f.unit}` };
};

export function AddFoodSheet({ meal: initialMeal }: { meal: MealKey }) {
  const close = useUI((s) => s.close);
  const date = useUI((s) => s.date);
  const [meal, setMeal] = useState<MealKey>(initialMeal);
  const [view, setView] = useState<View>({ kind: 'search' });
  // alles wat je in deze sessie toevoegt: zo kun je een hele maaltijd achter elkaar invullen
  const [added, setAdded] = useState<Added[]>([]);

  const add = (food: Food, grams: number, label: string) => {
    const id = useStore.getState().addFood(date, meal, food, grams, label);
    setAdded((a) => [...a, { id, meal, name: food.name, kcal: (food.kcal * grams) / 100 }]);
    setView({ kind: 'search' });
    toast(`${food.name} toegevoegd`);
  };
  const undo = () => {
    const last = added[added.length - 1];
    if (!last) return;
    useStore.getState().removeEntry(date, last.meal, last.id);
    setAdded((a) => a.slice(0, -1));
    toast(`${last.name} weer weggehaald`);
  };

  const title =
    view.kind === 'detail' ? 'Hoeveel?' : view.kind === 'quick' ? 'Snel toevoegen' : view.kind === 'custom' ? 'Nieuw product' : view.kind === 'scan' ? 'Barcode scannen' : 'Eten toevoegen';
  const back = view.kind !== 'search' ? (
    <button className="iconbtn" onClick={() => setView({ kind: 'search' })} aria-label="Terug"><I.left /></button>
  ) : null;
  const total = added.reduce((s, a) => s + a.kcal, 0);

  return (
    <Sheet onClose={close} full title={<span className="row" style={{ gap: 10 }}>{back}{title}</span>}>
      <div className="chips scroll" style={{ marginBottom: 14 }} role="radiogroup" aria-label="Maaltijd">
        {MEALS.map((m) => (
          <button key={m} role="radio" aria-checked={m === meal} className={'chip' + (m === meal ? ' on' : '')} onClick={() => setMeal(m)}>{MEAL_META[m].label}</button>
        ))}
      </div>
      {view.kind === 'search' && <SearchView meal={meal} onPick={(food) => setView({ kind: 'detail', food })} onQuick={(f) => { const p = firstPortion(f); add(f, p.grams, p.label); }} onView={setView} onMealLogged={(n, kcal) => { setAdded((a) => [...a, { id: '', meal, name: n, kcal }]); }} />}
      {view.kind === 'detail' && <FoodDetail food={view.food} meal={meal} onAdd={add} />}
      {view.kind === 'quick' && <QuickAdd meal={meal} onAdd={add} />}
      {view.kind === 'custom' && <CustomFood onSaved={(food) => setView({ kind: 'detail', food })} />}
      {view.kind === 'scan' && <Scanner onFound={(food) => setView({ kind: 'detail', food })} />}

      {added.length > 0 && view.kind === 'search' && (
        <div className="basket" role="status">
          <div className="grow" style={{ minWidth: 0 }}>
            <b className="num">{added.length} toegevoegd · {fmt(total)} kcal</b>
            <div className="small ellipsis">{added.map((a) => a.name).join(', ')}</div>
          </div>
          {added[added.length - 1].id && <button className="btn sm ghost" onClick={undo}>Ongedaan</button>}
          <button className="btn sm" onClick={close}>Klaar</button>
        </div>
      )}
    </Sheet>
  );
}

type Tab = 'recent' | 'fav' | 'meals' | 'cat';

function SearchView({ meal, onPick, onQuick, onView, onMealLogged }: { meal: MealKey; onPick: (f: Food) => void; onQuick: (f: Food) => void; onView: (v: View) => void; onMealLogged: (name: string, kcal: number) => void }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [cat, setCat] = useState<FoodCategory | 'recept' | null>(null);
  const [online, setOnline] = useState<{ state: 'idle' | 'loading' | 'done' | 'error'; items: Food[] }>({ state: 'idle', items: [] });
  const recent = useStore((s) => s.recent);
  const favIds = useStore((s) => s.favorites);
  const custom = useStore((s) => s.customFoods);
  const premium = useStore((s) => s.premium);
  const open = useUI((s) => s.open);
  const light = useStore((s) => !!s.recipePrefs.light);
  const all = useMemo(() => [...custom, ...recipeFoods(), ...FOODS], [custom, light]); // eslint-disable-line react-hooks/exhaustive-deps
  // wat je vaak gebruikt en je favorieten komen eerder in de zoekresultaten
  const boost = useMemo(() => {
    const rank = new Map(recent.map((f, i) => [f.id, 40 - i]));
    const fav = new Set(favIds);
    return (f: Food) => (rank.get(f.id) ?? 0) + (fav.has(f.id) ? 30 : 0);
  }, [recent, favIds]);
  const local = useMemo(() => searchFoods(q, [...recent, ...all], 40, boost), [q, all, recent, boost]);
  const favs = useMemo(() => {
    const byId = new Map([...all, ...recent].map((f) => [f.id, f]));
    return favIds.map((id) => byId.get(id)).filter((f): f is Food => !!f);
  }, [favIds, all, recent]);
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const f of all) c.set(f.cat, (c.get(f.cat) ?? 0) + 1);
    return c;
  }, [all]);

  useEffect(() => {
    if (q.trim().length < 3) {
      setOnline({ state: 'idle', items: [] });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setOnline((o) => ({ ...o, state: 'loading' }));
      searchOff(q, ctrl.signal)
        .then((items) => setOnline({ state: 'done', items }))
        .catch(() => !ctrl.signal.aborted && setOnline({ state: 'error', items: [] }));
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const list = q ? local : tab === 'recent' ? recent : tab === 'fav' ? favs : tab === 'cat' && cat ? sortForCategory(all.filter((f) => f.cat === cat)) : [];

  return (
    <div className="stack">
      <div className="search">
        <I.search />
        <input id="food-search" className="input" placeholder={`Zoek in ${fmt(FOODS.length)} producten en recepten…`} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" enterKeyHint="search" aria-label={`Zoek eten voor ${MEAL_META[meal].label.toLowerCase()}`} />
        {q && <button className="search-clear" onClick={() => setQ('')} aria-label="Zoekveld leegmaken"><I.close /></button>}
      </div>
      {!q && (
        <div className="quickrow">
          <button className="quickbtn" onClick={() => (premium ? onView({ kind: 'scan' }) : open({ type: 'premium', reason: 'De barcodescanner zit in Puls Premium.' }))}>
            <span className="i20"><I.barcode /></span>Scannen
          </button>
          <button className="quickbtn" onClick={() => onView({ kind: 'quick' })}><span className="i20"><I.bolt /></span>Alleen kcal</button>
          <button className="quickbtn" onClick={() => onView({ kind: 'custom' })}><span className="i20"><I.pencil /></span>Nieuw product</button>
        </div>
      )}

      {!q && (
        <div className="seg seg-wide" role="tablist">
          {([['recent', 'Recent'], ['fav', 'Favorieten'], ['meals', 'Maaltijden'], ['cat', 'Categorieën']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setCat(null); }}>{l}</button>
          ))}
        </div>
      )}

      {!q && tab === 'cat' && !cat && (
        <div className="catgrid">
          {CATEGORY_ORDER.map((c) => (
            <button key={c} className="cattile" onClick={() => setCat(c)}>
              <FoodIcon cat={c} size={38} />
              <span className="grow">
                <span className="cattile-name">{CATEGORY_LABEL[c]}</span>
                <span className="cattile-n num">{counts.get(c) ?? 0}</span>
              </span>
            </button>
          ))}
          <button className="cattile" onClick={() => setCat('recept')}>
            <FoodIcon cat="recept" size={38} />
            <span className="grow"><span className="cattile-name">Recepten van Puls</span><span className="cattile-n num">{counts.get('recept') ?? 0}</span></span>
          </button>
        </div>
      )}
      {!q && tab === 'cat' && cat && (
        <button className="tag" style={{ alignSelf: 'flex-start' }} onClick={() => setCat(null)}>← {cat === 'recept' ? 'Recepten van Puls' : CATEGORY_LABEL[cat]}</button>
      )}

      {!q && tab === 'meals' && <SavedMeals meal={meal} onLogged={onMealLogged} />}

      {list.length > 0 && (
        <div className="card" style={{ padding: '2px 12px' }}>
          <FoodList foods={list} onPick={onPick} onQuick={onQuick} />
        </div>
      )}

      {!q && list.length === 0 && (tab === 'recent' || tab === 'fav') && (
        <div className="empty">
          <p>{tab === 'fav' ? 'Tik op het hartje bij een product om het hier te bewaren.' : `Zoek in ${fmt(FOODS.length)} basisproducten, ${recipeFoods().length} recepten en miljoenen merkproducten.`}</p>
          <div className="chips" style={{ justifyContent: 'center' }}>
            {['Havermout', 'Banaan', 'Kipfilet', 'Skyr', 'Pindakaas', 'Broodje'].map((s) => (
              <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {q && (
        <>
          {local.length === 0 && online.state !== 'loading' && online.items.length === 0 && (
            <div className="empty">
              <p>Niets gevonden voor “{q}” in de basisdatabase.</p>
              <button className="btn sm" onClick={() => onView({ kind: 'custom' })}>Maak “{q}” zelf aan</button>
            </div>
          )}
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2 style={{ fontSize: 16 }}>Merkproducten</h2>
            <span className="tiny">Open Food Facts</span>
          </div>
          {online.state === 'loading' && <div className="small muted">Zoeken in de online database…</div>}
          {online.state === 'idle' && <div className="small muted">Typ minstens 3 letters om ook online te zoeken.</div>}
          {online.state === 'error' && <div className="small muted">Online zoeken lukt nu niet. Controleer je verbinding; de basisdatabase werkt gewoon offline.</div>}
          {online.state === 'done' && online.items.length === 0 && <div className="small muted">Geen merkproducten gevonden.</div>}
          {online.items.length > 0 && (
            <div className="card" style={{ padding: '2px 12px' }}>
              <FoodList foods={online.items} onPick={onPick} onQuick={onQuick} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FoodList({ foods, onPick, onQuick }: { foods: Food[]; onPick: (f: Food) => void; onQuick: (f: Food) => void }) {
  return (
    <div className="list">
      {foods.map((f) => {
        const p = firstPortion(f);
        const k = p.grams / 100;
        return (
          <div key={f.id} className="frow">
            <button className="frow-main" onClick={() => onPick(f)}>
              <FoodIcon cat={f.cat} />
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="t ellipsis">{f.name}</span>
                <span className="s ellipsis num">
                  {f.brand ? `${f.brand} · ` : ''}
                  {f.portions[0] ? `${p.label} (${f.portions[0].g} ${f.unit})` : p.label} · {fmt(f.kcal * k)} kcal{f.p * k >= 1 ? ` · ${fmt(f.p * k)} g eiwit` : ''}
                </span>
              </span>
            </button>
            <button className="frow-add" onClick={() => onQuick(f)} aria-label={`${f.name} toevoegen (${p.label})`}><I.plus /></button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Eigen maaltijden ---------- */

function SavedMeals({ meal, onLogged }: { meal: MealKey; onLogged: (name: string, kcal: number) => void }) {
  const saved = useStore((s) => s.savedMeals);
  const date = useUI((s) => s.date);
  const [confirm, setConfirm] = useState<string | null>(null);
  const sorted = useMemo(() => [...saved].sort((a, b) => Number(b.meal === meal) - Number(a.meal === meal) || b.used - a.used), [saved, meal]);
  if (!saved.length) {
    return (
      <div className="empty card">
        <b>Nog geen eigen maaltijden</b>
        <p className="small" style={{ margin: '6px 0 0' }}>Eet je vaak hetzelfde? Vul het één keer in en tik in je dagboek bij die maaltijd op <b>Bewaren</b>. Daarna voeg je alles in één tik toe.</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: '2px 12px' }}>
      <div className="list">
        {sorted.map((m) => {
          const n = savedTotals(m);
          return (
            <div key={m.id} className="frow">
              <button
                className="frow-main"
                onClick={() => {
                  useStore.getState().logSavedMeal(date, meal, m.id);
                  onLogged(m.name, n.kcal);
                  toast(`${m.name} toegevoegd aan ${MEAL_META[meal].label.toLowerCase()}`);
                }}
              >
                <span className="foodicon" style={{ width: 40, height: 40, color: MEAL_META[m.meal].color, background: MEAL_META[m.meal].tint }}><span className="i20">{MEAL_META[m.meal].icon()}</span></span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="t ellipsis">{m.name}</span>
                  <span className="s ellipsis num">{m.items.length} {m.items.length === 1 ? 'product' : 'producten'} · {fmt(n.kcal)} kcal · {fmt(n.p)} g eiwit</span>
                </span>
              </button>
              {confirm === m.id ? (
                <button className="btn sm danger" onClick={() => { useStore.getState().deleteSavedMeal(m.id); setConfirm(null); toast('Maaltijd verwijderd'); }}>Wis</button>
              ) : (
                <button className="iconbtn" onClick={() => setConfirm(m.id)} aria-label={`${m.name} verwijderen`}><I.trash /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const savedTotals = (m: SavedMeal) =>
  m.items.reduce((s, i) => ({ kcal: s.kcal + (i.food.kcal * i.grams) / 100, p: s.p + (i.food.p * i.grams) / 100 }), { kcal: 0, p: 0 });

/* ---------- Hoeveelheid ---------- */

/** Portiekeuze, gedeeld door "toevoegen" en "wijzigen". */
function usePortion(food: Food, initialGrams?: number) {
  const units = [...food.portions, { label: food.unit === 'ml' ? 'ml' : 'gram', g: 1 }];
  const init = (() => {
    if (initialGrams === undefined) return { unit: 0, amount: food.portions.length ? 1 : 100 };
    const i = food.portions.findIndex((p) => Math.abs(initialGrams / p.g - Math.round((initialGrams / p.g) * 2) / 2) < 0.01);
    return i >= 0 ? { unit: i, amount: initialGrams / food.portions[i].g } : { unit: units.length - 1, amount: initialGrams };
  })();
  const [unit, setUnit] = useState(init.unit);
  const [amount, setAmount] = useState(init.amount);
  const u = units[unit];
  const grams = Math.round(amount * u.g * 10) / 10;
  const isRaw = u.g === 1;
  const label = isRaw ? `${fmt(grams)} ${food.unit}` : `${fmt(amount, 2)} × ${u.label} (${fmt(grams)} ${food.unit})`;
  return { units, unit, setUnit: (i: number) => { setUnit(i); setAmount(units[i].g === 1 ? Math.round(grams) || 100 : 1); }, amount, setAmount, grams, label, isRaw };
}

function PortionEditor({ food, ps }: { food: Food; ps: ReturnType<typeof usePortion> }) {
  const step = ps.isRaw ? (food.unit === 'ml' ? 50 : 10) : 0.5;
  const quick = ps.isRaw ? (food.unit === 'ml' ? [100, 200, 250, 330, 500] : [25, 50, 100, 150, 200]) : [0.5, 1, 1.5, 2, 3];
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="chips">
        {ps.units.map((u, i) => (
          <button key={u.label} className={'chip' + (i === ps.unit ? ' on' : '')} onClick={() => ps.setUnit(i)}>
            {u.g === 1 ? u.label : `${u.label} · ${u.g} ${food.unit}`}
          </button>
        ))}
      </div>
      <div className="stepper">
        <button onClick={() => ps.setAmount(Math.max(step, Math.round((ps.amount - step) * 100) / 100))} aria-label="Minder">−</button>
        <NumField id="portion-amount" className="input num" value={ps.amount} onValue={ps.setAmount} aria-label="Hoeveelheid" />
        <button onClick={() => ps.setAmount(Math.round((ps.amount + step) * 100) / 100)} aria-label="Meer">+</button>
      </div>
      <div className="amounts" role="group" aria-label="Snel kiezen">
        {quick.map((v) => (
          <button key={v} className={ps.amount === v ? 'on' : ''} onClick={() => ps.setAmount(v)}>{ps.isRaw ? fmt(v) : v === 0.5 ? '½' : v === 1.5 ? '1½' : v}</button>
        ))}
      </div>
    </div>
  );
}

/** Voedingswaarden van een hoeveelheid, met verdeling van de energie en wat het is van je dagdoel. */
export function NutritionCard({ food, grams }: { food: Food; grams: number }) {
  const t = useTargets();
  const k = grams / 100;
  const n = { kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k, fib: food.fib === undefined ? undefined : food.fib * k };
  const split = energySplit(n);
  const rows: { name: string; v: number | undefined; goal?: number; color: string }[] = [
    { name: 'Eiwit', v: n.p, goal: t?.p, color: 'var(--protein)' },
    { name: 'Koolhydraten', v: n.c, goal: t?.c, color: 'var(--carb)' },
    { name: 'Vet', v: n.f, goal: t?.f, color: 'var(--fat)' },
    { name: 'Vezels', v: n.fib, goal: t?.fib, color: 'var(--fiber)' },
  ];
  return (
    <div className="card nut">
      <div className="nut-top">
        <div>
          <div className="nut-kcal num">{fmt(n.kcal)}</div>
          <div className="tiny">kcal{t ? ` · ${fmt((n.kcal / t.kcal) * 100)}% van je dag` : ''}</div>
        </div>
        {n.kcal > 0 && (
          <div className="nut-split" aria-label="Energie uit eiwit, koolhydraten en vet">
            <div className="splitbar">
              <i style={{ width: `${split.p * 100}%`, background: 'var(--protein)' }} />
              <i style={{ width: `${split.c * 100}%`, background: 'var(--carb)' }} />
              <i style={{ width: `${split.f * 100}%`, background: 'var(--fat)' }} />
            </div>
            <div className="tiny num">E {fmt(split.p * 100)}% · K {fmt(split.c * 100)}% · V {fmt(split.f * 100)}%</div>
          </div>
        )}
      </div>
      <div className="nut-rows">
        {rows.map((r) => (
          <div key={r.name} className="nut-row">
            <span className="nut-dot" style={{ background: r.color }} />
            <span className="grow">{r.name}</span>
            <b className="num">{r.v === undefined ? 'onbekend' : `${fmt(r.v, r.v < 10 ? 1 : 0)} g`}</b>
            {r.goal && r.v !== undefined ? <span className="nut-pct num">{fmt((r.v / r.goal) * 100)}%</span> : <span className="nut-pct" />}
          </div>
        ))}
      </div>
      <div className="tiny num" style={{ marginTop: 8 }}>Per 100 {food.unit}: {fmt(food.kcal)} kcal · E {fmt(food.p, 1)} · K {fmt(food.c, 1)} · V {fmt(food.f, 1)}{food.fib !== undefined ? ` · vezels ${fmt(food.fib, 1)}` : ''} g</div>
    </div>
  );
}

function FoodDetail({ food, meal, onAdd }: { food: Food; meal: MealKey; onAdd: (food: Food, grams: number, label: string) => void }) {
  const date = useUI((s) => s.date);
  const { toggleFavorite } = useStore.getState();
  const fav = useStore((s) => s.favorites.includes(food.id));
  const t = useTargets();
  const day = useDay(date);
  const ps = usePortion(food);
  const kcal = (food.kcal * ps.grams) / 100;
  const left = t ? Math.round(t.kcal - dayTotals(day).eaten.kcal - kcal) : 0;
  return (
    <div className="stack">
      <div className="fd-head">
        <FoodIcon cat={food.cat} size={48} />
        <div className="grow" style={{ minWidth: 0 }}>
          <h2 className="fd-name">{food.name}</h2>
          <div className="small muted">{food.brand ?? CATEGORY_LABEL[food.cat]}</div>
        </div>
        <button className="iconbtn" style={{ color: fav ? 'var(--protein)' : undefined }} onClick={() => toggleFavorite(food.id)} aria-label={fav ? 'Uit favorieten' : 'Aan favorieten toevoegen'} aria-pressed={fav}>
          <I.heart filled={fav} />
        </button>
      </div>
      <PortionEditor food={food} ps={ps} />
      <NutritionCard food={food} grams={ps.grams} />
      {t && <p className="small muted" style={{ margin: 0 }}>Hierna heb je vandaag nog <b className="num" style={{ color: left < 0 ? 'var(--protein)' : 'var(--ink)' }}>{left < 0 ? `${fmt(-left)} kcal te veel` : `${fmt(left)} kcal`}</b>{left >= 0 ? ' over' : ''}.</p>}
      <button className="btn block" disabled={ps.grams <= 0} onClick={() => onAdd(food, ps.grams, ps.label)}>
        Toevoegen aan {MEAL_META[meal].label.toLowerCase()} <span className="btn-sub num">{fmt(kcal)} kcal</span>
      </button>
    </div>
  );
}

export function EditEntrySheet({ meal, entryId }: { meal: MealKey; entryId: string }) {
  const { date, close } = useUI();
  const entry = useStore((s) => s.days[date]?.meals[meal].find((e) => e.id === entryId));
  if (!entry) return null;
  return <EditEntryInner meal={meal} date={date} entry={entry} close={close} />;
}

function EditEntryInner({ meal, date, entry, close }: { meal: MealKey; date: string; entry: FoodEntry; close: () => void }) {
  const ps = usePortion(entry.food, entry.grams);
  const { updateEntry, removeEntry } = useStore.getState();
  return (
    <Sheet onClose={close} title={entry.food.name}>
      <div className="stack">
        <div className="small muted">{MEAL_META[meal].label}{entry.food.brand ? ` · ${entry.food.brand}` : ''}</div>
        <PortionEditor food={entry.food} ps={ps} />
        <NutritionCard food={entry.food} grams={ps.grams} />
        <div className="row">
          <button className="btn danger" onClick={() => { removeEntry(date, meal, entry.id); toast('Verwijderd'); close(); }} aria-label="Verwijderen"><I.trash /></button>
          <button className="btn grow" onClick={() => { updateEntry(date, meal, entry.id, ps.grams, ps.label); toast('Opgeslagen'); close(); }}>Opslaan</button>
        </div>
      </div>
    </Sheet>
  );
}

/** Een maaltijd bewaren als eigen maaltijd. */
export function SaveMealSheet({ meal }: { meal: MealKey }) {
  const { date, close } = useUI();
  const day = useDay(date);
  const entries = day.meals[meal];
  const [name, setName] = useState(() => entries.slice(0, 2).map((e) => e.food.name.replace(/ \(.*\)$/, '')).join(' met ').toLowerCase().replace(/^./, (c) => c.toUpperCase()));
  const n = savedTotals({ id: '', name: '', meal, used: 0, items: entries });
  return (
    <Sheet onClose={close} title="Bewaren als maaltijd">
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>Deze {entries.length} {entries.length === 1 ? 'product komt' : 'producten komen'} onder <b>Eten toevoegen → Maaltijden</b>. Daarna log je ze in één tik.</p>
        <div className="field"><label htmlFor="sm-name">Naam</label><input id="sm-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. mijn vaste ontbijt" autoFocus /></div>
        <div className="card" style={{ padding: '4px 14px' }}>
          <div className="list">
            {entries.map((e) => (
              <div key={e.id} className="item">
                <FoodIcon cat={e.food.cat} size={34} />
                <div className="grow" style={{ minWidth: 0 }}><div className="t ellipsis">{e.food.name}</div><div className="s ellipsis">{e.label}</div></div>
                <b className="num small">{fmt((e.food.kcal * e.grams) / 100)}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="small muted num">Samen {fmt(n.kcal)} kcal · {fmt(n.p)} g eiwit</div>
        <button className="btn block" disabled={!name.trim() || !entries.length} onClick={() => { useStore.getState().saveMeal(name.trim(), meal, entries); toast(`“${name.trim()}” bewaard`); close(); }}>Bewaren</button>
      </div>
    </Sheet>
  );
}

const numIn = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function QuickAdd({ meal, onAdd }: { meal: MealKey; onAdd: (food: Food, grams: number, label: string) => void }) {
  const [name, setName] = useState('');
  const [v, setV] = useState({ kcal: '', p: '', c: '', f: '' });
  const kcal = numIn(v.kcal) || numIn(v.p) * 4 + numIn(v.c) * 4 + numIn(v.f) * 9;
  const t = useTargets();
  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>Weet je alleen de calorieën, bijvoorbeeld van een restaurant of een etiket? Vul ze hier direct in.</p>
      <div className="field"><label htmlFor="qa-name">Omschrijving (optioneel)</label><input id="qa-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. lunch op werk" /></div>
      <div className="field"><label htmlFor="qa-kcal">Calorieën (kcal)</label><input id="qa-kcal" className="input num" inputMode="decimal" value={v.kcal} onChange={(e) => setV({ ...v, kcal: e.target.value })} placeholder={kcal ? fmt(kcal) : '0'} /></div>
      {t && !skipsMeal(meal, t.split) && <div className="chips">{[100, 250, 400, 600].map((k) => <button key={k} className="chip sm" onClick={() => setV({ ...v, kcal: String(k) })}>{k} kcal</button>)}</div>}
      <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {(['c', 'p', 'f'] as const).map((k) => (
          <div key={k} className="field">
            <label htmlFor={`qa-${k}`}>{k === 'c' ? 'Koolh. (g)' : k === 'p' ? 'Eiwit (g)' : 'Vet (g)'}</label>
            <input id={`qa-${k}`} className="input num" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} placeholder="0" />
          </div>
        ))}
      </div>
      <button
        className="btn block" disabled={kcal <= 0}
        onClick={() => {
          const food: Food = { id: 'quick-' + newId(), name: name.trim() || 'Snel toegevoegd', cat: 'eigen', kcal: Math.round(kcal), p: numIn(v.p), c: numIn(v.c), f: numIn(v.f), unit: 'g', portions: [{ label: 'portie', g: 100 }], source: 'custom' };
          onAdd(food, 100, '1 portie');
        }}
      >
        Toevoegen
      </button>
    </div>
  );
}

function CustomFood({ onSaved }: { onSaved: (f: Food) => void }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [portion, setPortion] = useState('');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [v, setV] = useState({ kcal: '', p: '', c: '', f: '', fib: '' });
  const ok = name.trim() && numIn(v.kcal) > 0;
  const labels = { kcal: `kcal per 100 ${unit}`, c: 'Koolhydraten (g)', p: 'Eiwit (g)', f: 'Vet (g)', fib: 'Vezels (g)' } as const;
  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>Neem de waarden per 100 gram of 100 ml over van het etiket. Daarna staat het product altijd in je zoekresultaten.</p>
      <div className="field"><label htmlFor="cf-name">Productnaam</label><input id="cf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. eiwitpannenkoek" /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="cf-brand">Merk (optioneel)</label><input id="cf-brand" className="input" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
        <div className="field"><label htmlFor="cf-portion">Portie in {unit === 'g' ? 'gram' : 'ml'}</label><input id="cf-portion" className="input num" inputMode="decimal" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="bijv. 30" /></div>
      </div>
      <div className="seg" role="radiogroup" aria-label="Eenheid" style={{ alignSelf: 'flex-start' }}>
        <button role="radio" aria-checked={unit === 'g'} className={unit === 'g' ? 'on' : ''} onClick={() => setUnit('g')}>Vast (gram)</button>
        <button role="radio" aria-checked={unit === 'ml'} className={unit === 'ml' ? 'on' : ''} onClick={() => setUnit('ml')}>Drinken (ml)</button>
      </div>
      <div className="grid2">
        {(['kcal', 'c', 'p', 'f', 'fib'] as const).map((k) => (
          <div key={k} className="field">
            <label htmlFor={`cf-${k}`}>{labels[k]}</label>
            <input id={`cf-${k}`} className="input num" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} placeholder={k === 'fib' ? 'optioneel' : '0'} />
          </div>
        ))}
      </div>
      <button
        className="btn block" disabled={!ok}
        onClick={() => {
          const g = numIn(portion);
          const food: Food = {
            id: 'custom-' + newId(), name: name.trim(), brand: brand.trim() || undefined, cat: 'eigen', kcal: Math.round(numIn(v.kcal)), p: numIn(v.p), c: numIn(v.c), f: numIn(v.f),
            fib: v.fib.trim() ? numIn(v.fib) : undefined, unit, portions: g > 0 ? [{ label: 'portie', g }] : [], source: 'custom',
          };
          useStore.getState().addCustomFood(food);
          toast('Product opgeslagen');
          onSaved(food);
        }}
      >
        Opslaan en kiezen
      </button>
    </div>
  );
}

function Scanner({ onFound }: { onFound: (f: Food) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'starting' | 'live' | 'problem' | 'looking'>('starting');
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const busy = phase === 'looking';

  const lookup = async (c: string) => {
    setPhase('looking');
    setNote(`Barcode ${c} gevonden, product opzoeken…`);
    navigator.vibrate?.(30);
    try {
      const food = await lookupBarcode(c);
      if (food) return onFound(food);
      setNote(`Product ${c} staat nog niet in de database. Maak het zelf aan via “Eigen”.`);
    } catch {
      setNote(inFrame() ? 'In deze voorbeeldversie kan Puls de online productdatabase niet bereiken. Via de eigen link werkt het wel.' : 'Opzoeken lukt nu niet. Controleer je internetverbinding.');
    }
    setCode(c);
    setPhase(problem ? 'problem' : 'live');
  };

  // camera starten en blijven lezen tot er een barcode in beeld is
  useEffect(() => {
    let stream: MediaStream | undefined;
    let stop = false;
    setPhase('starting');
    setProblem(null);
    (async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !cameraAllowedHere()) throw new Error('geen camera hier');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stop) return;
        const v = videoRef.current;
        if (!v) throw new Error('geen videoveld');
        v.srcObject = stream;
        await v.play();
        setPhase('live');
        const dec = await getDecoder();
        while (!stop) {
          if (v.readyState >= 2) {
            const found = await dec.decode(v);
            if (found && !stop) {
              stop = true;
              lookup(found);
              break;
            }
          }
          await new Promise((r) => setTimeout(r, dec.kind === 'native' ? 250 : 120));
        }
      } catch (err) {
        if (stop) return;
        setProblem(cameraProblem(err));
        setPhase('problem');
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const fromPhoto = async (file?: File) => {
    if (!file) return;
    setNote('Foto lezen…');
    try {
      const c = await decodeFile(file);
      if (c) return lookup(c);
      setNote('Geen barcode gevonden op de foto. Zorg dat de streepjes scherp en recht in beeld zijn, of typ de cijfers in.');
    } catch {
      setNote('Deze foto kan niet worden geopend. Probeer een andere.');
    }
  };

  const help = problem ? CAMERA_HELP[problem] : null;

  return (
    <div className="stack">
      <div className="video-box" hidden={phase === 'problem'}>
        <video ref={videoRef} playsInline muted autoPlay />
        <div className={'frame' + (phase === 'live' ? ' scanning' : '')}><i /></div>
        {phase === 'starting' && <div className="video-note">Camera starten…</div>}
      </div>
      {phase === 'live' && !note && <div className="small muted" style={{ textAlign: 'center' }}>Houd de barcode in het kader. Scannen gaat vanzelf.</div>}
      {help && (
        <div className="cam-help" role="alert">
          <span className="cam-help-ico"><I.info /></span>
          <div>
            <b>{help.title}</b>
            <p>{help.text}</p>
            {problem !== 'blocked' && problem !== 'insecure' && problem !== 'nocamera' && <button className="btn sm" onClick={() => setAttempt((a) => a + 1)}>Opnieuw proberen</button>}
          </div>
        </div>
      )}
      {note && <div className="small" role="status" style={{ color: 'var(--ink-2)' }}>{note}</div>}

      <button className="btn ghost block" onClick={() => fileRef.current?.click()} disabled={busy}>
        <span className="i20"><I.camera /></span> Foto van de barcode
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { fromPhoto(e.target.files?.[0]); e.target.value = ''; }} />

      <div className="field">
        <label htmlFor="barcode">Of typ de cijfers onder de streepjes</label>
        <div className="row">
          <input id="barcode" className="input num grow" inputMode="numeric" placeholder="Bijv. 8710400035508" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && code.length >= 8 && lookup(code)} />
          <button className="btn sm" style={{ height: 52 }} disabled={code.length < 8 || busy} onClick={() => lookup(code)}>Zoek</button>
        </div>
      </div>
    </div>
  );
}
