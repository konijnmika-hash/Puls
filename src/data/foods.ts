// Ingebouwde voedingsdatabase (waarden per 100 g of 100 ml, afgerond; gebaseerd op gangbare
// Nederlandse productwaarden). Online zoeken via Open Food Facts vult dit aan met miljoenen producten.
import { ALCOHOLIC, MORE_ROWS } from './foods-meer';

export type FoodCategory =
  | 'brood'
  | 'beleg'
  | 'zuivel'
  | 'vlees'
  | 'vega'
  | 'granen'
  | 'groente'
  | 'fruit'
  | 'snack'
  | 'zoet'
  | 'drank'
  | 'gerecht'
  | 'afhaal'
  | 'saus';

export interface Portion {
  label: string;
  g: number;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  cat: FoodCategory | 'online' | 'eigen' | 'recept';
  /** per 100 g / 100 ml */
  kcal: number;
  p: number;
  c: number;
  f: number;
  /** vezels per 100 g (ontbreekt = onbekend) */
  fib?: number;
  unit: 'g' | 'ml';
  portions: Portion[];
  source: 'db' | 'off' | 'custom' | 'recipe';
}

export const CATEGORY_LABEL: Record<Food['cat'], string> = {
  brood: 'Brood & ontbijt',
  beleg: 'Beleg, kaas & smeersels',
  zuivel: 'Zuivel & eieren',
  vlees: 'Vlees & vis',
  vega: 'Vega & peulvruchten',
  granen: 'Rijst, pasta & aardappel',
  groente: 'Groente',
  fruit: 'Fruit',
  snack: 'Noten, zaden & snacks',
  zoet: 'Koek, snoep & toetjes',
  drank: 'Dranken',
  gerecht: 'Maaltijden & soepen',
  afhaal: 'Snackbar & afhaal',
  saus: 'Sauzen, oliën & bakken',
  online: 'Online database',
  eigen: 'Eigen product',
  recept: 'Recept van Puls',
};

/** Volgorde van de categorieën in "Eten toevoegen" */
export const CATEGORY_ORDER: FoodCategory[] = ['brood', 'beleg', 'zuivel', 'vlees', 'vega', 'granen', 'groente', 'fruit', 'snack', 'zoet', 'drank', 'gerecht', 'afhaal', 'saus'];

// [naam, categorie, kcal, eiwit, koolhydraten, vet, vezels, porties "label:gram|label:gram", eenheid?]
export type Row = [string, FoodCategory, number, number, number, number, number, string, ('ml' | 'g')?];

