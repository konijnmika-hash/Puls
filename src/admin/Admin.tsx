import { useCallback, useEffect, useState } from 'react';
import { euro, makeCode, PLANS } from '../lib/account';
import {
  adminStats, createCode, isAdmin, listCodes, nlError, online, sb, setCodeActive, signIn, signOut, type CodeRow, type Stats,
} from '../lib/backend';
import { demoCodes, demoStats } from './demo';

/* ---------- Thema ---------- */

type Theme = 'licht' | 'donker' | 'systeem';
const readTheme = (): Theme => {
  try {
    return (localStorage.getItem('puls-admin-theme') as Theme) || 'systeem';
  } catch {
    return 'systeem';
  }
};
function applyTheme(t: Theme) {
  const r = document.documentElement;
  if (t === 'systeem') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', t === 'donker' ? 'dark' : 'light');
  try {
    localStorage.setItem('puls-admin-theme', t);
  } catch {
    /* niet beschikbaar */
  }
}

function ThemeSwitch() {
  const [t, setT] = useState<Theme>(readTheme);
  useEffect(() => applyTheme(t), [t]);
  return (
    <div className="seg" role="group" aria-label="Weergave">
      {([['licht', 'Licht'], ['donker', 'Donker'], ['systeem', 'Auto']] as [Theme, string][]).map(([v, l]) => (
        <button key={v} className={t === v ? 'on' : ''} aria-pressed={t === v} onClick={() => setT(v)}>{l}</button>
      ))}
    </div>
  );
}

const nl = (n: number, d = 0) => n.toLocaleString('nl-NL', { maximumFractionDigits: d, minimumFractionDigits: d });
const money = (n: number) => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (iso: string) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
const shortWeek = (iso: string) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '');

/* ---------- App ---------- */

type Phase = { kind: 'loading' } | { kind: 'setup' } | { kind: 'login' } | { kind: 'denied'; email: string } | { kind: 'ready'; demo: boolean };

export function AdminApp() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  const check = useCallback(async () => {
    if (!online) return setPhase({ kind: 'setup' });
    const { data } = await sb().auth.getSession();
    if (!data.session) return setPhase({ kind: 'login' });
    try {
      if (await isAdmin()) setPhase({ kind: 'ready', demo: false });
      else setPhase({ kind: 'denied', email: data.session.user.email ?? '' });
    } catch (e) {
      setPhase({ kind: 'login' });
      console.warn(nlError(e));
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand"><span className="adm-dot" aria-hidden /> Puls <span>Beheer</span></div>
        <div className="row" style={{ gap: 8 }}>
          <ThemeSwitch />
          {phase.kind === 'ready' && !phase.demo && <button className="btn ghost sm" onClick={() => void signOut().then(check)}>Uitloggen</button>}
          {phase.kind === 'ready' && phase.demo && <button className="btn ghost sm" onClick={() => setPhase({ kind: 'setup' })}>Sluiten</button>}
        </div>
      </header>
      {phase.kind === 'loading' && <p className="muted">Laden…</p>}
      {phase.kind === 'setup' && <Setup onDemo={() => setPhase({ kind: 'ready', demo: true })} />}
      {phase.kind === 'login' && <Login onDone={check} />}
      {phase.kind === 'denied' && (
        <section className="card stack adm-narrow">
          <b>Geen toegang</b>
          <p className="small muted" style={{ margin: 0 }}>{phase.email} staat niet in de lijst met beheerders. Voeg je e-mailadres toe aan de tabel <code>admins</code> in Supabase (zie README).</p>
          <button className="btn ghost sm" onClick={() => void signOut().then(check)}>Ander account</button>
        </section>
      )}
      {phase.kind === 'ready' && <Dashboard demo={phase.demo} />}
    </div>
  );
}

function Setup({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="card stack adm-narrow">
      <h1 className="adm-h1">Nog niet verbonden</h1>
      <p className="muted" style={{ margin: 0 }}>
        Om te zien hoeveel mensen Puls kopen, moeten alle accounts en abonnementen op één plek staan. Daarvoor koppel je Puls aan een (gratis) Supabase-project. De stappen staan in de README onder <b>Server en beheer</b>.
      </p>
      <button className="btn" onClick={onDemo}>Bekijk met voorbeeldcijfers</button>
      <p className="tiny" style={{ margin: 0 }}>De voorbeeldcijfers zijn verzonnen, alleen om te zien hoe het eruitziet.</p>
    </section>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="card stack adm-narrow" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      setErr(null);
      try {
        await signIn(email.trim().toLowerCase(), pass);
        onDone();
      } catch (x) {
        setErr(nlError(x));
      } finally {
        setBusy(false);
      }
    }}>
      <h1 className="adm-h1">Inloggen</h1>
      <p className="small muted" style={{ margin: 0 }}>Met hetzelfde account als in de app. Alleen beheerders komen verder.</p>
      <label className="field"><span className="lbl">E-mailadres</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="field"><span className="lbl">Wachtwoord</span><input className="input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
      {err && <p className="form-err" role="alert">{err}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Even geduld…' : 'Inloggen'}</button>
    </form>
  );
}

