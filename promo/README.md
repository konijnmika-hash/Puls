# Puls promotiefilmpje

`puls-promo.mp4`: 33 seconden, staand 1080×1920 (Reels, TikTok, Shorts, Stories), 30 fps, met muziek.

Opnieuw maken na aanpassingen in `scene.html`:

```bash
npm ci                 # in de root, voor Playwright
python3 promo/music.py # soundtrack -> promo/music.wav
node promo/render.cjs  # beelden + muziek -> promo/puls-promo.mp4
```

Elke scène wordt aangestuurd door `render(t)` in `scene.html`. Open het bestand in een browser en roep `render(12)` aan in de console om een moment te bekijken.