const ROWS: Row[] = [
  // Brood & ontbijt
  ['Volkorenbrood', 'brood', 230, 9.5, 38, 3, 6.5, 'snee:35'],
  ['Bruinbrood', 'brood', 240, 9, 42, 2.5, 5, 'snee:35'],
  ['Witbrood', 'brood', 255, 8.5, 48, 2.5, 2.7, 'snee:35'],
  ['Meergranenbrood', 'brood', 250, 10, 38, 5, 5.5, 'snee:35'],
  ['Speltbrood', 'brood', 245, 9.5, 42, 3, 5, 'snee:35'],
  ['Zuurdesembrood', 'brood', 245, 9, 47, 1.5, 3, 'snee:40'],
  ['Volkoren bolletje', 'brood', 245, 10, 40, 3.5, 6, 'bolletje:55'],
  ['Wit bolletje', 'brood', 270, 9, 51, 3, 2.7, 'bolletje:50'],
  ['Krentenbol', 'brood', 285, 7.5, 52, 4, 2.8, 'stuk:60'],
  ['Croissant', 'brood', 410, 8, 45, 21, 2, 'stuk:50'],
  ['Volkoren wrap', 'brood', 290, 9, 46, 6.5, 6, 'stuk:60'],
  ['Beschuit', 'brood', 400, 10, 76, 5.5, 3.5, 'stuk:10'],
  ['Knäckebröd volkoren', 'brood', 350, 10, 62, 2, 15, 'stuk:12'],
  ['Rijstwafel', 'brood', 385, 8, 81, 3, 3, 'stuk:8'],
  ['Wrap (tortilla)', 'brood', 300, 8.5, 50, 7, 2.5, 'stuk:60'],
  ['Bagel', 'brood', 260, 10, 50, 1.5, 2.5, 'stuk:90'],
  ['Ontbijtkoek', 'brood', 320, 4, 72, 1.5, 2.5, 'plak:25'],
  ['Havermout', 'brood', 370, 13.5, 59, 7, 10, 'portie:40|eetlepel:10'],
  ['Muesli (zonder toegevoegd suiker)', 'brood', 360, 10, 60, 6.5, 8, 'portie:50'],
  ['Cruesli', 'brood', 450, 8, 64, 16, 6, 'portie:45'],
  ['Granola', 'brood', 470, 10, 58, 20, 6, 'portie:45'],
  ['Cornflakes', 'brood', 375, 7.5, 84, 0.9, 3, 'portie:30'],
  ['Pannenkoek', 'brood', 200, 6.5, 26, 8, 1, 'stuk:100'],
  ['Wentelteefje', 'brood', 220, 8, 27, 9, 1.5, 'stuk:70'],

  // Beleg
  ['Pindakaas', 'beleg', 620, 25, 13, 50, 6, 'op brood:15|eetlepel:20'],
  ['Pindakaas 100% pinda', 'beleg', 600, 27, 10, 49, 7, 'op brood:15|eetlepel:20'],
  ['Hagelslag puur', 'beleg', 470, 6, 66, 19, 6, 'op brood:15'],
  ['Hagelslag melk', 'beleg', 490, 5, 72, 20, 2, 'op brood:15'],
  ['Chocoladepasta', 'beleg', 540, 6, 57, 31, 3, 'op brood:15'],
  ['Jam', 'beleg', 245, 0.4, 60, 0.1, 1, 'op brood:15'],
  ['Appelstroop', 'beleg', 285, 1, 69, 0, 1, 'op brood:15'],
  ['Honing', 'beleg', 320, 0.4, 80, 0, 0, 'theelepel:7|eetlepel:21'],
  ['Jonge kaas 48+', 'beleg', 360, 24, 0, 29, 0, 'plak:20'],
  ['Belegen kaas 48+', 'beleg', 375, 25, 0, 30, 0, 'plak:20'],
  ['Kaas 30+', 'beleg', 270, 30, 0, 16.5, 0, 'plak:20'],
  ['Smeerkaas', 'beleg', 250, 11, 4, 21, 0, 'op brood:20'],
  ['Kipfilet (beleg)', 'beleg', 110, 21, 2, 2, 0, 'plak:15'],
  ['Achterham', 'beleg', 115, 19, 1, 4, 0, 'plak:15'],
  ['Rookvlees', 'beleg', 120, 25, 0.5, 2, 0, 'plak:10'],
  ['Filet americain', 'beleg', 210, 15, 2, 16, 0, 'op brood:25'],
  ['Salami', 'beleg', 420, 22, 1, 37, 0, 'plak:8'],
  ['Hummus', 'beleg', 290, 7.5, 13, 23, 6, 'eetlepel:20'],
  ['Boter', 'beleg', 740, 0.7, 0.6, 82, 0, 'op brood:5'],
  ['Halvarine', 'beleg', 355, 0.2, 0.5, 39, 0, 'op brood:5'],
  ['Avocado', 'beleg', 160, 2, 2, 15, 6.7, 'halve:70|stuk:140'],
  ['Ahornsiroop', 'beleg', 260, 0, 67, 0, 0, 'eetlepel:20'],

  // Zuivel & eieren
  ['Ei (gekookt)', 'zuivel', 140, 12.5, 0.5, 10, 0, 'stuk:55'],
  ['Ei (gebakken)', 'zuivel', 190, 13, 0.5, 15, 0, 'stuk:55'],
  ['Roerei', 'zuivel', 160, 11, 1.5, 12, 0, 'portie (2 eieren):120'],
  ['Omelet', 'zuivel', 155, 11, 1, 12, 0, 'portie (2 eieren):120'],
  ['Ei (rauw)', 'zuivel', 143, 12.6, 0.7, 9.5, 0, 'stuk:55'],
  ['Halfvolle melk', 'zuivel', 46, 3.5, 4.7, 1.5, 0, 'glas:200|scheutje:30', 'ml'],
  ['Volle melk', 'zuivel', 63, 3.4, 4.6, 3.5, 0, 'glas:200|scheutje:30', 'ml'],
  ['Magere melk', 'zuivel', 35, 3.5, 4.8, 0.1, 0, 'glas:200', 'ml'],
  ['Karnemelk', 'zuivel', 35, 3.1, 3.9, 0.5, 0, 'glas:200', 'ml'],
  ['Halfvolle yoghurt', 'zuivel', 50, 4, 4.5, 1.5, 0, 'schaaltje:150'],
  ['Volle yoghurt', 'zuivel', 65, 3.8, 4.3, 3.3, 0, 'schaaltje:150'],
  ['Griekse yoghurt 10%', 'zuivel', 117, 3.6, 4, 10, 0, 'schaaltje:150'],
  ['Griekse yoghurt 0%', 'zuivel', 55, 10, 3.5, 0.2, 0, 'schaaltje:150'],
  ['Skyr naturel', 'zuivel', 60, 11, 4, 0.2, 0, 'bakje:150'],
  ['Magere kwark', 'zuivel', 55, 10, 3.5, 0.1, 0, 'schaaltje:150'],
  ['Hüttenkäse', 'zuivel', 95, 12, 3, 4, 0, 'portie:100'],
  ['Vanillevla', 'zoet', 110, 3, 17, 3, 0.2, 'schaaltje:150'],
  ['Mozzarella', 'zuivel', 240, 18, 1, 18, 0, 'bol:125|portie:50'],
  ['Feta', 'zuivel', 265, 15, 1, 22, 0, 'portie:30'],
  ['Parmezaanse kaas', 'zuivel', 400, 33, 0, 29, 0, 'eetlepel:10'],
  ['Sojadrink', 'zuivel', 39, 3.3, 2.5, 1.8, 0.6, 'glas:200', 'ml'],
  ['Haverdrink', 'zuivel', 45, 0.3, 6.5, 1.5, 0.8, 'glas:200', 'ml'],
  ['Amandeldrink ongezoet', 'zuivel', 13, 0.4, 0.1, 1.1, 0.3, 'glas:200', 'ml'],
  ['Proteïnepoeder (whey)', 'zuivel', 380, 75, 8, 6, 0, 'schep:30'],

  // Vlees & vis
  ['Kipfilet (gebakken)', 'vlees', 150, 30, 0, 3, 0, 'stuk:120|portie:100'],
  ['Kippendij (gebakken)', 'vlees', 200, 25, 0, 11, 0, 'portie:100'],
  ['Kippenpoot', 'vlees', 215, 26, 0, 12, 0, 'stuk:150'],
  ['Rundergehakt (gebakken)', 'vlees', 250, 26, 0, 16, 0, 'portie:100'],
  ['Half-om-half gehakt (gebakken)', 'vlees', 270, 24, 0, 19, 0, 'portie:100'],
  ['Kipgehakt (gebakken)', 'vlees', 170, 22, 0, 9, 0, 'portie:100'],
  ['Biefstuk (gebakken)', 'vlees', 160, 28, 0, 5.5, 0, 'stuk:125'],
  ['Mager rundergehakt (gebakken)', 'vlees', 200, 28, 0, 10, 0, 'portie:100'],
  ['Varkenshaas (gebakken)', 'vlees', 145, 27, 0, 4, 0, 'portie:100'],
  ['Shoarmavlees', 'vlees', 200, 20, 3, 12, 0.3, 'portie:125'],
  ['Bacon (gebakken)', 'vlees', 400, 30, 1, 31, 0, 'plak:10'],
  ['Rookworst', 'vlees', 290, 12, 2, 26, 0, 'portie:60'],
  ['Frikandel', 'afhaal', 230, 11, 10, 16, 0.5, 'stuk:70'],
  ['Kroket', 'afhaal', 245, 6, 20, 16, 1, 'stuk:75'],
  ['Kipnuggets', 'afhaal', 270, 15, 17, 16, 1, 'stuk:18'],
  ['Zalm (gebakken)', 'vlees', 200, 22, 0, 12, 0, 'moot:125'],
  ['Gerookte zalm', 'vlees', 180, 22, 0, 10, 0, 'plak:20'],
  ['Tonijn in water (uitgelekt)', 'vlees', 110, 25, 0, 1, 0, 'blikje:120'],
  ['Kabeljauw', 'vlees', 90, 20, 0, 0.7, 0, 'filet:125'],
  ['Pangasius', 'vlees', 85, 16, 0, 2.5, 0, 'filet:125'],
  ['Garnalen', 'vlees', 85, 18, 0, 1, 0, 'portie:100'],
  ['Hollandse nieuwe haring', 'vlees', 200, 16, 0, 15, 0, 'stuk:80'],
  ['Kibbeling', 'afhaal', 230, 15, 12, 14, 0.5, 'portie:150'],

  // Vega & peulvruchten
  ['Tofu', 'vega', 125, 13, 1.5, 7.5, 0.5, 'portie:100'],
  ['Tempeh', 'vega', 190, 19, 9, 11, 4, 'portie:100'],
  ['Vegetarische burger', 'vega', 220, 16, 10, 12, 4, 'stuk:100'],
  ['Vegetarische kipstukjes', 'vega', 160, 18, 4, 7, 3, 'portie:100'],
  ['Linzen (gekookt)', 'vega', 115, 9, 17, 0.4, 8, 'portie:150'],
  ['Kikkererwten (uitgelekt)', 'vega', 120, 7, 14, 2.5, 5, 'portie:100'],
  ['Kidneybonen (uitgelekt)', 'vega', 105, 7.5, 14, 0.5, 6, 'portie:100'],
  ['Zwarte bonen (uitgelekt)', 'vega', 110, 7.5, 15, 0.5, 7, 'portie:100'],
  ['Edamame', 'vega', 120, 11, 9, 5, 5, 'portie:100'],
  ['Falafel', 'vega', 330, 13, 31, 18, 5, 'stuk:20'],

  // Rijst, pasta & aardappel
  ['Witte rijst (gekookt)', 'granen', 130, 2.7, 28, 0.3, 0.4, 'portie:150|opscheplepel:50'],
  ['Witte rijst (droog)', 'granen', 350, 7, 78, 0.6, 1.3, 'portie:75'],
  ['Zilvervliesrijst (gekookt)', 'granen', 125, 2.7, 25.5, 1, 1.8, 'portie:150|opscheplepel:50'],
  ['Pasta (gekookt)', 'granen', 150, 5.5, 30, 0.9, 1.8, 'portie:200|opscheplepel:60'],
  ['Pasta (droog)', 'granen', 355, 12.5, 71, 1.5, 3, 'portie:80'],
  ['Volkoren pasta (gekookt)', 'granen', 140, 6, 26, 1.2, 4.5, 'portie:200'],
  ['Couscous (bereid)', 'granen', 115, 4, 23, 0.3, 1.4, 'portie:150'],
  ['Rijstnoedels (gekookt)', 'granen', 110, 1.8, 25, 0.2, 1, 'portie:200'],
  ['Gnocchi', 'granen', 150, 4, 32, 0.4, 1.5, 'portie:200'],
  ['Quinoa (gekookt)', 'granen', 120, 4.4, 21, 1.9, 2.8, 'portie:150'],
  ['Bulgur (gekookt)', 'granen', 85, 3, 17, 0.2, 4.5, 'portie:150'],
  ['Noedels (gekookt)', 'granen', 140, 4.5, 26, 2, 1.2, 'portie:200'],
  ['Aardappelen (gekookt)', 'granen', 75, 2, 16, 0.1, 1.8, 'stuk:70|portie:200'],
  ['Krieltjes (gebakken)', 'granen', 130, 2.5, 19, 4.5, 2, 'portie:200'],
  ['Zoete aardappel (gekookt)', 'granen', 85, 1.5, 18, 0.1, 3, 'portie:200'],
  ['Aardappelpuree', 'granen', 100, 2, 14, 4, 1.5, 'portie:200'],
  ['Patat', 'afhaal', 290, 3.5, 36, 14, 3, 'klein:100|middel:150|groot:200'],

  // Groente
  ['Broccoli', 'groente', 30, 3, 3, 0.4, 3, 'portie:150|opscheplepel:50'],
  ['Sperziebonen', 'groente', 28, 2, 4, 0.2, 3.4, 'portie:150|opscheplepel:50'],
  ['Spinazie', 'groente', 23, 2.9, 1, 0.4, 2.2, 'portie:150'],
  ['Bloemkool', 'groente', 25, 2, 3, 0.3, 2.2, 'portie:150'],
  ['Spruitjes', 'groente', 40, 3.5, 5, 0.4, 3.8, 'portie:150'],
  ['Rode kool', 'groente', 30, 1.4, 5, 0.2, 2.5, 'portie:150'],
  ['Boerenkool', 'groente', 40, 3.5, 4, 0.9, 4, 'portie:150'],
  ['Andijvie', 'groente', 15, 1.5, 1.5, 0.2, 1.5, 'portie:150'],
  ['Courgette', 'groente', 18, 1.5, 2, 0.3, 1.1, 'stuk:250|portie:150'],
  ['Champignons', 'groente', 22, 3, 0.5, 0.3, 1.5, 'portie:100'],
  ['Doperwten', 'groente', 75, 5.5, 10, 0.4, 5, 'portie:100'],
  ['Maïs', 'groente', 80, 3, 14, 1.5, 2.5, 'portie:75'],
  ['Wortel', 'groente', 35, 0.7, 7, 0.3, 2.8, 'stuk:80'],
  ['Paprika', 'groente', 28, 1, 5, 0.3, 1.8, 'stuk:150'],
  ['Tomaat', 'groente', 18, 0.9, 3, 0.2, 1.2, 'stuk:100|cherrytomaatje:15'],
  ['Komkommer', 'groente', 13, 0.7, 2, 0.1, 0.6, 'halve:150|plakjes:50'],
  ['Ui', 'groente', 35, 1.2, 7, 0.1, 1.7, 'stuk:100'],
  ['Sla', 'groente', 15, 1.2, 1.5, 0.2, 1.3, 'portie:50'],
  ['Gemengde salade', 'groente', 20, 1.3, 2.5, 0.2, 1.5, 'portie:100'],
  ['Wokgroenten', 'groente', 30, 1.8, 4, 0.3, 2.2, 'portie:200'],
  ['Tomatenblokjes (blik)', 'groente', 22, 1.2, 3.5, 0.2, 1.2, 'blik:400'],
  ['Rucola', 'groente', 25, 2.6, 2, 0.7, 1.6, 'handje:20'],
  ['Knoflook', 'groente', 150, 6, 30, 0.5, 2, 'teentje:4'],
  ['Lente-ui', 'groente', 32, 1.8, 6, 0.2, 2.4, 'stengel:15'],
  ['Paksoi', 'groente', 13, 1.5, 2, 0.2, 1.2, 'struik:150'],
  ['Pompoen', 'groente', 30, 1, 6, 0.1, 1.5, 'portie:200'],

  // Fruit
  ['Appel', 'fruit', 52, 0.3, 12, 0.2, 2.4, 'stuk:150'],
  ['Banaan', 'fruit', 95, 1.1, 21, 0.3, 2.2, 'stuk:120'],
  ['Peer', 'fruit', 55, 0.4, 12, 0.1, 3.1, 'stuk:160'],
  ['Sinaasappel', 'fruit', 45, 1, 9, 0.2, 2.2, 'stuk:150'],
  ['Mandarijn', 'fruit', 45, 0.8, 10, 0.3, 1.8, 'stuk:70'],
  ['Aardbeien', 'fruit', 33, 0.7, 6, 0.3, 2, 'schaaltje:150'],
  ['Blauwe bessen', 'fruit', 57, 0.7, 12, 0.3, 2.4, 'handje:75'],
  ['Frambozen', 'fruit', 45, 1.2, 5.5, 0.6, 6.5, 'handje:75'],
  ['Druiven', 'fruit', 70, 0.6, 16, 0.2, 0.9, 'trosje:100'],
  ['Kiwi', 'fruit', 60, 1, 12, 0.5, 3, 'stuk:75'],
  ['Mango', 'fruit', 65, 0.8, 14, 0.4, 1.6, 'halve:150'],
  ['Ananas', 'fruit', 50, 0.5, 11, 0.1, 1.4, 'schijf:80'],
  ['Watermeloen', 'fruit', 30, 0.6, 7, 0.2, 0.4, 'part:200'],
  ['Dadels', 'fruit', 290, 2.5, 66, 0.4, 7, 'stuk:8'],
  ['Rozijnen', 'fruit', 300, 3, 69, 0.5, 3.7, 'handje:25'],
  ['Bosvruchten (diepvries)', 'fruit', 45, 1, 8, 0.3, 4, 'handje:75'],
  ['Citroen', 'fruit', 30, 1, 9, 0.3, 2.8, 'partje:10|halve:40'],

  // Snacks & noten
  ['Amandelen', 'snack', 600, 21, 7, 52, 12, 'handje:25'],
  ['Walnoten', 'snack', 680, 15, 7, 65, 6.7, 'handje:25'],
  ['Cashewnoten', 'snack', 580, 18, 27, 46, 3.3, 'handje:25'],
  ["Pinda's (gezouten)", 'snack', 600, 26, 10, 49, 8, 'handje:25'],
  ['Ongebrande gemengde noten', 'snack', 620, 20, 10, 54, 8, 'handje:25'],
  ['Chiazaad', 'snack', 450, 17, 8, 31, 34, 'eetlepel:10'],
  ['Sesamzaad', 'snack', 570, 18, 12, 50, 12, 'theelepel:3'],
  ['Pompoenpitten', 'snack', 560, 30, 11, 46, 6, 'eetlepel:10'],
  ['Kokosrasp', 'snack', 660, 6, 24, 62, 14, 'eetlepel:5'],
  ['Cacaopoeder', 'snack', 380, 20, 12, 21, 33, 'theelepel:5'],
  ['Pure chocolade 70%', 'zoet', 580, 8, 33, 43, 11, 'stukje:10|reep:100'],
  ['Melkchocolade', 'zoet', 540, 7, 56, 31, 2, 'stukje:10|reep:45'],
  ['Chips naturel', 'snack', 540, 6, 52, 34, 4, 'portie:30|zak:150'],
  ['Popcorn (zout)', 'snack', 470, 9, 56, 22, 10, 'portie:25'],
  ['Stroopwafel', 'zoet', 460, 3.5, 66, 19, 1.5, 'stuk:30'],
  ['Mueslireep', 'snack', 420, 6, 65, 13, 4, 'stuk:25'],
  ['Proteïnereep', 'snack', 360, 33, 35, 12, 5, 'stuk:55'],
  ['Biscuitje', 'zoet', 450, 6.5, 70, 15, 2, 'stuk:8'],
  ['Gevulde koek', 'zoet', 440, 7, 52, 22, 2.5, 'stuk:85'],
  ['Appeltaart', 'zoet', 270, 3, 37, 12, 1.5, 'punt:120'],
  ['Drop', 'zoet', 350, 4, 80, 0.5, 0.5, 'portie:20'],
  ['Winegums', 'zoet', 340, 5, 78, 0.2, 0, 'portie:20'],
  ['Roomijs', 'zoet', 210, 3.5, 24, 11, 0.5, 'bolletje:50'],

  // Dranken (per 100 ml)
  ['Water', 'drank', 0, 0, 0, 0, 0, 'glas:250|fles:500', 'ml'],
  ['Koffie zwart', 'drank', 2, 0.1, 0.3, 0, 0, 'kopje:125', 'ml'],
  ['Cappuccino', 'drank', 38, 2.2, 3.2, 1.8, 0, 'kop:150', 'ml'],
  ['Latte macchiato', 'drank', 45, 2.6, 3.7, 2, 0, 'glas:250', 'ml'],
  ['Thee (zonder suiker)', 'drank', 1, 0, 0.2, 0, 0, 'kop:200', 'ml'],
  ['Sinaasappelsap', 'drank', 45, 0.7, 10, 0.1, 0.2, 'glas:200', 'ml'],
  ['Appelsap', 'drank', 45, 0.1, 11, 0, 0.1, 'glas:200', 'ml'],
  ['Smoothie', 'drank', 55, 0.7, 12, 0.3, 1, 'flesje:250', 'ml'],
  ['Cola', 'drank', 42, 0, 10.6, 0, 0, 'glas:250|blikje:330', 'ml'],
  ['Cola zero', 'drank', 0.3, 0, 0, 0, 0, 'glas:250|blikje:330', 'ml'],
  ['Ice tea', 'drank', 19, 0, 4.5, 0, 0, 'glas:250|blikje:330', 'ml'],
  ['Energiedrank', 'drank', 45, 0, 11, 0, 0, 'blikje:250', 'ml'],
  ['Chocolademelk', 'drank', 70, 3.3, 10, 1.6, 0.5, 'glas:200', 'ml'],
  ['Bier (pils)', 'drank', 43, 0.5, 3, 0, 0, 'fluitje:200|flesje:300|vaasje:250', 'ml'],
  ['Bier 0.0%', 'drank', 20, 0.4, 4.4, 0, 0, 'flesje:300', 'ml'],
  ['Rode wijn', 'drank', 85, 0, 2.6, 0, 0, 'glas:125', 'ml'],
  ['Witte wijn', 'drank', 80, 0, 2.6, 0, 0, 'glas:125', 'ml'],

  // Maaltijden
  ['Pizza margherita', 'afhaal', 250, 10, 30, 9, 2, 'halve pizza:175|hele pizza:350'],
  ['Spaghetti bolognese', 'gerecht', 130, 7, 16, 4.5, 1.5, 'bord:400'],
  ['Lasagne', 'gerecht', 160, 8, 13, 8.5, 1.2, 'portie:400'],
  ['Nasi goreng', 'gerecht', 160, 6, 20, 6, 1.5, 'bord:400'],
  ['Bami goreng', 'gerecht', 155, 6, 19, 6, 1.5, 'bord:400'],
  ['Stamppot boerenkool met worst', 'gerecht', 140, 5, 10, 9, 2.5, 'bord:400'],
  ['Chili con carne', 'gerecht', 110, 8, 9, 4.5, 3.5, 'bord:350'],
  ['Kip tandoori met rijst', 'gerecht', 140, 10, 17, 3.5, 1, 'bord:400'],
  ['Pokébowl zalm', 'gerecht', 145, 7, 18, 5, 1.5, 'bowl:400'],
  ['Maaltijdsalade met kip', 'gerecht', 120, 8, 8, 6, 1.5, 'bak:350'],
  ['Sushi (maki)', 'afhaal', 150, 4, 28, 1.5, 0.8, 'stuk:25'],
  ['Hamburger (broodje)', 'afhaal', 250, 13, 25, 11, 1.5, 'stuk:200'],
  ['Kapsalon', 'afhaal', 230, 11, 16, 14, 1.5, 'bak:550'],
  ['Tosti ham-kaas', 'gerecht', 270, 15, 25, 12, 1.5, 'stuk:120'],
  ['Broodje gezond', 'gerecht', 190, 10, 22, 7, 2.5, 'stuk:200'],
  ['Tomatensoep', 'gerecht', 40, 1.5, 5, 1.5, 0.8, 'kom:250'],
  ['Erwtensoep', 'gerecht', 85, 5.5, 8, 3.5, 3.5, 'kom:250'],
  ['Kippensoep', 'gerecht', 35, 2.5, 3.5, 1, 0.5, 'kom:250'],

  // Sauzen & oliën
  ['Olijfolie', 'saus', 884, 0, 0, 100, 0, 'eetlepel:13|theelepel:5'],
  ['Mayonaise', 'saus', 720, 1, 2, 79, 0, 'eetlepel:15'],
  ['Fritessaus', 'saus', 290, 1, 12, 26, 0, 'portie:25'],
  ['Ketchup', 'saus', 110, 1.2, 24, 0.2, 0.5, 'eetlepel:15'],
  ['Pesto', 'saus', 450, 5, 6, 45, 2, 'eetlepel:15'],
  ['Satésaus', 'saus', 240, 7, 14, 17, 2.5, 'portie:50'],
  ['Sojasaus', 'saus', 60, 8, 6, 0, 0.5, 'eetlepel:15', 'ml'],
  ['Suiker', 'saus', 400, 0, 100, 0, 0, 'theelepel:4|klontje:5'],
  ['Kokosmelk light', 'saus', 75, 0.7, 2, 7, 0.5, 'blik:400', 'ml'],
  ['Kerriepasta', 'saus', 150, 2, 10, 11, 2.5, 'eetlepel:15'],
  ['Tomatenpuree', 'saus', 85, 4.5, 13, 0.5, 4, 'eetlepel:15'],
  ['Pastasaus (tomaat)', 'saus', 55, 1.5, 8, 1.5, 1.5, 'pot:400'],
  ['Balsamicoazijn', 'saus', 110, 0.5, 22, 0, 0, 'eetlepel:15', 'ml'],

  // ---------- Uitbreiding: brood & ontbijt ----------
  ['Roggebrood', 'brood', 210, 6, 40, 1.5, 7.5, 'snee:45'],
  ['Pitabroodje', 'brood', 270, 9, 54, 1.5, 2.2, 'stuk:65'],
  ['Volkoren pita', 'brood', 255, 10, 48, 2.5, 6, 'stuk:65'],
  ['Turks brood', 'brood', 270, 9, 52, 2, 2.5, 'plak:70'],
  ['Tijgerbol', 'brood', 270, 9, 50, 3.5, 2.5, 'stuk:60'],
  ['Ciabatta', 'brood', 260, 9, 49, 3, 2.5, 'stuk:80'],
  ['Stokbrood', 'brood', 255, 8.5, 51, 1.5, 2.5, 'snee:30'],
  ['Krentenbrood', 'brood', 270, 7.5, 49, 4, 3, 'snee:35'],
  ['Suikerbrood', 'brood', 330, 7, 57, 8, 2, 'snee:35'],
  ['Glutenvrij brood', 'brood', 240, 4, 44, 5, 5, 'snee:35'],
  ['Speltcrackers', 'brood', 400, 12, 66, 8, 6, 'stuk:10'],
  ['Crackers (naturel)', 'brood', 430, 10, 70, 11, 3, 'stuk:8'],
  ['Toastjes', 'brood', 390, 12, 74, 4, 3, 'stuk:5'],
  ['Tarwebiscuits', 'brood', 350, 12, 67, 2, 10, 'stuk:19'],
  ['Muesli met noten', 'brood', 390, 11, 58, 11, 7, 'portie:50'],
  ['Boekweitpannenkoek', 'brood', 190, 6, 28, 6, 2.5, 'stuk:100'],
  ['Poffertjes', 'brood', 240, 6, 37, 7, 1.5, 'portie:100'],
  ['Gierstvlokken', 'brood', 360, 10, 72, 4, 4, 'portie:40'],
  ['Quinoavlokken', 'brood', 370, 13, 64, 6, 7, 'portie:40'],
  ['Overnight oats (kant-en-klaar)', 'brood', 120, 5, 17, 3.5, 2.5, 'beker:200'],

  // ---------- Uitbreiding: beleg ----------
  ['Pindakaas crunchy', 'beleg', 610, 25, 13, 50, 6, 'op brood:15|eetlepel:20'],
  ['Amandelpasta', 'beleg', 620, 21, 8, 54, 10, 'eetlepel:15'],
  ['Cashewpasta', 'beleg', 590, 18, 27, 46, 3.5, 'eetlepel:15'],
  ['Tahin', 'beleg', 600, 18, 10, 54, 9, 'eetlepel:15'],
  ['Hummus light', 'beleg', 180, 7.5, 14, 10, 6, 'eetlepel:20'],
  ['Guacamole', 'beleg', 150, 2, 6, 13, 5, 'eetlepel:20'],
  ['Kalkoenfilet (beleg)', 'beleg', 105, 21, 1.5, 1.5, 0, 'plak:15'],
  ['Rosbief', 'beleg', 115, 23, 0.5, 2.5, 0, 'plak:15'],
  ['Kipkerriesalade', 'beleg', 250, 9, 6, 21, 0.5, 'op brood:25'],
  ['Eiersalade', 'beleg', 230, 8, 3, 21, 0.3, 'op brood:25'],
  ['Tonijnsalade', 'beleg', 240, 11, 4, 20, 0.3, 'op brood:25'],
  ['Zalmsalade', 'beleg', 230, 10, 4, 19, 0.3, 'op brood:25'],
  ['Leverworst', 'beleg', 290, 13, 4, 25, 0.5, 'plak:15'],
  ['Boterhamworst', 'beleg', 240, 12, 3, 20, 0, 'plak:10'],
  ['Cervelaat', 'beleg', 400, 24, 1, 33, 0, 'plak:8'],
  ['Oude kaas 48+', 'beleg', 400, 28, 0, 32, 0, 'plak:20'],
  ['Kaas 20+', 'beleg', 225, 32, 0, 11, 0, 'plak:20'],
  ['Light smeerkaas', 'beleg', 150, 13, 4, 9, 0, 'op brood:20'],
  ['Roomkaas', 'beleg', 240, 6, 4, 22, 0, 'op brood:20'],
  ['Vega beleg plakjes', 'beleg', 180, 15, 6, 10, 3, 'plak:15'],
  ['Speculoospasta', 'beleg', 580, 3, 60, 37, 1.5, 'op brood:15'],
  ['Vruchtenspread (zonder suiker)', 'beleg', 130, 0.5, 30, 0.2, 1.5, 'op brood:15'],
  ['Muisjes', 'beleg', 400, 0.5, 97, 1, 0.5, 'op brood:15'],
  ['Agavesiroop', 'beleg', 300, 0, 75, 0, 0, 'eetlepel:20'],

  // ---------- Uitbreiding: zuivel & eieren ----------
  ['Halfvolle kwark', 'zuivel', 90, 9, 3.5, 4, 0, 'schaaltje:150'],
  ['Volle kwark', 'zuivel', 130, 7.5, 3.5, 9, 0, 'schaaltje:150'],
  ['Vanillekwark (mager)', 'zuivel', 75, 8.5, 9.5, 0.2, 0, 'schaaltje:150'],
  ['Skyr vanille', 'zuivel', 75, 9.5, 8.5, 0.2, 0, 'bakje:150'],
  ['Skyr aardbei', 'zuivel', 75, 9, 9, 0.2, 0, 'bakje:150'],
  ['Proteïnepudding', 'zuivel', 80, 10, 7, 1.5, 0, 'beker:200'],
  ['Proteïne-yoghurtdrink', 'zuivel', 55, 6, 6, 0.4, 0, 'flesje:300', 'ml'],
  ['Kefir', 'zuivel', 60, 3.4, 4.5, 3, 0, 'glas:200', 'ml'],
  ['Ayran', 'zuivel', 35, 1.7, 2.4, 1.8, 0, 'glas:250', 'ml'],
  ['Drinkyoghurt', 'zuivel', 70, 3, 11, 1.5, 0, 'glas:200', 'ml'],
  ['Magere drinkyoghurt', 'zuivel', 35, 3.3, 5, 0.1, 0, 'glas:200', 'ml'],
  ['Chocoladevla', 'zoet', 115, 3.2, 17, 3.5, 1, 'schaaltje:150'],
  ['Rijstepap', 'zuivel', 105, 3.5, 17, 2.5, 0.2, 'kom:200'],
  ['Griesmeelpudding', 'zoet', 110, 3.5, 17, 3, 0.3, 'schaaltje:150'],
  ['Slagroom', 'zuivel', 340, 2, 3, 36, 0, 'eetlepel:15'],
  ['Kookroom light', 'zuivel', 150, 3, 5, 13, 0, 'scheutje:50', 'ml'],
  ['Zure room', 'zuivel', 190, 2.5, 3.5, 18, 0, 'eetlepel:20'],
  ['Crème fraîche light', 'zuivel', 165, 3, 4, 15, 0, 'eetlepel:20'],
  ['Mozzarella light', 'zuivel', 165, 19, 1, 9, 0, 'bol:125'],
  ['Halloumi', 'zuivel', 320, 22, 2, 25, 0, 'portie:60'],
  ['Burrata', 'zuivel', 230, 12, 2, 19, 0, 'bol:125'],
  ['Geraspte kaas 30+', 'zuivel', 270, 30, 0, 16.5, 0, 'handje:20'],
  ['Geitenkaas (zacht)', 'zuivel', 300, 18, 1, 25, 0, 'portie:30'],
  ['Ricotta', 'zuivel', 150, 9, 3, 11, 0, 'portie:50'],
  ['Paneer', 'zuivel', 300, 18, 4, 23, 0, 'portie:100'],
  ['Eiwit van ei', 'zuivel', 48, 11, 0.7, 0.2, 0, 'stuk:33'],
  ['Ei (gepocheerd)', 'zuivel', 145, 12.5, 0.7, 10, 0, 'stuk:55'],
  ['Kokosdrink', 'zuivel', 20, 0.1, 2.5, 1, 0.2, 'glas:200', 'ml'],
  ['Rijstdrink', 'zuivel', 50, 0.1, 10, 1, 0.3, 'glas:200', 'ml'],
  ['Sojayoghurt naturel', 'zuivel', 50, 4, 2.5, 2.3, 1, 'schaaltje:150'],
  ['Kokosyoghurt', 'zuivel', 120, 1, 6, 10, 1, 'schaaltje:150'],
  ['Caseïnepoeder', 'zuivel', 360, 80, 5, 2, 0, 'schep:30'],
  ['Plantaardig proteïnepoeder', 'zuivel', 380, 75, 8, 6, 3, 'schep:30'],

  // ---------- Uitbreiding: vlees & vis ----------
  ['Kalkoenfilet (gebakken)', 'vlees', 140, 29, 0, 2.5, 0, 'portie:100'],
  ['Kipshoarma (gebakken)', 'vlees', 180, 24, 2, 8.5, 0, 'portie:125'],
  ['Kipgyros', 'vlees', 190, 22, 3, 10, 0, 'portie:125'],
  ['Kipburger', 'vlees', 200, 18, 6, 11, 0, 'stuk:100'],
  ['Tartaar (gebakken)', 'vlees', 190, 26, 0, 9.5, 0, 'stuk:100'],
  ['Hamburger rund (gebakken)', 'vlees', 250, 24, 0, 17, 0, 'stuk:100'],
  ['Slavink', 'vlees', 270, 15, 4, 22, 0, 'stuk:100'],
  ['Gehaktbal', 'vlees', 240, 17, 5, 17, 0.3, 'stuk:100'],
  ['Speklappen', 'vlees', 310, 25, 0, 23, 0, 'stuk:100'],
  ['Hamlappen', 'vlees', 150, 26, 0, 5, 0, 'stuk:100'],
  ['Karbonade', 'vlees', 230, 26, 0, 14, 0, 'stuk:150'],
  ['Lamskotelet', 'vlees', 290, 24, 0, 21.5, 0, 'stuk:80'],
  ['Runderreepjes', 'vlees', 150, 27, 0, 4.5, 0, 'portie:100'],
  ['Runderstoofvlees', 'vlees', 190, 30, 0, 7.5, 0, 'portie:150'],
  ['Kipschnitzel', 'vlees', 200, 20, 10, 9, 0.8, 'stuk:120'],
  ['Kippenvleugels', 'vlees', 260, 24, 0, 18, 0, 'stuk:40'],
  ['Braadworst', 'vlees', 280, 13, 3, 24, 0, 'stuk:100'],
  ['Tonijnsteak (gebakken)', 'vlees', 140, 30, 0, 2, 0, 'stuk:125'],
  ['Makreel (gerookt)', 'vlees', 300, 19, 0, 25, 0, 'filet:100'],
  ['Sardines in olijfolie', 'vlees', 210, 24, 0, 12.5, 0, 'blikje:90'],
  ['Forel (gerookt)', 'vlees', 140, 22, 0, 5.5, 0, 'filet:60'],
  ['Tilapia', 'vlees', 95, 20, 0, 1.5, 0, 'filet:125'],
  ['Koolvis', 'vlees', 80, 18, 0, 0.9, 0, 'filet:125'],
  ['Schol', 'vlees', 90, 18, 0, 2, 0, 'filet:125'],
  ['Mosselen', 'vlees', 90, 12, 3.5, 2.5, 0, 'portie:200'],
  ['Scampi (gebakken)', 'vlees', 110, 22, 0, 2, 0, 'portie:100'],
  ['Calamares', 'vlees', 240, 12, 18, 13, 0.8, 'portie:100'],
  ['Surimi', 'vlees', 95, 8, 14, 0.8, 0.3, 'stuk:17'],
  ['Vissticks', 'vlees', 200, 12, 18, 9, 1, 'stuk:30'],
  ['Lekkerbekje', 'afhaal', 230, 15, 13, 13, 0.6, 'stuk:150'],

  // ---------- Uitbreiding: vega & peulvruchten ----------
  ['Tofu gerookt', 'vega', 150, 16, 2, 8.5, 0.5, 'portie:100'],
  ['Zijden tofu', 'vega', 55, 5, 2, 3, 0.2, 'portie:100'],
  ['Seitan', 'vega', 120, 24, 4, 1, 0.6, 'portie:100'],
  ['Vegetarisch gehakt', 'vega', 170, 18, 5, 8, 4, 'portie:100'],
  ['Vegetarische balletjes', 'vega', 200, 15, 8, 12, 3, 'stuk:20'],
  ['Vegetarische schnitzel', 'vega', 220, 13, 15, 12, 3, 'stuk:90'],
  ['Plantaardige burger', 'vega', 230, 17, 6, 15, 3, 'stuk:113'],
  ['Rode linzen (droog)', 'vega', 340, 24, 50, 1.5, 11, 'portie:60'],
  ['Witte bonen (uitgelekt)', 'vega', 100, 7, 14, 0.5, 6, 'portie:100'],
  ['Bruine bonen (uitgelekt)', 'vega', 100, 7.5, 14, 0.5, 6.5, 'portie:100'],
  ['Kapucijners (uitgelekt)', 'vega', 110, 7.5, 15, 0.7, 6, 'portie:100'],
  ['Mungbonen (gekookt)', 'vega', 105, 7, 19, 0.4, 7.6, 'portie:100'],

  // ---------- Uitbreiding: rijst, pasta & aardappel ----------
  ['Basmatirijst (gekookt)', 'granen', 130, 3, 28, 0.4, 0.4, 'portie:150|opscheplepel:50'],
  ['Zilvervliesrijst (droog)', 'granen', 350, 7.5, 73, 2.5, 3.5, 'portie:75'],
  ['Risottorijst (droog)', 'granen', 350, 7, 78, 0.6, 1.2, 'portie:75'],
  ['Wilde rijst (gekookt)', 'granen', 100, 4, 21, 0.3, 1.8, 'portie:150'],
  ['Volkoren couscous (bereid)', 'granen', 120, 4.5, 22, 0.8, 4, 'portie:150'],
  ['Parelcouscous (bereid)', 'granen', 140, 5, 28, 0.6, 1.5, 'portie:150'],
  ['Volkoren pasta (droog)', 'granen', 340, 13, 64, 2.5, 8, 'portie:80'],
  ['Linzenpasta (droog)', 'granen', 340, 25, 50, 2, 9, 'portie:80'],
  ['Kikkererwtenpasta (droog)', 'granen', 350, 21, 55, 5, 8, 'portie:80'],
  ['Orzo (gekookt)', 'granen', 150, 5, 30, 0.8, 1.5, 'portie:150'],
  ['Tortellini (gekookt)', 'granen', 180, 7, 28, 4.5, 1.5, 'portie:200'],
  ['Glasnoedels (gekookt)', 'granen', 90, 0.1, 22, 0.1, 0.5, 'portie:150'],
  ['Udon-noedels', 'granen', 125, 3.5, 26, 0.5, 1.2, 'portie:200'],
  ['Mie (gekookt)', 'granen', 140, 4.5, 26, 2, 1.2, 'portie:200'],
  ['Polenta (bereid)', 'granen', 70, 1.6, 15, 0.3, 1, 'portie:200'],
  ['Boekweit (gekookt)', 'granen', 95, 3.4, 20, 0.6, 2.7, 'portie:150'],
  ['Gierst (gekookt)', 'granen', 120, 3.5, 23, 1, 1.3, 'portie:150'],
  ['Ovenfrites', 'granen', 160, 2.5, 25, 5, 2.5, 'portie:150'],
  ['Zoete aardappelfrietjes (oven)', 'granen', 160, 2, 25, 6, 3.5, 'portie:150'],
  ['Aardappelpartjes (oven)', 'granen', 120, 2.3, 19, 3.8, 2.2, 'portie:200'],
  ['Gebakken aardappelen', 'granen', 140, 2.5, 20, 5.5, 2, 'portie:200'],
  ['Rösti', 'granen', 170, 2.5, 22, 8, 2, 'stuk:50'],
  ['Tarwebloem', 'granen', 350, 10, 72, 1.2, 3, 'eetlepel:10'],
  ['Maïzena', 'granen', 360, 0.3, 88, 0.1, 0.9, 'eetlepel:10'],

  // ---------- Uitbreiding: groente ----------
  ['Asperges', 'groente', 20, 2.2, 2, 0.2, 1.5, 'portie:200'],
  ['Aubergine', 'groente', 25, 1, 3, 0.2, 2.5, 'stuk:300'],
  ['Bleekselderij', 'groente', 15, 0.7, 1.5, 0.2, 1.6, 'stengel:40'],
  ['Bietjes (gekookt)', 'groente', 45, 1.7, 8, 0.2, 2.5, 'portie:150'],
  ['Chinese kool', 'groente', 15, 1.2, 1.5, 0.2, 1.2, 'portie:150'],
  ['Witte kool', 'groente', 28, 1.4, 4.5, 0.2, 2.5, 'portie:150'],
  ['Spitskool', 'groente', 25, 1.3, 4, 0.2, 2.5, 'portie:150'],
  ['Savooiekool', 'groente', 30, 2, 4, 0.2, 3, 'portie:150'],
  ['Knolselderij', 'groente', 30, 1.3, 4.5, 0.3, 3.5, 'portie:150'],
  ['Koolrabi', 'groente', 27, 1.7, 4, 0.1, 2.4, 'portie:150'],
  ['Pastinaak', 'groente', 75, 1.2, 15, 0.3, 4.5, 'stuk:150'],
  ['Prei', 'groente', 30, 1.5, 5, 0.3, 2.2, 'stuk:200'],
  ['Radijs', 'groente', 15, 0.7, 2.5, 0.1, 1.6, 'bosje:100'],
  ['Snijbonen', 'groente', 25, 1.8, 3.5, 0.2, 3, 'portie:150'],
  ['Sugarsnaps', 'groente', 40, 2.8, 6, 0.2, 2.6, 'portie:150'],
  ['Peultjes', 'groente', 38, 3, 5, 0.2, 2.6, 'portie:150'],
  ['Venkel', 'groente', 25, 1.2, 3.5, 0.2, 2.7, 'stuk:250'],
  ['Witlof', 'groente', 17, 1.2, 2.5, 0.1, 1.3, 'stuk:120'],
  ['IJsbergsla', 'groente', 13, 0.9, 2, 0.1, 1.2, 'portie:50'],
  ['Veldsla', 'groente', 20, 2, 2, 0.4, 1.5, 'handje:30'],
  ['Rode ui', 'groente', 40, 1.1, 8, 0.1, 1.7, 'stuk:100'],
  ['Sjalot', 'groente', 70, 2.5, 14, 0.1, 3.2, 'stuk:25'],
  ['Kastanjechampignons', 'groente', 25, 3, 1, 0.4, 1.5, 'portie:100'],
  ['Shiitake', 'groente', 35, 2.2, 5, 0.5, 2.5, 'portie:100'],
  ['Oesterzwammen', 'groente', 30, 3.3, 3.5, 0.4, 2.3, 'portie:100'],
  ['Zongedroogde tomaten', 'groente', 210, 5, 23, 12, 6, 'eetlepel:15'],
  ['Passata', 'groente', 30, 1.4, 5, 0.2, 1.2, 'pak:500'],
  ['Spinazie à la crème', 'groente', 70, 3, 4, 4.5, 1.8, 'portie:150'],
  ['Rode kool met appel', 'groente', 60, 1.2, 11, 1, 2.2, 'portie:150'],
  ['Zuurkool', 'groente', 20, 1.3, 2, 0.3, 2.5, 'portie:150'],
  ['Bloemkoolrijst', 'groente', 25, 2, 3, 0.3, 2.2, 'portie:150'],
  ['Courgetti', 'groente', 18, 1.5, 2, 0.3, 1.1, 'portie:200'],
  ['Olijven', 'groente', 145, 1, 1, 15, 3.3, 'handje:30'],
  ['Augurk', 'groente', 15, 0.5, 2.5, 0.2, 1, 'stuk:40'],
  ['Rode peper', 'groente', 40, 1.9, 7, 0.4, 1.5, 'stuk:15'],
  ['Gember (vers)', 'groente', 80, 1.8, 16, 0.8, 2, 'stukje:10'],
  ['Kimchi', 'groente', 20, 1.5, 2.5, 0.5, 2.4, 'portie:50'],

  // ---------- Uitbreiding: fruit ----------
  ['Abrikoos', 'fruit', 45, 1, 9, 0.2, 2, 'stuk:40'],
  ['Abrikozen (gedroogd)', 'fruit', 250, 3.5, 56, 0.5, 7.3, 'stuk:8'],
  ['Bramen', 'fruit', 45, 1.4, 6, 0.5, 5.3, 'handje:75'],
  ['Cranberries (gedroogd)', 'fruit', 320, 0.2, 80, 1.4, 5.7, 'handje:25'],
  ['Grapefruit', 'fruit', 35, 0.7, 7.5, 0.1, 1.6, 'halve:150'],
  ['Granaatappel', 'fruit', 75, 1.7, 14, 1.2, 4, 'halve:100'],
  ['Kersen', 'fruit', 60, 1, 13, 0.3, 1.6, 'handje:100'],
  ['Lychees', 'fruit', 70, 0.8, 16, 0.4, 1.3, 'stuk:10'],
  ['Meloen', 'fruit', 35, 0.8, 7.5, 0.2, 0.9, 'part:200'],
  ['Nectarine', 'fruit', 45, 1, 9.5, 0.3, 1.7, 'stuk:140'],
  ['Perzik', 'fruit', 40, 0.9, 8.5, 0.2, 1.5, 'stuk:150'],
  ['Pruimen', 'fruit', 45, 0.7, 10, 0.3, 1.4, 'stuk:60'],
  ['Pruimen (gedroogd)', 'fruit', 240, 2.2, 55, 0.4, 7, 'stuk:9'],
  ['Vijgen (vers)', 'fruit', 75, 0.8, 16, 0.3, 2.9, 'stuk:50'],
  ['Vijgen (gedroogd)', 'fruit', 250, 3.3, 54, 1, 9.8, 'stuk:20'],
  ['Passievrucht', 'fruit', 75, 2.2, 13, 0.7, 10.4, 'stuk:20'],
  ['Papaja', 'fruit', 40, 0.5, 9, 0.3, 1.7, 'halve:150'],
  ['Rode bessen', 'fruit', 40, 1.1, 7, 0.2, 4.3, 'handje:75'],
  ['Limoen', 'fruit', 30, 0.7, 8, 0.2, 2.8, 'stuk:65'],
  ['Appelmoes', 'fruit', 75, 0.2, 18, 0.1, 1.2, 'schaaltje:100'],
  ['Fruitsalade', 'fruit', 55, 0.6, 12, 0.2, 1.5, 'bakje:200'],

  // ---------- Uitbreiding: snacks & noten ----------
  ['Pistachenoten (gepeld)', 'snack', 570, 20, 18, 46, 10, 'handje:25'],
  ['Hazelnoten', 'snack', 650, 15, 7, 62, 9.7, 'handje:25'],
  ['Macadamianoten', 'snack', 740, 8, 5, 76, 8.6, 'handje:25'],
  ['Pecannoten', 'snack', 700, 9, 5, 72, 9.6, 'handje:25'],
  ['Paranoten', 'snack', 670, 14, 4, 67, 7.5, 'handje:25'],
  ["Pinda's (ongezouten)", 'snack', 590, 26, 10, 49, 8.5, 'handje:25'],
  ['Zonnebloempitten', 'snack', 590, 23, 12, 50, 8.6, 'eetlepel:10'],
  ['Lijnzaad (gebroken)', 'snack', 450, 20, 2, 38, 27, 'eetlepel:10'],
  ['Hennepzaad', 'snack', 580, 32, 3, 49, 4, 'eetlepel:10'],
  ['Studentenhaver', 'snack', 480, 13, 40, 30, 6, 'handje:30'],
  ['Kikkererwten (geroosterd)', 'snack', 400, 20, 50, 9, 15, 'handje:30'],
  ['Zeewiersnack', 'snack', 520, 10, 15, 45, 4, 'zakje:5'],
  ['Proteïnechips', 'snack', 400, 40, 35, 10, 5, 'zakje:30'],
  ['Popcorn (luchtgepoft)', 'snack', 380, 12, 63, 4.5, 14, 'portie:20'],
  ['Tortillachips', 'snack', 490, 7, 62, 23, 5, 'portie:30'],
  ['Zoute stengels', 'snack', 380, 10, 77, 3, 3, 'portie:30'],
  ['Groentechips', 'snack', 520, 5, 50, 33, 8, 'portie:30'],
  ['Rijstwafel met chocolade', 'zoet', 490, 7, 62, 23, 3, 'stuk:17'],
  ['Tompouce', 'zoet', 330, 3.5, 44, 15.5, 0.5, 'stuk:90'],
  ['Bossche bol', 'zoet', 380, 4.5, 33, 25, 0.8, 'stuk:110'],
  ['Speculaas', 'zoet', 470, 6, 68, 19, 2, 'stuk:15'],
  ['Kruidnoten', 'zoet', 470, 5, 73, 17, 2, 'handje:25'],
  ['Marsepein', 'zoet', 450, 8, 60, 20, 5, 'portie:20'],
  ['Notenreep (dadel)', 'snack', 420, 10, 45, 22, 6, 'stuk:35'],
  ['Fruitreep', 'snack', 350, 3, 75, 4, 5, 'stuk:25'],
  ['Eierkoek', 'zoet', 380, 7, 72, 6, 1.5, 'stuk:25'],
  ['Volkoren biscuit', 'zoet', 450, 7, 66, 17, 6, 'stuk:15'],
  ['Proteïnekoek', 'snack', 400, 30, 40, 13, 6, 'stuk:50'],
  ['Sorbetijs', 'zoet', 120, 0.3, 29, 0.2, 0.5, 'bolletje:50'],
  ['Waterijs', 'zoet', 80, 0, 20, 0, 0, 'stuk:60'],
  ['Frozen yoghurt', 'zoet', 150, 4, 25, 3.5, 0, 'bolletje:70'],
  ['Proteïne-ijs', 'zoet', 90, 7, 11, 2, 2, 'bolletje:60'],

  // ---------- Uitbreiding: dranken (per 100 ml) ----------
  ['Bruisend water', 'drank', 0, 0, 0, 0, 0, 'glas:250', 'ml'],
  ['Kombucha', 'drank', 15, 0, 3.5, 0, 0, 'flesje:330', 'ml'],
  ['Groene thee', 'drank', 1, 0, 0.2, 0, 0, 'kop:200', 'ml'],
  ['Verse muntthee', 'drank', 1, 0, 0.2, 0, 0, 'glas:250', 'ml'],
  ['Espresso', 'drank', 2, 0.1, 0.3, 0, 0, 'kopje:30', 'ml'],
  ['Flat white', 'drank', 45, 2.8, 3.8, 1.8, 0, 'kop:200', 'ml'],
  ['Latte met haverdrink', 'drank', 45, 0.5, 6.5, 1.8, 0, 'glas:250', 'ml'],
  ['Tomatensap', 'drank', 20, 0.8, 3.5, 0.1, 0.8, 'glas:200', 'ml'],
  ['Multivruchtensap', 'drank', 47, 0.4, 11, 0.1, 0.3, 'glas:200', 'ml'],
  ['Groene smoothie', 'drank', 45, 0.8, 9, 0.3, 1.2, 'flesje:250', 'ml'],
  ['Proteïneshake (kant-en-klaar)', 'drank', 70, 10, 5, 1, 0.5, 'flesje:330', 'ml'],
  ['Sportdrank', 'drank', 25, 0, 6, 0, 0, 'flesje:500', 'ml'],
  ['Limonade (aangelengd)', 'drank', 25, 0, 6, 0, 0, 'glas:250', 'ml'],
  ['Limonade zonder suiker', 'drank', 2, 0, 0.3, 0, 0, 'glas:250', 'ml'],
  ['Sinas', 'drank', 40, 0, 10, 0, 0, 'blikje:330', 'ml'],
  ['Speciaalbier', 'drank', 60, 0.5, 4, 0, 0, 'glas:300', 'ml'],
  ['Radler (bier met citroen)', 'drank', 35, 0.3, 6, 0, 0, 'flesje:300', 'ml'],
  ['Roséwijn', 'drank', 80, 0, 2.6, 0, 0, 'glas:125', 'ml'],
  ['Mousserende wijn (prosecco)', 'drank', 75, 0.1, 1.5, 0, 0, 'glas:125', 'ml'],

  // ---------- Uitbreiding: maaltijden ----------
  ['Pasta pesto', 'gerecht', 190, 6, 25, 7, 2, 'bord:350'],
  ['Macaroni met ham en kaas', 'gerecht', 160, 8, 18, 6, 1.5, 'bord:400'],
  ['Hutspot', 'gerecht', 90, 2, 12, 3.5, 2.5, 'bord:400'],
  ['Zuurkoolstamppot', 'gerecht', 110, 4, 9, 6, 2, 'bord:400'],
  ['Andijviestamppot', 'gerecht', 100, 4, 10, 5, 2, 'bord:400'],
  ['Groentesoep', 'gerecht', 30, 1.5, 4, 1, 1.2, 'kom:250'],
  ['Linzensoep', 'gerecht', 70, 4.5, 10, 1.3, 2.5, 'kom:250'],
  ['Pompoensoep', 'gerecht', 50, 1, 6, 2.5, 1, 'kom:250'],
  ['Uiensoep', 'gerecht', 40, 1.5, 5, 1.5, 0.6, 'kom:250'],
  ['Mosterdsoep', 'gerecht', 70, 2, 6, 4.5, 0.4, 'kom:250'],
  ['Saoto soep', 'gerecht', 45, 3.5, 4, 1.5, 0.4, 'kom:300'],
  ['Kipsaté met rijst en pindasaus', 'afhaal', 165, 10, 17, 6.5, 1.2, 'bord:400'],
  ['Babi pangang', 'afhaal', 170, 8, 18, 7, 1, 'bord:400'],
  ['Groene curry met kip en rijst', 'gerecht', 130, 8, 14, 4.5, 1, 'bord:400'],
  ['Pad thai', 'gerecht', 150, 7, 20, 5, 1.2, 'bord:350'],
  ['Burrito', 'gerecht', 200, 9, 25, 7, 2.5, 'stuk:250'],
  ['Taco', 'gerecht', 210, 9, 20, 10, 2.5, 'stuk:90'],
  ['Quiche', 'gerecht', 260, 9, 18, 17, 1, 'punt:150'],
  ['Ovenschotel kip-broccoli', 'gerecht', 110, 9, 8, 4.5, 1.5, 'portie:400'],
  ['Shakshuka', 'gerecht', 90, 5.5, 5, 5.5, 1.5, 'portie:350'],
  ['Bibimbap', 'gerecht', 140, 7, 20, 3.5, 1.5, 'bowl:450'],
  ['Sushi (nigiri)', 'afhaal', 140, 6, 26, 1, 0.4, 'stuk:35'],
  ['Broodje döner', 'afhaal', 230, 12, 22, 10, 1.5, 'stuk:300'],
  ['Falafelwrap', 'afhaal', 210, 7, 26, 9, 3, 'stuk:250'],
  ['Salade niçoise', 'gerecht', 90, 7, 5, 5, 1.5, 'bak:350'],
  ['Griekse salade', 'gerecht', 110, 4, 4, 9, 1.2, 'bak:300'],
  ['Couscoussalade', 'gerecht', 140, 4.5, 19, 5, 2, 'bak:300'],
  ['Pastasalade', 'gerecht', 170, 5.5, 21, 7, 1.5, 'bak:300'],
  ['Pokébowl kip', 'gerecht', 140, 9, 17, 4, 1.5, 'bowl:400'],
  ['Loempia', 'afhaal', 230, 6, 25, 11.5, 1.8, 'stuk:150'],
  ['Kaassoufflé', 'afhaal', 300, 9, 24, 19, 1, 'stuk:80'],
  ['Bitterballen', 'afhaal', 270, 8, 18, 18, 0.8, 'stuk:25'],
  ['Pizza pepperoni', 'afhaal', 280, 12, 30, 12, 2, 'halve pizza:180'],
  ['Wrap met kip (kant-en-klaar)', 'gerecht', 200, 11, 22, 7, 2, 'stuk:200'],
  ['Uitsmijter ham-kaas', 'gerecht', 220, 14, 14, 12, 1, 'portie:250'],
  ['Huzarensalade', 'gerecht', 160, 4, 11, 11, 1.5, 'bakje:150'],

  // ---------- Uitbreiding: sauzen, oliën & bakken ----------
  ['Kokosolie', 'saus', 860, 0, 0, 99, 0, 'eetlepel:13'],
  ['Teriyakisaus', 'saus', 90, 4, 17, 0.1, 0.2, 'eetlepel:15', 'ml'],
  ['Sweet chilisaus', 'saus', 220, 0.5, 52, 0.5, 0.5, 'eetlepel:15'],
  ['Sriracha', 'saus', 95, 2, 19, 1, 2.2, 'theelepel:5'],
  ['Mosterd', 'saus', 140, 7, 5, 10, 3, 'theelepel:5'],
  ['Currysaus', 'saus', 120, 1, 27, 0.4, 1, 'eetlepel:15'],
  ['Barbecuesaus', 'saus', 150, 1, 35, 0.3, 0.8, 'eetlepel:15'],
  ['Knoflooksaus', 'saus', 380, 1, 6, 39, 0, 'eetlepel:15'],
  ['Tzatziki', 'saus', 100, 3.5, 4, 8, 0.3, 'eetlepel:30'],
  ['Yoghurtdressing', 'saus', 100, 2, 7, 7, 0, 'eetlepel:15'],
  ['Vinaigrette', 'saus', 330, 0.2, 9, 33, 0, 'eetlepel:15'],
  ['Honing-mosterddressing', 'saus', 280, 1.5, 20, 21, 0.5, 'eetlepel:15'],
  ['Appelazijn', 'saus', 20, 0, 1, 0, 0, 'eetlepel:15', 'ml'],
  ['Ketjap manis', 'saus', 270, 2, 64, 0.5, 0, 'eetlepel:15'],
  ['Vissaus', 'saus', 35, 5, 3.5, 0, 0, 'theelepel:5', 'ml'],
  ['Rode pesto', 'saus', 380, 4, 8, 36, 2.5, 'eetlepel:15'],
  ['Hoisinsaus', 'saus', 220, 3, 45, 3.5, 2.6, 'eetlepel:15'],
  ['Kokosmelk', 'saus', 180, 1.6, 3, 18, 0, 'blik:400', 'ml'],
  ['Bouillon (bereid)', 'saus', 5, 0.5, 0.5, 0.2, 0, 'kop:250', 'ml'],
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const FOODS: Food[] = [...ROWS, ...MORE_ROWS].map(([name, cat, kcal, p, c, f, fib, portions, unit]) => ({
  id: 'db-' + slug(name),
  name,
  cat,
  kcal,
  p,
  c,
  f,
  fib,
  unit: unit ?? 'g',
  portions: portions.split('|').map((part) => {
    const [label, g] = part.split(':');
    return { label, g: Number(g) };
  }),
  source: 'db',
}));

export const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]));

