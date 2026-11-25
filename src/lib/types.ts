import type { Equip } from '../data/exercises';
import type { Food } from '../data/foods';

export type Sex = 'man' | 'vrouw' | 'anders';
export type ActivityLevel = 'zittend' | 'licht' | 'gemiddeld' | 'actief' | 'zeer';
/** recomp = vet verliezen en tegelijk spieren opbouwen */
export type Goal = 'afvallen' | 'recomp' | 'onderhouden' | 'aankomen';
export type Pace = 'rustig' | 'normaal' | 'snel';
export type Focus = 'afvallen' | 'spiermassa' | 'kracht' | 'fit';
export type Experience = 'nieuw' | 'beginner' | 'gemiddeld' | 'ervaren';
export type Place = 'gym' | 'thuis';
export type MealKey = 'ontbijt' | 'lunch' | 'diner' | 'snacks';
/** Hoe je je calorieën over de dag verdeelt */
export type EatPattern = 'standaard' | 'groot-ontbijt' | 'geen-ontbijt' | 'tussendoor';
/** Verdeling van vet en koolhydraten (eiwit blijft gelijk) */
export type MacroStyle = 'gebalanceerd' | 'koolhydraatarm' | 'sportief';

export const MEALS: MealKey[] = ['ontbijt', 'lunch', 'diner', 'snacks'];

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  /** gewicht bij de start, voor de voortgang */
  startWeightKg?: number;
  activity: ActivityLevel;
  goal: Goal;
  pace: Pace;
  /** 0 = maandag ... 6 = zondag */
  trainDays: number[];
  focus: Focus;
  experience: Experience;
  place: Place;
  /** apparatuur die je kunt gebruiken */
  equipment: Equip[];
  /** oefeningen die je niet kunt of wilt doen */
  excluded: string[];
  /** zelf gekozen vervangers per plek in het schema */
  swaps: Record<string, string>;
  /** zelfinschatting 1-10: hoeveel vet (1 = heel slank, 10 = veel overgewicht) */
  fat: number;
  /** zelfinschatting 1-10: hoeveel spieren (1 = weinig, 10 = bodybuilder) */
  muscle: number;
  /** Handmatig overschreven doelen (Premium) */
  custom?: { kcal?: number; waterMl?: number; steps?: number };
  /** eetpatroon: hoe de calorieën over de maaltijden verdeeld worden */
  pattern?: EatPattern;
  /** verdeling van vet en koolhydraten */
  macroStyle?: MacroStyle;
  /** calorie-doel bijsturen op basis van je gemeten verbruik (eten + gewichtstrend) */
  adaptive?: boolean;
  createdAt: string;
}

export interface Targets {
  kcal: number;
  p: number;
  c: number;
  f: number;
  /** vezels in gram */
  fib: number;
  waterMl: number;
  steps: number;
  /** rustverbranding */
  bmr: number;
  /** totaal verbruik per dag (dagelijks leven + training) */
  tdee: number;
  /** verbruik door dagelijks leven, zonder training */
  neat: number;
  /** gemiddeld per dag verbruikt door je trainingen */
  sport: number;
  /** kcal per dag t.o.v. je verbruik: negatief = tekort, positief = overschot */
  delta: number;
  /** verwachte gewichtsverandering per week (negatief = afvallen) */
  kgPerWeek: number;
  /** geschat vetpercentage */
  bodyFat: number;
  /** vetvrije massa in kg */
  lbm: number;
  /** deel van de dag per maaltijd [min, max] */
  split: Record<MealKey, [number, number]>;
  /** het verbruik is bijgestuurd met je eigen gegevens */
  adaptive: boolean;
}

export interface FoodEntry {
  id: string;
  food: Food;
  grams: number;
  /** bijv. "2 × snee" of "150 g" */
  label: string;
}

export interface ActivityEntry {
  id: string;
  name: string;
  emoji: string;
  minutes: number;
  kcal: number;
  /** id van de trainingsdag als dit een schema-training was */
  workout?: string;
}

export interface DayLog {
  meals: Record<MealKey, FoodEntry[]>;
  waterMl: number;
  steps: number;
  activities: ActivityEntry[];
  /** id's van afgeronde trainingsdagen (bijv. "push") */
  workoutsDone: string[];
}

export interface WeightEntry {
  date: string;
  kg: number;
}
