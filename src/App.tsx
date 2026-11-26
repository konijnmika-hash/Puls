import { useEffect } from 'react';
import { AddFoodSheet, EditEntrySheet, MealBuilderSheet, SaveMealSheet } from './components/FoodSheets';
import {
  ActivitySheet, ConnectSheet, ExerciseSheet, ExplainSheet, GoalsSheet, PlanEditSheet, PremiumSheet, ProfileEditSheet, QuickSheet, StepsSheet, WeightSheet,
} from './components/Sheets';
import { toast, Toast } from './components/ui';
import { controleerCode } from './lib/cadeau';
import { Celebrations, InboxSheet, useReminders } from './components/Coach';
import { CookMode, RecipeSheet, ShoppingSheet } from './components/RecipeSheets';
import { WaterSheet } from './components/WaterSheet';
import { CopySheet, DataSheet, NoteSheet, WeightHistorySheet } from './components/DaySheets';
import { GoalEditSheet } from './components/GoalSheets';
import { CustomExerciseSheet, ExerciseHistorySheet, TemplateEditSheet, WorkoutDetailSheet } from './components/TrainingSheets';
import { BottomNav, Sidebar } from './components/Nav';
import { Recipes } from './screens/Recipes';
import { dateKey } from './lib/date';
import { useStore } from './lib/store';
import { useBack } from './lib/back';
import { useUI } from './lib/ui';
import { Onboarding } from './screens/Onboarding';
import { Progress } from './screens/Progress';
import { ProfileScreen } from './screens/Profile';
import { Today } from './screens/Today';
import { Training, WorkoutSession } from './screens/Training';
import { GoalsScreen } from './screens/Goals';
import { CalendarScreen } from './screens/Calendar';

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
    case 'exercise': return <ExerciseSheet id={sheet.id} slotKey={sheet.slotKey} />;
    case 'inbox': return <InboxSheet />;
    case 'recipe': return <RecipeSheet key={sheet.id} id={sheet.id} meal={sheet.meal} planned={sheet.factor} />;
    case 'shopping': return <ShoppingSheet />;
    case 'saveMeal': return <SaveMealSheet meal={sheet.meal} />;
    case 'explain': return <ExplainSheet />;
    case 'water': return <WaterSheet />;
    case 'copy': return <CopySheet from={sheet.from} meal={sheet.meal} />;
    case 'mealBuilder': return <MealBuilderSheet id={sheet.id} />;
    case 'goalEdit': return <GoalEditSheet />;
    case 'templateEdit': return <TemplateEditSheet id={sheet.id} />;
    case 'customExercise': return <CustomExerciseSheet />;
    case 'workoutDetail': return <WorkoutDetailSheet index={sheet.index} />;
    case 'exerciseHistory': return <ExerciseHistorySheet id={sheet.id} />;
    case 'weightHistory': return <WeightHistorySheet />;
    case 'note': return <NoteSheet date={sheet.date} />;
    case 'data': return <DataSheet />;
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
  const { tab, setTab, session, cook } = useUI();
  useReminders();
  // terugknop op een ander tabblad: eerst naar Vandaag
  useBack(() => (tab !== 'vandaag' ? (setTab('vandaag'), true) : false));

  return (
    <div className="app">
      <Sidebar />
      <main className="content" key={tab}>
        {tab === 'vandaag' && <Today />}
        {tab === 'recepten' && <Recipes />}
        {tab === 'training' && <Training />}
        {tab === 'voortgang' && <Progress />}
        {tab === 'doelen' && <GoalsScreen />}
        {tab === 'kalender' && <CalendarScreen />}
        {tab === 'profiel' && <ProfileScreen />}
      </main>
      <BottomNav />

      {session && <WorkoutSession id={session} />}
      {cook && <CookMode key={cook.id} />}
      <SheetHost />
      <Celebrations />
      <Toast />
    </div>
  );
}