/** Dranken met alcohol (voor de energiecontrole: alcohol levert 7 kcal per gram). */
export const ALCOHOL = new Set(ALCOHOLIC);

/** Lowercase, accents removed - for forgiving search. */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Producten die veel mensen bedoelen als ze een kort woord typen: "kip" is meestal kipfilet. */
const POPULAR = new Set([
  'Havermout', 'Volkorenbrood', 'Bruinbrood', 'Witbrood', 'Banaan', 'Appel', 'Kipfilet (gebakken)', 'Kipfilet (rauw)', 'Ei (gekookt)',
  'Ei (gebakken)', 'Halfvolle melk', 'Magere kwark', 'Skyr naturel', 'Griekse yoghurt 0%', 'Halfvolle yoghurt', 'Pindakaas',
  'Jonge kaas 48+', 'Belegen kaas 48+', 'Achterham', 'Kipfilet (beleg)', 'Hagelslag puur', 'Witte rijst (gekookt)',
  'Zilvervliesrijst (gekookt)', 'Pasta (gekookt)', 'Aardappelen (gekookt)', 'Broccoli', 'Sperziebonen', 'Tomaat', 'Komkommer',
  'Paprika', 'Avocado', 'Zalm (gebakken)', 'Rundergehakt (gebakken)', 'Tonijn in water (uitgelekt)', 'Amandelen', 'Walnoten',
  'Pure chocolade 70%', 'Koffie zwart', 'Cappuccino', 'Water', 'Cola zero', 'Bier (pils)', 'Olijfolie', 'Boter', 'Mayonaise',
  'Patat', 'Pizza margherita', 'Proteïnepoeder (whey)', 'Blauwe bessen', 'Aardbeien', 'Sinaasappel', 'Mandarijn', 'Druiven',
  'Kiwi', 'Wrap (tortilla)', 'Rijstwafel', 'Knäckebröd volkoren', 'Hüttenkäse', 'Mozzarella', 'Feta', 'Linzen (gekookt)',
  'Kikkererwten (uitgelekt)', 'Tofu', 'Zoete aardappel (gekookt)', 'Couscous (bereid)', 'Quinoa (gekookt)', 'Spinazie',
  'Champignons', 'Ui', 'Wortel', 'Chips naturel', 'Stroopwafel', 'Proteïnereep', 'Sinaasappelsap', 'Thee (zonder suiker)',
  'Latte macchiato', 'Cola', 'Melkchocolade', 'Frikandel', 'Kroket', 'Croissant', 'Krentenbol', 'Volkoren wrap',
  'Rode wijn', 'Witte wijn', 'Appelsap', 'Peer', 'Mango', 'Cherrytomaten', 'Hummus', 'Granola', 'Cruesli', 'Muesli (zonder toegevoegd suiker)',
]);