/* ---------- Overzicht ---------- */

function Dashboard({ demo }: { demo: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      if (demo) {
        setStats(demoStats());
        setCodes((c) => (c.length ? c : demoCodes()));
      } else {
        const [s, c] = await Promise.all([adminStats(), listCodes()]);
        setStats(s);
        setCodes(c);
      }
      setAt(new Date());
    } catch (e) {
      setErr(nlError(e));
    }
  }, [demo]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  if (err) return <section className="card adm-narrow"><p className="form-err">{err}</p><button className="btn ghost sm" onClick={() => void load()}>Opnieuw</button></section>;
  if (!stats) return <p className="muted">Cijfers laden…</p>;

  const paying = stats.monthly + stats.yearly;
  const mrr = stats.monthly * PLANS.maand.price + stats.yearly * (PLANS.jaar.price / 12);
  const conversion = stats.accounts ? (stats.buyers / stats.accounts) * 100 : 0;

  return (
    <main className="stack adm-main">
      {demo && <div className="adm-demo">Voorbeeldcijfers: verzonnen, niet echt. Koppel de server om je echte cijfers te zien.</div>}
      <div className="row between">
        <h1 className="adm-h1">Overzicht</h1>
        <span className="tiny">{at ? `Bijgewerkt ${at.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : ''} · <button className="link" onClick={() => void load()}>Vernieuwen</button></span>
      </div>

      <section className="adm-hero card">
        <div>
          <div className="label-cap">Betalende abonnees</div>
          <div className="adm-big num">{nl(paying)}</div>
          <div className="small muted">{nl(stats.monthly)} per maand · {nl(stats.yearly)} per jaar{stats.cancelled ? ` · ${nl(stats.cancelled)} opgezegd (lopen nog)` : ''}</div>
        </div>
        <div className="adm-split" aria-label="Verdeling maand en jaar">
          <SplitBar a={stats.monthly} b={stats.yearly} />
        </div>
      </section>

      <div className="adm-tiles">
        <Tile label="Maandabonnementen" value={nl(stats.monthly)} sub={`${euro(PLANS.maand.price)} per maand`} />
        <Tile label="Jaarabonnementen" value={nl(stats.yearly)} sub={`${euro(PLANS.jaar.price)} per jaar`} />
        <Tile label="Gratis via code" value={nl(stats.friends)} sub="Voor altijd gratis" />
        <Tile label="Mensen die kochten" value={nl(stats.buyers)} sub={`${nl(conversion, 1)}% van alle accounts`} />
        <Tile label="Omzet per maand" value={money(mrr)} sub="Terugkerend, jaar ÷ 12" />
        <Tile label="Omzet laatste 30 dagen" value={money(stats.revenue30)} sub={`Totaal ${money(stats.revenue)}`} />
        <Tile label="Accounts" value={nl(stats.accounts)} sub={`${nl(stats.inTrial)} nu in proefperiode`} />
        <Tile label="Proef voorbij, niet gekocht" value={nl(stats.expired)} sub="Zien nu het betaalscherm" />
      </div>

      <WeekChart weeks={stats.weeks} />

      <section className="card stack">
        <h2 className="adm-h2">Laatste aankopen</h2>
        {stats.recent.length === 0 ? <p className="small muted" style={{ margin: 0 }}>Nog geen aankopen.</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Wanneer</th><th>Wie</th><th>Abonnement</th><th className="r">Bedrag</th></tr></thead>
              <tbody>
                {stats.recent.map((r, i) => (
                  <tr key={i}>
                    <td>{day(r.created_at)}</td>
                    <td className="ell">{r.email ?? '(verwijderd)'}</td>
                    <td><span className={'adm-key ' + r.plan} aria-hidden />{PLANS[r.plan].label}</td>
                    <td className="r num">{money(Number(r.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Codes codes={codes} demo={demo} reload={load} setCodes={setCodes} />
    </main>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card adm-tile">
      <div className="label-cap">{label}</div>
      <div className="adm-val num">{value}</div>
      <div className="tiny">{sub}</div>
    </div>
  );
}

function SplitBar({ a, b }: { a: number; b: number }) {
  const total = a + b || 1;
  return (
    <div className="stack tight">
      <div className="adm-splitbar">
        {a > 0 && <i className="maand" style={{ flexGrow: a }} title={`Maand: ${a}`} />}
        {b > 0 && <i className="jaar" style={{ flexGrow: b }} title={`Jaar: ${b}`} />}
      </div>
      <div className="adm-legend">
        <span><span className="adm-key maand" />Maand {Math.round((a / total) * 100)}%</span>
        <span><span className="adm-key jaar" />Jaar {Math.round((b / total) * 100)}%</span>
      </div>
    </div>
  );
}

/** Aankopen per week, gestapeld maand + jaar, met hover en een tabelweergave. */
function WeekChart({ weeks }: { weeks: Stats['weeks'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...weeks.map((w) => Number(w.maand) + Number(w.jaar)));
  const nice = Math.max(4, Math.ceil(max / 4) * 4);
  const H = 180;
  return (
    <section className="card stack">
      <div className="row between">
        <h2 className="adm-h2">Aankopen per week</h2>
        <button className="link" onClick={() => setTable(!table)}>{table ? 'Grafiek' : 'Tabel'}</button>
      </div>
      <div className="adm-legend">
        <span><span className="adm-key maand" />Maand</span>
        <span><span className="adm-key jaar" />Jaar</span>
      </div>
      {weeks.length === 0 ? <p className="small muted" style={{ margin: 0 }}>Nog geen aankopen in de laatste 12 weken.</p> : table ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Week van</th><th className="r">Maand</th><th className="r">Jaar</th><th className="r">Omzet</th></tr></thead>
            <tbody>{weeks.map((w) => <tr key={w.week}><td>{shortWeek(w.week)}</td><td className="r num">{w.maand}</td><td className="r num">{w.jaar}</td><td className="r num">{money(Number(w.amount))}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="adm-chart" onMouseLeave={() => setHover(null)}>
          <div className="adm-grid" style={{ height: H }}>
            {[1, 0.5, 0].map((f) => <div key={f} className="gl" style={{ bottom: f * H }}><span className="num">{Math.round(nice * f)}</span></div>)}
          </div>
          <div className="adm-bars" style={{ height: H }}>
            {weeks.map((w, i) => {
              const m = Number(w.maand);
              const j = Number(w.jaar);
              return (
                <div key={w.week} className={'adm-col' + (hover === i ? ' on' : '')} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}
                  aria-label={`Week van ${shortWeek(w.week)}: ${m} maand, ${j} jaar`}>
                  <div className="stackbar">
                    {j > 0 && <i className="jaar" style={{ height: (j / nice) * H }} />}
                    {m > 0 && <i className="maand" style={{ height: (m / nice) * H }} />}
                  </div>
                  {hover === i && (
                    <div className={'adm-tip' + (i > weeks.length / 2 ? ' left' : '')}>
                      <b>Week van {shortWeek(w.week)}</b>
                      <div><span className="adm-key maand" />Maand <b className="num">{m}</b></div>
                      <div><span className="adm-key jaar" />Jaar <b className="num">{j}</b></div>
                      <div className="muted">Omzet {money(Number(w.amount))}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="adm-x">
            {weeks.map((w, i) => <span key={w.week}>{i % 2 === weeks.length % 2 ? '' : shortWeek(w.week)}</span>)}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Vriendencodes ---------- */

function Codes({ codes, demo, reload, setCodes }: { codes: CodeRow[]; demo: boolean; reload: () => Promise<void>; setCodes: (c: CodeRow[]) => void }) {
  const [note, setNote] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const make = async () => {
    setErr(null);
    const code = makeCode();
    try {
      if (demo) setCodes([{ code, note: note.trim(), created_at: new Date().toISOString(), active: true, redeemed_email: null, redeemed_at: null }, ...codes]);
      else {
        await createCode(code, note.trim());
        await reload();
      }
      setFresh(code);
      setNote('');
    } catch (e) {
      setErr(nlError(e));
    }
  };

  const toggle = async (c: CodeRow) => {
    try {
      if (demo) setCodes(codes.map((x) => (x.code === c.code ? { ...x, active: !x.active } : x)));
      else {
        await setCodeActive(c.code, !c.active);
        await reload();
      }
    } catch (e) {
      setErr(nlError(e));
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* kopiëren niet toegestaan */
    }
  };

  const shareText = (code: string) => `Hoi! Met deze code is Puls voor altijd gratis voor je: ${code}\nMaak een account in de app en vul de code in bij "Heb je een code?" (Profiel → Abonnement).`;
  const used = codes.filter((c) => c.redeemed_email).length;

  return (
    <section className="card stack">
      <div className="row between">
        <h2 className="adm-h2">Vriendencodes</h2>
        <span className="tiny">{codes.length} gemaakt · {used} gebruikt</span>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Elke code werkt één keer. Wie hem invult, heeft Puls voor altijd gratis.</p>
      <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); void make(); }}>
        <input className="input grow" placeholder="Voor wie? (bijv. Sam)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Voor wie is de code" />
        <button className="btn" type="submit">Maak code</button>
      </form>
      {err && <p className="form-err" role="alert">{err}</p>}
      {fresh && (
        <div className="adm-fresh">
          <div className="tiny">Nieuwe code</div>
          <div className="adm-code num">{fresh}</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => void copy(fresh, 'c')}>{copied === 'c' ? 'Gekopieerd' : 'Kopieer code'}</button>
            <button className="btn ghost sm" onClick={() => void copy(shareText(fresh), 't')}>{copied === 't' ? 'Gekopieerd' : 'Kopieer berichtje'}</button>
          </div>
        </div>
      )}
      {codes.length > 0 && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Code</th><th>Voor</th><th>Status</th><th /></tr></thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className={c.active ? '' : 'off'}>
                  <td className="mono"><button className="link mono" onClick={() => void copy(c.code, c.code)} title="Kopieer">{copied === c.code ? 'Gekopieerd' : c.code}</button></td>
                  <td className="ell">{c.note || '-'}</td>
                  <td>{!c.active ? 'Uitgezet' : c.redeemed_email ? <>Gebruikt door <b>{c.redeemed_email}</b> op {day(c.redeemed_at!)}</> : 'Nog niet gebruikt'}</td>
                  <td className="r"><button className="link" onClick={() => void toggle(c)}>{c.active ? 'Uitzetten' : 'Aanzetten'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="tiny" style={{ margin: 0 }}>Uitzetten werkt voor codes die nog niet gebruikt zijn. Wie een code al gebruikte, houdt Puls gratis.</p>
    </section>
  );
}
