import { useMemo, useRef, useState } from 'react';
import { hoortBijPuls, maakCode, nieuweId } from '../lib/cadeau';
import { I, Sheet, Toast, toast, Wordmark } from '../components/ui';
import { bewaar, importeer, laad, open, sluitIn, type BeheerData, type Gegeven } from './kluis';

const Gift = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.2C6 4.8 7 8 12 8zM12 8s1.5-4.5 4-3.8C18 4.8 17 8 12 8z" />
  </svg>
);

const datum = (t: number) => new Date(t).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
const pulsLink = (code: string) => new URL('./', location.href).href + '#cadeau=' + code;

function download(naam: string, inhoud: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(inhoud, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = naam;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function kopieer(tekst: string) {
  try {
    await navigator.clipboard.writeText(tekst);
    toast('Link gekopieerd');
  } catch {
    toast('Kopiëren lukt niet; houd de link ingedrukt om te kopiëren');
  }
}

async function deel(g: Gegeven) {
  const url = pulsLink(g.code);
  const text = `Hoi ${g.n}! Je krijgt Puls Premium van mij, voor altijd. Open deze link op je telefoon:`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Puls Premium cadeau', text, url });
      return;
    } catch {
      /* geannuleerd */
    }
  }
  kopieer(url);
}

export function Beheer() {
  const [data, setDataRaw] = useState<BeheerData>(laad);
  const [sleutel, setSleutel] = useState<CryptoKey | null>(null);
  const setData = (d: BeheerData) => {
    setDataRaw(d);
    if (!bewaar(d)) toast('Let op: opslaan op dit toestel lukt niet');
  };

  let scherm;
  if (!data.kluis) scherm = <Instellen onKlaar={(d, k) => { setData(d); setSleutel(k); }} />;
  else if (!sleutel) scherm = <Slot data={data} onOpen={setSleutel} onVergeten={() => setData({ ...data, kluis: null })} />;
  else scherm = <Overzicht data={data} setData={setData} sleutel={sleutel} onSlot={() => setSleutel(null)} />;

  return (
    <div className="app beheer">
      {scherm}
      <Toast />
    </div>
  );
}

