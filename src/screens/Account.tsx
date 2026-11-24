import { useState } from 'react';
import {
  accessOf, checkout, checkSignup, euro, hashPassword, longDate, normEmail, PLANS, TRIAL_DAYS, YEAR_SAVING, type Plan,
} from '../lib/account';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { I, Logo, Sheet, toast } from '../components/ui';

export const FEATURES: [string, string][] = [
  ['Je persoonlijke plan', 'Calorieën, eiwit, water en stappen op maat, en bijgestuurd op je resultaten.'],
  ['Eten loggen en barcodescanner', 'Honderden producten, je recepten en miljoenen producten online.'],
  ['Recepten op jouw maat', 'Porties die passen bij je doel, dagmenu en boodschappenlijst.'],
  ['Trainingsschema en coach', 'Schema voor gym of thuis, reminders en je voortgang over tijd.'],
];

/** Formulier om een account te maken of in te loggen. */
export function AccountForm({ mode, onDone, cta }: { mode: 'signup' | 'login'; onDone: () => void; cta?: string }) {
  const account = useStore((s) => s.account);
  const [email, setEmail] = useState(mode === 'login' ? account?.email ?? '' : '');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (mode === 'signup') {
      const e = checkSignup(email, pass);
      if (e) return setErr(e);
      setBusy(true);
      useStore.getState().createAccount({ email: normEmail(email), passHash: await hashPassword(email, pass), createdAt: new Date().toISOString() });
      setBusy(false);
      onDone();
      return;
    }
    if (!account || normEmail(email) !== account.email) return setErr('Geen account met dit e-mailadres op dit apparaat.');
    setBusy(true);
    const ok = (await hashPassword(email, pass)) === account.passHash;
    setBusy(false);
    if (!ok) return setErr('Dat wachtwoord klopt niet.');
    useStore.getState().setLoggedIn(true);
    onDone();
  };

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
      <label className="field">
        <span className="lbl">E-mailadres</span>
        <input id="acc-email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="jij@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span className="lbl">Wachtwoord</span>
        <div className="pass">
          <input id="acc-pass" className="input" type={show ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'Minstens 8 tekens' : 'Je wachtwoord'} value={pass} onChange={(e) => setPass(e.target.value)} />
          <button type="button" className="link" onClick={() => setShow(!show)}>{show ? 'Verberg' : 'Toon'}</button>
        </div>
      </label>
      {err && <p className="form-err" role="alert">{err}</p>}
      <button className="btn block" type="submit" disabled={busy}>{cta ?? (mode === 'signup' ? 'Account maken' : 'Inloggen')}</button>
    </form>
  );
}

/** Los inlogscherm (na uitloggen) of account maken voor wie de app al gebruikte. */
export function AuthScreen() {
  const account = useStore((s) => s.account);
  const mode = account ? 'login' : 'signup';
  return (
    <div className="ob">
      <div className="ob-body auth">
        <Logo size={56} />
        <h1>{mode === 'login' ? 'Welkom terug' : 'Maak je account'}</h1>
        <p className="lead">
          {mode === 'login'
            ? 'Log in om verder te gaan waar je gebleven was.'
            : `Je plan en dagboek blijven bewaard. Met een account probeer je Puls ${TRIAL_DAYS} dagen gratis.`}
        </p>
        <AccountForm mode={mode} onDone={() => toast(mode === 'login' ? 'Je bent ingelogd' : 'Account gemaakt')} />
      </div>
    </div>
  );
}

/** Keuze tussen maand en jaar. */
export function PlanPicker({ plan, setPlan }: { plan: Plan; setPlan: (p: Plan) => void }) {
  return (
    <div className="stack tight">
      {(['jaar', 'maand'] as Plan[]).map((k) => (
        <button key={k} className={'plan' + (plan === k ? ' on' : '')} onClick={() => setPlan(k)} aria-pressed={plan === k}>
          <span className="radio" />
          <div className="grow">
            <b>{PLANS[k].label} {k === 'jaar' && <span className="tag brand">−{YEAR_SAVING}%</span>}</b>
            <div className="small muted num">{k === 'jaar' ? `${euro(PLANS.jaar.price / 12)} per maand, in één keer` : 'Elke maand opzegbaar'}</div>
          </div>
          <div className="price num">{euro(PLANS[k].price)}<span className="tiny"> {k === 'jaar' ? '/jr' : '/mnd'}</span></div>
        </button>
      ))}
    </div>
  );
}

function useBuy() {
  const [busy, setBusy] = useState(false);
  const buy = async (plan: Plan) => {
    setBusy(true);
    const s = useStore.getState();
    const sub = await checkout(plan, s.subscription, s.installedAt);
    useStore.getState().setSubscription(sub);
    setBusy(false);
    toast(`Je abonnement loopt tot ${longDate(sub.until)}`);
  };
  return { busy, buy };
}

