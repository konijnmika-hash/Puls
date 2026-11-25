import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALL_EQUIP } from '../data/exercises';
import { FOOD_BY_ID, type Food } from '../data/foods';
import type { Recipe } from '../data/recipes';
import type { WorkoutLog } from './training';
import { mergeShopping, portionNutrients, portionText, recipeFood, type Prefs, type ShopItem } from './recipes';
import { dateKey } from './date';
import type { Cadeau } from './cadeau';
import type { ActivityEntry, DayLog, FoodEntry, MealKey, Profile, WeightEntry } from './types';

export const emptyDay = (): DayLog => ({
  meals: { ontbijt: [], lunch: [], diner: [], snacks: [] },
  waterMl: 0,
  steps: 0,
  activities: [],
  workoutsDone: [],
});

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

/** Een eigen maaltijd: een vaste combinatie van producten die je in één tik logt. */
export interface SavedMeal {
  id: string;
  name: string;
  items: { food: Food; grams: number; label: string }[];
  /** bij welke maaltijd hij bewaard is (voor de volgorde) */
  meal: MealKey;
  /** hoe vaak gelogd */
  used: number;
}

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
  premium: boolean;
  /** Premium voor altijd gekregen via een cadeaucode */
  cadeau: Cadeau | null;
  setCadeau: (c: Cadeau) => void;
  glassMl: number;
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
  /** eigen maaltijden */
  savedMeals: SavedMeal[];

  setProfile: (p: Profile) => void;
  updateProfile: (p: Partial<Profile>) => void;
  /** geeft de id van de nieuwe regel terug (om ongedaan te maken) */
  addFood: (date: string, meal: MealKey, food: Food, grams: number, label: string) => string;
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
  setPremium: (v: boolean) => void;
  setSettings: (s: Partial<Pick<State, 'glassMl' | 'stepsSource'>>) => void;
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
  saveMeal: (name: string, meal: MealKey, entries: FoodEntry[]) => void;
  deleteSavedMeal: (id: string) => void;
  logSavedMeal: (date: string, meal: MealKey, id: string) => void;
  clearMeal: (date: string, meal: MealKey) => void;
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
  premium: false,
  cadeau: null as Cadeau | null,
  glassMl: 250,
  stepsSource: 'handmatig' as const,
  reminders: DEFAULT_REMINDERS,
  fired: {} as Record<string, string[]>,
  cheered: {} as Record<string, string[]>,
  favRecipes: [] as string[],
  cooked: {} as Record<string, number>,
  shopping: [] as ShopItem[],
  recipePrefs: { vega: false } as Prefs,
  savedMeals: [] as SavedMeal[],
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
          return entry.id;
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
        setPremium: (premium) => set((s) => ({ premium: premium || !!s.cadeau })),
        setCadeau: (cadeau) => set({ cadeau, premium: true }),
        setSettings: (st) => set(st),
        setReminders: (r) => set((s) => ({ reminders: { ...s.reminders, ...r } })),
        markFired: (date, id) => set((s) => ({ fired: { [date]: [...(s.fired[date] ?? []), id] } })),
        markCheered: (date, ids) => set((s) => ({ cheered: { [date]: [...new Set([...(s.cheered[date] ?? []), ...ids])] } })),
        reset: () => set((s) => ({ ...initial, cadeau: s.cadeau, premium: !!s.cadeau })),

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

        saveMeal: (name, meal, entries) =>
          set((s) => ({
            savedMeals: [
              { id: uid(), name, meal, used: 0, items: entries.map((e) => ({ food: e.food, grams: e.grams, label: e.label })) },
              ...s.savedMeals,
            ],
          })),
        deleteSavedMeal: (id) => set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) })),
        logSavedMeal: (date, meal, id) => {
          const saved = useStore.getState().savedMeals.find((m) => m.id === id);
          if (!saved) return;
          const entries: FoodEntry[] = saved.items.map((i) => ({ id: uid(), food: i.food, grams: i.grams, label: i.label }));
          updateDay(date, (d) => ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], ...entries] } }));
          set((s) => ({ savedMeals: s.savedMeals.map((m) => (m.id === id ? { ...m, used: m.used + 1 } : m)) }));
        },
        clearMeal: (date, meal) => updateDay(date, (d) => ({ ...d, meals: { ...d.meals, [meal]: [] } })),
      };
    },
    {
      name: 'puls-v1',
      version: 5,
      migrate: (persisted) => {
        const s = persisted as State;
        // oudere dagboekregels: vezels en (nieuwe) categorie uit de database aanvullen
        const fresh = (f: Food): Food => {
          const db = f.source === 'db' ? FOOD_BY_ID.get(f.id) : undefined;
          return db ? { ...f, cat: db.cat, fib: f.fib ?? db.fib } : f;
        };
        if (s.days) {
          for (const d of Object.values(s.days)) {
            for (const m of Object.keys(d.meals) as MealKey[]) d.meals[m] = d.meals[m].map((e) => ({ ...e, food: fresh(e.food) }));
          }
        }
        if (s.recent) s.recent = s.recent.map(fresh);
        return { ...s, profile: s.profile ? normalizeProfile(s.profile) : null, reminders: s.reminders ?? DEFAULT_REMINDERS, fired: s.fired ?? {}, cheered: s.cheered ?? {}, favRecipes: s.favRecipes ?? [], workoutLog: s.workoutLog ?? [], cooked: s.cooked ?? {}, shopping: s.shopping ?? [], recipePrefs: s.recipePrefs ?? { vega: false }, cadeau: s.cadeau ?? null, savedMeals: s.savedMeals ?? [] } as State;
      },
    },
  ),
);

export const newId = uid;