/** Andere woorden voor hetzelfde product. */
const ALIASES: Record<string, string[]> = {
  friet: ['patat', 'frites'], frieten: ['patat', 'frites'], frietje: ['patat'], patatje: ['patat'], fries: ['patat', 'frites'],
  yogurt: ['yoghurt'], yoghurtje: ['yoghurt'], cottage: ['huttenkase'], kwarkje: ['kwark'],
  spaghetti: ['pasta', 'spaghetti'], penne: ['pasta'], macaroni: ['macaroni', 'pasta'], fusilli: ['pasta'], tagliatelle: ['pasta'],
  boterham: ['brood'], boterhammen: ['brood'], broodje: ['broodje', 'bolletje', 'brood'], toast: ['toast', 'brood'],
  eieren: ['ei'], eitje: ['ei'], eitjes: ['ei'], piepers: ['aardappel'], pieper: ['aardappel'],
  shake: ['shake', 'proteine'], whey: ['proteinepoeder', 'whey'], eiwit: ['eiwit', 'proteine'], proteine: ['proteine', 'eiwit'],
  kipfilet: ['kipfilet'], cola: ['cola'], light: ['zero', 'light'], sinas: ['sinas', 'sinaasappel'], jus: ['sinaasappelsap', 'jus'],
  pinda: ['pinda'], noten: ['noten', 'amandel', 'walno', 'cashew', 'hazelno', 'pinda', 'pistache'], nootjes: ['noten', 'pinda', 'borrelnoot'],
  snoep: ['snoep', 'drop', 'winegum', 'zuurtje', 'spekjes'], koekje: ['koek', 'biscuit'], koekjes: ['koek', 'biscuit'],
  ijsje: ['ijs'], frisdrank: ['cola', 'sinas', 'frisdrank', 'ice tea', 'limonade'], fris: ['cola', 'sinas', 'frisdrank', 'ice tea'],
  limo: ['limonade'], ranja: ['limonade'], wijntje: ['wijn'], biertje: ['bier'], pils: ['bier (pils)', 'pils'],
  zuivel: ['melk', 'yoghurt', 'kwark'], groenten: ['groente'], sla: ['sla', 'salade'], salade: ['salade', 'sla'],
  aardappels: ['aardappel'], aardappeltjes: ['aardappel', 'krieltje'], rijst: ['rijst'], noedels: ['noedels', 'mie'],
  mie: ['mie', 'noedels'], wrap: ['wrap', 'tortilla'], tortilla: ['tortilla', 'wrap'], tosti: ['tosti'], pizza: ['pizza'],
  burger: ['burger'], hamburger: ['hamburger', 'burger'], shoarma: ['shoarma', 'shawarma'], doner: ['doner', 'durum'], kebab: ['doner', 'kebab'],
  vla: ['vla'], pudding: ['pudding', 'vla', 'mousse'], kaasje: ['kaas'], plakje: ['plak'], chocola: ['chocola'], chocolade: ['chocola'],
  choco: ['chocola', 'choco'], muesli: ['muesli', 'cruesli', 'granola'], cornflakes: ['cornflakes', 'ontbijtgranen'],
  havermoutpap: ['havermout'], pap: ['pap', 'havermout'], sap: ['sap', 'jus'], smoothie: ['smoothie'], koffie: ['koffie', 'cappuccino', 'latte', 'espresso'],
  thee: ['thee'], energy: ['energiedrank'], redbull: ['energiedrank'], tonijnsalade: ['tonijnsalade', 'tonijn'],
  quorn: ['mycoproteine'], vega: ['vega', 'vegetarisch', 'plantaardig'], vegetarische: ['vegetarisch', 'vega'],
};

