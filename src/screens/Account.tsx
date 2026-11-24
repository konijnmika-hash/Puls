import { useState } from 'react';
import {
  accessOf, checkout, checkSignup, euro, hashPassword, longDate, normCode, normEmail, planLabel, PLANS, TRIAL_DAYS, YEAR_SAVING, type Plan,
} from '../lib/account';
import { loadRemote, nlError, online, remoteCancel, remoteCheckout, remoteRedeem, signIn, signOut, signUp } from '../lib/backend';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { I, Logo, Sheet, toast } from '../components/ui';

export const FEATURES: [string, string][] = [
  ['Je persoonlijke plan', 'Calorieën, eiwit, water en stappen op maat, en bijgestuurd op je resultaten.'],
  ['Eten loggen en barcodescanner', 'Honderden producten, je recepten en miljoenen producten online.'],
  ['Recepten op jouw maat', 'Porties die passen bij je doel, dagmenu en boodschappenlijst.'],
  ['Trainingsschema en coach', 'Schema voor gym of thuis, reminders en je voortgang over tijd.'],
];

async function syncFromServer() {
  const r = await loadRemote();
  if (r) useStore.getState().syncRemote(r);
  return r;
}

/** Formulier om een account te maken of in te loggen. */
export function AccountForm({ mode, onDone, cta }: { mode: 'signup' | 'login'; onDone: () => void; cta?: string }) {
  const account = useStore((s) => s.account);
  const [email, setEmail] = useState(mode === 'login' ? account?.email ?? '' : '');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitOnline = async () => {
    if (mode === 'signup') {
      const { needsConfirm } = await signUp(normEmail(email), pass);
      if (needsConfirm) {
        setInfo('Check je mail en klik op de bevestigingslink. Log daarna hier in.');
        return false;
      }
    } else await signIn(normEmail(email), pass);
    await syncFromServer();
    return true;
  };

  const submitLocal = async () => {
    if (mode === 'signup') {
      useStore.getState().createAccount({ email: normEmail(email), passHash: await hashPassword(email, pass), createdAt: new Date().toISOString() });
      return true;
    }
    if (!account || normEmail(email) !== account.email) throw new Error('Geen account met dit e-mailadres op dit apparaat.');
    if ((await hashPassword(email, pass)) !== account.passHash) throw new Error('Dat wachtwoord klopt niet.');
    useStore.getState().setLoggedIn(true);
    return true;
  };

  const submit = async () => {
    setErr(null);
    setInfo(null);
    if (mode === 'signup') {
      const e = checkSignup(email, pass);
      if (e) return setErr(e);
    }
    setBusy(true);
    try {
      if (await (online ? submitOnline() : submitLocal())) onDone();
    } catch (e) {
      setErr(nlError(e));
    } finally {
      setBusy(false);
    }
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
      {info && <p className="form-info" role="status">{info}</p>}
      <button className="btn block" type="submit" disabled={busy}>{busy ? 'Even geduld…' : cta ?? (mode === 'signup' ? 'Account maken' : 'Inloggen')}</button>
    </form>
  );
}

/** Account maken, met de keuze om in te loggen (met server ook op een nieuw apparaat). */
export function AccountChoice({ onDone, signupCta }: { onDone: () => void; signupCta?: string }) {
  const hasLocal = useStore((s) => !!s.account);
  const [mode, setMode] = useState<'signup' | 'login'>(hasLocal ? 'login' : 'signup');
  const canSwitch = online || hasLocal;
  return (
    <div className="stack">
      <AccountForm key={mode} mode={mode} onDone={onDone} cta={mode === 'signup' ? signupCta : undefined} />
      {canSwitch && (
        <p className="small" style={{ textAlign: 'center', margin: 0 }}>
          {mode === 'signup' ? 'Heb je al een account? ' : 'Nog geen account? '}
          <button className="link" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Inloggen' : 'Account maken'}</button>
        </p>
      )}
    </div>
  );
}

/** Los inlogscherm (na uitloggen) of account maken voor wie de app al gebruikte. */
export function AuthScreen() {
  const account = useStore((s) => s.account);
  return (
    <div className="ob">
      <div className="ob-body auth">
        <Logo size={56} />
        <h1>{account ? 'Welkom terug' : 'Maak je account'}</h1>
        <p className="lead">
          {account
            ? 'Log in om verder te gaan waar je gebleven was.'
            : `Je plan en dagboek blijven bewaard. Met een account probeer je Puls ${TRIAL_DAYS} dagen gratis.`}
        </p>
        <AccountChoice onDone={() => toast('Je bent ingelogd')} />
      </div>
    </div>
  );
}

