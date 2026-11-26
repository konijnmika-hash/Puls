import { useRef, useState } from 'react';
import { sumNutrients } from '../lib/calc';
import { addDays, dateKey, dayTitle, fmt, parseKey } from '../lib/date';
import { backupJson, daysCsv, download, foodCsv, parseBackup, workoutsCsv } from '../lib/export';
import { useDay } from '../lib/hooks';
import { useStore, type PersistedData } from '../lib/store';
import { useUI } from '../lib/ui';
import { MEALS, type MealKey } from '../lib/types';
import { MEAL_META } from '../screens/Today';
import { I, Sheet, Stepper, toast } from './ui';

/** Datum kiezen met snelkeuzes en een kalenderveld. */
export function DatePick({ value, onChange, around }: { value: string; onChange: (d: string) => void; around: string }) {
  const today = dateKey();
  const quick = [...new Set([today, addDays(today, 1), addDays(today, -1), addDays(around, 1)])].filter((d) => d !== around).slice(0, 3);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="chips">
        {quick.map((d) => <button key={d} className={'chip sm' + (value === d ? ' on' : '')} onClick={() => onChange(d)}>{dayTitle(d).split(',')[0]}</button>)}
      </div>
      <input type="date" className="input" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Datum kiezen" />
    </div>
  );
}

/** Een maaltijd of een hele dag kopiëren naar een andere dag. */
export function CopySheet({ from, meal }: { from: string; meal?: MealKey }) {
  const close = useUI((s) => s.close);
  const day = useDay(from);
  const [to, setTo] = useState(() => (from === dateKey() ? addDays(from, 1) : dateKey()));
  const [toMeal, setToMeal] = useState<MealKey>(meal ?? 'ontbijt');
  const entries = meal ? day.meals[meal] : MEALS.flatMap((m) => day.meals[m]);
  const n = sumNutrients(entries);
  const go = () => {
    const s = useStore.getState();
    const count = meal ? s.copyMeal(from, to, meal, toMeal) : s.copyDay(from, to);
    if (count) toast(`${count} ${count === 1 ? 'product' : 'producten'} gekopieerd naar ${dayTitle(to).toLowerCase()}`);
    close();
  };
  return (
    <Sheet onClose={close} title={meal ? `${MEAL_META[meal].label} kopiëren` : 'Dag kopiëren'}>
      <div className="stack">
        <div className="card row">
          <div className="meal-icon" style={meal ? { background: MEAL_META[meal].tint, color: MEAL_META[meal].color } : { background: 'var(--surface-2)' }}>{meal ? MEAL_META[meal].icon() : <I.copy />}</div>
          <div className="grow">
            <b>{entries.length} {entries.length === 1 ? 'product' : 'producten'}</b>
            <div className="small muted num">{fmt(n.kcal)} kcal · {fmt(n.p)} g eiwit · van {dayTitle(from).toLowerCase()}</div>
          </div>
        </div>
        <div className="field"><span className="lbl">Naar welke dag?</span><DatePick value={to} onChange={setTo} around={from} /></div>
        {meal && (
          <div className="field">
            <span className="lbl">Bij welke maaltijd?</span>
            <div className="chips">{MEALS.map((m) => <button key={m} className={'chip sm' + (toMeal === m ? ' on' : '')} onClick={() => setToMeal(m)}>{MEAL_META[m].label}</button>)}</div>
          </div>
        )}
        {to === from && (!meal || toMeal === meal) && <span className="hint warn">Kies een andere dag of maaltijd.</span>}
        <button className="btn block" disabled={!entries.length || (to === from && (!meal || toMeal === meal))} onClick={go}>
          Kopiëren naar {dayTitle(to).toLowerCase()}
        </button>
        <p className="tiny" style={{ margin: 0 }}>Wat er al staat blijft staan; de producten komen erbij.</p>
      </div>
    </Sheet>
  );
}

const NOTE_TAGS = ['Goed geslapen', 'Slecht geslapen', 'Veel energie', 'Moe', 'Etentje buiten de deur', 'Feestje', 'Druk op werk', 'Niet lekker', 'Ongesteld', 'Spierpijn'];

