import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALL_EQUIP } from '../data/exercises';
import { FOOD_BY_ID, type Food } from '../data/foods';
import type { Recipe } from '../data/recipes';
import type { WorkoutLog } from './training';
import { mergeShopping, portionNutrients, portionText, recipeFood, setLightRecipes, type Prefs, type ShopItem } from './recipes';
import { dateKey } from './date';
import type { Cadeau } from './cadeau';
import { setCustomExercises, type CustomExercise, type WorkoutTemplate } from './exlib';
import type { ActivityEntry, DayLog, FoodEntry, Goals, Habit, MealKey, Profile, WeightEntry } from './types';

export const emptyDay = (): DayLog => ({
  meals: { ontbijt: [], lunch: [], diner: [], snacks: [] },
  waterMl: 0,
  steps: 0,
  activities: [],
  workoutsDone: [],
});

export type Theme = 'systeem' | 'licht' | 'donker';

/** Gezonde gewoontes die Puls voorstelt; je kunt ze aan- en uitzetten en eigen gewoontes toevoegen. */
export const DEFAULT_HABITS: Habit[] = [
  { id: 'groente', name: '250 g groente', em: '🥦', builtin: true, on: true },
  { id: 'fruit', name: '2 stuks fruit', em: '🍎', builtin: true, on: true },
  { id: 'slaap', name: '7 uur of meer geslapen', em: '😴', builtin: true, on: true },
  { id: 'buiten', name: 'Even naar buiten', em: '🌳', builtin: true, on: false },
  { id: 'stretch', name: '5 minuten stretchen', em: '🧘', builtin: true, on: false },
  { id: 'frisdrank', name: 'Geen suikerhoudende frisdrank', em: '🥤', builtin: true, on: false },
  { id: 'scherm', name: 'Laatste uur zonder scherm', em: '📵', builtin: true, on: false },
];

export const defaultGoals = (p?: Pick<Profile, 'trainDays'> | null): Goals => ({
  logDays: 5,
  activeMin: 150,
  trainings: Math.max(1, Math.min(6, p?.trainDays.length || 2)),
  waterDays: 5,
  stepDays: 4,
  habits: DEFAULT_HABITS.map((h) => ({ ...h })),
});

/** Gezonde grenzen voor persoonlijke doelen: geen extreme doelen. */
export const GOAL_LIMITS = {
  logDays: [1, 7],
  activeMin: [30, 600],
  trainings: [1, 6],
  waterDays: [1, 7],
  stepDays: [1, 7],
} as const satisfies Record<Exclude<keyof Goals, 'habits'>, readonly [number, number]>;

const clampGoal = (k: keyof typeof GOAL_LIMITS, v: number) => Math.max(GOAL_LIMITS[k][0], Math.min(GOAL_LIMITS[k][1], Math.round(v)));

/**
 * Tegen dubbele registraties: dezelfde handeling binnen 2 seconden (dubbelklik, twee keer op opslaan)
 * telt maar één keer. Bewust niet voor het plusje bij eten: twee tikken = twee porties.
 */
