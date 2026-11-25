export interface ActivityLevelOption {
  label: string;
  /** Metabolic equivalent (Compendium of Physical Activities) */
  met: number;
}

export interface ActivityType {
  id: string;
  name: string;
  emoji: string;
  /** standaard MET (gemiddelde intensiteit) */
  met: number;
  /** keuze in tempo of zwaarte; de middelste is de standaard */
  levels?: ActivityLevelOption[];
}

const L = (...xs: [string, number][]) => xs.map(([label, met]) => ({ label, met }));

export const ACTIVITIES: ActivityType[] = [
  { id: 'wandelen', name: 'Wandelen', emoji: '🚶', met: 3.5, levels: L(['Rustig (± 4 km/u)', 3], ['Stevig (± 5,5 km/u)', 4.3], ['Bergop of met rugzak', 6]) },
  { id: 'hardlopen', name: 'Hardlopen', emoji: '🏃', met: 9.8, levels: L(['± 8 km/u', 8.3], ['± 10 km/u', 9.8], ['± 12 km/u', 11.8], ['14+ km/u', 12.8]) },
  { id: 'fietsen', name: 'Fietsen', emoji: '🚴', met: 6.8, levels: L(['Rustig (onder 16 km/u)', 4], ['Normaal (± 18 km/u)', 6.8], ['Stevig (± 22 km/u)', 8], ['Wielrennen (25+ km/u)', 10]) },
  { id: 'krachttraining', name: 'Krachttraining', emoji: '🏋️', met: 5, levels: L(['Licht', 3.5], ['Gemiddeld', 5], ['Zwaar', 6]) },
  { id: 'hiit', name: 'HIIT / bootcamp', emoji: '⚡', met: 8 },
  { id: 'spinning', name: 'Spinning', emoji: '🚲', met: 8.5, levels: L(['Rustig', 6.8], ['Gemiddeld', 8.5], ['Zwaar', 10.5]) },
  { id: 'zwemmen', name: 'Zwemmen', emoji: '🏊', met: 7, levels: L(['Rustig', 5.8], ['Gemiddeld', 7], ['Snel', 9.8]) },
  { id: 'crosstrainer', name: 'Crosstrainer', emoji: '🏃', met: 5, levels: L(['Rustig', 4.5], ['Gemiddeld', 5], ['Stevig', 7]) },
  { id: 'roeien', name: 'Roeien', emoji: '🚣', met: 7, levels: L(['Rustig', 4.8], ['Gemiddeld', 7], ['Stevig', 8.5]) },
  { id: 'traplopen', name: 'Traplopen', emoji: '🪜', met: 8.8 },
  { id: 'voetbal', name: 'Voetbal', emoji: '⚽', met: 7, levels: L(['Training', 7], ['Wedstrijd', 10]) },
  { id: 'hockey', name: 'Hockey', emoji: '🏑', met: 8 },
  { id: 'basketbal', name: 'Basketbal', emoji: '🏀', met: 6.5 },
  { id: 'volleybal', name: 'Volleybal', emoji: '🏐', met: 4 },
  { id: 'padel', name: 'Padel', emoji: '🎾', met: 6 },
  { id: 'tennis', name: 'Tennis', emoji: '🎾', met: 7.3, levels: L(['Dubbel', 6], ['Enkel', 8]) },
  { id: 'badminton', name: 'Badminton', emoji: '🏸', met: 5.5 },
  { id: 'squash', name: 'Squash', emoji: '🎾', met: 7.3 },
  { id: 'tafeltennis', name: 'Tafeltennis', emoji: '🏓', met: 4 },
  { id: 'boksen', name: 'Boksen', emoji: '🥊', met: 7.8, levels: L(['Zakken slaan', 5.5], ['Training', 7.8], ['Sparren', 12.8]) },
  { id: 'vechtsport', name: 'Kickboksen / vechtsport', emoji: '🥋', met: 10.3 },
  { id: 'dansen', name: 'Dansen', emoji: '💃', met: 5, levels: L(['Rustig', 4.5], ['Zumba / aerobics', 6.5], ['Intensief', 7.8]) },
  { id: 'yoga', name: 'Yoga', emoji: '🧘', met: 2.5, levels: L(['Rustig', 2.5], ['Power / vinyasa', 4]) },
  { id: 'pilates', name: 'Pilates', emoji: '🤸', met: 3 },
  { id: 'klimmen', name: 'Klimmen / boulderen', emoji: '🧗', met: 7.5 },
  { id: 'mountainbiken', name: 'Mountainbiken', emoji: '🚵', met: 8.5 },
  { id: 'schaatsen', name: 'Schaatsen', emoji: '⛸️', met: 7 },
  { id: 'skien', name: 'Skiën / snowboarden', emoji: '⛷️', met: 6 },
  { id: 'skaten', name: 'Skeeleren', emoji: '🛼', met: 7.5 },
  { id: 'golf', name: 'Golf (lopend)', emoji: '⛳', met: 4.8 },
  { id: 'paardrijden', name: 'Paardrijden', emoji: '🏇', met: 5.5 },
  { id: 'suppen', name: 'Suppen / kanoën', emoji: '🛶', met: 5 },
  { id: 'tuinieren', name: 'Tuinieren', emoji: '🌱', met: 3.8 },
  { id: 'huishouden', name: 'Huishouden', emoji: '🧹', met: 3.3 },
  { id: 'verhuizen', name: 'Sjouwen / verhuizen', emoji: '📦', met: 6 },
];
