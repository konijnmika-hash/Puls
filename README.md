# Puls

Jouw persoonlijke coach voor eten, trainen en energie: calorieën en macro's tellen, water en stappen bijhouden, een gymschema op maat, en een coach die je herinnert, tips geeft en je viert als je goed bezig bent.

## Wat zit erin

- **Intake bij de eerste start**: naam, geslacht, leeftijd, lengte, gewicht, **vet (schaal 1–10)** en **spieren (schaal 1–10)** met een silhouet dat meeverandert, doel, tempo en streefgewicht, dagelijkse activiteit, trainingsdagen, gym of thuis, **beschikbare apparatuur**, **gymervaring**, focus en coach-reminders.
- **Persoonlijke doelen, opnieuw uitgerekend**:
  - **Verbruik** = rustverbranding (gemiddelde van Mifflin-St Jeor en Katch-McArdle; vetpercentage uit je eigen inschatting, gemengd met de BMI-formule van Deurenberg, die minder meetelt als je gespierd bent) × je dagelijkse activiteit **zonder** sport, plus je trainingen apart (sessieduur per ervaring, netto MET, afgestemd op jouw rustverbranding).
  - **Tempo als deel van je verbruik** (rustig 12 %, normaal 20 %, snel 25 % tekort; aankomen 5–15 % overschot), met een kleinere stap als je al slank bent en een veilige ondergrens (1.200/1.500 kcal en niet ver onder je rustverbranding). Puls laat zien hoeveel kg per week dat ongeveer is.
  - **Eiwit** 2,0–2,6 g per kg vetvrije massa (vanaf 50 jaar iets meer), **vet** als deel van je calorieën maar minimaal 0,6 g/kg, **koolhydraten** de rest, **vezels** 14 g per 1.000 kcal (Gezondheidsraad), **water** 30 ml/kg plus extra bij een actief leven en +0,5 L op trainingsdagen.
  - **Eetpatroon**: standaard, groot ontbijt, ontbijt overslaan (16:8) of vaker kleine porties; bepaalt de kcal per maaltijd, de porties in recepten en het dagmenu.
  - **Macroverdeling**: gebalanceerd, koolhydraatarm of sportief.
  - **Slimme bijsturing**: na ± 2 weken loggen en een paar keer wegen rekent Puls je **echte verbruik** uit (gemiddeld gegeten, gecorrigeerd voor je gewichtstrend) en stuurt je doel daarop bij, maximaal 20 %.
  - **Zo rekent Puls**: een uitlegscherm met de hele berekening en jouw eigen getallen.