export function NoteSheet({ date }: { date: string }) {
  const close = useUI((s) => s.close);
  const day = useDay(date);
  const [text, setText] = useState(day.note ?? '');
  const save = () => {
    useStore.getState().setNote(date, text.trim());
    toast(text.trim() ? 'Notitie opgeslagen' : 'Notitie verwijderd');
    close();
  };
  return (
    <Sheet onClose={close} title={`Notitie · ${dayTitle(date).toLowerCase()}`}>
      <div className="stack">
        <textarea className="input textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hoe ging je dag? Bijvoorbeeld hoe je sliep, hoe je je voelde of waarom je anders at." maxLength={2000} autoFocus aria-label="Notitie" />
        <div className="chips">
          {NOTE_TAGS.map((tag) => (
            <button key={tag} className="chip sm" onClick={() => setText((t) => (t.includes(tag) ? t : `${t.trim()}${t.trim() ? '. ' : ''}${tag}`))}>{tag}</button>
          ))}
        </div>
        <div className="row">
          {day.note && <button className="btn danger" onClick={() => { useStore.getState().setNote(date, ''); toast('Notitie verwijderd'); close(); }} aria-label="Notitie verwijderen"><I.trash /></button>}
          <button className="btn grow" onClick={save}>Opslaan</button>
        </div>
      </div>
    </Sheet>
  );
}