function FeatureList() {
  return (
    <div className="stack">
      {FEATURES.map(([t, s]) => (
        <div key={t} className="feat"><I.check /><div><b>{t}</b><div className="small muted">{s}</div></div></div>
      ))}
    </div>
  );
}

/** Volledig scherm als je proefperiode voorbij is en je geen abonnement hebt. */
export function Paywall() {
  const [plan, setPlan] = useState<Plan>('jaar');
  const { busy, buy } = useBuy();
  const name = useStore((s) => s.profile?.name);
  return (
    <div className="ob">
      <div className="ob-body">
        <div className="premium-hero">
          <svg className="leaf" viewBox="0 0 32 32" aria-hidden><path d="M4 26C4 12 14 4 30 3c-1 17-10 25-24 25" fill="#c9f27a" /></svg>
          <span className="tag gold">Proefperiode voorbij</span>
          <h2 style={{ marginTop: 10 }}>{name ? `${name}, ga` : 'Ga'} door met Puls</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.85 }}>Je {TRIAL_DAYS} gratis dagen zitten erop. Met een abonnement heb je weer de hele app. Je plan, dagboek en voortgang staan nog voor je klaar.</p>
        </div>
        <FeatureList />
        <PlanPicker plan={plan} setPlan={setPlan} />
      </div>
      <div className="ob-foot stack tight">
        <button className="btn block" disabled={busy} onClick={() => void buy(plan)}>Doorgaan voor {euro(PLANS[plan].price)} {PLANS[plan].per}</button>
        <p className="tiny" style={{ textAlign: 'center', margin: 0 }}>Demo: er wordt nog niets afgeschreven. · <button className="link" onClick={() => useStore.getState().setLoggedIn(false)}>Uitloggen</button></p>
      </div>
    </div>
  );
}

/** Je abonnement bekijken, afsluiten of opzeggen (vanuit Profiel). */
export function SubscriptionSheet() {
  const close = useUI((s) => s.close);
  const installedAt = useStore((s) => s.installedAt);
  const sub = useStore((s) => s.subscription);
  const access = accessOf(installedAt, sub);
  const [plan, setPlan] = useState<Plan>(sub?.plan ?? 'jaar');
  const { busy, buy } = useBuy();

  return (
    <Sheet onClose={close} title="Abonnement">
      <div className="stack">
        <div className="card">
          {access.kind === 'abo' ? (
            <>
              <b>Puls · {PLANS[access.sub.plan].label.toLowerCase()}</b>
              <div className="small muted">{access.sub.renews ? `Wordt verlengd op ${longDate(access.sub.until)} voor ${euro(PLANS[access.sub.plan].price)}.` : `Opgezegd. Je hebt toegang tot en met ${longDate(access.sub.until)}.`}</div>
            </>
          ) : (
            <>
              <b>Gratis proefperiode</b>
              <div className="small muted">Nog {access.kind === 'trial' ? access.daysLeft : 0} {access.kind === 'trial' && access.daysLeft === 1 ? 'dag' : 'dagen'}, tot {longDate(access.ends)}. Daarna {euro(PLANS.maand.price)} per maand of {euro(PLANS.jaar.price)} per jaar.</div>
            </>
          )}
        </div>
        {access.kind === 'abo' && access.sub.renews ? (
          <button className="btn outline block" onClick={() => { useStore.getState().setSubscription({ ...access.sub, renews: false }); toast('Opgezegd. Je houdt toegang tot het einde van je periode.'); }}>Abonnement opzeggen</button>
        ) : (
          <>
            {access.kind !== 'abo' && <FeatureList />}
            <PlanPicker plan={plan} setPlan={setPlan} />
            <button className="btn block" disabled={busy} onClick={() => void buy(plan).then(close)}>
              {access.kind === 'abo' ? 'Opnieuw verlengen' : 'Nu abonneren'} · {euro(PLANS[plan].price)} {PLANS[plan].per}
            </button>
            {access.kind === 'trial' && <p className="tiny" style={{ textAlign: 'center', margin: 0 }}>Je proefdagen raak je niet kwijt: je abonnement gaat pas in als ze op zijn.</p>}
          </>
        )}
        <p className="tiny" style={{ textAlign: 'center', margin: 0 }}>Demo: er wordt nog niets afgeschreven.</p>
      </div>
    </Sheet>
  );
}

/** Rij in Profiel met je e-mail en uitloggen. */
export function AccountRow() {
  const account = useStore((s) => s.account);
  if (!account) return null;
  return (
    <div className="list">
      <div className="item">
        <div className="grow"><div className="t">Account</div><div className="s">{account.email}</div></div>
        <button className="btn ghost sm" onClick={() => { useStore.getState().setLoggedIn(false); useUI.getState().setTab('vandaag'); }}>Uitloggen</button>
      </div>
    </div>
  );
}