- **Coach**: elke dag berichten op maat (ochtendplan, “je loopt achter met water”, eiwittips, trainingsreminder, stappen, streaks), een felicitatie-animatie zodra je een doel haalt, en reminders (water, maaltijden, training op een zelfgekozen tijd, dagoverzicht om 21:00) als melding op je telefoon of in de app.
- **Dagboek**: ontbijt, lunch, avondeten en snacks met aanbevolen kcal per maaltijd en een balkje hoe vol die maaltijd al is. Een **weekstrook** met per dag een ringetje (op doel, eronder of erboven) om snel terug te bladeren. Eiwit, koolhydraten, vet én **vezels** in de dagkaart. "Zelfde als gisteren" en **eigen maaltijden**: bewaar een maaltijd en log hem later in één tik.
- **Voedingsdatabase**: **1.028 Nederlandse producten**, allemaal met vezels, in 14 categorieën met eigen iconen (o.a. koek, snoep & toetjes en snackbar & afhaal), plus online zoeken in miljoenen merkproducten via [Open Food Facts](https://world.openfoodfacts.org). Zoeken begrijpt meervouden en andere woorden ("bananen", "friet", "spaghetti") en zet basisproducten en wat jij vaak eet bovenaan.
  - **Snel invullen**: met de + naast een product voeg je meteen één portie toe; het scherm blijft open zodat je een hele maaltijd achter elkaar invult (met "Ongedaan").
  - Per product: porties, snelkeuze (½, 1, 1½…), de verdeling van de energie, eiwit/koolhydraten/vet/vezels en welk deel van je dagdoel dat is, en hoeveel je daarna nog over hebt.
  - Verder: alleen kcal invullen, eigen producten (ook drinken in ml en met vezels), favorieten, recent en een barcodescanner (camera, foto of cijfers intikken).
- **Recepten** (eigen tab): **146 recepten** voor ontbijt, lunch, avondeten en snacks (van eiwitpannenkoeken en erwtensoep tot pad thai, bami en burrito bowls), elk met een getekende foodfoto, ingrediënten, stappen en een tip. Calorieën, macro's en vezels worden uit de voedingsdatabase berekend.
  - **Porties op maat**: elk recept wordt geschaald (½× tot 2×) naar jouw doel voor die maaltijd. Heb je vandaag al gegeten, dan verdeelt Puls wat je nog over hebt over de maaltijden die nog open staan.
  - **Je coach raadt aan**: voorstellen voor de maaltijd die nu aan de beurt is, op basis van je resterende kcal en eiwit, met uitleg waarom het past. Recent gegeten recepten wisselt hij af.
  - **Dagmenu**: één recept per maaltijd dat samen je calorie- en eiwitdoel haalt; schudden voor een ander menu en alles in één tik op je boodschappenlijst.
  - **Kookmodus**: stap voor stap in grote letters, ingebouwde kookwekker met geluid en trilling, scherm blijft aan, en aan het eind meteen loggen.
  - **Boodschappenlijst**: dezelfde producten worden opgeteld en per afdeling gesorteerd; afvinken en delen.
  - Favorieten, vega-voorkeur (geldt ook voor alle voorstellen), filters (eiwitrijk, snel, vezelrijk, koolhydraatarm, veganistisch, meal prep, budget, zoet, comfortfood), sorteren (meeste eiwit, minste kcal, snelst klaar) en zoeken op ingrediënt. Recepten zijn ook te vinden in “Eten toevoegen”.
  - Lege maaltijden op het dagscherm tonen een **idee van je coach**, en de coach stelt 's middags voor wat je vanavond kunt eten of welke snack je eiwittekort aanvult.
  - Echte foto's: zet een foto in `public/recepten/` en vul `photo: 'recepten/<id>.jpg'` in bij het recept in `src/data/recipes.ts`; die gaat dan vóór de tekening.
- **Water**: glas met golfanimatie en een seintje als je achterloopt op schema.
- **Stappen**: handmatig invoeren; koppelscherm voor Health Connect / Apple Gezondheid (zie hieronder).
- **Trainingsschema**: 1–2 dagen = full body; 3 dagen = push / pull / benen; 4 dagen = borst & triceps, rug & biceps, benen, schouders & armen; 5 dagen = één spiergroep per dag; 6 dagen = push/pull/benen 2×. Oefeningen worden gekozen op je apparatuur en ervaring (van machines en lichaamsgewicht voor starters tot halterstang-oefeningen voor gevorderden). Elke oefening heeft een **geanimeerd plaatje**, stapsgewijze uitleg en een tip. Je kunt een oefening **wisselen** of aangeven dat je hem **niet kunt doen**; dan kiest Puls een alternatief voor dezelfde spieren. Tijdens de training vink je sets af, houd je je gewichten bij en loopt er een rusttimer.
- **Activiteiten**: 35 sporten en bezigheden, met tempo of zwaarte (bijv. hardlopen 8–14 km/u, fietsen rustig tot wielrennen). De kcal-schatting gebruikt MET, afgestemd op jouw rustverbranding.
- **Voortgang**: **trendgewicht** (dagelijkse schommelingen eruit gefilterd), tempo per week en een **voorspelling** wanneer je je streefgewicht haalt; je **gemeten verbruik**; gemiddelde eiwit, koolhydraten, vet en vezels; calorieën, water en stappen per dag; streak en dagen op doel.
- **Premium (€ 4,99/mnd of € 39,99/jaar)**: barcodescanner, eigen doelen en 30-dagen-grafieken. Nu een demo-schakelaar; echte betalingen gaan straks via App Store / Google Play.
- **Cadeaucodes**: een link `…/#cadeau=…` of een geplakte code geeft Premium voor altijd. Codes zijn ondertekend (ECDSA P-256); Puls controleert ze met de openbare sleutel in `src/lib/cadeau-sleutel.ts`, dus niemand kan zelf codes maken.
- Licht en donker thema, werkt offline als PWA (installeerbaar op je beginscherm), gegevens blijven op het toestel.

## Starten

```bash
npm install
npm run dev        # http://localhost:5173, open op je telefoon via het netwerkadres
npm run telefoon   # zelfde, maar via https: nodig voor de camera (barcodescanner) op je telefoon
npm test           # rekenregels, database, schema-generator en recepten
npm run build      # productiebuild in dist/
npm run build:single  # alles in één HTML-bestand (dist-single/) om te delen
```

## Puls Beheer (alleen voor de eigenaar)

`beheer.html` (online: `https://<gebruiker>.github.io/<repo>/beheer.html`) is je eigen beheer-app in de Puls-stijl:

- **Abonnementen**: hoeveel mensen Premium hebben, per soort (cadeau voor altijd, maandelijks, jaarlijks) en een grafiek per maand. Betaalde abonnementen staan op 0 zolang betalen nog een demo is.
- **Premium cadeau geven**: naam invullen, link delen. Wie de link opent heeft Premium voor altijd.
- **Lijst** van iedereen die een cadeau heeft gekregen, met datum en notitie; link opnieuw kopiëren of delen.
- **Back-up** downloaden en terugzetten om naar een ander toestel te gaan.

De pagina werkt alleen met het geheime sleutelbestand `puls-beheer-sleutel.json`. Dat staat **niet** in deze repo: bewaar het goed en deel het met niemand. Bij de eerste keer kies je het bestand en een beheercode; daarna staat de sleutel versleuteld op je toestel.

## Barcodescanner en camera

- Scannen werkt live met de camera: op Chrome/Android via de ingebouwde BarcodeDetector, op iPhone (Safari) en andere browsers via ZXing. De decoder wordt pas geladen als je gaat scannen.
- Telefoons geven de camera alleen vrij via **https**. Gebruik dus de GitHub Pages-link of `npm run telefoon` (je telefoon toont dan eenmalig een waarschuwing over het zelfgemaakte certificaat; kies doorgaan).
- Geen camera of geweigerd? Je kunt een **foto van de barcode** maken of kiezen, of de cijfers intikken. De app legt per situatie uit wat er mis is (geweigerd, geen https, afgeschermd venster, camera bezet).
- Opzoeken gebeurt via Open Food Facts en heeft internet nodig.

## Online zetten (GitHub Pages)

De workflow `.github/workflows/pages.yml` test en bouwt Puls en publiceert hem op `https://<gebruiker>.github.io/<repo>/` zodra er naar `main` wordt gepusht. Zet eenmalig in de repo bij Settings → Pages de bron op “GitHub Actions”. Via https werken camera, meldingen en “Zet op beginscherm”.

## Volgende stappen richting App Store / Play Store

1. **Native verpakken** met [Capacitor](https://capacitorjs.com): dezelfde code wordt een iOS- en Android-app.
2. **Push-meldingen op de achtergrond**: in de webversie komen reminders alleen als de app open is of op de achtergrond draait. In de native app plan je ze met lokale notificaties (Capacitor Local Notifications).
3. **Stappen automatisch**: Google Fit-API’s worden uitgefaseerd; gebruik **Health Connect** (Android) en **HealthKit** (iOS) via een Capacitor-plugin. Het koppelscherm staat al klaar.
4. **Abonnement**: in-app aankopen via App Store en Google Play (bijv. met RevenueCat); de Premium-schermen en vergrendelde functies staan al klaar.
5. **Accounts en sync**: nu staat alles lokaal op het toestel; met een backend (bijv. Supabase of Firebase) kunnen gebruikers wisselen van telefoon.
6. **Open Food Facts**: vermeld de bron (ODbL-licentie) in de app en stuur een eigen User-Agent mee vanuit de native app.
