import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALL_EQUIP } from '../data/exercises';
import type { Food } from '../data/foods';
import type { Recipe } from '../data/recipes';
import type { WorkoutLog } from './training';
import { mergeShopping, portionNutrients, portionText, recipeFood, setLightRecipes, type Prefs, type ShopItem } from './recipes';
import { isCut } from './calc';
import type { Account, Subscription } from './account';
import { dateKey } from './date';
import type { ActivityEntry, DayLog, FoodEntry, MealKey, Profile, WeightEntry } from './types';

export const emptyDay = (): DayLog => ({
  meals: { ontbijt: [], lunch: [], diner: [], snacks: [] },
  waterMl: 0,
  steps: 0,
  activities: [],
  workoutsDone: [],
});

export type Theme = 'systeem' | 'licht' | 'donker';

/** Zet het thema op de pagina, ook de kleur van de statusbalk. */
export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'systeem') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme === 'donker' ? 'dark' : 'light');
  const dark = theme === 'donker' || (theme === 'systeem' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0c1813' : '#edf3ea'));
}

export interface Reminders {
  on: boolean;
  water: boolean;
  meals: boolean;
  training: boolean;
  evening: boolean;
  /** HH:MM */
  trainingTime: string;
}

export const DEFAULT_REMINDERS: Reminders = { on: true, water: true, meals: true, training: true, evening: true, trainingTime: '18:00' };

/** Vult velden aan die in oudere versies nog niet bestonden. */
export function normalizeProfile(p: Profile & { level?: string }): Profile {
  return {
    ...p,
    experience: p.experience ?? (p.level === 'gevorderd' ? 'gemiddeld' : 'beginner'),
    equipment: p.equipment ?? (p.place === 'thuis' ? [] : [...ALL_EQUIP]),
    excluded: p.excluded ?? [],
    swaps: p.swaps ?? {},
    fat: p.fat ?? 5,
    muscle: p.muscle ?? 4,
  };
}

