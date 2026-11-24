# Puls

Jouw persoonlijke coach voor eten, trainen en energie: calorieën en macro's tellen, water en stappen bijhouden, een gymschema op maat, en een coach die je herinnert, tips geeft en je viert als je goed bezig bent.

## Wat zit erin

- **Intake bij de eerste start**: naam, geslacht, leeftijd, lengte, gewicht, **vet (schaal 1–10)** en **spieren (schaal 1–10)** met een silhouet dat meeverandert, doel, tempo en streefgewicht, dagelijkse activiteit, trainingsdagen, gym of thuis, **beschikbare apparatuur**, **gymervaring**, focus en coach-reminders.
- **Persoonlijke doelen**: rustverbranding als gemiddelde van Mifflin-St Jeor en Katch-McArdle (op basis van de geschatte vetvrije massa uit de schalen, met correctie voor spiermassa) × activiteitsfactor, met tekort/overschot op basis van tempo. Eiwit 2,0–2,5 g per kg vetvrije massa, vet 28 %, de rest koolhydraten; waterdoel 35 ml/kg (+0,5 L op trainingsdagen) en een stappendoel op basis van je activiteit.
- **Coach**: elke dag berichten op maat (ochtendplan, “je loopt achter met water”, eiwittips, trainingsreminder, stappen, streaks), een felicitatie-animatie zodra je een doel haalt, en reminders (water, maaltijden, training op een zelfgekozen tijd, dagoverzicht om 21:00) als melding op je telefoon of in de app.
- **Dagboek**: ontbijt, lunch, avondeten en snacks, met aanbevolen kcal per maaltijd, “zelfde als gisteren” en per dag terugbladeren.
- **Voedingsdatabase**: 500+ Nederlandse producten met porties (snee, plak, glas…), plus online zoeken in miljoenen merkproducten via [Open Food Facts](https://world.openfoodfacts.org). Ook: snel kcal toevoegen, eigen producten, favorieten, recent en een barcodescanner (camera, of cijfers intikken).
- **Recepten** (eigen tab): 77 recepten voor ontbijt, lunch, avondeten en snacks, elk met een getekende foodfoto, ingrediënten, stappen en een tip. Calorieën en macro's worden uit de voedingsdatabase berekend.
  - **Porties op maat**: elk recept wordt geschaald (½× tot 2×) naar jouw doel voor die maaltijd. Heb je vandaag al gegeten, dan verdeelt Puls wat je nog over hebt over de maaltijden die nog open staan.
  - **Je coach raadt aan**: voorstellen voor de maaltijd die nu aan de beurt is, op basis van je resterende kcal en eiwit, met uitleg waarom het past. Recent gegeten recepten wisselt hij af.
  - **Dagmenu**: één recept per maaltijd dat samen je calorie- en eiwitdoel haalt; schudden voor een ander menu en alles in één tik op je boodschappenlijst.
  - **Kookmodus**: stap voor stap in grote letters, ingebouwde kookwekker met geluid en trilling, scherm blijft aan, en aan het eind meteen loggen.
  - **Boodschappenlijst**: dezelfde producten worden opgeteld en per afdeling gesorteerd; afvinken en delen.
  - Favorieten, vega-voorkeur (geldt ook voor alle voorstellen), filters (eiwitrijk, snel, meal prep, budget, zoet, comfortfood) en zoeken op ingrediënt. Recepten zijn ook te vinden in “Eten toevoegen”.
  - Lege maaltijden op het dagscherm tonen een **idee van je coach**, en de coach stelt 's middags voor wat je vanavond kunt eten of welke snack je eiwittekort aanvult.
  - Echte foto's: zet een foto in `public/recepten/` en vul `photo: 'recepten/<id>.jpg'` in bij het recept in `src/data/recipes.ts`; die gaat dan vóór de tekening.
- **Water**: glas met golfanimatie en een seintje als je achterloopt op schema.
- **Stappen**: handmatig invoeren; koppelscherm voor Health Connect / Apple Gezondheid (zie hieronder).
- **Trainingsschema**: 1–2 dagen = full body; 3 dagen = push / pull / benen; 4 dagen = borst & triceps, rug & biceps, benen, schouders & armen; 5 dagen = één spiergroep per dag; 6 dagen = push/pull/benen 2×. Oefeningen worden gekozen op je apparatuur en ervaring (van machines en lichaamsgewicht voor starters tot halterstang-oefeningen voor gevorderden). Elke oefening heeft een **geanimeerd plaatje**, stapsgewijze uitleg en een tip. Je kunt een oefening **wisselen** of aangeven dat je hem **niet kunt doen**; dan kiest Puls een alternatief voor dezelfde spieren. Tijdens de training vink je sets af, houd je je gewichten bij en loopt er een rusttimer.
- **Activiteiten**: hardlopen, fietsen, padel, zwemmen enz. met kcal-schatting (MET).
- **Voortgang**: gewichtslijn naar streefgewicht, calorieën, water en stappen per dag, streak.
- **Account en abonnement**: account met e-mail en wachtwoord, 14 dagen gratis vanaf de eerste keer openen, daarna € 2,99 per maand of € 30 per jaar voor de hele app. Zonder abonnement zie je alleen het betaalscherm. Accounts en betalingen zijn nu nog lokaal en een demo (`src/lib/account.ts`).
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
4. **Abonnement en accounts**: een server voor accounts (bijv. Supabase of Firebase) zodat je op elk apparaat kunt inloggen, en echte betalingen via Mollie/Stripe (web) of App Store/Google Play (bijv. met RevenueCat). Vervang daarvoor `checkout` en de accountfuncties in `src/lib/account.ts`; de schermen staan al klaar.
5. **Accounts en sync**: nu staat alles lokaal op het toestel; met een backend (bijv. Supabase of Firebase) kunnen gebruikers wisselen van telefoon.
6. **Open Food Facts**: vermeld de bron (ODbL-licentie) in de app en stuur een eigen User-Agent mee vanuit de native app.

## Server en beheer

Zonder server werkt Puls helemaal op het toestel (accounts en abonnementen alleen lokaal). Met een gratis Supabase-project staan alle accounts op één plek, werken vriendencodes en zie je je cijfers in het beheeroverzicht.

1. Maak een project op [supabase.com](https://supabase.com) (gratis).
2. Ga naar **SQL Editor → New query**, plak de inhoud van `supabase/schema.sql` en klik **Run**.
3. Maak jezelf beheerder: draai in de SQL Editor
   `insert into public.admins (email) values ('jouw@email.nl');` (met jouw e-mailadres).
4. Zet in **Authentication → Sign In / Providers → Email** de optie *Confirm email* uit als je wilt dat mensen meteen verder kunnen (aan laten kan ook: dan krijgen ze eerst een bevestigingsmail).
5. Kopieer in **Project Settings → API** de *Project URL* en de *anon public key*, en zet ze in GitHub bij **Settings → Secrets and variables → Actions → Variables** als `SUPABASE_URL` en `SUPABASE_ANON_KEY`. Lokaal kan het in een bestand `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
6. Na de volgende publicatie maak je in de app een account met het e-mailadres uit stap 3.

**Beheeroverzicht:** open `admin.html` naast de app (bijv. `https://<jouw-site>/admin.html`) en log in met je beheerdersaccount. Je ziet:
- betalende abonnees, met hoeveel per maand en per jaar
- hoeveel mensen kochten, omzet per maand en van de laatste 30 dagen
- accounts, wie in de proefperiode zit en wie na de proef niet kocht
- aankopen per week en de laatste aankopen
- **vriendencodes**: maak een code voor iemand, kopieer hem (of een kant-en-klaar berichtje) en zie wie hem gebruikt heeft. Met een code is Puls voor altijd gratis.

Zonder server kun je het overzicht bekijken met verzonnen voorbeeldcijfers.

**Let op:** betalen is nog een demo (`demo_checkout` in `schema.sql` zet het abonnement direct aan). Voor echte betalingen komt hier een betaalprovider (Mollie of Stripe) met een webhook die het abonnement en de aankoop wegschrijft.

