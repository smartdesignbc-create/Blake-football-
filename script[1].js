/* ============================================================
   SMART DESIGN FOOTBALL — script.js
   Precision Shooting Challenge — Version 1.0
   Vanilla JS + Canvas2D. No build step, no external assets.
   ============================================================ */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     0. STORAGE / SETTINGS
  --------------------------------------------------------- */
  const STORE_KEY_SCORES = "sdf_high_scores";
  const STORE_KEY_SETTINGS = "sdf_settings";

  const defaultSettings = { sfx: true, music: false, difficulty: "normal" };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORE_KEY_SETTINGS);
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
    } catch { return { ...defaultSettings }; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(STORE_KEY_SETTINGS, JSON.stringify(s)); } catch {}
  }
  function loadScores() {
    try {
      const raw = localStorage.getItem(STORE_KEY_SCORES);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveScores(arr) {
    try { localStorage.setItem(STORE_KEY_SCORES, JSON.stringify(arr)); } catch {}
  }
  function addHighScore(score) {
    const scores = loadScores();
    scores.push({ score, date: new Date().toISOString().slice(0, 10) });
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 10);
    saveScores(top);
    return top;
  }

  let settings = loadSettings();

  /* ---------------------------------------------------------
     1. DIFFICULTY TUNING
     Target movement / speed / bonus frequency / scoring difficulty
  --------------------------------------------------------- */
  const DIFFICULTY = {
    easy: {
      label: "Easy",
      targetSpeed: 0.55,
      moveAmplitude: 0.10,
      bonusChance: 0.22,
      hitRadiusMult: 1.25,
      ballFlightMs: 620,
    },
    normal: {
      label: "Normal",
      targetSpeed: 0.95,
      moveAmplitude: 0.18,
      bonusChance: 0.16,
      hitRadiusMult: 1.0,
      ballFlightMs: 540,
    },
    professional: {
      label: "Professional",
      targetSpeed: 1.5,
      moveAmplitude: 0.27,
      bonusChance: 0.10,
      hitRadiusMult: 0.78,
      ballFlightMs: 460,
    },
  };

  /* ---------------------------------------------------------
     2. AUDIO ENGINE (synthesized — zero external files)
  --------------------------------------------------------- */
  const Audio2 = (() => {
    let ctx = null;
    let musicNodes = null;
    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type = "sine", vol = 0.18, startDelay = 0, slideTo = null) {
      if (!settings.sfx) return;
      const c = getCtx();
      const t0 = c.currentTime + startDelay;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
    function noiseBurst(dur = 0.12, vol = 0.22) {
      if (!settings.sfx) return;
      const c = getCtx();
      const bufferSize = c.sampleRate * dur;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const gain = c.createGain();
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
    }
    return {
      kick() { noiseBurst(0.09, 0.20); tone(180, 0.12, "triangle", 0.12, 0, 90); },
      hitCenter() { tone(520, 0.18, "sine", 0.22, 0, 700); },
      hitCorner() { tone(620, 0.2, "sine", 0.24, 0, 900); tone(900, 0.16, "sine", 0.12, 0.05); },
      hitBonus() {
        tone(700, 0.12, "square", 0.18, 0);
        tone(900, 0.12, "square", 0.18, 0.08);
        tone(1200, 0.18, "square", 0.18, 0.16);
      },
      miss() { tone(160, 0.22, "sawtooth", 0.10, 0, 90); },
      click() { tone(820, 0.05, "square", 0.08); },
      countdownBeep(final = false) {
        tone(final ? 880 : 520, final ? 0.3 : 0.12, "sine", 0.2);
      },
      streak(n) { tone(500 + n * 40, 0.1, "triangle", 0.15); },
      celebrate() {
        [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "sine", 0.14, i * 0.09));
      },
      setMusic(on) {
        if (on && settings.music) {
          if (musicNodes) return;
          const c = getCtx();
          const gain = c.createGain();
          gain.gain.value = 0.035;
          gain.connect(c.destination);
          const notes = [220, 261, 196, 246];
          let i = 0;
          const id = setInterval(() => {
            if (!settings.music) return;
            const osc = c.createOscillator();
            osc.type = "sine";
            osc.frequency.value = notes[i % notes.length];
            const g = c.createGain();
            g.gain.setValueAtTime(0.05, c.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.6);
            osc.connect(g).connect(gain);
            osc.start();
            osc.stop(c.currentTime + 1.6);
            i++;
          }, 900);
          musicNodes = { gain, id };
        } else if (musicNodes) {
          clearInterval(musicNodes.id);
          musicNodes.gain.disconnect();
          musicNodes = null;
        }
      },
    };
  })();

  /* ---------------------------------------------------------
     3. SCREEN NAVIGATION
  --------------------------------------------------------- */
  const screens = {};
  document.querySelectorAll(".screen").forEach(el => { screens[el.id.replace("-screen", "")] = el; });

  function goTo(name) {
    Object.values(screens).forEach(s => s.classList.add("hidden"));
    if (screens[name]) screens[name].classList.remove("hidden");
    Audio2.click();
    if (name === "high-scores") renderScores();
    if (name === "menu") Game.stopIfRunning();
  }

  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => goTo(btn.getAttribute("data-nav")));
  });

  /* ---------------------------------------------------------
     4. SETTINGS SCREEN WIRING
  --------------------------------------------------------- */
  const toggleSfx = document.getElementById("toggle-sfx");
  const toggleMusic = document.getElementById("toggle-music");
  const diffRow = document.getElementById("diff-row");

  function refreshSettingsUI() {
    toggleSfx.classList.toggle("on", settings.sfx);
    toggleMusic.classList.toggle("on", settings.music);
    diffRow.querySelectorAll(".diff-pill").forEach(p => {
      p.classList.toggle("active", p.dataset.diff === settings.difficulty);
    });
    document.getElementById("btn-mute").textContent = settings.sfx ? "🔊" : "🔇";
  }
  toggleSfx.addEventListener("click", () => {
    settings.sfx = !settings.sfx; saveSettings(settings); refreshSettingsUI();
  });
  toggleMusic.addEventListener("click", () => {
    settings.music = !settings.music; saveSettings(settings); refreshSettingsUI();
    Audio2.setMusic(settings.music);
  });
  diffRow.querySelectorAll(".diff-pill").forEach(p => {
    p.addEventListener("click", () => {
      settings.difficulty = p.dataset.diff; saveSettings(settings); refreshSettingsUI(); Audio2.click();
    });
  });
  document.getElementById("btn-mute").addEventListener("click", () => {
    settings.sfx = !settings.sfx; saveSettings(settings); refreshSettingsUI();
  });
  refreshSettingsUI();

  /* ---------------------------------------------------------
     5. HIGH SCORES SCREEN
  --------------------------------------------------------- */
  function renderScores() {
    const body = document.getElementById("score-table-body");
    const scores = loadScores();
    if (!scores.length) {
      body.innerHTML = `<tr><td colspan="3" style="color:var(--ink-dim); text-align:center; padding:20px 0;">No scores yet. Play a match to set a record.</td></tr>`;
      return;
    }
    body.innerHTML = scores.map((s, i) =>
      `<tr><td>${String(i + 1).padStart(2, "0")}</td><td style="color:var(--ink-dim); font-size:12px;">${s.date}</td><td>${s.score}</td></tr>`
    ).join("");
  }
  document.getElementById("btn-clear-scores").addEventListener("click", () => {
    if (confirm("Clear all saved high scores?")) { saveScores([]); renderScores(); }
  });

  /* ---------------------------------------------------------
     6. SPLASH → MENU
  --------------------------------------------------------- */
  window.addEventListener("load", () => {
    setTimeout(() => { goTo("menu"); }, 1500);
  });

  /* ---------------------------------------------------------
     7. THE GAME ENGINE
  --------------------------------------------------------- */
  const canvas = document.getElementById("stage");
  const ctx2d = canvas.getContext("2d");
  const stageWrap = document.getElementById("stage-wrap");

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = stageWrap.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    Game.W = rect.width;
    Game.H = rect.height;
  }
  window.addEventListener("resize", resizeCanvas);

  const Game = {
    W: 0, H: 0,
    running: false,
    paused: false,
    timeLeft: 60,
    score: 0,
    shots: 0,
    hits: 0,
    streak: 0,
    bestStreak: 0,
    targets: [],
    ball: null,        // {x,y,scale,state:'idle'|'flying'|'result', t, dur, fromX,fromY,toGoalX,toGoalY, resultHit}
    drag: null,         // {x0,y0,x1,y1,active}
    lastTick: 0,
    timerAccum: 0,
    rafId: null,
    floodlightPhase: 0,
    crowdParticles: [],

    cfg() { return DIFFICULTY[settings.difficulty]; },

    start() {
      resizeCanvas();
      this.running = true;
      this.paused = false;
      this.timeLeft = 60;
      this.score = 0;
      this.shots = 0;
      this.hits = 0;
      this.streak = 0;
      this.bestStreak = 0;
      this.targets = [];
      this.timerAccum = 0;
      this.spawnTargets();
      this.resetBall();
      this.updateHud();
      this.bindInput();
      Audio2.setMusic(settings.music);
      this.runCountdown(() => {
        this.lastTick = performance.now();
        this.loop(this.lastTick);
      });
    },

    stopIfRunning() {
      this.running = false;
      this.paused = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      Audio2.setMusic(false);
      document.getElementById("pause-overlay").classList.add("hidden");
    },

    runCountdown(done) {
      const overlay = document.getElementById("countdown-overlay");
      overlay.classList.remove("hidden");
      let n = 3;
      overlay.textContent = n;
      Audio2.countdownBeep();
      const id = setInterval(() => {
        n--;
        if (n > 0) {
          overlay.textContent = n;
          Audio2.countdownBeep();
        } else if (n === 0) {
          overlay.textContent = "GO!";
          Audio2.countdownBeep(true);
        } else {
          clearInterval(id);
          overlay.classList.add("hidden");
          done();
        }
      }, 650);
    },

    /* ---------- goal geometry (fractions of stage, perspective target box) ---------- */
    goalRect() {
      // goal mouth occupies upper-middle portion of the stage
      const w = this.W;
      const h = this.H;
      const gw = w * 0.74;
      const gx = (w - gw) / 2;
      const gy = h * 0.10;
      const gh = h * 0.30;
      return { x: gx, y: gy, w: gw, h: gh };
    },

    spawnTargets() {
      const g = this.goalRect();
      const cfg = this.cfg();
      const list = [];
      // center target
      list.push({
        id: "center", baseX: g.x + g.w * 0.5, baseY: g.y + g.h * 0.55,
        amp: g.w * cfg.moveAmplitude * 0.6, axis: "x", phase: 0,
        speed: cfg.targetSpeed * 0.8, r: 30, points: 100, color: "var-gold", kind: "center",
      });
      // corner targets
      list.push({
        id: "cornerL", baseX: g.x + g.w * 0.16, baseY: g.y + g.h * 0.30,
        amp: g.h * cfg.moveAmplitude, axis: "y", phase: 1.3,
        speed: cfg.targetSpeed, r: 24, points: 250, color: "var-green", kind: "corner",
      });
      list.push({
        id: "cornerR", baseX: g.x + g.w * 0.84, baseY: g.y + g.h * 0.30,
        amp: g.h * cfg.moveAmplitude, axis: "y", phase: 2.6,
        speed: cfg.targetSpeed, r: 24, points: 250, color: "var-green", kind: "corner",
      });
      this.targets = list;
      this.maybeBonus = 0;
    },

    maybeBonus: 0,

    spawnBonusIfDue(dt) {
      const cfg = this.cfg();
      this.maybeBonus += dt;
      const hasBonus = this.targets.some(t => t.kind === "bonus");
      if (!hasBonus && this.maybeBonus > 2.2) {
        this.maybeBonus = 0;
        if (Math.random() < cfg.bonusChance + 0.5) {
          const g = this.goalRect();
          this.targets.push({
            id: "bonus" + Date.now(), baseX: g.x + g.w * (0.25 + Math.random() * 0.5),
            baseY: g.y + g.h * (0.2 + Math.random() * 0.5),
            amp: g.w * 0.16, axis: Math.random() < 0.5 ? "x" : "y", phase: Math.random() * 6,
            speed: cfg.targetSpeed * 1.3, r: 19, points: 500, color: "var-amber", kind: "bonus",
            life: 3.2, age: 0,
          });
        }
      }
      // age out bonus targets
      this.targets = this.targets.filter(t => {
        if (t.kind !== "bonus") return true;
        t.age += dt;
        return t.age < t.life;
      });
    },

    resetBall() {
      this.ball = {
        x: this.W / 2, y: this.H * 0.88, scale: 1,
        state: "idle", t: 0, dur: 0,
        fromX: 0, fromY: 0, toX: 0, toY: 0,
        resultHit: null,
      };
    },

    bindInput() {
      if (this._bound) return;
      this._bound = true;
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return { x: p.clientX - rect.left, y: p.clientY - rect.top };
      };
      const down = (e) => {
        if (!this.running || this.paused) return;
        if (this.ball.state !== "idle") return;
        const pos = getPos(e);
        const d = Math.hypot(pos.x - this.ball.x, pos.y - this.ball.y);
        if (d < 70) {
          this.drag = { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y, active: true };
        }
        e.preventDefault();
      };
      const move = (e) => {
        if (!this.drag || !this.drag.active) return;
        const pos = getPos(e);
        this.drag.x1 = pos.x; this.drag.y1 = pos.y;
        e.preventDefault();
      };
      const up = (e) => {
        if (!this.drag || !this.drag.active) return;
        this.drag.active = false;
        const dx = this.drag.x1 - this.drag.x0;
        const dy = this.drag.y1 - this.drag.y0;
        const dist = Math.hypot(dx, dy);
        this.drag = null;
        if (dist > 18 && dy < -6) {
          this.shoot(dx, dy, dist);
        }
      };
      canvas.addEventListener("mousedown", down);
      canvas.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      canvas.addEventListener("touchstart", down, { passive: false });
      canvas.addEventListener("touchmove", move, { passive: false });
      canvas.addEventListener("touchend", up);
    },

    shoot(dx, dy, dist) {
      const g = this.goalRect();
      const power = Math.min(dist / 220, 1);
      // normalize swipe direction → map to goal-plane offset
      const lateral = Math.max(-1, Math.min(1, dx / 160));
      const vertical = Math.max(0.15, Math.min(1, -dy / 220));
      const targetX = g.x + g.w * (0.5 + lateral * 0.42);
      const targetY = g.y + g.h * (1.05 - vertical * 0.9);
      this.ball.state = "flying";
      this.ball.t = 0;
      this.ball.dur = this.cfg().ballFlightMs;
      this.ball.fromX = this.W / 2; this.ball.fromY = this.H * 0.88;
      this.ball.toX = targetX; this.ball.toY = Math.max(g.y + 14, Math.min(g.y + g.h - 10, targetY));
      this.ball.power = 0.5 + power * 0.5;
      this.shots++;
      Audio2.kick();
    },

    resolveShot() {
      const b = this.ball;
      // find nearest target within hit radius
      const cfg = this.cfg();
      let hit = null;
      let bestD = Infinity;
      for (const t of this.targets) {
        const tx = t.baseX + (t.axis === "x" ? Math.sin(t.phase) * t.amp : 0);
        const ty = t.baseY + (t.axis === "y" ? Math.sin(t.phase) * t.amp : 0);
        const d = Math.hypot(tx - b.toX, ty - b.toY);
        const radius = t.r * cfg.hitRadiusMult + 10;
        if (d < radius && d < bestD) { bestD = d; hit = t; }
      }
      if (hit) {
        this.hits++;
        this.streak++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);
        let pts = hit.points;
        let comboLabel = `+${pts}`;
        if (this.streak >= 3) {
          const bonus = Math.round(pts * 0.25);
          pts += bonus;
          comboLabel = `+${pts} STREAK x${this.streak}`;
          Audio2.streak(this.streak);
        }
        this.score += pts;
        if (hit.kind === "bonus") {
          this.targets = this.targets.filter(t => t !== hit);
          Audio2.hitBonus();
        } else if (hit.kind === "corner") {
          Audio2.hitCorner();
        } else {
          Audio2.hitCenter();
        }
        this.popText(comboLabel, b.toX, b.toY);
        b.resultHit = true;
      } else {
        this.streak = 0;
        Audio2.miss();
        b.resultHit = false;
      }
      this.updateHud();
    },

    popText(text, x, y) {
      const el = document.createElement("div");
      el.className = "combo-pop";
      el.textContent = text;
      el.style.left = x + "px";
      el.style.top = y + "px";
      stageWrap.appendChild(el);
      setTimeout(() => el.remove(), 720);
    },

    updateHud() {
      document.getElementById("score-val").textContent = this.score;
      document.getElementById("timer-val").textContent = Math.ceil(this.timeLeft);
      const timerCard = document.getElementById("hud-timer");
      timerCard.classList.toggle("low", this.timeLeft <= 10);
    },

    togglePause(forceState) {
      if (!this.running) return;
      this.paused = typeof forceState === "boolean" ? forceState : !this.paused;
      document.getElementById("pause-overlay").classList.toggle("hidden", !this.paused);
      if (!this.paused) { this.lastTick = performance.now(); this.loop(this.lastTick); }
    },

    end() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      Audio2.setMusic(false);
      Audio2.celebrate();
      const accuracy = this.shots ? Math.round((this.hits / this.shots) * 100) : 0;
      const scores = addHighScore(this.score);
      const best = scores.length ? scores[0].score : this.score;
      const isNewBest = scores[0] && scores[0].score === this.score && scores[0].date === new Date().toISOString().slice(0, 10);
      document.getElementById("final-score").textContent = this.score;
      document.getElementById("stat-best").textContent = best;
      document.getElementById("stat-accuracy").textContent = accuracy + "%";
      document.getElementById("stat-streak").textContent = this.bestStreak;
      document.getElementById("best-badge").classList.toggle("hidden", !(this.score >= best));
      goTo("end");
    },

    /* ---------------------------------------------------------
       MAIN LOOP
    --------------------------------------------------------- */
    loop(now) {
      if (!this.running || this.paused) return;
      const dt = Math.min((now - this.lastTick) / 1000, 0.05);
      this.lastTick = now;
      this.floodlightPhase += dt;

      // timer
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.updateHud();
        this.render();
        this.end();
        return;
      }

      // targets motion
      for (const t of this.targets) t.phase += dt * t.speed;
      this.spawnBonusIfDue(dt);

      // ball flight
      const b = this.ball;
      if (b.state === "flying") {
        b.t += dt * 1000;
        const p = Math.min(b.t / b.dur, 1);
        const ease = 1 - Math.pow(1 - p, 2);
        b.x = b.fromX + (b.toX - b.fromX) * ease;
        b.y = b.fromY + (b.toY - b.fromY) * ease;
        b.scale = 1 - ease * 0.82;
        if (p >= 1) {
          this.resolveShot();
          b.state = "result";
          b.t = 0;
        }
      } else if (b.state === "result") {
        b.t += dt * 1000;
        if (b.t > 260) this.resetBall();
      }

      this.updateHud();
      this.render();
      this.rafId = requestAnimationFrame((t) => this.loop(t));
    },

    /* ---------------------------------------------------------
       RENDER
    --------------------------------------------------------- */
    render() {
      const w = this.W, h = this.H;
      ctx2d.clearRect(0, 0, w, h);

      // sky / stadium back
      const skyGrad = ctx2d.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#0a0c10");
      skyGrad.addColorStop(0.45, "#11161c");
      skyGrad.addColorStop(1, "#0c2418");
      ctx2d.fillStyle = skyGrad;
      ctx2d.fillRect(0, 0, w, h);

      // floodlights
      this.drawFloodlight(w * 0.08, h * 0.04);
      this.drawFloodlight(w * 0.92, h * 0.04);

      // pitch
      const pitchY = h * 0.42;
      const pitchGrad = ctx2d.createLinearGradient(0, pitchY, 0, h);
      pitchGrad.addColorStop(0, "#143a26");
      pitchGrad.addColorStop(1, "#0a1c12");
      ctx2d.fillStyle = pitchGrad;
      ctx2d.fillRect(0, pitchY, w, h - pitchY);
      // pitch stripes
      ctx2d.save();
      ctx2d.beginPath();
      ctx2d.rect(0, pitchY, w, h - pitchY);
      ctx2d.clip();
      const stripeCount = 9;
      for (let i = 0; i < stripeCount; i++) {
        ctx2d.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.06)";
        const yTop = pitchY + ((h - pitchY) / stripeCount) * i;
        ctx2d.beginPath();
        ctx2d.moveTo(w * 0.5 + (yTop - pitchY) * -0.9, yTop);
        ctx2d.lineTo(w * 0.5 + (yTop - pitchY) * 0.9 + w, yTop);
        ctx2d.lineTo(w * 0.5 + (yTop + (h - pitchY) / stripeCount - pitchY) * 0.9 + w, yTop + (h - pitchY) / stripeCount);
        ctx2d.lineTo(w * 0.5 + (yTop + (h - pitchY) / stripeCount - pitchY) * -0.9, yTop + (h - pitchY) / stripeCount);
        ctx2d.closePath();
        ctx2d.fill();
      }
      ctx2d.restore();

      // goal
      this.drawGoal();

      // targets
      for (const t of this.targets) this.drawTarget(t);

      // ball
      this.drawBall();

      // drag trail
      if (this.drag && this.drag.active) {
        ctx2d.save();
        ctx2d.strokeStyle = "rgba(212,175,106,0.55)";
        ctx2d.lineWidth = 3;
        ctx2d.setLineDash([6, 6]);
        ctx2d.beginPath();
        ctx2d.moveTo(this.drag.x0, this.drag.y0);
        ctx2d.lineTo(this.drag.x1, this.drag.y1);
        ctx2d.stroke();
        ctx2d.restore();
      }
    },

    drawFloodlight(x, y) {
      const glow = 90 + Math.sin(this.floodlightPhase * 2) * 4;
      const grad = ctx2d.createRadialGradient(x, y, 0, x, y, glow);
      grad.addColorStop(0, "rgba(255,250,230,0.22)");
      grad.addColorStop(1, "rgba(255,250,230,0)");
      ctx2d.fillStyle = grad;
      ctx2d.beginPath();
      ctx2d.arc(x, y, glow, 0, Math.PI * 2);
      ctx2d.fill();
    },

    drawGoal() {
      const g = this.goalRect();
      ctx2d.save();
      // posts
      ctx2d.strokeStyle = "#f3efe7";
      ctx2d.lineWidth = 6;
      ctx2d.lineJoin = "round";
      ctx2d.beginPath();
      ctx2d.moveTo(g.x, g.y + g.h + 14);
      ctx2d.lineTo(g.x, g.y);
      ctx2d.lineTo(g.x + g.w, g.y);
      ctx2d.lineTo(g.x + g.w, g.y + g.h + 14);
      ctx2d.stroke();

      // net pattern
      ctx2d.strokeStyle = "rgba(255,255,255,0.16)";
      ctx2d.lineWidth = 1;
      const cols = 14, rows = 7;
      for (let i = 1; i < cols; i++) {
        const x = g.x + (g.w / cols) * i;
        ctx2d.beginPath(); ctx2d.moveTo(x, g.y); ctx2d.lineTo(x, g.y + g.h + 14); ctx2d.stroke();
      }
      for (let j = 1; j < rows; j++) {
        const y = g.y + (g.h / rows) * j;
        ctx2d.beginPath(); ctx2d.moveTo(g.x, y); ctx2d.lineTo(g.x + g.w, y); ctx2d.stroke();
      }
      ctx2d.restore();
    },

    drawTarget(t) {
      const tx = t.baseX + (t.axis === "x" ? Math.sin(t.phase) * t.amp : 0);
      const ty = t.baseY + (t.axis === "y" ? Math.sin(t.phase) * t.amp : 0);
      ctx2d.save();
      const pulse = 1 + Math.sin(this.floodlightPhase * 4 + t.phase) * 0.05;
      const r = t.r * pulse;
      let stroke = "#d4af6a", fillA = "rgba(212,175,106,0.12)";
      if (t.kind === "corner") { stroke = "#2ecc71"; fillA = "rgba(46,204,113,0.10)"; }
      if (t.kind === "bonus") { stroke = "#e0a437"; fillA = "rgba(224,164,55,0.18)"; }
      ctx2d.beginPath();
      ctx2d.arc(tx, ty, r, 0, Math.PI * 2);
      ctx2d.fillStyle = fillA;
      ctx2d.fill();
      ctx2d.lineWidth = 3;
      ctx2d.strokeStyle = stroke;
      ctx2d.stroke();
      ctx2d.beginPath();
      ctx2d.arc(tx, ty, r * 0.4, 0, Math.PI * 2);
      ctx2d.strokeStyle = stroke;
      ctx2d.lineWidth = 2;
      ctx2d.stroke();
      if (t.kind === "bonus") {
        ctx2d.fillStyle = "#1a1305";
        ctx2d.font = "bold 11px Inter, sans-serif";
        ctx2d.textAlign = "center";
        ctx2d.fillStyle = stroke;
        ctx2d.fillText("500", tx, ty + 4);
      }
      ctx2d.restore();
    },

    drawBall() {
      const b = this.ball;
      const r = 22 * b.scale;
      ctx2d.save();
      // shadow on pitch only when near idle
      if (b.state === "idle") {
        ctx2d.beginPath();
        ctx2d.ellipse(b.x, b.y + r * 0.9, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
        ctx2d.fillStyle = "rgba(0,0,0,0.35)";
        ctx2d.fill();
      }
      ctx2d.beginPath();
      ctx2d.arc(b.x, b.y, r, 0, Math.PI * 2);
      const grad = ctx2d.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, r * 0.1, b.x, b.y, r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, "#c9c9c9");
      ctx2d.fillStyle = grad;
      ctx2d.fill();
      ctx2d.lineWidth = 1.4;
      ctx2d.strokeStyle = "#444";
      ctx2d.stroke();
      // pentagon hint
      ctx2d.beginPath();
      ctx2d.arc(b.x, b.y, r * 0.32, 0, Math.PI * 2);
      ctx2d.fillStyle = "#1a1a1a";
      ctx2d.fill();
      ctx2d.restore();

      // result flash ring
      if (b.state === "result" && b.resultHit !== null) {
        ctx2d.save();
        const p = b.t / 260;
        ctx2d.globalAlpha = 1 - p;
        ctx2d.beginPath();
        ctx2d.arc(b.toX, b.toY, 14 + p * 30, 0, Math.PI * 2);
        ctx2d.strokeStyle = b.resultHit ? "#2ecc71" : "#e2574c";
        ctx2d.lineWidth = 4;
        ctx2d.stroke();
        ctx2d.restore();
      }
    },
  };

  /* ---------------------------------------------------------
     8. GAME SCREEN BUTTON WIRING
  --------------------------------------------------------- */
  document.getElementById("btn-play").addEventListener("click", () => {
    goTo("game");
    Game.start();
  });
  document.getElementById("btn-play-again").addEventListener("click", () => {
    goTo("game");
    Game.start();
  });
  document.getElementById("btn-pause").addEventListener("click", () => Game.togglePause());
  document.getElementById("btn-resume").addEventListener("click", () => Game.togglePause(false));
  document.getElementById("btn-quit-pause").addEventListener("click", () => {
    Game.stopIfRunning();
    goTo("menu");
  });
  document.getElementById("btn-mute").addEventListener("click", (e) => e.stopPropagation());
  document.getElementById("btn-share").addEventListener("click", async () => {
    const text = `I scored ${Game.score} points on Smart Design Football's Precision Shooting Challenge! ⚽🏆`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById("btn-share");
        const old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = old), 1400);
      } catch {}
    }
  });

  // resize on load too
  window.addEventListener("DOMContentLoaded", resizeCanvas);

  // expose for debugging
  window.Game = Game;
})();