// Gegevens van de eerdere naam meenemen
try {
  if (typeof localStorage !== 'undefined' && !localStorage.getItem('puls-v1')) {
    const old = localStorage.getItem('fris-v1');
    if (old) localStorage.setItem('puls-v1', old);
  }
} catch {
  /* opslag niet beschikbaar */
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

interface State {
  profile: Profile | null;
  days: Record<string, DayLog>;
  weights: WeightEntry[];
  recent: Food[];
  favorites: string[];
  customFoods: Food[];
  /** laatst gebruikte gewicht per oefening */
  lifts: Record<string, number>;
  /** afgeronde trainingen met alle sets, nieuwste achteraan */
  workoutLog: WorkoutLog[];
  /** eerste keer dat de app op dit apparaat openging: start van de proefperiode */
  installedAt: string;
  account: Account | null;
  loggedIn: boolean;
  subscription: Subscription | null;
  glassMl: number;
  /** licht, donker of volgens je telefoon */
  theme: Theme;
  stepsSource: 'handmatig' | 'health';
  reminders: Reminders;
  /** per dag: welke reminders al zijn verstuurd */
  fired: Record<string, string[]>;
  /** per dag: welke successen al gevierd zijn */
  cheered: Record<string, string[]>;
  /** favoriete recepten */
  favRecipes: string[];
  /** hoe vaak je een recept hebt gelogd */
  cooked: Record<string, number>;
  shopping: ShopItem[];
  recipePrefs: Prefs;

  setProfile: (p: Profile) => void;
  updateProfile: (p: Partial<Profile>) => void;
  addFood: (date: string, meal: MealKey, food: Food, grams: number, label: string) => void;
  updateEntry: (date: string, meal: MealKey, id: string, grams: number, label: string) => void;
  removeEntry: (date: string, meal: MealKey, id: string) => void;
  copyMeal: (from: string, to: string, meal: MealKey) => void;
  setWater: (date: string, ml: number) => void;
  setSteps: (date: string, steps: number) => void;
  addActivity: (date: string, a: Omit<ActivityEntry, 'id'>) => void;
  removeActivity: (date: string, id: string) => void;
  completeWorkout: (date: string, workoutId: string, a: Omit<ActivityEntry, 'id'>, lifts: Record<string, number>, log?: WorkoutLog) => void;
  logWeight: (date: string, kg: number) => void;
  toggleFavorite: (id: string) => void;
  addCustomFood: (f: Food) => void;
  createAccount: (a: Account) => void;
  setLoggedIn: (v: boolean) => void;
  setSubscription: (s: Subscription | null) => void;
  setSettings: (s: Partial<Pick<State, 'glassMl' | 'stepsSource' | 'theme'>>) => void;
  setReminders: (r: Partial<Reminders>) => void;
  markFired: (date: string, id: string) => void;
  markCheered: (date: string, ids: string[]) => void;
  reset: () => void;
  logRecipe: (date: string, meal: MealKey, r: Recipe, factor: number) => void;
  toggleFavRecipe: (id: string) => void;
  addToShopping: (r: Recipe, factor: number) => void;
  toggleShop: (key: string) => void;
  clearShopping: (onlyDone: boolean) => void;
  setRecipePrefs: (p: Partial<Prefs>) => void;
}

const initial = {
  profile: null,
  days: {},
  weights: [],
  recent: [],
  favorites: [],
  customFoods: [],
  lifts: {},
  workoutLog: [] as WorkoutLog[],
  installedAt: new Date().toISOString(),
  account: null as Account | null,
  loggedIn: false,
  subscription: null as Subscription | null,
  glassMl: 250,
  theme: 'systeem' as Theme,
  stepsSource: 'handmatig' as const,
  reminders: DEFAULT_REMINDERS,
  fired: {} as Record<string, string[]>,
  cheered: {} as Record<string, string[]>,
  favRecipes: [] as string[],
  cooked: {} as Record<string, number>,
  shopping: [] as ShopItem[],
  recipePrefs: { vega: false } as Prefs,
};

export const useStore = create<State>()(
  persist(
    (set) => {
      const updateDay = (date: string, fn: (d: DayLog) => DayLog) =>
        set((s) => ({ days: { ...s.days, [date]: fn(s.days[date] ?? emptyDay()) } }));

      return {
        ...initial,

        setProfile: (profile) =>
          set((s) => ({
            profile: normalizeProfile(profile),
            weights: s.weights.length ? s.weights : [{ date: dateKey(), kg: profile.weightKg }],
          })),
        updateProfile: (p) => set((s) => (s.profile ? { profile: { ...s.profile, ...p } } : {})),

        addFood: (date, meal, food, grams, label) => {
          const entry: FoodEntry = { id: uid(), food, grams, label };
          updateDay(date, (d) => ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], entry] } }));
          set((s) => ({ recent: [food, ...s.recent.filter((r) => r.id !== food.id)].slice(0, 30) }));
        },
        updateEntry: (date, meal, id, grams, label) =>
          updateDay(date, (d) => ({
            ...d,
            meals: { ...d.meals, [meal]: d.meals[meal].map((e) => (e.id === id ? { ...e, grams, label } : e)) },
          })),
        removeEntry: (date, meal, id) =>
          updateDay(date, (d) => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].filter((e) => e.id !== id) } })),
        copyMeal: (from, to, meal) =>
          set((s) => {
            const src = s.days[from]?.meals[meal] ?? [];
            const d = s.days[to] ?? emptyDay();
            const copies = src.map((e) => ({ ...e, id: uid() }));
            return { days: { ...s.days, [to]: { ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], ...copies] } } } };
          }),

        setWater: (date, ml) => updateDay(date, (d) => ({ ...d, waterMl: Math.max(0, Math.min(8000, ml)) })),
        setSteps: (date, steps) => updateDay(date, (d) => ({ ...d, steps: Math.max(0, Math.round(steps)) })),

        addActivity: (date, a) => updateDay(date, (d) => ({ ...d, activities: [...d.activities, { ...a, id: uid() }] })),
        removeActivity: (date, id) => {
          const removed = useStore.getState().days[date]?.activities.find((a) => a.id === id);
          if (removed?.workout) set((s) => ({ workoutLog: s.workoutLog.filter((l) => !(l.date === date && l.id === removed.workout)) }));
          updateDay(date, (d) => {
            const removed = d.activities.find((a) => a.id === id);
            return {
              ...d,
              activities: d.activities.filter((a) => a.id !== id),
              workoutsDone: removed?.workout ? d.workoutsDone.filter((w) => w !== removed.workout) : d.workoutsDone,
            };
          });
        },
        completeWorkout: (date, workoutId, a, lifts, log) => {
          if (log) set((s) => ({ workoutLog: [...s.workoutLog, log].slice(-150) }));
          updateDay(date, (d) => ({
            ...d,
            activities: [...d.activities, { ...a, id: uid(), workout: workoutId }],
            workoutsDone: [...new Set([...d.workoutsDone, workoutId])],
          }));
          set((s) => ({ lifts: { ...s.lifts, ...lifts } }));
        },

        logWeight: (date, kg) =>
          set((s) => {
            const weights = [...s.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) =>
              a.date.localeCompare(b.date),
            );
            const latest = weights[weights.length - 1];
            return { weights, profile: s.profile ? { ...s.profile, weightKg: latest.kg } : s.profile };
          }),

        toggleFavorite: (id) =>
          set((s) => ({
            favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
          })),
        addCustomFood: (f) => set((s) => ({ customFoods: [f, ...s.customFoods] })),
        createAccount: (account) => set({ account, loggedIn: true }),
        setLoggedIn: (loggedIn) => set({ loggedIn }),
        setSubscription: (subscription) => set({ subscription }),
        setSettings: (st) => set(st),
        setReminders: (r) => set((s) => ({ reminders: { ...s.reminders, ...r } })),
        markFired: (date, id) => set((s) => ({ fired: { [date]: [...(s.fired[date] ?? []), id] } })),
        markCheered: (date, ids) => set((s) => ({ cheered: { [date]: [...new Set([...(s.cheered[date] ?? []), ...ids])] } })),
        // account, proefperiode en abonnement blijven: opnieuw beginnen geeft geen nieuwe proefperiode
        reset: () => set((s) => ({ ...initial, theme: s.theme, installedAt: s.installedAt, account: s.account, loggedIn: s.loggedIn, subscription: s.subscription })),

        logRecipe: (date, meal, r, factor) => {
          // waarden van precies deze portie, met hele sneetjes en eieren
          const food = recipeFood(r, factor);
          const grams = Math.round(portionNutrients(r, factor).grams);
          const entry: FoodEntry = { id: uid(), food, grams, label: portionText(factor) };
          updateDay(date, (d) => ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], entry] } }));
          set((s) => ({
            recent: [food, ...s.recent.filter((x) => x.id !== food.id)].slice(0, 30),
            cooked: { ...s.cooked, [r.id]: (s.cooked[r.id] ?? 0) + 1 },
          }));
        },
        toggleFavRecipe: (id) =>
          set((s) => ({ favRecipes: s.favRecipes.includes(id) ? s.favRecipes.filter((f) => f !== id) : [...s.favRecipes, id] })),
        addToShopping: (r, factor) => set((s) => ({ shopping: mergeShopping(s.shopping, r, factor) })),
        toggleShop: (key) => set((s) => ({ shopping: s.shopping.map((i) => (i.key === key ? { ...i, done: !i.done } : i)) })),
        clearShopping: (onlyDone) => set((s) => ({ shopping: onlyDone ? s.shopping.filter((i) => !i.done) : [] })),
        setRecipePrefs: (p) => set((s) => ({ recipePrefs: { ...s.recipePrefs, ...p } })),
      };
    },
    {
      name: 'puls-v1',
      version: 5,
      migrate: (persisted) => {
        const s = persisted as State;
        return { ...s, profile: s.profile ? normalizeProfile(s.profile) : null, reminders: s.reminders ?? DEFAULT_REMINDERS, fired: s.fired ?? {}, cheered: s.cheered ?? {}, favRecipes: s.favRecipes ?? [], workoutLog: s.workoutLog ?? [], cooked: s.cooked ?? {}, shopping: s.shopping ?? [], recipePrefs: s.recipePrefs ?? { vega: false }, theme: s.theme ?? 'systeem', installedAt: s.installedAt ?? new Date().toISOString(), account: s.account ?? null, loggedIn: s.loggedIn ?? false, subscription: s.subscription ?? null } as State;
      },
    },
  ),
);

export const newId = uid;

// Thema en lichte recepten direct toepassen en meeveranderen
applyTheme(useStore.getState().theme);
setLightRecipes(isCut(useStore.getState().profile?.goal));
useStore.subscribe((s, prev) => {
  if (s.theme !== prev.theme) applyTheme(s.theme);
  if (s.profile?.goal !== prev.profile?.goal) setLightRecipes(isCut(s.profile?.goal));
});
if (typeof window !== 'undefined') window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(useStore.getState().theme));
