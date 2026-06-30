# Smart Design Football ⚽

**Precision Shooting Challenge — Version 1.0**
*A premium, browser-based football game. One stadium. One goal. Sixty seconds. Pure skill.*

Built from the Smart Design Football production blueprint by Blake BMC.

---

## Play it

Open `index.html` in any modern browser — no install, no build step, no server required for local testing. For the full experience (and to publish a shareable link), deploy it with GitHub Pages or Vercel (instructions below).

## How to play

1. **Swipe the ball** — drag from the football and release toward the goal. The direction and length of your swipe set the shot's power and placement.
2. **Hit the moving targets** inside the goal: the centre target is worth 100, the corner targets 250, and the rare gold bonus target is worth 500.
3. **Chain hits together** for a streak bonus, and keep your accuracy up.
4. You have **60 seconds**. Highest score wins.

Works with touch (swipe) on phones/tablets and mouse drag on desktop.

## What's included

| File | Purpose |
|---|---|
| `index.html` | Page structure — every screen (splash, menu, how to play, settings, high scores, about, game, end) |
| `style.css` | The premium dark + gold visual theme, fully responsive |
| `script.js` | All game logic: physics, scoring, targets, timer, audio, difficulty, navigation, local high scores |
| `README.md` | This file |

No external assets, frameworks, or build tools are required — sound effects are synthesized in the browser with the Web Audio API, so there are no audio files to manage.

## Features implemented

- Splash screen, main menu, how-to-play, settings, high scores, about, in-game HUD, pause, and end-game screens
- Swipe / drag-to-shoot physics with power and direction
- Three moving target types (centre, corner ×2, timed bonus) with score values
- Streak combo bonus and live accuracy tracking
- Three difficulty modes (Easy / Normal / Professional) that change target speed, movement, bonus frequency, and hit precision
- 60-second countdown timer with low-time warning state
- Locally persisted high scores (top 10) and settings (sound, music, difficulty) via `localStorage`
- Pause / resume, mute, and share-score (native share sheet or clipboard fallback)
- Fully responsive canvas rendering — scales cleanly across phones, tablets, laptops, and desktops
- Stadium visual theme: floodlights, pitch, goal net, premium dark + metallic gold UI

## Publish it to GitHub + Vercel

```bash
# from inside this folder
git init
git add .
git commit -m "Smart Design Football v1.0 — Precision Shooting Challenge"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/smart-design-football.git
git push -u origin main
```

Then either:

- **GitHub Pages** — repo Settings → Pages → Deploy from branch `main` / root. Your game will be live at `https://YOUR-USERNAME.github.io/smart-design-football/`.
- **Vercel** — go to vercel.com → New Project → Import the GitHub repo → Deploy (no configuration needed, it's a static site). You'll get a live production URL automatically on every push.

## Roadmap (Version 2+)

Penalty shootout mode, career mode, online multiplayer, global leaderboards (would need a backend such as Supabase), daily challenges, achievements, player customisation, tournament mode, AI goalkeeper, multiple stadiums.

---

*Designed and developed by Blake BMC.*
