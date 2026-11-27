# Puls promotiefilmpjes

Twaalf promotiefilmpjes voor Puls. Elk filmpje heeft eigen, zelf gecomponeerde muziek. Filmpje 01 tot en met 11 eindigen met **"Download Puls nu, 14 dagen gratis"**; filmpje 12 eindigt met **"Eerste 14 dagen Premium gratis"** en de knop **"Download Puls"**. De kant-en-klare video's staan in `out/`.

| # | Bestand | Formaat | Duur | Waar gaat het over | Muziek |
|---|---------|---------|------|--------------------|--------|
| 01 | `out/01-promo.mp4` | 9:16 (1080×1920) | 33 s | Overzicht: hartslag-intro, logo, voeding, scanner, training, coach | Premium tech-pop, 91 bpm |
| 02 | `out/02-stop-met-gokken.mp4` | 9:16 | 21,5 s | Hook: drie herkenbare problemen worden doorgestreept, daarna de oplossing | Gespannen intro en een future-bass-drop, 120 bpm |
| 03 | `out/03-een-dag-met-puls.mp4` | 9:16 | 29,5 s | Een dag van 07:30 tot 21:00, de lucht verkleurt van ochtend naar nacht | Zonnige deep house, 120 bpm |
| 04 | `out/04-scan-alles.mp4` | 9:16 | 18 s | Zes producten gescand op de beat, de lijst vult zich | Energieke electro house, 128 bpm |
| 05 | `out/05-recepten.mp4` | 9:16, licht thema | 25 s | 77 recepten, porties op maat, dagmenu, boodschappenlijst | Warme lo-fi chillhop, 92 bpm |
| 06 | `out/06-training.mp4` | 9:16 | 23,5 s | Squat-animatie, 1–6 trainingsdagen, oefening wisselen, sets afvinken | Donkere trap/gym-beat, 140 bpm |
| 07 | `out/07-coach.mp4` | 9:16 | 20,5 s | Meldingen van de coach op het vergrendelscherm, van 08:00 tot 21:00 | Speelse minimal-pop met marimba, 112 bpm |
| 08 | `out/08-wetenschap.mp4` | 9:16 | 23 s | Hoe Puls je plan berekent: Mifflin-St Jeor, Katch-McArdle, macro's, water | Filmische tech, 100 bpm |
| 09 | `out/09-jouw-plan.mp4` | 9:16 | 23,5 s | De intake met silhouet en schuifjes, daarna onthulling van je plan | Filmische opbouw met drop, 110 bpm |
| 10 | `out/10-manifest.mp4` | **16:9 (1920×1080)** | 21 s | Kinetische typografie, "Eet slimmer. Train beter. Voel je sterker." | Stampende electro-pop-anthem, 124 bpm |
| 11 | `out/11-voortgang.mp4` | 9:16 | 27 s | Van dag 1 tot dag 84: gewichtsgrafiek, mijlpalen, "Kleine stappen. Grote verandering." | Emotionele piano en strijkers, 96 bpm |
| 12 | `out/12-probeer-14-dagen.mp4` | 9:16 | **15 s** | Voor TikTok: "Probeer dit 14 dagen", daarna dag 1, 2, 5, 8 en 14 met **echte beelden van de app** (dashboard, barcodescanner, recepten, training, statistieken) en als slot "Eerste 14 dagen Premium gratis" | Energieke pop-house, 128 bpm |

Je kunt ze plaatsen op Reels, TikTok, Shorts en Stories (9:16), en op YouTube of je website (16:9). Alle muziek staat op −14 LUFS, de norm voor social media.

## Muziek

De muziek is zelf gemaakt in code en dus volledig rechtenvrij (`music/`):

- `music/lib.py` is een kleine muziekstudio. Hij heeft synthesizers (supersaw, pluck, FM-bel, 808, Karplus-Strong), drums, overgangen (riser, impact, whoosh), echte instrumenten via FluidSynth met de General MIDI-soundfont (piano, Rhodes, strijkers, koor, koper, vibrafoon, contrabas), galm, delay, sidechain en mastering.
- `music/tNN.py` is per filmpje het arrangement, afgestemd op de beelden. Schermwissels vallen op de maat en interface-geluidjes (scanpiep, afvinken, meldingen) zijn gestemd in de toonsoort.