/** Alle wegingen: bekijken, aanpassen, verwijderen en een eerdere weging toevoegen. */
export function WeightHistorySheet() {
  const close = useUI((s) => s.close);
  const weights = useStore((s) => s.weights);
  const [edit, setEdit] = useState<string | null>(null);
  const [kg, setKg] = useState(70);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(addDays(dateKey(), -1));
  const list = [...weights].reverse();
  const save = (d: string, v: number) => {
    if (v < 30 || v > 300) return toast('Vul een gewicht tussen 30 en 300 kg in');
    useStore.getState().logWeight(d, Math.round(v * 10) / 10);
    toast(`${fmt(v, 1)} kg opgeslagen voor ${dayTitle(d).toLowerCase()}`);
    setEdit(null);
    setAdding(false);
  };
  return (
    <Sheet onClose={close} title="Wegingen">
      <div className="stack">
        {adding ? (
          <div className="card stack">
            <b>Eerdere weging toevoegen</b>
            <input type="date" className="input" value={date} max={dateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Datum van de weging" />
            <Stepper id="wh-new" value={kg} onChange={setKg} step={0.1} min={30} max={300} />
            <div className="row">
              <button className="btn ghost sm grow" onClick={() => setAdding(false)}>Annuleren</button>
              <button className="btn sm grow" disabled={date > dateKey()} onClick={() => save(date, kg)}>Opslaan</button>
            </div>
          </div>
        ) : (
          <button className="btn outline block sm" onClick={() => { setKg(weights.at(-1)?.kg ?? 70); setAdding(true); }}><span className="i18"><I.plus /></span> Eerdere weging toevoegen</button>
        )}
        <div className="card" style={{ padding: '2px 14px' }}>
          <div className="list">
            {list.map((w, i) => {
              const prev = list[i + 1];
              const diff = prev ? w.kg - prev.kg : 0;
              if (edit === w.date) {
                return (
                  <div key={w.date} className="item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div className="small" style={{ fontWeight: 700 }}>{dayTitle(w.date)}</div>
                    <Stepper id={`wh-${w.date}`} value={kg} onChange={setKg} step={0.1} min={30} max={300} />
                    <div className="row">
                      <button className="btn ghost sm grow" onClick={() => setEdit(null)}>Annuleren</button>
                      <button className="btn sm grow" onClick={() => save(w.date, kg)}>Opslaan</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={w.date} className="item">
                  <div className="grow">
                    <div className="t num">{fmt(w.kg, 1)} kg</div>
                    <div className="s">{parseKey(w.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  {prev && Math.abs(diff) >= 0.05 && <span className="tiny num">{diff > 0 ? '+' : ''}{fmt(diff, 1)}</span>}
                  {confirm === w.date ? (
                    <button className="btn sm danger" onClick={() => { useStore.getState().deleteWeight(w.date); setConfirm(null); toast('Weging verwijderd'); }}>Wis</button>
                  ) : (
                    <>
                      <button className="iconbtn" onClick={() => { setKg(w.kg); setEdit(w.date); }} aria-label={`Weging van ${dayTitle(w.date)} aanpassen`}><I.pencil /></button>
                      {weights.length > 1 && <button className="iconbtn" onClick={() => setConfirm(w.date)} aria-label={`Weging van ${dayTitle(w.date)} verwijderen`}><I.trash /></button>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p className="tiny" style={{ margin: 0 }}>Je laatste weging is je huidige gewicht; daar rekent Puls je doelen mee uit.</p>
      </div>
    </Sheet>
  );
}

const stamp = () => dateKey();

/** Gegevens exporteren, back-up maken en terugzetten. */
export function DataSheet() {
  const close = useUI((s) => s.close);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: PersistedData; days: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = () => {
    const { days, weights, profile, workoutLog } = useStore.getState();
    return { days, weights, profile, workoutLog };
  };
  const snapshot = (): PersistedData => {
    const s = useStore.getState();
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') out[k] = v;
    return out as unknown as PersistedData;
  };
  const read = async (file?: File) => {
    setError(null);
    if (!file) return;
    if (file.size > 30_000_000) return setError('Dit bestand is te groot voor een back-up van Puls.');
    const r = parseBackup(await file.text());
    if (!r.ok) return setError(r.error);
    setPending({ data: r.data, days: r.days, name: file.name });
  };
  const days = Object.keys(useStore.getState().days).length;
  return (
    <Sheet onClose={close} title="Je gegevens">
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>Al je gegevens staan alleen op dit apparaat ({days} {days === 1 ? 'dag' : 'dagen'} in je dagboek). Maak af en toe een back-up, zeker voordat je van telefoon wisselt.</p>

        <div className="section-title" style={{ marginTop: 0 }}><h2 style={{ fontSize: 17 }}>Exporteren voor Excel</h2></div>
        <div className="card" style={{ padding: '2px 14px' }}>
          <div className="list">
            <button className="item" onClick={() => download(`puls-voeding-${stamp()}.csv`, foodCsv(state().days), 'text/csv;charset=utf-8')}>
              <div className="ico"><span className="i20"><I.apple /></span></div>
              <div className="grow"><div className="t">Voedingsdagboek</div><div className="s">Elk product met maaltijd, hoeveelheid en voedingswaarden</div></div>
              <span className="i20"><I.download /></span>
            </button>
            <button className="item" onClick={() => download(`puls-dagen-${stamp()}.csv`, daysCsv(state()), 'text/csv;charset=utf-8')}>
              <div className="ico"><span className="i20"><I.calendar /></span></div>
              <div className="grow"><div className="t">Dagoverzicht</div><div className="s">Totalen per dag: eten, water, stappen, sport, gewicht en notities</div></div>
              <span className="i20"><I.download /></span>
            </button>
            <button className="item" onClick={() => download(`puls-trainingen-${stamp()}.csv`, workoutsCsv(state()), 'text/csv;charset=utf-8')}>
              <div className="ico"><span className="i20"><I.dumbbell /></span></div>
              <div className="grow"><div className="t">Trainingen</div><div className="s">Alle sets met gewicht en herhalingen, plus je sport</div></div>
              <span className="i20"><I.download /></span>
            </button>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 4 }}><h2 style={{ fontSize: 17 }}>Back-up</h2></div>
        <div className="card stack">
          <button className="btn block" onClick={() => { download(`puls-backup-${stamp()}.json`, backupJson(snapshot()), 'application/json'); toast('Back-up gedownload'); }}>
            <span className="i20"><I.download /></span> Back-up downloaden
          </button>
          <button className="btn outline block" onClick={() => fileRef.current?.click()}>
            <span className="i20"><I.upload /></span> Back-up terugzetten
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { read(e.target.files?.[0]); e.target.value = ''; }} />
          {error && <div className="hint warn" role="alert">{error}</div>}
          {pending && (
            <div className="health-note stop">
              <b>Alles vervangen door deze back-up?</b>
              <p>{pending.name}: {pending.days} {pending.days === 1 ? 'dag' : 'dagen'} in het dagboek. Wat nu in Puls staat wordt overschreven. Download eerst een back-up als je twijfelt.</p>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn ghost sm grow" onClick={() => setPending(null)}>Annuleren</button>
                <button className="btn danger sm grow" onClick={() => { useStore.getState().restore(pending.data); toast('Back-up teruggezet'); setPending(null); close(); }}>Ja, terugzetten</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