/* ---------- Eerste keer: sleutel inlezen en beheercode kiezen ---------- */
function Instellen({ onKlaar }: { onKlaar: (d: BeheerData, k: CryptoKey) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [jwk, setJwk] = useState<JsonWebKey | null>(null);
  const [cadeaus, setCadeaus] = useState<Gegeven[]>([]);
  const [kluisUitBackup, setKluisUitBackup] = useState<BeheerData['kluis']>(null);
  const [code, setCode] = useState('');
  const [code2, setCode2] = useState('');
  const [bezig, setBezig] = useState(false);

  const [plak, setPlak] = useState('');
  const lees = async (f: File | string) => {
    try {
      const tekst = typeof f === 'string' ? f : await f.text();
      const j = JSON.parse(tekst.slice(tekst.indexOf('{'), tekst.lastIndexOf('}') + 1));
      if (j?.soort === 'puls-beheer-sleutel' && j.sleutel?.d) {
        if (!hoortBijPuls(j.sleutel)) return toast('Deze sleutel hoort niet bij deze versie van Puls');
        setJwk(j.sleutel);
      } else if (j?.soort === 'puls-beheer-backup' && j.kluis) {
        setKluisUitBackup(j.kluis);
        setCadeaus(Array.isArray(j.cadeaus) ? j.cadeaus : []);
      } else toast('Dit is geen Puls-sleutel of -back-up');
    } catch {
      toast('Dit bestand kan ik niet lezen');
    }
  };

  const opslaan = async () => {
    if (!jwk) return;
    setBezig(true);
    const kluis = await sluitIn(jwk, code);
    const k = await importeer(jwk);
    setBezig(false);
    onKlaar({ kluis, cadeaus }, k);
    toast('Klaar! Bewaar het sleutelbestand ook ergens veilig');
  };

  if (kluisUitBackup) {
    return <Slot data={{ kluis: kluisUitBackup, cadeaus }} terug={() => setKluisUitBackup(null)} onOpen={(k, d) => onKlaar(d, k)} />;
  }

  return (
    <div className="page">
      <div className="topbar"><Wordmark /><span className="tag gold">Beheer</span></div>
      <div className="premium-hero">
        <svg className="leaf" viewBox="0 0 32 32" aria-hidden><path d="M4 26C4 12 14 4 30 3c-1 17-10 25-24 25" fill="#c9f27a" /></svg>
        <span className="tag gold">Alleen voor jou</span>
        <h2 style={{ marginTop: 10 }}>Jouw Puls-beheer</h2>
        <p style={{ margin: '6px 0 0', opacity: 0.85 }}>Zie wie Premium heeft en geef mensen Puls Premium cadeau, voor altijd.</p>
      </div>

      {!jwk ? (
        <div className="card stack">
          <div className="step-n">1</div>
          <b>Kies je sleutelbestand</b>
          <p className="small muted" style={{ margin: 0 }}>
            Dit is het bestand <code>puls-beheer-sleutel.json</code> (of een back-up van dit beheer). Alleen met deze sleutel kun je cadeaucodes maken die Puls accepteert.
          </p>
          <input ref={file} type="file" hidden onChange={(e) => { if (e.target.files?.[0]) lees(e.target.files[0]); e.target.value = ''; }} />
          <button className="btn block" onClick={() => file.current?.click()}>Bestand kiezen</button>
          <div className="of"><span>of</span></div>
          <label className="small muted" htmlFor="plak">Open het bestand, kopieer alles en plak het hier:</label>
          <textarea id="plak" className="input plakvak" value={plak} onChange={(e) => setPlak(e.target.value)} placeholder='{ "soort": "puls-beheer-sleutel", … }' spellCheck={false} autoCapitalize="off" autoCorrect="off" />
          <button className="btn ghost block" disabled={!plak.trim()} onClick={() => lees(plak)}>Gebruik geplakte sleutel</button>
        </div>
      ) : (
        <div className="card stack">
          <div className="step-n">2</div>
          <b>Kies een beheercode</b>
          <p className="small muted" style={{ margin: 0 }}>Hiermee open je het beheer op dit toestel. Minimaal 6 tekens.</p>
          <input className="input" type="password" inputMode="text" autoComplete="new-password" placeholder="Beheercode" value={code} onChange={(e) => setCode(e.target.value)} />
          <input className="input" type="password" autoComplete="new-password" placeholder="Nog een keer" value={code2} onChange={(e) => setCode2(e.target.value)} />
          {code2.length > 0 && code !== code2 && <span className="small" style={{ color: 'var(--danger)' }}>De codes zijn niet hetzelfde</span>}
          <button className="btn block" disabled={code.length < 6 || code !== code2 || bezig} onClick={opslaan}>{bezig ? 'Even geduld…' : 'Beheer openen'}</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Vergrendeld ---------- */
function Slot({ data, onOpen, onVergeten, terug }: { data: BeheerData; onOpen: (k: CryptoKey, d: BeheerData) => void; onVergeten?: () => void; terug?: () => void }) {
  const [code, setCode] = useState('');
  const [fout, setFout] = useState(false);
  const [bezig, setBezig] = useState(false);
  const probeer = async () => {
    setBezig(true);
    const k = await open(data.kluis!, code);
    setBezig(false);
    if (k) onOpen(k, data);
    else { setFout(true); setCode(''); }
  };
  return (
    <div className="page slot">
      <div className="slot-logo"><Wordmark /><span className="tag gold">Beheer</span></div>
      <div className="card stack">
        <div className="slot-ico"><I.lock /></div>
        <h2 style={{ textAlign: 'center', fontSize: 24 }}>Vergrendeld</h2>
        <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>Vul je beheercode in.</p>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); probeer(); }}>
          <input className="input" type="password" autoFocus autoComplete="current-password" placeholder="Beheercode" value={code} onChange={(e) => { setCode(e.target.value); setFout(false); }} />
          {fout && <span className="small" style={{ color: 'var(--danger)' }}>Verkeerde code</span>}
          <button className="btn block" disabled={!code || bezig}>{bezig ? 'Even geduld…' : 'Openen'}</button>
        </form>
      </div>
      {terug && <button className="link small muted" onClick={terug}>Ander bestand kiezen</button>}
      {onVergeten && (
        <button className="link small muted" onClick={() => {
          if (confirm('Code vergeten? Je kiest dan opnieuw je sleutelbestand en een nieuwe code. De lijst met cadeaus blijft bewaard.')) onVergeten();
        }}>Code vergeten?</button>
      )}
    </div>
  );
}

/* ---------- Het overzicht ---------- */
function Overzicht({ data, setData, sleutel, onSlot }: { data: BeheerData; setData: (d: BeheerData) => void; sleutel: CryptoKey; onSlot: () => void }) {
  const [naam, setNaam] = useState('');
  const [notitie, setNotitie] = useState('');
  const [bezig, setBezig] = useState(false);
  const [zoek, setZoek] = useState('');
  const [gekozen, setGekozen] = useState<Gegeven | null>(null);
  const [nieuw, setNieuw] = useState<Gegeven | null>(null);
  const herstel = useRef<HTMLInputElement>(null);

  const cadeaus = useMemo(() => [...data.cadeaus].sort((a, b) => b.t - a.t), [data.cadeaus]);
  const totaal = cadeaus.length; // + betaalde abonnementen zodra die live zijn

  const maanden = useMemo(() => {
    const nu = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(nu.getFullYear(), nu.getMonth() - 5 + i, 1);
      const n = cadeaus.filter((c) => { const x = new Date(c.t); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); }).length;
      return { label: d.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', ''), n };
    });
  }, [cadeaus]);
  const max = Math.max(1, ...maanden.map((m) => m.n));
  const dezeMaand = maanden[5].n;

  const geef = async () => {
    const n = naam.trim();
    if (!n) return;
    setBezig(true);
    const c = { n, i: nieuweId(), t: Date.now() };
    const g: Gegeven = { ...c, code: await maakCode(c, sleutel), ...(notitie.trim() ? { notitie: notitie.trim() } : {}) };
    setBezig(false);
    setData({ ...data, cadeaus: [...data.cadeaus, g] });
    setNaam('');
    setNotitie('');
    setNieuw(g);
  };

  const verwijder = (g: Gegeven) => {
    if (!confirm(`${g.n} uit je lijst halen?\n\nLet op: een cadeau is voor altijd. Heeft ${g.n} de link al geopend, dan blijft Premium bij die persoon werken.`)) return;
    setData({ ...data, cadeaus: data.cadeaus.filter((c) => c.i !== g.i) });
    setGekozen(null);
    toast(`${g.n} is uit de lijst`);
  };

  const zetTerug = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      if (j?.soort !== 'puls-beheer-backup' || !Array.isArray(j.cadeaus)) return toast('Dit is geen back-up van Puls Beheer');
      const bestaand = new Set(data.cadeaus.map((c) => c.i));
      const erbij = (j.cadeaus as Gegeven[]).filter((c) => !bestaand.has(c.i));
      setData({ ...data, cadeaus: [...data.cadeaus, ...erbij] });
      toast(erbij.length ? `${erbij.length} cadeau${erbij.length === 1 ? '' : 's'} teruggezet` : 'Alles stond er al in');
    } catch {
      toast('Dit bestand kan ik niet lezen');
    }
  };

  const lijst = zoek ? cadeaus.filter((c) => (c.n + ' ' + (c.notitie ?? '')).toLowerCase().includes(zoek.toLowerCase())) : cadeaus;

  return (
    <div className="page">
      <div className="topbar">
        <div className="row" style={{ gap: 10 }}><Wordmark /><span className="tag gold">Beheer</span></div>
        <button className="iconbtn" onClick={onSlot} aria-label="Vergrendelen"><I.lock /></button>
      </div>

      <div className="premium-hero abo-hero">
        <svg className="leaf" viewBox="0 0 32 32" aria-hidden><path d="M4 26C4 12 14 4 30 3c-1 17-10 25-24 25" fill="#c9f27a" /></svg>
        <div className="abo-label">Abonnementen</div>
        <div className="abo-num num">{totaal}</div>
        <div className="abo-sub">{totaal === 1 ? 'persoon heeft' : 'mensen hebben'} Puls Premium{dezeMaand > 0 && <> · <b>+{dezeMaand}</b> deze maand</>}</div>
        <div className="abo-tiles">
          <div><b className="num">{cadeaus.length}</b><span>Cadeau, voor altijd</span></div>
          <div><b className="num">0</b><span>Maandelijks</span></div>
          <div><b className="num">0</b><span>Jaarlijks</span></div>
        </div>
      </div>

      <div className="card flat row note">
        <span className="note-ico"><I.info /></span>
        <div className="small muted">Betaalde abonnementen staan nog op 0: Premium kopen is in Puls nog een demo en er wordt niets afgeschreven. Zodra betalen via de App Store en Google Play live is, komen die aantallen hier bij.</div>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <b>Cadeaus per maand</b>
          <span className="tiny">laatste 6 maanden</span>
        </div>
        <div className="maanden">
          {maanden.map((m, i) => (
            <div key={i} className={'maand' + (i === 5 ? ' nu' : '')}>
              <span className="num">{m.n || ''}</span>
              <i style={{ height: `${(m.n / max) * 100}%` }} />
              <small>{m.label}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title"><h2>Geef Premium cadeau</h2></div>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); geef(); }}>
        <div className="geef-kop">
          <span className="geef-ico"><Gift /></span>
          <div className="small muted">Je krijgt een link. Wie die opent, heeft Puls Premium voor altijd, gratis.</div>
        </div>
        <div className="field">
          <label htmlFor="naam">Voor wie?</label>
          <input id="naam" className="input" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Naam" maxLength={40} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="notitie">Notitie <span className="tiny">(alleen voor jou)</span></label>
          <input id="notitie" className="input" value={notitie} onChange={(e) => setNotitie(e.target.value)} placeholder="Bijv. vriend, tester, familie" maxLength={80} autoComplete="off" />
        </div>
        <button className="btn block" disabled={!naam.trim() || bezig}><Gift /> Geef voor altijd</button>
      </form>

      <div className="section-title"><h2>Met cadeau <span className="muted num" style={{ fontWeight: 600 }}>{cadeaus.length}</span></h2></div>
      {cadeaus.length > 5 && (
        <div className="search"><I.search /><input className="input" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op naam" /></div>
      )}
      <div className="card" style={{ padding: '4px 14px' }}>
        {lijst.length === 0 ? (
          <div className="empty"><div className="em">🎁</div>{cadeaus.length ? 'Niemand gevonden' : 'Je hebt nog niemand Premium gegeven.'}</div>
        ) : (
          <div className="list">
            {lijst.map((g) => (
              <button key={g.i} className="item" onClick={() => setGekozen(g)}>
                <span className="ini">{g.n.slice(0, 1).toUpperCase()}</span>
                <div className="grow">
                  <div className="t">{g.n}</div>
                  <div className="s">{datum(g.t)}{g.notitie ? ` · ${g.notitie}` : ''}</div>
                </div>
                <span className="tag gold">Voor altijd</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="section-title"><h2>Back-up</h2></div>
      <div className="card stack">
        <p className="small muted" style={{ margin: 0 }}>Alles staat alleen op dit toestel. Met een back-up zet je je beheer op een ander toestel of na een reset terug. Hij is beveiligd met je beheercode.</p>
        <div className="row">
          <button className="btn ghost sm grow" onClick={() => download(`puls-beheer-backup-${new Date().toISOString().slice(0, 10)}.json`, { soort: 'puls-beheer-backup', versie: 1, kluis: data.kluis, cadeaus: data.cadeaus })}>Downloaden</button>
          <button className="btn outline sm grow" onClick={() => herstel.current?.click()}>Terugzetten</button>
        </div>
        <input ref={herstel} type="file" accept=".json,application/json" hidden onChange={(e) => { if (e.target.files?.[0]) zetTerug(e.target.files[0]); e.target.value = ''; }} />
      </div>
      <div style={{ height: 24 }} />

      {nieuw && (
        <Sheet onClose={() => setNieuw(null)}>
          <div className="stack" style={{ textAlign: 'center' }}>
            <div className="klaar-ico"><Gift /></div>
            <h2 style={{ fontSize: 26 }}>Cadeau voor {nieuw.n}</h2>
            <p className="muted" style={{ margin: 0 }}>Stuur deze link. Zodra {nieuw.n} hem opent, staat Premium voor altijd aan.</p>
            <LinkVak g={nieuw} />
          </div>
        </Sheet>
      )}
      {gekozen && (
        <Sheet onClose={() => setGekozen(null)} title={gekozen.n}>
          <div className="stack">
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="tag gold">Premium voor altijd</span>
              <span className="tag">Gegeven op {datum(gekozen.t)}</span>
            </div>
            {gekozen.notitie && <p className="muted" style={{ margin: 0 }}>{gekozen.notitie}</p>}
            <LinkVak g={gekozen} />
            <button className="btn danger block" onClick={() => verwijder(gekozen)}><I.trash /> Uit lijst halen</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function LinkVak({ g }: { g: Gegeven }) {
  const url = pulsLink(g.code);
  return (
    <div className="stack" style={{ textAlign: 'left' }}>
      <div className="linkvak" onClick={(e) => { const r = document.createRange(); r.selectNodeContents(e.currentTarget); getSelection()?.removeAllRanges(); getSelection()?.addRange(r); }}>{url}</div>
      <div className="row">
        <button className="btn grow" onClick={() => deel(g)}><I.share /> Delen</button>
        <button className="btn ghost grow" onClick={() => kopieer(url)}><I.copy /> Kopiëren</button>
      </div>
    </div>
  );
}