## Zelf opnieuw maken

Je hebt Node met Playwright nodig (`npm ci` in de root), ffmpeg, Python 3 en de audiotools:

```bash
pip install pedalboard scipy mido pyloudnorm numpy
sudo apt-get install fluidsynth fluid-soundfont-gm

python3 promo/music/t04.py            # muziek -> promo/videos/04-scan-alles/audio.wav
node promo/render.cjs 04-scan-alles   # beeld + muziek -> promo/out/04-scan-alles.mp4
node promo/render.cjs 04-scan-alles --shots 2,5,9,15   # contactblad met losse frames om te controleren
```

- Elk filmpje is een HTML-pagina (`videos/NN-naam/scene.html`) met een functie `render(t)`. Open hem in een browser en roep bijvoorbeeld `render(7.5)` aan in de console om een moment te bekijken.
- Gedeelde onderdelen staan in `lib/`: `base.css` (stijl), `engine.js` (animaties, logo, telefoon, sportfiguurtje, silhouet en confetti) en `screens.js` (geanimeerde app-schermen).
- Bij filmpje 01 laat `sync.json` de schermwissels precies op de maat van de muziek vallen.
- De getoonde gegevens (Sam, 2.300 kcal, de gewichtsgrafiek) zijn voorbeeldgegevens.
- De renderer rekent de kleuren om volgens de HD-norm (BT.709) en labelt de video zo. Daardoor ziet het groen er in apps hetzelfde uit als in de browser. De filmpjes 01 tot en met 11 zijn nog met de oude instelling gemaakt; wie ze opnieuw rendert krijgt een fractie andere kleuren.

## Filmpje 12: echte beelden van de app

Filmpje 12 tekent de app niet na, maar laat de echte app zien. Dat gaat in drie stappen:

```bash
npm ci                                       # eenmalig, in de root: de app moet kunnen draaien
node promo/capture.cjs 12-probeer-14-dagen   # app-beelden   -> promo/videos/12-probeer-14-dagen/clips/
python3 promo/music/t12.py                   # muziek        -> promo/videos/12-probeer-14-dagen/audio.wav
node promo/render.cjs 12-probeer-14-dagen    # beeld + muziek -> promo/out/12-probeer-14-dagen.mp4
```

- `capture.cjs` start de app, vult hem met voorbeeldgegevens en neemt per shot een clip op. De klok en alle animaties staan stil en gaan per frame 1/30 seconde verder, dus elke opname is precies gelijk en loopt vloeiend. De clips (ongeveer 120 MB aan losse frames) staan niet in de repo; je maakt ze met het commando hierboven.
- `videos/12-probeer-14-dagen/clips.cjs` beschrijft het verhaal: de eerste 14 dagen van Sam (dag 1 is maandag 16 november 2026). Per clip staat er welke dag het is, wat er al is ingevuld en wat er gebeurt: eten loggen, scannen, scrollen, sets afvinken. Alles valt op de tel van de muziek (128 bpm, 1 tel = 14 frames).
- Snel kijken zonder op te nemen: `node promo/capture.cjs 12-probeer-14-dagen scan --peek` maakt één schermfoto van die clip; na een opname staat er per clip ook een contactblad (`clips/<naam>-blad.jpg`).
- De barcodescanner is de echte app, maar het camerabeeld is getekend (een pak magere kwark met een echte EAN-13-code) en het antwoord van de online productdatabase ligt vast. Zo is de opname elke keer hetzelfde.
- In `scene.html` zoomt een camera per shot in op het deel van de app dat ertoe doet. De posities komen uit de opname zelf (`clips/manifest.json`), dus als de app verandert schuift de camera mee.
- TikTok legt eigen knoppen over de video. Belangrijke tekst staat daarom tussen y 140 en 1440 en links van x 940. Open `scene.html` in een browser en typ `safe(true)` in de console om die zones te zien.