/** Varianten van een zoekwoord: synoniemen en eenvoudige meervouden ("bananen" → "banaan", "druiven" → "druif"). */
function variants(t: string): string[] {
  const out = new Set([t, ...(ALIASES[t] ?? [])]);
  let s = t;
  if (s.length > 4 && s.endsWith('en')) s = s.slice(0, -2);
  else if (s.length > 4 && s.endsWith('jes')) s = s.slice(0, -3);
  else if (s.length > 3 && s.endsWith('s')) s = s.slice(0, -1);
  if (s !== t) {
    out.add(s);
    if (/[^aeiou][aeiou][^aeiou]$/.test(s)) out.add(s.slice(0, -1) + s.slice(-2));
    if (s.endsWith('v')) out.add(s.slice(0, -1) + 'f');
    if (s.endsWith('z')) out.add(s.slice(0, -1) + 's');
    if (/(.)\1$/.test(s)) out.add(s.slice(0, -1));
  }
  return [...out];
}

const nameCache = new WeakMap<Food, string>();
const searchName = (f: Food) => {
  let n = nameCache.get(f);
  if (n === undefined) {
    n = normalize(f.name + ' ' + (f.brand ?? ''));
    nameCache.set(f, n);
  }
  return n;
};

/**
 * Zoekt producten. Volgorde: naam begint met wat je typt, daarna woorden die ermee beginnen, populaire
 * basisproducten en wat je zelf vaak gebruikt (boost) eerst, kortere namen voor langere.
 */
