import type { ReactElement } from 'react';
import { useStore } from '../lib/store';
import { PROGRESS_TABS, useUI, type Tab } from '../lib/ui';
import { I, Logo } from './ui';

interface NavItem {
  id: Tab;
  label: string;
  icon: () => ReactElement;
}

/** Volgorde in de zijbalk op een groot scherm. */
const SIDE: NavItem[] = [
  { id: 'vandaag', label: 'Vandaag', icon: I.today },
  { id: 'kalender', label: 'Kalender', icon: I.calendar },
  { id: 'recepten', label: 'Recepten', icon: I.book },
  { id: 'training', label: 'Training', icon: I.dumbbell },
  { id: 'voortgang', label: 'Statistieken', icon: I.chart },
  { id: 'doelen', label: 'Doelen', icon: I.trophy },
];

/** Onderbalk op de telefoon: vier tabbladen en de grote plusknop in het midden. */
const BOTTOM: NavItem[] = [
  { id: 'vandaag', label: 'Vandaag', icon: I.today },
  { id: 'recepten', label: 'Recepten', icon: I.book },
  { id: 'training', label: 'Training', icon: I.dumbbell },
  { id: 'voortgang', label: 'Voortgang', icon: I.chart },
];

const isOn = (item: Tab, tab: Tab, grouped: boolean) => item === tab || (grouped && item === 'voortgang' && PROGRESS_TABS.includes(tab));

export function Sidebar() {
  const { tab, setTab, open } = useUI();
  const name = useStore((s) => s.profile?.name);
  const premium = useStore((s) => s.premium);
  return (
    <nav className="sidebar" aria-label="Hoofdmenu">
      <button className="side-brand" onClick={() => setTab('vandaag')} aria-label="Puls, naar vandaag">
        <Logo size={34} />
        <span>puls</span>
      </button>
      <button className="btn block side-log" onClick={() => open({ type: 'quick' })}>
        <span className="i20"><I.plus /></span> Snel loggen
      </button>
      <div className="side-items">
        {SIDE.map((t) => {
          const Icon = t.icon;
          const on = isOn(t.id, tab, false);
          return (
            <button key={t.id} className={'side-item' + (on ? ' on' : '')} onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined}>
              <span className="i20"><Icon /></span>
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="grow" />
      <button className={'side-profile' + (tab === 'profiel' ? ' on' : '')} onClick={() => setTab('profiel')} aria-current={tab === 'profiel' ? 'page' : undefined}>
        <span className="avatar" style={{ width: 38, height: 38, fontSize: 16 }}>{(name || 'P').slice(0, 1).toUpperCase()}</span>
        <span className="grow" style={{ textAlign: 'left' }}>
          <b className="ellipsis" style={{ display: 'block' }}>{name || 'Profiel'}</b>
          <span className="tiny">{premium ? 'Premium' : 'Profiel en instellingen'}</span>
        </span>
        <span className="i18" style={{ color: 'var(--ink-3)' }}><I.gear /></span>
      </button>
    </nav>
  );
}

export function BottomNav() {
  const { tab, setTab, open } = useUI();
  const btn = (t: NavItem) => {
    const Icon = t.icon;
    const on = isOn(t.id, tab, true);
    return (
      <button key={t.id} className={'tab' + (on ? ' on' : '')} onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined}>
        <Icon />
        {t.label}
      </button>
    );
  };
  return (
    <nav className="tabbar" aria-label="Hoofdmenu">
      <div className="tabbar-inner">
        {BOTTOM.slice(0, 2).map(btn)}
        <button className="fab" onClick={() => open({ type: 'quick' })} aria-label="Snel loggen"><I.plus /></button>
        {BOTTOM.slice(2).map(btn)}
      </div>
    </nav>
  );
}

/** Op de telefoon en tablet: wisselen tussen Statistieken, Doelen en Kalender bovenaan de pagina. */
export function HubTabs() {
  const { tab, setTab } = useUI();
  const items: [Tab, string][] = [['voortgang', 'Statistieken'], ['doelen', 'Doelen'], ['kalender', 'Kalender']];
  return (
    <div className="seg seg-wide hub-tabs" role="tablist" aria-label="Voortgang">
      {items.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
      ))}
    </div>
  );
}

/** Kop van een pagina: titel, eventueel een ondertitel en knoppen rechts. */
export function PageHead({ title, sub, right, hub }: { title: string; sub?: string; right?: ReactElement | null; hub?: boolean }) {
  return (
    <>
      <header className="topbar page-head">
        <div className="grow">
          <h1 className="page-title">{title}</h1>
          {sub && <div className="small muted">{sub}</div>}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {right}
          <ProfileButton />
        </div>
      </header>
      {hub && <HubTabs />}
    </>
  );
}

function ProfileButton() {
  const name = useStore((s) => s.profile?.name);
  return (
    <button className="avatar hide-desktop" onClick={() => useUI.getState().setTab('profiel')} aria-label="Profiel en instellingen">
      {(name || 'P').slice(0, 1).toUpperCase()}
    </button>
  );
}