export async function logout() {
  if (online) await signOut().catch(() => {});
  useStore.getState().setLoggedIn(false);
  useUI.getState().setTab('vandaag');
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
    try {
      const s = useStore.getState();
      const sub = online ? await remoteCheckout(plan) : await checkout(plan, s.subscription, s.installedAt);
      s.setSubscription(sub);
      if (sub) toast(sub.plan === 'vriend' ? 'Je hebt Puls al gratis voor altijd' : `Je abonnement loopt tot ${longDate(sub.until)}`);
      return true;
    } catch (e) {
      toast(nlError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, buy };
}

/** Vriendencode inwisselen: daarna is Puls voor altijd gratis. */
export function CodeRedeem() {
  const [shown, setShown] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!shown) return <button className="link" style={{ alignSelf: 'center' }} onClick={() => setShown(true)}>Heb je een code?</button>;
  const redeem = async () => {
    setErr(null);
    if (!online) return setErr('Codes werken zodra Puls met de server verbonden is.');
    if (normCode(code).length < 6) return setErr('Vul je code in.');
    setBusy(true);
    try {
      const sub = await remoteRedeem(normCode(code));
      useStore.getState().setSubscription(sub);
      toast('Code geactiveerd: Puls is voor altijd gratis voor je');
      useUI.getState().close();
    } catch (e) {
      setErr(nlError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="stack tight" onSubmit={(e) => { e.preventDefault(); void redeem(); }}>
      <div className="row" style={{ gap: 8 }}>
        <input id="code" className="input grow code-input" placeholder="PULS-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn" type="submit" disabled={busy}>Activeer</button>
      </div>
      {err && <p className="form-err" role="alert">{err}</p>}
    </form>
  );
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
        <CodeRedeem />
      </div>
      <div className="ob-foot stack tight">
        <button className="btn block" disabled={busy} onClick={() => void buy(plan)}>Doorgaan voor {euro(PLANS[plan].price)} {PLANS[plan].per}</button>
        <p className="tiny" style={{ textAlign: 'center', margin: 0 }}>Demo: er wordt nog niets afgeschreven. · <button className="link" onClick={() => void logout()}>Uitloggen</button></p>
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
  const [plan, setPlan] = useState<Plan>(sub && sub.plan !== 'vriend' ? sub.plan : 'jaar');
  const { busy, buy } = useBuy();

  const cancel = async (s: NonNullable<typeof sub>) => {
    try {
      const next = online ? await remoteCancel() : { ...s, renews: false };
      useStore.getState().setSubscription(next ?? { ...s, renews: false });
      toast('Opgezegd. Je houdt toegang tot het einde van je periode.');
    } catch (e) {
      toast(nlError(e));
    }
  };

  if (access.kind === 'abo' && access.sub.plan === 'vriend') {
    return (
      <Sheet onClose={close} title="Abonnement">
        <div className="card"><b>Gratis voor altijd</b><div className="small muted">Je hebt een code gebruikt. Je hoeft nooit te betalen.</div></div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={close} title="Abonnement">
      <div className="stack">
        <div className="card">
          {access.kind === 'abo' ? (
            <>
              <b>Puls · {planLabel(access.sub.plan).toLowerCase()}</b>
              <div className="small muted">{access.sub.renews ? `Wordt verlengd op ${longDate(access.sub.until)}.` : `Opgezegd. Je hebt toegang tot en met ${longDate(access.sub.until)}.`}</div>
            </>
          ) : (
            <>
              <b>Gratis proefperiode</b>
              <div className="small muted">Nog {access.kind === 'trial' ? access.daysLeft : 0} {access.kind === 'trial' && access.daysLeft === 1 ? 'dag' : 'dagen'}, tot {longDate(access.ends)}. Daarna {euro(PLANS.maand.price)} per maand of {euro(PLANS.jaar.price)} per jaar.</div>
            </>
          )}
        </div>
        {access.kind === 'abo' && access.sub.renews ? (
          <button className="btn outline block" onClick={() => void cancel(access.sub)}>Abonnement opzeggen</button>
        ) : (
          <>
            {access.kind !== 'abo' && <FeatureList />}
            <PlanPicker plan={plan} setPlan={setPlan} />
            <button className="btn block" disabled={busy} onClick={() => void buy(plan).then((ok) => ok && close())}>
              {access.kind === 'abo' ? 'Opnieuw verlengen' : 'Nu abonneren'} · {euro(PLANS[plan].price)} {PLANS[plan].per}
            </button>
            {access.kind === 'trial' && <p className="tiny" style={{ textAlign: 'center', margin: 0 }}>Je proefdagen raak je niet kwijt: je abonnement gaat pas in als ze op zijn.</p>}
            <CodeRedeem />
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
        <button className="btn ghost sm" onClick={() => void logout()}>Uitloggen</button>
      </div>
    </div>
  );
}

/** Bij opstarten het abonnement van de server ophalen (bijv. na een code of betaling elders). */
export function refreshFromServer() {
  if (!online || !useStore.getState().loggedIn) return;
  syncFromServer().catch(() => {
    /* offline: we gebruiken wat we nog weten */
  });
}
