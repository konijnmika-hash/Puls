import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { AddFoodSheet, EditEntrySheet, SaveMealSheet } from './components/FoodSheets';
import {
  ActivitySheet, ConnectSheet, ExerciseSheet, ExplainSheet, GoalsSheet, PlanEditSheet, PremiumSheet, ProfileEditSheet, QuickSheet, StepsSheet, WeightSheet,
} from './components/Sheets';
import { I, toast, Toast } from './components/ui';
import { controleerCode } from './lib/cadeau';
import { Celebrations, InboxSheet, useReminders } from './components/Coach';
import { CookMode, RecipeSheet, ShoppingSheet } from './components/RecipeSheets';
import { Recipes } from './screens/Recipes';
import { dateKey } from './lib/date';
import { useStore } from './lib/store';
import { useBack } from './lib/back';
import { useUI, type Tab } from './lib/ui';
import { Onboarding } from './screens/Onboarding';
import { Progress } from './screens/Progress';
import { ProfileScreen } from './screens/Profile';
import { Today } from './screens/Today';
import { Training, WorkoutSession } from './screens/Training';
import { CombineSheet, WorkoutSheet } from './screens/Workouts';

const TABS: { id: Tab; label: string; icon: () => ReactElement }[] = [
  { id: 'vandaag', label: 'Vandaag', icon: I.today },
  { id: 'recepten', label: 'Recepten', icon: I.book },
  { id: 'training', label: 'Training', icon: I.dumbbell },
  { id: 'voortgang', label: 'Voortgang', icon: I.chart },
];

function SheetHost() {
  const sheet = useUI((s) => s.sheet);
  if (!sheet) return null;
  switch (sheet.type) {
    case 'addFood': return <AddFoodSheet key={sheet.meal} meal={sheet.meal} />;
    case 'editEntry': return <EditEntrySheet meal={sheet.meal} entryId={sheet.entryId} />;
    case 'steps': return <StepsSheet />;
    case 'activity': return <ActivitySheet />;
    case 'weight': return <WeightSheet />;
    case 'quick': return <QuickSheet />;
    case 'premium': return <PremiumSheet reason={sheet.reason} />;
    case 'planEdit': return <PlanEditSheet />;
    case 'profileEdit': return <ProfileEditSheet />;
    case 'goals': return <GoalsSheet />;
    case 'connect': return <ConnectSheet />;
    case 'exercise': return <ExerciseSheet id={sheet.id} slotKey={sheet.slotKey} wid={sheet.wid} />;
    case 'workout': return <WorkoutSheet key={sheet.id} id={sheet.id} day={sheet.day} />;
    case 'combine': return <CombineSheet edit={sheet.edit} day={sheet.day} />;
    case 'inbox': return <InboxSheet />;
    case 'recipe': return <RecipeSheet key={sheet.id} id={sheet.id} meal={sheet.meal} planned={sheet.factor} />;
    case 'shopping': return <ShoppingSheet />;
    case 'saveMeal': return <SaveMealSheet meal={sheet.meal} />;
    case 'explain': return <ExplainSheet />;
  }
}

export function App() {
  const profile = useStore((s) => s.profile);

  // Spring na middernacht vanzelf naar de nieuwe dag als je op "vandaag" stond
  useEffect(() => {
    let last = dateKey();
    const t = setInterval(() => {
      const now = dateKey();
      if (now !== last) {
        if (useUI.getState().date === last) useUI.getState().setDate(now);
        last = now;
      }
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Cadeaulink geopend (…#cadeau=…)? Dan krijg je Premium voor altijd.
  useEffect(() => {
    if (!location.hash.includes('cadeau=')) return;
    const hash = location.hash;
    history.replaceState(null, '', location.pathname + location.search);
    controleerCode(hash).then((c) => {
      if (c) {
        useStore.getState().setCadeau(c);
        setTimeout(() => toast(`Cadeau! Je hebt Puls Premium voor altijd, ${c.n}`), 400);
      } else toast('Deze cadeaulink klopt niet');
    });
  }, []);

  if (!profile) return <Onboarding />;
  return <Main />;
}

function Main() {
  const { tab, setTab, open, session, cook } = useUI();
  useReminders();
  // terugknop op een ander tabblad: eerst naar Vandaag
  useBack(() => (tab !== 'vandaag' ? (setTab('vandaag'), true) : false));

  return (
    <div className="app">
      {tab === 'vandaag' && <Today />}
      {tab === 'recepten' && <Recipes />}
      {tab === 'training' && <Training />}
      {tab === 'voortgang' && <Progress />}
      {tab === 'profiel' && <ProfileScreen />}

      <nav className="tabbar" aria-label="Hoofdmenu">
        <div className="tabbar-inner">
          {TABS.slice(0, 2).map((t) => <TabBtn key={t.id} t={t} on={tab === t.id} onClick={() => setTab(t.id)} />)}
          <button className="fab" onClick={() => open({ type: 'quick' })} aria-label="Snel loggen"><I.plus /></button>
          {TABS.slice(2).map((t) => <TabBtn key={t.id} t={t} on={tab === t.id} onClick={() => setTab(t.id)} />)}
        </div>
      </nav>

      {session && <WorkoutSession id={session} />}
      {cook && <CookMode key={cook.id} />}
      <SheetHost />
      <Celebrations />
      <Toast />
    </div>
  );
}

function TabBtn({ t, on, onClick }: { t: (typeof TABS)[number]; on: boolean; onClick: () => void }) {
  const Icon = t.icon;
  return (
    <button className={'tab' + (on ? ' on' : '')} onClick={onClick} aria-current={on ? 'page' : undefined}>
      <Icon />
      {t.label}
    </button>
  );
}