const recentActions = new Map<string, number>();
export function isDuplicate(signature: string, windowMs = 2000) {
  const now = Date.now();
  const last = recentActions.get(signature);
  recentActions.set(signature, now);
  return last !== undefined && now - last < windowMs;
}

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
  /** eigen maaltijden */
  savedMeals: SavedMeal[];
  /** persoonlijke doelen en gewoontes */
  goals: Goals;
  /** per dag: welke gewoontes je hebt afgevinkt */
  habitLog: Record<string, string[]>;
  /** per dag: de uitdaging van de dag die je hebt afgevinkt (voor uitdagingen die Puls niet zelf kan meten) */
  challengeDone: Record<string, boolean>;
  customExercises: CustomExercise[];
  /** eigen trainingen */
  templates: WorkoutTemplate[];

  setProfile: (p: Profile) => void;
  updateProfile: (p: Partial<Profile>) => void;
  /** geeft de id van de nieuwe regel terug (om ongedaan te maken) */
  addFood: (date: string, meal: MealKey, food: Food, grams: number, label: string) => string;
  updateEntry: (date: string, meal: MealKey, id: string, grams: number, label: string) => void;
  removeEntry: (date: string, meal: MealKey, id: string) => void;
  /** kopieert een maaltijd naar een (andere) dag en eventueel een andere maaltijd; geeft het aantal regels terug */
  copyMeal: (from: string, to: string, meal: MealKey, toMeal?: MealKey) => number;
  /** kopieert alle maaltijden van een dag naar een andere dag */
  copyDay: (from: string, to: string) => number;
  moveEntry: (date: string, from: MealKey, id: string, to: MealKey) => void;
  setWater: (date: string, ml: number) => void;
  /** voegt water toe (met tijdstip); negatief haalt er af */
  addWater: (date: string, ml: number) => void;
  /** haalt één keer drinken weg uit de daglijst */
  removeSip: (date: string, index: number) => void;
  setNote: (date: string, note: string) => void;
  deleteWeight: (date: string) => void;
  setGoals: (g: Partial<Omit<Goals, 'habits'>>) => void;
  toggleHabit: (date: string, id: string) => void;
  setHabitOn: (id: string, on: boolean) => void;
  addHabit: (name: string, em: string) => void;
  removeHabit: (id: string) => void;
  setChallengeDone: (date: string, done: boolean) => void;
  addCustomExercise: (e: Omit<CustomExercise, 'id'>) => string;
  deleteCustomExercise: (id: string) => void;
  saveTemplate: (t: Omit<WorkoutTemplate, 'id' | 'used' | 'created'> & { id?: string }) => string;
  deleteTemplate: (id: string) => void;
  toggleFavTemplate: (id: string) => void;
  updateSavedMeal: (id: string, patch: Partial<Pick<SavedMeal, 'name' | 'items' | 'meal'>>) => void;
  createMeal: (name: string, meal: MealKey, items: SavedMeal['items']) => void;
  deleteCustomFood: (id: string) => void;
  /** zet een back-up terug (vervangt alles) */
  restore: (data: PersistedData) => void;
  setSteps: (date: string, steps: number) => void;
  addActivity: (date: string, a: Omit<ActivityEntry, 'id'>) => void;
  removeActivity: (date: string, id: string) => void;
  completeWorkout: (date: string, workoutId: string, a: Omit<ActivityEntry, 'id'>, lifts: Record<string, number>, log?: WorkoutLog) => void;
  logWeight: (date: string, kg: number) => void;
  toggleFavorite: (id: string) => void;
  addCustomFood: (f: Food) => void;
  setPremium: (v: boolean) => void;
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
  saveMeal: (name: string, meal: MealKey, entries: FoodEntry[]) => void;
  deleteSavedMeal: (id: string) => void;
  /** geeft de id's van de nieuwe regels terug (om ongedaan te maken) */
  logSavedMeal: (date: string, meal: MealKey, id: string) => string[];
  clearMeal: (date: string, meal: MealKey) => void;
}

const initial = {
  profile: null,
  days: {} as Record<string, DayLog>,
  weights: [] as WeightEntry[],
  recent: [] as Food[],
  favorites: [] as string[],
  customFoods: [] as Food[],
  lifts: {} as Record<string, number>,
  workoutLog: [] as WorkoutLog[],
  premium: false,
  cadeau: null as Cadeau | null,
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
  savedMeals: [] as SavedMeal[],
  goals: defaultGoals(),
  habitLog: {} as Record<string, string[]>,
  challengeDone: {} as Record<string, boolean>,
  customExercises: [] as CustomExercise[],
  templates: [] as WorkoutTemplate[],
};