export function searchFoods(query: string, foods: Food[], limit = 40, boost?: (f: Food) => number): Food[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const terms = q.split(/\s+/).map(variants);
  const scored: { food: Food; score: number }[] = [];
  const seen = new Set<string>();
  for (const food of foods) {
    if (seen.has(food.id)) continue;
    const name = searchName(food);
    if (!terms.every((vs) => vs.some((v) => name.includes(v)))) continue;
    seen.add(food.id);
    const words = name.split(/[\s(),%+-]+/);
    let score = 0;
    if (name === q) score += 200;
    // "kip" als heel woord vooraan telt zwaarder dan als begin van een langer woord ("kipburger")
    if (name.startsWith(q)) score += /[a-z0-9]/.test(name.charAt(q.length)) ? 50 : 100;
    for (const vs of terms) {
      if (words.some((w) => vs.includes(w))) score += 40;
      else if (words.some((w) => vs.some((v) => w.startsWith(v)))) score += 25;
    }
    if (vs0(terms).some((v) => words[0].startsWith(v))) score += 20;
    if (POPULAR.has(food.name)) score += 80;
    if (food.source === 'db' || food.source === 'recipe') score += 5;
    if (boost) score += boost(food);
    score -= name.length * 0.4;
    scored.push({ food, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.food);
}

const vs0 = (terms: string[][]) => terms[0] ?? [];

/** Een paar gewone producten per categorie bovenaan, de rest op alfabet. */
export function sortForCategory(list: Food[]) {
  return [...list].sort((a, b) => Number(POPULAR.has(b.name)) - Number(POPULAR.has(a.name)) || a.name.localeCompare(b.name, 'nl'));
}