/** Alles wat bewaard wordt (zonder de functies). */
export type PersistedData = Omit<typeof initial, 'profile' | 'stepsSource'> & { profile: Profile | null; stepsSource: 'handmatig' | 'health' };

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const updateDay = (date: string, fn: (d: DayLog) => DayLog) =>
        set((s) => ({ days: { ...s.days, [date]: fn(s.days[date] ?? emptyDay()) } }));

      return {
        ...initial,

        setProfile: (profile) =>
          set((s) => ({
            profile: normalizeProfile(profile),
            weights: s.weights.length ? s.weights : [{ date: dateKey(), kg: profile.weightKg }],
            goals: s.profile ? s.goals : { ...s.goals, trainings: defaultGoals(profile).trainings },
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
        copyMeal: (from, to, meal, toMeal = meal) => {
          const src = get().days[from]?.meals[meal] ?? [];
          if (!src.length || isDuplicate(`copy:${from}:${meal}:${to}:${toMeal}`)) return 0;
          const copies = src.map((e) => ({ ...e, id: uid() }));
          updateDay(to, (d) => ({ ...d, meals: { ...d.meals, [toMeal]: [...d.meals[toMeal], ...copies] } }));
          return copies.length;
        },
        copyDay: (from, to) => {
          const src = get().days[from];
          if (!src || from === to || isDuplicate(`copyday:${from}:${to}`)) return 0;
          let n = 0;
          updateDay(to, (d) => {
            const meals = { ...d.meals };
            for (const m of Object.keys(meals) as MealKey[]) {
              const copies = src.meals[m].map((e) => ({ ...e, id: uid() }));
              n += copies.length;
              meals[m] = [...meals[m], ...copies];
            }
            return { ...d, meals };
          });
          return n;
        },
        moveEntry: (date, from, id, to) =>
          updateDay(date, (d) => {
            const e = d.meals[from].find((x) => x.id === id);
            if (!e || from === to) return d;
            return { ...d, meals: { ...d.meals, [from]: d.meals[from].filter((x) => x.id !== id), [to]: [...d.meals[to], e] } };
          }),

        setWater: (date, ml) =>
          updateDay(date, (d) => {
            const waterMl = Math.max(0, Math.min(8000, Math.round(ml)));
            // daglijst inkorten als het totaal lager wordt, zodat de twee blijven kloppen
            let sips = d.sips;
            if (sips && waterMl < d.waterMl) {
              sips = [...sips];
              let sum = sips.reduce((t, x) => t + x.ml, 0);
              while (sips.length && sum > waterMl) sum -= sips.pop()!.ml;
            }
            return { ...d, waterMl, sips };
          }),
        addWater: (date, ml) => {
          if (ml < 0) return get().setWater(date, (get().days[date]?.waterMl ?? 0) + ml);
          updateDay(date, (d) => {
            const room = 8000 - d.waterMl;
            const add = Math.max(0, Math.min(room, Math.round(ml)));
            if (!add) return d;
            return { ...d, waterMl: d.waterMl + add, sips: [...(d.sips ?? []), { t: Date.now(), ml: add }] };
          });
        },
        removeSip: (date, index) =>
          updateDay(date, (d) => {
            const sip = d.sips?.[index];
            if (!sip) return d;
            return { ...d, waterMl: Math.max(0, d.waterMl - sip.ml), sips: d.sips!.filter((_, i) => i !== index) };
          }),
        setNote: (date, note) => updateDay(date, (d) => ({ ...d, note: note.slice(0, 2000) || undefined })),
        setSteps: (date, steps) => updateDay(date, (d) => ({ ...d, steps: Math.max(0, Math.round(steps)) })),

        addActivity: (date, a) => {
          if (isDuplicate(`act:${date}:${a.name}:${a.minutes}:${a.kcal}`)) return;
          updateDay(date, (d) => ({ ...d, activities: [...d.activities, { ...a, id: uid() }] }));
        },
        removeActivity: (date, id) => {
          const removed = get().days[date]?.activities.find((a) => a.id === id);
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
          // twee keer op opslaan of een dubbele tik: maar één keer bewaren
          if (isDuplicate(`workout:${date}:${workoutId}`, 5000)) return;
          if (log) set((s) => ({ workoutLog: [...s.workoutLog, log].slice(-500) }));
          if (workoutId.startsWith('tpl-')) set((s) => ({ templates: s.templates.map((t) => (t.id === workoutId ? { ...t, used: t.used + 1 } : t)) }));
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

        deleteWeight: (date) =>
          set((s) => {
            const weights = s.weights.filter((w) => w.date !== date);
            if (!weights.length) return {};
            const latest = weights[weights.length - 1];
            return { weights, profile: s.profile ? { ...s.profile, weightKg: latest.kg } : s.profile };
          }),

        toggleFavorite: (id) =>
          set((s) => ({
            favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
          })),
        addCustomFood: (f) => {
          if (isDuplicate(`food:${f.name}:${f.kcal}`)) return;
          set((s) => ({ customFoods: [f, ...s.customFoods] }));
        },
        deleteCustomFood: (id) => set((s) => ({ customFoods: s.customFoods.filter((f) => f.id !== id), favorites: s.favorites.filter((f) => f !== id) })),
        setPremium: (premium) => set((s) => ({ premium: premium || !!s.cadeau })),
        setCadeau: (cadeau) => set({ cadeau, premium: true }),
        setSettings: (st) => set(st),
        setReminders: (r) => set((s) => ({ reminders: { ...s.reminders, ...r } })),
        markFired: (date, id) => set((s) => ({ fired: { [date]: [...(s.fired[date] ?? []), id] } })),
        markCheered: (date, ids) => set((s) => ({ cheered: { [date]: [...new Set([...(s.cheered[date] ?? []), ...ids])] } })),
        reset: () => set((s) => ({ ...initial, cadeau: s.cadeau, premium: !!s.cadeau })),

        logRecipe: (date, meal, r, factor) => {
          if (isDuplicate(`recipe:${date}:${meal}:${r.id}:${factor}`)) return;
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
          !isDuplicate(`meal:${name}`) && set((s) => ({
            savedMeals: [
              { id: uid(), name, meal, used: 0, items: entries.map((e) => ({ food: e.food, grams: e.grams, label: e.label })) },
              ...s.savedMeals,
            ],
          })),
        deleteSavedMeal: (id) => set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) })),
        logSavedMeal: (date, meal, id) => {
          const saved = get().savedMeals.find((m) => m.id === id);
          if (!saved || isDuplicate(`logmeal:${date}:${meal}:${id}`)) return [];
          const entries: FoodEntry[] = saved.items.map((i) => ({ id: uid(), food: i.food, grams: i.grams, label: i.label }));
          updateDay(date, (d) => ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], ...entries] } }));
          set((s) => ({
            savedMeals: s.savedMeals.map((m) => (m.id === id ? { ...m, used: m.used + 1 } : m)),
            recent: [...saved.items.map((i) => i.food), ...s.recent].filter((f, i, all) => all.findIndex((x) => x.id === f.id) === i).slice(0, 30),
          }));
          return entries.map((e) => e.id);
        },
        updateSavedMeal: (id, patch) => set((s) => ({ savedMeals: s.savedMeals.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
        createMeal: (name, meal, items) => {
          if (!items.length || isDuplicate(`meal:${name}`)) return;
          set((s) => ({ savedMeals: [{ id: uid(), name, meal, used: 0, items }, ...s.savedMeals] }));
        },
        clearMeal: (date, meal) => updateDay(date, (d) => ({ ...d, meals: { ...d.meals, [meal]: [] } })),

        setGoals: (g) =>
          set((s) => {
            const next = { ...s.goals };
            for (const [k, v] of Object.entries(g) as [keyof typeof GOAL_LIMITS, number][]) if (Number.isFinite(v)) next[k] = clampGoal(k, v);
            return { goals: next };
          }),
        toggleHabit: (date, id) =>
          set((s) => {
            const cur = s.habitLog[date] ?? [];
            return { habitLog: { ...s.habitLog, [date]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } };
          }),
        setHabitOn: (id, on) => set((s) => ({ goals: { ...s.goals, habits: s.goals.habits.map((h) => (h.id === id ? { ...h, on } : h)) } })),
        addHabit: (name, em) => {
          const clean = name.trim().slice(0, 60);
          if (!clean || isDuplicate(`habit:${clean}`)) return;
          set((s) => ({ goals: { ...s.goals, habits: [...s.goals.habits, { id: 'h-' + uid(), name: clean, em: em || '✨', on: true }] } }));
        },
        removeHabit: (id) => set((s) => ({ goals: { ...s.goals, habits: s.goals.habits.filter((h) => h.id !== id || h.builtin) } })),
        setChallengeDone: (date, done) => set((s) => ({ challengeDone: { ...s.challengeDone, [date]: done } })),

        addCustomExercise: (e) => {
          const id = 'cx-' + uid();
          if (isDuplicate(`cx:${e.name}`)) return get().customExercises.find((c) => c.name === e.name)?.id ?? id;
          set((s) => ({ customExercises: [{ ...e, id }, ...s.customExercises] }));
          return id;
        },
        deleteCustomExercise: (id) =>
          set((s) => ({
            customExercises: s.customExercises.filter((c) => c.id !== id),
            templates: s.templates.map((t) => ({ ...t, items: t.items.filter((i) => i.ex !== id) })),
          })),
        saveTemplate: (t) => {
          const existing = t.id ? get().templates.find((x) => x.id === t.id) : undefined;
          if (existing) {
            set((s) => ({ templates: s.templates.map((x) => (x.id === t.id ? { ...x, name: t.name, items: t.items, fav: t.fav } : x)) }));
            return existing.id;
          }
          const id = 'tpl-' + uid();
          if (isDuplicate(`tpl:${t.name}`)) return id;
          set((s) => ({ templates: [{ id, name: t.name, items: t.items, fav: t.fav, used: 0, created: dateKey() }, ...s.templates] }));
          return id;
        },
        deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
        toggleFavTemplate: (id) => set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, fav: !t.fav } : t)) })),

        restore: (data) =>
          set({
            ...initial,
            ...data,
            profile: data.profile ? normalizeProfile(data.profile) : null,
            goals: data.goals ? { ...defaultGoals(data.profile), ...data.goals, habits: data.goals.habits ?? defaultGoals().habits } : defaultGoals(data.profile),
            reminders: data.reminders ?? DEFAULT_REMINDERS,
          }),
      };
    },
    {
      name: 'puls-v1',
      version: 6,
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
        return { ...s, profile: s.profile ? normalizeProfile(s.profile) : null, reminders: s.reminders ?? DEFAULT_REMINDERS, fired: s.fired ?? {}, cheered: s.cheered ?? {}, favRecipes: s.favRecipes ?? [], workoutLog: s.workoutLog ?? [], cooked: s.cooked ?? {}, shopping: s.shopping ?? [], recipePrefs: s.recipePrefs ?? { vega: false }, cadeau: s.cadeau ?? null, savedMeals: s.savedMeals ?? [], theme: s.theme ?? 'systeem',
          // nieuw in versie 6: doelen, gewoontes, eigen oefeningen en trainingen
          goals: s.goals ? { ...defaultGoals(s.profile), ...s.goals, habits: s.goals.habits ?? defaultGoals().habits } : defaultGoals(s.profile),
          habitLog: s.habitLog ?? {}, challengeDone: s.challengeDone ?? {}, customExercises: s.customExercises ?? [], templates: s.templates ?? [] } as State;
      },
    },
  ),
);

export const newId = uid;

// Eigen oefeningen beschikbaar maken voor het schema, de sessie en de geschiedenis
setCustomExercises(useStore.getState().customExercises);
useStore.subscribe((s, prev) => {
  if (s.customExercises !== prev.customExercises) setCustomExercises(s.customExercises);
});

// Lichter koken volgt je receptvoorkeur (vóór React opnieuw tekent, zodat alle waarden kloppen)
setLightRecipes(!!useStore.getState().recipePrefs.light);
useStore.subscribe((s, prev) => {
  if (s.recipePrefs.light !== prev.recipePrefs.light) setLightRecipes(!!s.recipePrefs.light);
});

// Thema meteen toepassen, en opnieuw als je het wijzigt of je telefoon wisselt tussen licht en donker
if (typeof window !== 'undefined') {
  applyTheme(useStore.getState().theme);
  useStore.subscribe((s, prev) => {
    if (s.theme !== prev.theme) applyTheme(s.theme);
  });
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(useStore.getState().theme));
}
