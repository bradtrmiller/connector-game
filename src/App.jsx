import React, { useState, useEffect, useRef } from "react";

// ── Analytics helper ───────────────────────────────────────────────────────────
function track(eventName, params = {}) {
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }
  } catch(e) {}
}

// ── Puzzle number helper ───────────────────────────────────────────────────────
function getPuzzleNumber(dateStr) {
  const start = new Date("2026-03-11T00:00:00");
  const current = new Date(dateStr + "T00:00:00");
  const diff = Math.round((current - start) / (1000 * 60 * 60 * 24));
  return diff + 1; // puzzle #1 = March 11
}

function renderHighlighted(text, baseColor, highlightColor = "#f59e0b") {
  if (!text) return null;
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*")
          ? <strong key={i} style={{ color: highlightColor }}>{part.slice(1, -1)}</strong>
          : <span key={i} style={{ color: baseColor }}>{part}</span>
      )}
    </>
  );
}

function formatMonthYear(dateStr) {
  const [year, month] = dateStr.split("-");
  return new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const STEPS = { MODE: "mode", TRIVIA: "trivia", REVIEW: "review", CONNECTOR: "connector", DONE: "done" };

// ── Fallback example puzzle (shown if API fails) ───────────────────────────
const EXAMPLE_PUZZLE = {
  date: "2026-03-11",
  questions: [
    { question: "This Canadian rock band, formed in Toronto in 1968, is known for complex time signatures and prog epics like '2112.' What is their name?", answers: ["Triumph","Rush","Bachman-Turner Overdrive","The Guess Who"], correct: 1, fact: "Rush's classic lineup was inducted into the Rock and Roll Hall of Fame in 2013.", displayAnswer: "*Gold* Rush", connectionNote: "The 1849 mass migration to California in search of fortune." },
    { question: "America's highest military decoration is awarded by the President in the name of Congress. What single word completes its name: the Congressional ___ of Honor?", answers: ["Badge","Star","Medal","Cross"], correct: 2, fact: "The Medal of Honor has been awarded fewer than 3,500 times since the Civil War.", displayAnswer: "*Gold* Medal", connectionNote: "The ultimate prize in Olympic competition." },
    { question: "In the 2003 Pixar film Finding Nemo, a flock of seagulls squawk one word over and over while fighting over food. What is it?", answers: ["Food","Here","Mine","Now"], correct: 2, fact: "Director Andrew Stanton said the birds were inspired by how real seagulls behave — pure selfish chaos.", displayAnswer: "*Gold* Mine", connectionNote: "Literally where gold is found, and a metaphor for anything enormously valuable." },
    { question: "In Australian slang, this term refers to a soldier — especially one who served at Gallipoli in WWI. What is the word?", answers: ["Cobber","Bloke","Digger","Mate"], correct: 2, fact: "The term came from the trench warfare of WWI, where soldiers spent much of their time digging.", displayAnswer: "*Gold* Digger", connectionNote: "The Kanye West hit, and slang for someone who's in it for the money." }
  ],
  connector: { answer: "GOLD", hint: "It's at the end of a rainbow.", reveal: "" }
};
// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#07070d", cardBg: "rgba(255,255,255,0.04)", cardBorder: "rgba(255,255,255,0.1)",
    modalBg: "#111118", text: "#f0efe8", textTitle: "#f5f0e8",
    textSub: "rgba(255,255,255,0.45)", textFaint: "rgba(255,255,255,0.25)",
    textMuted: "rgba(255,255,255,0.3)", btnBg: "rgba(255,255,255,0.06)",
    btnBorder: "rgba(255,255,255,0.15)", btnColor: "rgba(255,255,255,0.45)",
    inputBg: "rgba(255,255,255,0.05)", inputColor: "#f0efe8",
    answerBg: "rgba(255,255,255,0.04)", answerBorder: "rgba(255,255,255,0.1)",
    answerColor: "#e8e8e4", tagBg: "rgba(255,255,255,0.05)",
    tagBorder: "rgba(255,255,255,0.1)", tagColor: "rgba(255,255,255,0.4)",
    progressEmpty: "rgba(255,255,255,0.08)", divider: "rgba(255,255,255,0.07)",
    factBgOk: "rgba(16,185,129,0.08)", factBorderOk: "rgba(16,185,129,0.25)",
    factBgErr: "rgba(239,68,68,0.08)", factBorderErr: "rgba(239,68,68,0.25)",
    recapBg: "rgba(255,255,255,0.04)", recapBorder: "rgba(255,255,255,0.07)",
    sharePreviewBg: "rgba(255,255,255,0.04)", sharePreviewBorder: "rgba(255,255,255,0.1)",
    sharePreviewColor: "rgba(255,255,255,0.7)", overlay: "rgba(0,0,0,0.75)",
    letterBadge: "rgba(255,255,255,0.06)", letterBadgeColor: "rgba(255,255,255,0.3)",
    archiveBorder: "rgba(255,255,255,0.06)", archiveMonthBg: "rgba(255,255,255,0.03)",
    archiveMonthBorder: "rgba(255,255,255,0.08)", archivePlayedBg: "rgba(16,185,129,0.06)",
    archivePlayedBorder: "rgba(16,185,129,0.2)",
  },
  light: {
    bg: "#f5f3ee", cardBg: "#ffffff", cardBorder: "rgba(0,0,0,0.08)",
    modalBg: "#ffffff", text: "#1c1a16", textTitle: "#1c1a16",
    textSub: "rgba(0,0,0,0.5)", textFaint: "rgba(0,0,0,0.35)",
    textMuted: "rgba(0,0,0,0.4)", btnBg: "rgba(0,0,0,0.05)",
    btnBorder: "rgba(0,0,0,0.15)", btnColor: "rgba(0,0,0,0.45)",
    inputBg: "rgba(0,0,0,0.04)", inputColor: "#1c1a16",
    answerBg: "rgba(0,0,0,0.03)", answerBorder: "rgba(0,0,0,0.1)",
    answerColor: "#2a2820", tagBg: "rgba(0,0,0,0.05)",
    tagBorder: "rgba(0,0,0,0.1)", tagColor: "rgba(0,0,0,0.45)",
    progressEmpty: "rgba(0,0,0,0.1)", divider: "rgba(0,0,0,0.08)",
    factBgOk: "rgba(16,185,129,0.08)", factBorderOk: "rgba(16,185,129,0.35)",
    factBgErr: "rgba(239,68,68,0.07)", factBorderErr: "rgba(239,68,68,0.3)",
    recapBg: "rgba(0,0,0,0.03)", recapBorder: "rgba(0,0,0,0.07)",
    sharePreviewBg: "rgba(0,0,0,0.03)", sharePreviewBorder: "rgba(0,0,0,0.1)",
    sharePreviewColor: "rgba(0,0,0,0.6)", overlay: "rgba(0,0,0,0.5)",
    letterBadge: "rgba(0,0,0,0.06)", letterBadgeColor: "rgba(0,0,0,0.35)",
    archiveBorder: "rgba(0,0,0,0.06)", archiveMonthBg: "#ffffff",
    archiveMonthBorder: "rgba(0,0,0,0.1)", archivePlayedBg: "rgba(16,185,129,0.06)",
    archivePlayedBorder: "rgba(16,185,129,0.25)",
  },
};

// ── Root ──────────────────────────────────────────────────────────────────────

// ── Network Animation (Welcome Screen Graphic) ────────────────────────────────
const BATCHES = [
  { clues: ["RUSH",    "MEDAL",  "MINE",    "DIGGER"],  linq: "GOLD"   },
  { clues: ["CURTAIN", "MAIDEN", "CHEF",    "WAFFLE"],  linq: "IRON"   },
  { clues: ["CAMP",    "TRUCK",  "FRIENDLY","ESCAPE"],  linq: "FIRE"   },
  { clues: ["RUNNING", "PAPER",  "HATCH",   "HORSE"],   linq: "BACK"   },
  { clues: ["SAND",    "LIME",   "CORNER",  "FLINT"],   linq: "STONE"  },
  { clues: ["FLUSH",   "BLUE",   "FAMILY",  "TIES"],    linq: "ROYAL"  },
  { clues: ["FINGERS", "FLY",    "CUP",     "MILK"],    linq: "BUTTER" },
  { clues: ["TREE",    "CRAB",   "PIES",    "CARAMEL"], linq: "APPLE"  },
  { clues: ["MALL",    "POWER",  "VEGAS",   "CLUB"],    linq: "STRIP"  },
  { clues: ["EATER",   "TRIUMPH","HILL",    "FIRE"],    linq: "ANT"    },
  { clues: ["UP",      "SIX",    "NOSE",    "CHERRY"],  linq: "PICK"   },
  { clues: ["SAG",     "PUNCH",  "TRUMP",   "RED"],     linq: "CARD"   },
];
const VB_W = 600, VB_H = 380;
const CENTER_N = { x: 300, y: 190 };
const OUTER_N = [
  { x: 90,  y: 80,  key: "tl" },
  { x: 510, y: 80,  key: "tr" },
  { x: 510, y: 300, key: "br" },
  { x: 90,  y: 300, key: "bl" },
];
const NW = 160, NH = 54, CW = 200, CH = 70;
const STAGGER_MS = 600, CENTER_DELAY_MS = 3200, HOLD_MS = 4200, FADE_MS = 700, PULSE_MS = 1100;
const BATCH_DUR = CENTER_DELAY_MS + 300 + HOLD_MS + FADE_MS + PULSE_MS;

function NetworkGraphic({ dark }) {
  const [batchIdx, setBatchIdx] = React.useState(0);
  const [, setTick] = React.useState(0);
  const startRef = React.useRef(performance.now());
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    const loop = () => {
      const elapsed = performance.now() - startRef.current;
      if (elapsed >= BATCH_DUR) { startRef.current = performance.now(); setBatchIdx(i => (i + 1) % BATCHES.length); }
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const elapsed = performance.now() - startRef.current;
  const batch = BATCHES[batchIdx];

  const fadeStart = CENTER_DELAY_MS + 300 + HOLD_MS;
  const fadeEnd = fadeStart + FADE_MS;
  const fadeT = elapsed > fadeStart ? Math.min(1, (elapsed - fadeStart) / FADE_MS) : 0;
  const fadeOpacity = 1 - fadeT;
  const inPulse = elapsed > fadeEnd;
  const pulseT = inPulse ? Math.min(1, (elapsed - fadeEnd) / PULSE_MS) : 0;
  const pulseAmp = inPulse ? Math.sin(pulseT * Math.PI) : 0;

  function nodeAlpha(i) {
    const t = (elapsed - i * STAGGER_MS) / 280;
    return t <= 0 ? 0 : t >= 1 ? 1 : t;
  }
  function nodeScale(i) {
    const t = (elapsed - i * STAGGER_MS) / 320;
    if (t <= 0) return 0.7;
    if (t >= 1) return 1;
    return 0.7 + 0.3 * (1 - Math.pow(1 - t, 3)) + Math.sin(t * Math.PI) * 0.06;
  }
  function centerAlpha() {
    const t = (elapsed - CENTER_DELAY_MS) / 320;
    return t <= 0 ? 0 : t >= 1 ? 1 : t;
  }
  function centerScale() {
    const t = (elapsed - CENTER_DELAY_MS) / 380;
    if (t <= 0) return 0.6;
    if (t >= 1) return 1;
    return 0.6 + 0.4 * (1 - Math.pow(1 - t, 3)) + Math.sin(t * Math.PI) * 0.08;
  }
  const lp = Math.max(0, Math.min(1, (elapsed - CENTER_DELAY_MS + 200) / 600));
  const ca = centerAlpha() * fadeOpacity;
  const cs = centerScale();
  const nodeBg = dark ? "#11121a" : "#ffffff";
  const ghostA = (dark ? 0.18 : 0.22);

  return (
    <div style={{ margin: "4px auto 24px", maxWidth: 360, width: "100%" }}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <filter id="ng-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Connection lines — endpoints computed to land exactly on box edges */}
        {OUTER_N.map((n, i) => {
          const dx = CENTER_N.x - n.x, dy = CENTER_N.y - n.y;
          const len = Math.sqrt(dx*dx + dy*dy);
          const ux = dx/len, uy = dy/len;

          // Outer node edge: clip to rounded-rect edge along the direction
          // Half-extents of outer node
          const hw = NW/2, hh = NH/2;
          const tX = ux !== 0 ? hw / Math.abs(ux) : Infinity;
          const tY = uy !== 0 ? hh / Math.abs(uy) : Infinity;
          const trimOuter = Math.min(tX, tY);
          const x1 = n.x + ux * trimOuter, y1 = n.y + uy * trimOuter;

          // Center node edge: clip coming from the opposite direction
          const chw = CW/2, chh = CH/2;
          const tCX = ux !== 0 ? chw / Math.abs(ux) : Infinity;
          const tCY = uy !== 0 ? chh / Math.abs(uy) : Infinity;
          const trimCenter = Math.min(tCX, tCY);
          const x2 = CENTER_N.x - ux * trimCenter, y2 = CENTER_N.y - uy * trimCenter;

          const alpha = nodeAlpha(i) * (0.15 + 0.85 * lp) * fadeOpacity;
          return (
            <g key={n.key}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeOpacity={alpha * 0.35} strokeWidth={8} filter="url(#ng-glow)" />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeOpacity={alpha} strokeWidth={2} strokeLinecap="round" />
              <circle cx={x1} cy={y1} r={3} fill="#f59e0b" opacity={alpha} />
              <circle cx={x2} cy={y2} r={3} fill="#f59e0b" opacity={alpha} />
            </g>
          );
        })}

        {/* Ghost nodes */}
        {OUTER_N.map((n, i) => (
          <rect key={`g-${n.key}`}
            x={n.x - NW/2} y={n.y - NH/2} width={NW} height={NH} rx={12}
            fill="none" stroke="#f59e0b"
            strokeOpacity={ghostA + pulseAmp * 0.4}
            strokeWidth={1.5 + pulseAmp * 1.4}
            strokeDasharray="4 6" />
        ))}
        <rect x={CENTER_N.x - CW/2} y={CENTER_N.y - CH/2} width={CW} height={CH} rx={16}
          fill="none" stroke="#f59e0b"
          strokeOpacity={ghostA + pulseAmp * 0.45}
          strokeWidth={1.5 + pulseAmp * 1.6}
          strokeDasharray="4 6" />

        {/* Pulse thinking lines */}
        {inPulse && OUTER_N.map((n, i) => {
          const dx = CENTER_N.x - n.x, dy = CENTER_N.y - n.y;
          const len = Math.sqrt(dx*dx + dy*dy);
          const ux = dx/len, uy = dy/len;
          const trimOuter = Math.min(ux !== 0 ? (NW/2)/Math.abs(ux) : Infinity, uy !== 0 ? (NH/2)/Math.abs(uy) : Infinity);
          const trimCenter = Math.min(ux !== 0 ? (CW/2)/Math.abs(ux) : Infinity, uy !== 0 ? (CH/2)/Math.abs(uy) : Infinity);
          return (
            <line key={`p-${n.key}`}
              x1={n.x + ux*trimOuter} y1={n.y + uy*trimOuter}
              x2={CENTER_N.x - ux*trimCenter} y2={CENTER_N.y - uy*trimCenter}
              stroke="#f59e0b" strokeOpacity={pulseAmp * 0.3}
              strokeWidth={1} strokeDasharray="3 5" />
          );
        })}

        {/* Outer active nodes */}
        {OUTER_N.map((n, i) => (
          <g key={n.key} opacity={nodeAlpha(i) * fadeOpacity}
            transform={`translate(${n.x} ${n.y}) scale(${nodeScale(i)})`}>
            <rect x={-NW/2} y={-NH/2} width={NW} height={NH} rx={12}
              fill={nodeBg} stroke="#f59e0b" strokeWidth={2} />
            <text x={0} y={8} textAnchor="middle"
              fontFamily="'DM Mono', monospace" fontSize={20} fontWeight={600}
              letterSpacing="1.5" fill="#f59e0b">
              {batch.clues[i]}
            </text>
          </g>
        ))}

        {/* Center active node */}
        <g opacity={ca} transform={`translate(${CENTER_N.x} ${CENTER_N.y}) scale(${cs})`}>
          <rect x={-CW/2 - 6} y={-CH/2 - 6} width={CW+12} height={CH+12} rx={20}
            fill="#f59e0b" opacity={0.18} filter="url(#ng-glow)" />
          <rect x={-CW/2} y={-CH/2} width={CW} height={CH} rx={16}
            fill="#f59e0b" stroke="#d97706" strokeWidth={1.5} />
          <text x={0} y={-14} textAnchor="middle"
            fontFamily="'DM Mono', monospace" fontSize={10} fontWeight={600}
            letterSpacing="3.5" fill="#07070d" fillOpacity={0.5}>LINK</text>
          <text x={0} y={18} textAnchor="middle"
            fontFamily="'DM Mono', monospace" fontSize={26} fontWeight={600}
            letterSpacing="4" fill="#07070d">
            {batch.linq}
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function App() {
  const [puzzle,        setPuzzle]        = useState(null);
  const [puzzleStatus,  setPuzzleStatus]  = useState("loading"); // loading | ready | error | no-puzzle
  const [showHelp,      setShowHelp]      = useState(false);
  const [showHardPromo, setShowHardPromo]  = useState(false);
  const [showArchive,   setShowArchive]   = useState(false);
  const [archivePuzzle, setArchivePuzzle] = useState(null);
  const [archiveMode,   setArchiveMode]   = useState(null);
  const [resetKey,      setResetKey]      = useState(0);

  function handleReset() {
    setShowArchive(false);
    setArchivePuzzle(null);
    setArchiveMode(null);
    setResetKey(k => k + 1);
  }

  function handleSelectArchivePuzzle(p) {
    setArchivePuzzle(p);
    setArchiveMode(null);
  }

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("linqed_theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const t = THEMES[isDark ? "dark" : "light"];

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("linqed_theme", next ? "dark" : "light");
  }

  const [soundOn, setSoundOn] = useState(() => {
    const s = localStorage.getItem("linqed_sound");
    return s === null ? false : s === "true";
  });

  function toggleSound() {
    setSoundOn(prev => {
      const next = !prev;
      localStorage.setItem("linqed_sound", String(next));
      return next;
    });
  }

  function playSound(type) {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const g = ctx.createGain();
      g.connect(ctx.destination);
      const sounds = {
        correct:     [{ f: 523, t: 0,    d: 0.12 }, { f: 659, t: 0.1,  d: 0.12 }],
        wrong:       [{ f: 220, t: 0,    d: 0.18, wave: "sawtooth" }],
        linkCorrect: [{ f: 523, t: 0,    d: 0.1  }, { f: 659, t: 0.08, d: 0.1 }, { f: 784, t: 0.16, d: 0.1 }, { f: 1047, t: 0.26, d: 0.2 }],
        linkWrong:   [{ f: 180, t: 0,    d: 0.25, wave: "sawtooth" }],
        complete:    [{ f: 523, t: 0,    d: 0.08 }, { f: 659, t: 0.07, d: 0.08 }, { f: 784, t: 0.14, d: 0.08 }, { f: 1047, t: 0.22, d: 0.08 }, { f: 1319, t: 0.31, d: 0.3 }],
      };
      (sounds[type] || []).forEach(({ f, t: start, d, wave = "sine" }) => {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.connect(og); og.connect(g);
        o.type = wave; o.frequency.value = f;
        og.gain.setValueAtTime(0.18, ctx.currentTime + start);
        og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + d);
        o.start(ctx.currentTime + start);
        o.stop(ctx.currentTime + start + d + 0.01);
      });
    } catch(e) {}
  }

  useEffect(() => { document.body.style.background = t.bg; }, [t.bg]);

  // ── Load today's puzzle from API ──
  useEffect(() => {
    async function load() {
      try {
        const localDate = new Date().toLocaleDateString("en-CA");
        const res = await fetch(`/api/puzzle?date=${localDate}`);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        if (!data || !data.questions) { setPuzzleStatus("no-puzzle"); return; }
        setPuzzle(data);
        setPuzzleStatus("ready");
      } catch(e) {
        console.error(e);
        setPuzzleStatus("error");
      }
    }
    load();
    const seen = localStorage.getItem("linqed_seen_instructions");
    if (!seen) { setShowHelp(true); localStorage.setItem("linqed_seen_instructions", "1"); }
    const seenHardPromo = localStorage.getItem("linqed_seen_hard_promo");
    const beforeExpiry = Date.now() < new Date("2026-04-18").getTime();
    if (!seenHardPromo && beforeExpiry) {
      const streak = parseInt(localStorage.getItem("linqed_streak") || "0");
      if (streak > 0) { setShowHardPromo(true); localStorage.setItem("linqed_seen_hard_promo", "1"); }
    }
  }, []);

  const headerButtons = (
    <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 8 }}>
      <button onClick={toggleSound} style={{ width: 30, height: 30, borderRadius: "50%", background: t.btnBg, border: `1.5px solid ${t.btnBorder}`, color: t.btnColor, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", opacity: soundOn ? 1 : 0.45 }}>{soundOn ? "🔊" : "🔇"}</button>
      <button onClick={toggleTheme} style={{ width: 30, height: 30, borderRadius: "50%", background: t.btnBg, border: `1.5px solid ${t.btnBorder}`, color: t.btnColor, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>{isDark ? "☀️" : "🌙"}</button>
      <button onClick={() => setShowHelp(true)} style={{ width: 30, height: 30, borderRadius: "50%", background: t.btnBg, border: `1.5px solid ${t.btnBorder}`, color: t.btnColor, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>?</button>
    </div>
  );

  const globalStyle = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      input, button, textarea { font-family: inherit; }
      input:focus { outline: none; }
      .fade-up { animation: fadeUp 0.3s ease forwards; }
      .pop     { animation: pop   0.25s ease forwards; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      @keyframes pop    { from { opacity:0; transform:scale(0.97);     } to { opacity:1; transform:scale(1);     } }
      @keyframes shake  { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
    `}</style>
  );

    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 999, background: "#f59e0b", padding: "5px 0", textAlign: "center" }}>
    </div>

  // ── Archive puzzle view ──
  if (archivePuzzle) {
    const dateLabel = new Date(archivePuzzle.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();

    // ── Archive mode picker ──
    if (!archiveMode) return (
      <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>
        {globalStyle}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 0", position: "relative" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, fontWeight: 700, color: t.textTitle, letterSpacing: "-0.03em" }}>
              lin<span style={{ color: "#f59e0b" }}>q</span>ed
            </div>
            <div style={{ display: "inline-block", fontSize: 11, color: "#f59e0b", letterSpacing: "0.1em", marginTop: 4, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 4, padding: "2px 8px" }}>
              ARCHIVE · {dateLabel}
            </div>
          </div>
          <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)" }}>
            <button onClick={() => { setArchivePuzzle(null); setShowArchive(true); }} style={{ padding: "6px 12px", background: t.btnBg, border: `1px solid ${t.btnBorder}`, borderRadius: 8, color: t.btnColor, fontSize: 12, cursor: "pointer" }}>← Archive</button>
          </div>
          <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)" }}>
            <button onClick={toggleTheme} style={{ width: 30, height: 30, borderRadius: "50%", background: t.btnBg, border: `1.5px solid ${t.btnBorder}`, color: t.btnColor, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isDark ? "☀️" : "🌙"}</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 24px" }}>
          <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }} className="fade-up">
            <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 8, lineHeight: 1.4 }}>
              How do you want to play?
            </p>
            <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 36, lineHeight: 1.6 }}>
              Archive results don't affect your streak.
            </p>
            <button onClick={() => setArchiveMode("normal")} style={{
              width: "100%", padding: "16px 20px", marginBottom: 10,
              background: "#f59e0b", border: "none",
              borderRadius: 12, cursor: "pointer", transition: "all 0.15s", textAlign: "center",
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#07070d" }}>Normal</span>
            </button>
            <button onClick={() => setArchiveMode("hard")} style={{
              width: "100%", padding: "16px 20px",
              background: "transparent", border: `1.5px solid ${t.text === "#1c1a16" ? "rgba(0,0,0,0.2)" : "rgba(245,158,11,0.3)"}`,
              borderRadius: 12, cursor: "pointer", transition: "all 0.15s", textAlign: "center",
            }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Hard Mode</span>
              <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 8 }}>No feedback until the end</span>
            </button>
          </div>
        </div>
        <Footer t={t} />
      </div>
    );

    // ── Archive game ──
    return (
      <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>
        {globalStyle}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 0", position: "relative" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, fontWeight: 700, color: t.textTitle, letterSpacing: "-0.03em" }}>
              lin<span style={{ color: "#f59e0b" }}>q</span>ed
            </div>
            <div style={{ display: "inline-block", fontSize: 11, color: "#f59e0b", letterSpacing: "0.1em", marginTop: 4, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 4, padding: "2px 8px" }}>
              ARCHIVE · {dateLabel}
            </div>
          </div>
          <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)" }}>
            <button onClick={() => setArchiveMode(null)} style={{ padding: "6px 12px", background: t.btnBg, border: `1px solid ${t.btnBorder}`, borderRadius: 8, color: t.btnColor, fontSize: 12, cursor: "pointer" }}>← Mode</button>
          </div>
          <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 8 }}>
            <button onClick={toggleSound} style={{ width: 30, height: 30, borderRadius: "50%", background: t.btnBg, border: `1.5px solid ${t.btnBorder}`, color: t.btnColor, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: soundOn ? 1 : 0.45 }}>{soundOn ? "🔊" : "🔇"}</button>
            <button onClick={toggleTheme} style={{ width: 30, height: 30, borderRadius: "50%", background: t.btnBg, border: `1.5px solid ${t.btnBorder}`, color: t.btnColor, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isDark ? "☀️" : "🌙"}</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "28px 16px 48px" }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <Game key={`${archivePuzzle.date}-${archiveMode}`} puzzle={archivePuzzle} t={t} playSound={playSound} isArchive={true} startHardMode={archiveMode === "hard"} onBackToArchive={() => { setArchivePuzzle(null); setArchiveMode(null); setShowArchive(true); }} />
          </div>
        </div>
        <Footer t={t} />
      </div>
    );
  }

  // ── Archive browser ──
  if (showArchive) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>
        {globalStyle}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 0", position: "relative" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, fontWeight: 700, color: t.textTitle, letterSpacing: "-0.03em" }}>
              lin<span style={{ color: "#f59e0b" }}>q</span>ed
            </div>
            <div style={{ fontSize: 11, color: t.textFaint, letterSpacing: "0.1em", marginTop: 2 }}>ARCHIVE</div>
          </div>
          <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)" }}>
            <button onClick={() => setShowArchive(false)} style={{ padding: "6px 12px", background: t.btnBg, border: `1px solid ${t.btnBorder}`, borderRadius: 8, color: t.btnColor, fontSize: 12, cursor: "pointer" }}>← Today</button>
          </div>
          <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)" }}>
            <button onClick={toggleTheme} style={{ width: 30, height: 30, borderRadius: "50%", background: t.btnBg, border: `1.5px solid ${t.btnBorder}`, color: t.btnColor, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isDark ? "☀️" : "🌙"}</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "28px 16px 48px" }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <ArchiveBrowser t={t} onPlay={handleSelectArchivePuzzle} />
          </div>
        </div>
        <Footer t={t} />
      </div>
    );
  }

  // ── Daily game ──
  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>
      {globalStyle}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 0", position: "relative" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, fontWeight: 700, color: t.textTitle, letterSpacing: "-0.03em", transition: "color 0.2s" }}>
            lin<span style={{ color: "#f59e0b" }}>q</span>ed
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 }}>
            <div style={{ fontSize: 11, color: t.textFaint, letterSpacing: "0.1em", transition: "color 0.2s" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
            </div>
            {puzzle && <>
              <div style={{ fontSize: 11, color: t.textFaint, letterSpacing: "0.06em" }}>·</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: t.textFaint, letterSpacing: "0.06em" }}>
                #{getPuzzleNumber(puzzle.date)}
              </div>
            </>}
          </div>
        </div>
        {headerButtons}
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "28px 16px 48px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          {puzzleStatus === "loading" && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
              <div style={{ fontSize: 13, color: t.textFaint, letterSpacing: "0.08em" }}>Loading today's puzzle...</div>
            </div>
          )}
          {puzzleStatus === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>⚠️</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: t.textSub }}>Couldn't load today's puzzle</p>
              <p style={{ fontSize: 13, color: t.textMuted }}>Try refreshing the page.</p>
              <button onClick={() => { setPuzzle(EXAMPLE_PUZZLE); setPuzzleStatus("ready"); }} style={{ marginTop: 8, padding: "10px 20px", background: "rgba(245,158,11,0.1)", border: "1.5px solid rgba(245,158,11,0.35)", borderRadius: 8, color: "#f59e0b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>▶ Play example puzzle</button>
            </div>
          )}
          {puzzleStatus === "no-puzzle" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>📭</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: t.textSub }}>No puzzle today</p>
              <p style={{ fontSize: 13, color: t.textMuted }}>Check back tomorrow!</p>
            </div>
          )}
          {puzzleStatus === "ready" && puzzle && (
            <Game key={`daily-${resetKey}`} puzzle={puzzle} t={t} playSound={playSound} onOpenArchive={() => { setShowArchive(true); track("archive_opened"); }} />
          )}
        </div>
      </div>
      {showHardPromo && <HardModePromo t={t} onClose={() => setShowHardPromo(false)} />}
      {showHelp && <HowToPlay t={t} onClose={() => setShowHelp(false)} />}
      <Footer t={t} />
    </div>
  );
}

// ── Archive Browser ───────────────────────────────────────────────────────────
function ArchiveBrowser({ t, onPlay }) {
  const [dates, setDates] = useState(null); // null = loading
  const [loadingPuzzle, setLoadingPuzzle] = useState(null); // date string being fetched
  const [openMonths, setOpenMonths] = useState({});

  useEffect(() => {
    async function loadIndex() {
      try {
        const res = await fetch("/api/puzzle-index");
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Only last 30 days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const cutoffKey = cutoff.toLocaleDateString("en-CA");
        const filtered = data.filter(d => d >= cutoffKey);
        setDates(filtered);
        // Auto-open most recent month
        if (filtered.length > 0) {
          setOpenMonths({ [filtered[0].slice(0, 7)]: true });
        }
      } catch {
        // API unavailable — show empty state
        setDates([]);
      }
    }
    loadIndex();
  }, []);

  async function handlePlay(date) {
    setLoadingPuzzle(date);
    try {
      const res = await fetch(`/api/puzzle?date=${date}`);
      if (!res.ok) throw new Error();
      const puzzle = await res.json();
      onPlay(puzzle);
    } catch {
      // API not available — find in hardcoded archive for test ground
      const puzzle = ARCHIVE_PUZZLES.find(p => p.date === date);
      if (puzzle) onPlay(puzzle);
    } finally {
      setLoadingPuzzle(null);
    }
  }

  function toggleMonth(month) {
    setOpenMonths(prev => ({ ...prev, [month]: !prev[month] }));
  }

  if (dates === null) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" }}>
        <div style={{ fontSize: 13, color: t.textFaint, letterSpacing: "0.08em" }}>Loading archive...</div>
      </div>
    );
  }

  // Group by month
  const grouped = {};
  dates.forEach(d => {
    const m = d.slice(0, 7);
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(d);
  });

  return (
    <div className="fade-up">
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
        The last 30 days of puzzles — free to replay anytime. Archive results don't affect your streak.
      </p>
      {dates.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: t.textFaint }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 14 }}>No past puzzles yet. Check back tomorrow!</p>
        </div>
      )}
      {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, monthDates]) => {
        const isOpen = openMonths[month];
        const playedCount = monthDates.filter(d => localStorage.getItem(`linqed_archive_${d}`)).length;
        return (
          <div key={month} style={{ marginBottom: 12 }}>
            <button onClick={() => toggleMonth(month)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", background: t.archiveMonthBg, border: `1px solid ${t.archiveMonthBorder}`,
              borderRadius: isOpen ? "10px 10px 0 0" : 10, cursor: "pointer", transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, fontWeight: 700, color: t.text }}>{formatMonthYear(month + "-01")}</span>
                <span style={{ fontSize: 11, color: t.textFaint, background: t.tagBg, border: `1px solid ${t.tagBorder}`, borderRadius: 999, padding: "1px 8px" }}>{monthDates.length} puzzles</span>
                {playedCount > 0 && <span style={{ fontSize: 11, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 999, padding: "1px 8px" }}>{playedCount} played</span>}
              </div>
              <span style={{ color: t.textFaint, fontSize: 11, display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
            </button>
            {isOpen && (
              <div style={{ border: `1px solid ${t.archiveMonthBorder}`, borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                {monthDates.map((d, i) => {
                  const played = !!localStorage.getItem(`linqed_archive_${d}`);
                  const isLast = i === monthDates.length - 1;
                  const isLoading = loadingPuzzle === d;
                  const dateLabel = new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  return (
                    <button key={d} onClick={() => handlePlay(d)} disabled={!!loadingPuzzle} style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", background: played ? t.archivePlayedBg : t.archiveMonthBg,
                      border: "none", borderTop: `1px solid ${t.archiveBorder}`,
                      borderRadius: isLast ? "0 0 10px 10px" : 0, cursor: loadingPuzzle ? "default" : "pointer",
                      transition: "background 0.15s", textAlign: "left", opacity: loadingPuzzle && !isLoading ? 0.5 : 1,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: t.textFaint, fontFamily: "'DM Mono', monospace", minWidth: 100 }}>{dateLabel}</span>
                        {played && !isLoading && <span style={{ fontSize: 10, color: "#10b981", letterSpacing: "0.06em", fontWeight: 600 }}>✓ PLAYED</span>}
                        {isLoading && <span style={{ fontSize: 10, color: t.textFaint, letterSpacing: "0.06em" }}>Loading...</span>}
                      </div>
                      <span style={{ fontSize: 12, color: "#f59e0b", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                        {isLoading ? "..." : "Play →"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Game ──────────────────────────────────────────────────────────────────────
function Game({ puzzle, t, playSound = () => {}, isArchive = false, startHardMode = false, onBackToArchive, onOpenArchive }) {
  const storageKey = isArchive ? `linqed_archive_${puzzle.date}` : `linqed_played_${puzzle.date}`;
  const streakKey  = "linqed_streak";

  const [step,         setStep]         = useState(isArchive ? STEPS.TRIVIA : STEPS.MODE);
  const [hardMode,     setHardMode]     = useState(startHardMode);
  const [qIndex,       setQIndex]       = useState(0);
  const [answers,      setAnswers]      = useState([]); // { selected, correct, isCorrect }
  // Hard mode: tracks selected (unconfirmed) answer per question during review
  const [hardSelections, setHardSelections] = useState([null, null, null, null]);
  const [reviewEditQ,  setReviewEditQ]  = useState(null); // which Q is being re-answered in review
  const [connInput,    setConnInput]    = useState("");
  const [connResult,   setConnResult]   = useState(null);
  const [shake,        setShake]        = useState(false);
  const [guessCount,   setGuessCount]   = useState(0);
  const [copied,       setCopied]       = useState(false);
  const [streak,       setStreak]       = useState(0);
  const [hintUsed,     setHintUsed]     = useState(-1); // -1 = not used, otherwise = guessCount when used
  const [guessHistory, setGuessHistory]  = useState([]); // hard mode: [{answers, connWrong}] per guess
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const { answers: a, connResult: cr, guessCount: gc, hardMode: hm, hintUsed: hu, guessHistory: gh } = JSON.parse(saved);
      setAnswers(a); setConnResult(cr); setGuessCount(gc || 0);
      setHardMode(hm || false); setHintUsed(hu !== undefined ? hu : -1); setGuessHistory(gh || []); setStep(STEPS.DONE);
    }
    if (!isArchive) setStreak(parseInt(localStorage.getItem(streakKey) || "0"));
  }, []);

  const q            = puzzle.questions[qIndex];
  const totalQ       = puzzle.questions.length;
  const answered     = answers[qIndex];
  const correctCount = answers.filter(a => a.isCorrect).length;

  // ── Normal mode answer ──
  function handleAnswer(idx) {
    if (answered) return;
    const isCorrect = idx === q.correct;
    setAnswers(prev => [...prev, { selected: idx, correct: q.correct, isCorrect }]);
    playSound(isCorrect ? "correct" : "wrong");
    track("question_answered", { question_number: qIndex + 1, correct: isCorrect, puzzle_date: puzzle.date });
  }

  function handleNext() {
    if (qIndex + 1 < totalQ) { setQIndex(qIndex + 1); }
    else { setStep(STEPS.CONNECTOR); setTimeout(() => inputRef.current?.focus(), 300); }
  }

  // ── Hard mode answer selection (no feedback yet) ──
  function handleHardSelect(idx) {
    if (reviewEditQ !== null) {
      // Editing during review
      const updated = [...hardSelections];
      updated[reviewEditQ] = idx;
      setHardSelections(updated);
    } else {
      const updated = [...hardSelections];
      updated[qIndex] = idx;
      setHardSelections(updated);
    }
  }

  function handleHardConfirm() {
    const selected = hardSelections[qIndex];
    if (selected === null) return;
    playSound("correct");
    if (qIndex + 1 < totalQ) {
      setQIndex(qIndex + 1);
    } else {
      setStep(STEPS.REVIEW);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }

  // ── Connector ──
  function handleConnectorSubmit() {
    if (!connInput.trim() || connResult) return;

    // In hard mode, lock in selections on first submission
    let currentAnswers = answers;
    if (hardMode && answers.length < puzzle.questions.length) {
      const finalAnswers = hardSelections.map((selected, i) => ({
        selected,
        correct: puzzle.questions[i].correct,
        isCorrect: selected === puzzle.questions[i].correct,
      }));
      setAnswers(finalAnswers);
      currentAnswers = finalAnswers;
    }

    const inputVal = connInput.trim().toUpperCase();
    const aliases = (puzzle.connector.aliases || []).map(a => a.toUpperCase());
    const isCorrect = inputVal === puzzle.connector.answer.toUpperCase() || aliases.includes(inputVal);
    const newGuessCount = guessCount + 1;
    setGuessCount(newGuessCount);

    // Snapshot this guess for hard mode share text
    const snapshot = { answers: currentAnswers.map(a => a.isCorrect), connCorrect: isCorrect, hintUsedThisGuess: hintUsed === guessCount };
    const newGuessHistory = hardMode ? [...guessHistory, snapshot] : guessHistory;
    if (hardMode) setGuessHistory(newGuessHistory);

    if (!isCorrect) {
      setShake(true); setTimeout(() => setShake(false), 500);
      setConnInput(""); playSound("linkWrong");
      track("link_guessed", { correct: false, guess_number: newGuessCount, puzzle_date: puzzle.date, mode: hardMode ? "hard" : "normal" });
      if (newGuessCount >= 3) {
        const result = "wrong"; setConnResult(result);
        localStorage.setItem(storageKey, JSON.stringify({ answers: currentAnswers, connResult: result, guessCount: newGuessCount, hardMode, hintUsed, guessHistory: newGuessHistory }));
        if (!isArchive) { setStreak(0); localStorage.setItem(streakKey, "0"); }
        track("puzzle_completed", { result: "failed", trivia_score: currentAnswers.filter(a => a.isCorrect).length, puzzle_date: puzzle.date, mode: hardMode ? "hard" : "normal", is_archive: isArchive });
        setTimeout(() => setStep(STEPS.DONE), 500);
      }
      return;
    }

    const result = "correct"; setConnResult(result);
    playSound("linkCorrect"); setTimeout(() => playSound("complete"), 560);
    track("link_guessed", { correct: true, guess_number: newGuessCount, puzzle_date: puzzle.date, mode: hardMode ? "hard" : "normal" });
    track("puzzle_completed", { result: "success", trivia_score: currentAnswers.filter(a => a.isCorrect).length, guess_number: newGuessCount, puzzle_date: puzzle.date, mode: hardMode ? "hard" : "normal", is_archive: isArchive });
    localStorage.setItem(storageKey, JSON.stringify({ answers: currentAnswers, connResult: result, guessCount: newGuessCount, hardMode, hintUsed, guessHistory: newGuessHistory }));
    if (!isArchive) {
      const today = new Date().toLocaleDateString("en-CA");
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yk = yesterday.toLocaleDateString("en-CA");
      const alreadyPlayedToday = !!localStorage.getItem(`linqed_played_${today}`);
      const playedYesterday = !!localStorage.getItem(`linqed_played_${yk}`);
      if (!alreadyPlayedToday) {
        const newStreak = playedYesterday ? streak + 1 : 1;
        setStreak(newStreak); localStorage.setItem(streakKey, String(newStreak));
      }
    }
    setTimeout(() => setStep(STEPS.DONE), 500);
  }

  function buildShareText() {
    const label = isArchive ? `linqed archive — ${puzzle.date}` : `linqed — ${puzzle.date}`;
    const hintTag = hintUsed !== -1 ? " 💡" : "";

    if (hardMode && guessHistory.length > 1) {
      // Multi-row hard mode share
      const rows = guessHistory.map((snap, i) => {
        const dots = snap.answers.map(correct => correct ? "🟩" : "🟥").join("");
        const connEmoji = snap.connCorrect ? "✅" : "❌";
        const hint = snap.hintUsedThisGuess ? "💡" : "";
        return `${dots} 🔗${connEmoji}${hint}`;
      });
      return `🧩 linqed 😈 — ${puzzle.date}\n${rows.join("\n")}\n\nplaylinqed.com`;
    }

    // Normal single-row share
    const dots = answers.map(a => a.isCorrect ? "🟩" : "🟥").join("");
    const wrongGuesses = Math.max(0, connResult === "correct" ? guessCount - 1 : guessCount);
    const conn = "🔗" + "❌".repeat(wrongGuesses) + (connResult === "correct" ? "✅" : "❌".repeat(Math.max(0, 3 - wrongGuesses)));
    const modeTag = hardMode ? " 😈 Hard Mode" : "";
    return `🧩 ${label}${modeTag}${hintTag}\n\n${dots} ${conn}\n\nplaylinqed.com`;
  }

  function handleShare() {
    const text = buildShareText();
    track("result_shared", { puzzle_date: puzzle.date, mode: hardMode ? "hard" : "normal", is_archive: isArchive });
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    }
  }

  const progressBar = (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {puzzle.questions.map((_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, transition: "background 0.3s",
          background: (step === STEPS.REVIEW || step === STEPS.CONNECTOR || step === STEPS.DONE || (step === STEPS.TRIVIA && i < qIndex)) ? "#f59e0b"
            : (step === STEPS.TRIVIA && i === qIndex) ? "rgba(245,158,11,0.35)"
            : t.progressEmpty }} />
      ))}
      <div style={{ flex: 0.3, height: 3, borderRadius: 2, transition: "background 0.3s",
        background: step === STEPS.CONNECTOR ? "rgba(245,158,11,0.35)"
          : step === STEPS.DONE ? (connResult === "correct" ? "#10b981" : "#ef4444")
          : t.progressEmpty }} />
    </div>
  );

  // ── Welcome screen ──
  if (step === STEPS.MODE) return (
    <div className="fade-up" style={{ textAlign: "center" }}>

      {/* Network animation graphic */}
      <NetworkGraphic dark={t.bg === "#07070d"} />

      {/* Tagline — streak quip or default */}
      {(() => {
        const streakCount = parseInt(localStorage.getItem("linqed_streak") || "0");
        const QUIPS = [
          "Welcome back. You ready for today's puzzle?",
          "I see you want more linqed. You came to the right place.",
          `You've been playing for ${streakCount} days now? Things are getting serious.`,
          "Want to try hard mode today? Or are you chicken?",
          "Linqed: now 100% dairy free!",
          "Welcome back! Give me a big kiss!",
          "I've got a brand new puzzle for you today. I think you're going to like it.",
          "Hey if I order fries for the table would you have some?",
          "Let's get linqed up in this.",
          "linqed linqed linqed linqed linqed linqed linqed linqed linqed linqed linqed linqed",
          "I linq therefore I am.",
          "Today's puzzle syncs up PERFECTLY with The Wizard of Oz. Try it!",
          `${streakCount} days without a linq-related accident.`,
          "The higher your streak number is, the closer you are to heaven!",
          "It's time for linqed!!! Yay!!!!!!!!!",
          "Oops! All Puzzles!",
          "ChatGPT wishes it could write my puzzles.",
          "Enjoy the game? Share it with a friend! Hate the game? Share it with an enemy!",
          "You're the type of person who reads the home screen of daily puzzles. I appreciate that.",
          "Does Wordle have silly quips? Huh?",
          "It's giving \"linqed\".",
          "Better linqed than sorry.",
          "Linqed is like jazz, it's the answers you DON'T get right.",
          "it's linqed time!",
          "i missed you so much.",
          "we're just tryna be the next wordle.",
        ];
        const seed = parseInt(puzzle.date.replace(/-/g, ""), 10);
        const quip = streakCount > 0 ? QUIPS[seed % QUIPS.length] : "Four answers. One word that secretly connects them all. Find it.";
        return (
          <>
            {streakCount > 0 && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "5px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 20 }}>
                <span style={{ fontSize: 13 }}>🔥</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: "#f59e0b", letterSpacing: "0.04em" }}>{streakCount} day streak</span>
              </div>
            )}
            <p style={{ fontSize: 15, color: t.textSub, lineHeight: 1.7, margin: "0 0 32px", maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>
              {quip}
            </p>
          </>
        );
      })()}

      {/* Mode buttons */}
      <button onClick={() => { setHardMode(false); setStep(STEPS.TRIVIA); track("puzzle_started", { mode: "normal", puzzle_date: puzzle.date }); }} style={{
        width: "100%", padding: "16px 20px", marginBottom: 10,
        background: "#f59e0b", border: "none",
        borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
        textAlign: "center",
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#07070d" }}>Play</span>
      </button>

      <button onClick={() => { setHardMode(true); setStep(STEPS.TRIVIA); track("puzzle_started", { mode: "hard", puzzle_date: puzzle.date }); }} style={{
        width: "100%", padding: "16px 20px",
        background: "transparent", border: `1.5px solid ${t.text === "#1c1a16" ? "rgba(0,0,0,0.2)" : "rgba(245,158,11,0.3)"}`,
        borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
        textAlign: "center",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Hard Mode</span>
        <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 8 }}>No feedback until the end</span>
      </button>

    </div>
  );

  // ── Hard Mode: review + link word combined screen ──
  if (step === STEPS.REVIEW) {

    // If editing a specific question, show that question full-screen
    if (reviewEditQ !== null) {
      const editQ = puzzle.questions[reviewEditQ];
      const currentSel = hardSelections[reviewEditQ];
      return (
        <div className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <button onClick={() => setReviewEditQ(null)} style={{ padding: "6px 12px", background: t.btnBg, border: `1px solid ${t.btnBorder}`, borderRadius: 8, color: t.btnColor, fontSize: 12, cursor: "pointer" }}>← Back</button>
            <span style={{ fontSize: 12, color: t.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Question {reviewEditQ + 1}</span>
          </div>
          <Card t={t}>
            <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(16px,3.5vw,20px)", fontWeight: 700, color: t.text, margin: "0 0 20px", lineHeight: 1.45 }}>{editQ.question}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {editQ.answers.map((ans, idx) => {
                const isSelected = currentSel === idx;
                return (
                  <button key={idx} onClick={() => handleHardSelect(idx)} style={{
                    padding: "12px 15px", background: isSelected ? "rgba(245,158,11,0.12)" : t.answerBg,
                    border: `1.5px solid ${isSelected ? "#f59e0b" : t.answerBorder}`,
                    borderRadius: 9, color: isSelected ? "#f59e0b" : t.answerColor,
                    fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, background: isSelected ? "rgba(245,158,11,0.2)" : t.letterBadge, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: isSelected ? "#f59e0b" : t.letterBadgeColor, flexShrink: 0 }}>{String.fromCharCode(65 + idx)}</span>
                    {ans}
                  </button>
                );
              })}
            </div>
          </Card>
          <GoldBtn onClick={() => { playSound("correct"); setReviewEditQ(null); }}>Confirm →</GoldBtn>
        </div>
      );
    }

    // Main review + link word screen
    return (
      <div className="fade-up">
        {progressBar}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Tag t={t} accent style={{ marginBottom: 0 }}>Final Round</Tag>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 4, padding: "2px 8px", letterSpacing: "0.08em" }}>😈 HARD</span>
        </div>

        {/* Answer recap — tappable to change */}
        <p style={{ fontSize: 11, color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Your answers — tap to change</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {puzzle.questions.map((pq, i) => {
            const sel = hardSelections[i];
            const rawAnswer = sel !== null ? pq.answers[sel] : "—";
            const answerText = sel !== null && (pq.connectorKey || "").trim() ? pq.connectorKey : rawAnswer;
            return (
              <button key={i} onClick={() => setReviewEditQ(i)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 14px", background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                borderRadius: 10, cursor: "pointer", transition: "all 0.15s", textAlign: "left",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 5, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#f59e0b", flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
                  <span style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{answerText}</span>
                </div>
                <span style={{ fontSize: 11, color: t.textMuted }}>✎</span>
              </button>
            );
          })}
        </div>

        {/* Link word input */}
        <Card t={t}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: t.textMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>What's the link word?</p>
            <div style={{ display: "flex", gap: 5 }}>
              {[1,2,3].map(n => <div key={n} style={{ width: 8, height: 8, borderRadius: "50%", background: n <= guessCount ? (connResult === "correct" && n === guessCount ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.15)", transition: "background 0.2s" }} />)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input ref={inputRef} value={connInput} onChange={e => setConnInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleConnectorSubmit()} placeholder="e.g. GOLD" disabled={!!connResult}
              style={{ flex: 1, padding: "12px 14px", background: t.inputBg, border: `1.5px solid ${connResult === "correct" ? "#10b981" : shake ? "#ef4444" : t.cardBorder}`, borderRadius: 8, color: t.inputColor, fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", animation: shake ? "shake 0.4s ease" : "none", transition: "border-color 0.2s, background 0.2s, color 0.2s" }}
            />
            <button onClick={handleConnectorSubmit} disabled={!connInput.trim() || !!connResult} style={{ padding: "12px 18px", background: "#f59e0b", border: "none", borderRadius: 8, color: "#07070d", fontSize: 14, fontWeight: 700, cursor: connInput.trim() && !connResult ? "pointer" : "not-allowed", opacity: connInput.trim() && !connResult ? 1 : 0.4, transition: "opacity 0.15s" }}>Go</button>
          </div>
          {!connResult && guessCount > 0 && <p style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.5, marginBottom: 8 }}>{guessCount === 1 ? "Not quite — 2 guesses left." : "One guess left!"}</p>}
          {!connResult && puzzle.connector.hint && hintUsed === -1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
            <button onClick={() => setHintUsed(guessCount)} style={{ padding: "6px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, color: "rgba(245,158,11,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.15s", animation: guessCount >= 2 ? "pulse 1s ease-in-out infinite" : "none" }}>
              💡 Stuck? Use a hint
            </button>
            {Date.now() < new Date("2026-04-15").getTime() && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "#07070d", background: "#f59e0b", borderRadius: 999, padding: "2px 6px", letterSpacing: "0.06em" }}>NEW!</span>
            )}
          </div>
        )}
        {!connResult && hintUsed !== -1 && puzzle.connector.hint && (
          <p style={{ fontSize: 13, color: "rgba(245,158,11,0.8)", lineHeight: 1.5, marginTop: 4 }}>💡 {puzzle.connector.hint}</p>
        )}
        </Card>

        <p style={{ fontSize: 11, color: t.textFaint, textAlign: "center", lineHeight: 1.6 }}>Not sure? Change your answers above — it's free.</p>
      </div>
    );
  }

  // ── Normal trivia ──
  if (step === STEPS.TRIVIA && !hardMode) return (
    <div className="fade-up" key={qIndex}>
      {progressBar}
      <Tag t={t}>Question {qIndex + 1} of {totalQ}</Tag>
      <Card t={t}>
        <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(16px,3.5vw,20px)", fontWeight: 700, color: t.text, margin: "0 0 20px", lineHeight: 1.45, transition: "color 0.2s" }}>{q.question}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.answers.map((ans, idx) => {
            let bg = t.answerBg, border = t.answerBorder, color = t.answerColor, opacity = 1;
            if (answered) {
              if (idx === q.correct)                                     { bg = "rgba(16,185,129,0.15)"; border = "#10b981"; color = "#6ee7b7"; }
              else if (idx === answered.selected && !answered.isCorrect) { bg = "rgba(239,68,68,0.12)";  border = "#ef4444"; color = "#fca5a5"; }
              else if (idx !== q.correct) opacity = 0.35;
            }
            return (
              <button key={idx} onClick={() => handleAnswer(idx)} disabled={!!answered} style={{ padding: "12px 15px", background: bg, border: `1.5px solid ${border}`, borderRadius: 9, color, opacity, fontSize: 14, textAlign: "left", cursor: answered ? "default" : "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 20, height: 20, borderRadius: 5, background: t.letterBadge, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: t.letterBadgeColor, flexShrink: 0 }}>{String.fromCharCode(65 + idx)}</span>
                {ans}
              </button>
            );
          })}
        </div>
      </Card>
      {answered && (
        <div className="pop">
          {q.fact && (
            <div style={{ background: answered.isCorrect ? t.factBgOk : t.factBgErr, border: `1px solid ${answered.isCorrect ? t.factBorderOk : t.factBorderErr}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{answered.isCorrect ? "🎯" : "💡"}</span>
              <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, transition: "color 0.2s" }}>{q.fact}</p>
            </div>
          )}
          <GoldBtn onClick={handleNext}>{qIndex + 1 < totalQ ? "Next Question →" : "Find the Link →"}</GoldBtn>
        </div>
      )}
      {!answered && <p style={{ fontSize: 11, color: t.textFaint, textAlign: "center", marginTop: 14, letterSpacing: "0.03em", transition: "color 0.2s" }}>After 4 answers, find the link.</p>}
    </div>
  );

  // ── Hard Mode trivia ──
  if (step === STEPS.TRIVIA && hardMode) {
    const currentSel = hardSelections[qIndex];
    return (
      <div className="fade-up" key={qIndex}>
        {progressBar}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Tag t={t} style={{ marginBottom: 0 }}>Question {qIndex + 1} of {totalQ}</Tag>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 4, padding: "2px 8px", letterSpacing: "0.08em" }}>😈 HARD</span>
        </div>
        <Card t={t}>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(16px,3.5vw,20px)", fontWeight: 700, color: t.text, margin: "0 0 20px", lineHeight: 1.45 }}>{q.question}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {q.answers.map((ans, idx) => {
              const isSelected = currentSel === idx;
              return (
                <button key={idx} onClick={() => handleHardSelect(idx)} style={{
                  padding: "12px 15px", background: isSelected ? "rgba(245,158,11,0.12)" : t.answerBg,
                  border: `1.5px solid ${isSelected ? "#f59e0b" : t.answerBorder}`,
                  borderRadius: 9, color: isSelected ? "#f59e0b" : t.answerColor,
                  fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ width: 20, height: 20, borderRadius: 5, background: isSelected ? "rgba(245,158,11,0.2)" : t.letterBadge, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: isSelected ? "#f59e0b" : t.letterBadgeColor, flexShrink: 0 }}>{String.fromCharCode(65 + idx)}</span>
                  {ans}
                </button>
              );
            })}
          </div>
        </Card>
        <button onClick={handleHardConfirm} disabled={currentSel === null} style={{
          width: "100%", padding: "13px", background: currentSel !== null ? "#f59e0b" : "rgba(245,158,11,0.2)",
          border: "none", borderRadius: 10, color: currentSel !== null ? "#07070d" : "rgba(0,0,0,0.3)",
          fontSize: 14, fontWeight: 700, cursor: currentSel !== null ? "pointer" : "default", letterSpacing: "0.03em", transition: "all 0.2s",
        }}>
          {qIndex + 1 < totalQ ? "Confirm →" : "Review Answers →"}
        </button>
        <p style={{ fontSize: 11, color: t.textFaint, textAlign: "center", marginTop: 12, letterSpacing: "0.03em" }}>No feedback until the end. You can review before locking in.</p>
      </div>
    );
  }

  // ── Connector ──
  if (step === STEPS.CONNECTOR) return (
    <div className="fade-up">
      {progressBar}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Tag t={t} accent>Final Round</Tag>
        <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 700, color: t.text, lineHeight: 1.3, marginBottom: 8, transition: "color 0.2s" }}>What's the<br /><span style={{ color: "#f59e0b" }}>link?</span></h2>
        <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, maxWidth: 320, margin: "0 auto 20px", transition: "color 0.2s" }}>One word secretly links all four answers. What is it?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {answers.map((a, i) => {
            const q = puzzle.questions[i];
            const displayText = (q.connectorKey || "").trim() || q.answers[q.correct];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: t.recapBg, border: `1px solid ${t.recapBorder}`, borderRadius: 8, padding: "9px 14px", transition: "background 0.2s" }}>
                {!hardMode && <span style={{ fontSize: 13, color: a.isCorrect ? "#6ee7b7" : "#fca5a5" }}>{a.isCorrect ? "✓" : "✗"}</span>}
                <span style={{ fontSize: 13, color: t.textSub, transition: "color 0.2s" }}>{displayText}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Card t={t}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: t.textMuted, letterSpacing: "0.05em", textTransform: "uppercase", transition: "color 0.2s" }}>Type the link word:</p>
          <div style={{ display: "flex", gap: 5 }}>
            {[1,2,3].map(n => <div key={n} style={{ width: 8, height: 8, borderRadius: "50%", background: n <= guessCount ? (connResult === "correct" && n === guessCount ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.15)", transition: "background 0.2s" }} />)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input ref={inputRef} value={connInput} onChange={e => setConnInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleConnectorSubmit()} placeholder="e.g. GOLD" disabled={!!connResult}
            style={{ flex: 1, padding: "12px 14px", background: t.inputBg, border: `1.5px solid ${connResult === "correct" ? "#10b981" : shake ? "#ef4444" : t.cardBorder}`, borderRadius: 8, color: t.inputColor, fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", animation: shake ? "shake 0.4s ease" : "none", transition: "border-color 0.2s, background 0.2s, color 0.2s" }}
          />
          <button onClick={handleConnectorSubmit} disabled={!connInput.trim() || !!connResult} style={{ padding: "12px 18px", background: "#f59e0b", border: "none", borderRadius: 8, color: "#07070d", fontSize: 14, fontWeight: 700, cursor: connInput.trim() && !connResult ? "pointer" : "not-allowed", opacity: connInput.trim() && !connResult ? 1 : 0.4, transition: "opacity 0.15s" }}>Go</button>
        </div>
        {!connResult && guessCount > 0 && <p style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.5, marginBottom: 8 }}>{guessCount === 1 ? "Not quite — 2 guesses left." : "One guess left!"}</p>}
        {!connResult && puzzle.connector.hint && hintUsed === -1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
            <button onClick={() => setHintUsed(guessCount)} style={{ padding: "6px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, color: "rgba(245,158,11,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.15s", animation: guessCount >= 2 ? "pulse 1s ease-in-out infinite" : "none" }}>
              💡 Stuck? Use a hint
            </button>
            {Date.now() < new Date("2026-04-15").getTime() && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "#07070d", background: "#f59e0b", borderRadius: 999, padding: "2px 6px", letterSpacing: "0.06em" }}>NEW!</span>
            )}
          </div>
        )}
        {!connResult && hintUsed !== -1 && puzzle.connector.hint && (
          <p style={{ fontSize: 13, color: "rgba(245,158,11,0.8)", lineHeight: 1.5, marginTop: 4 }}>💡 {puzzle.connector.hint}</p>
        )}
      </Card>
    </div>
  );

  // ── Done ──
  const emoji = correctCount === 4 && connResult === "correct" ? "🎯" : correctCount >= 3 && connResult === "correct" ? "🔥" : connResult === "correct" ? "👀" : "💀";
  const currentStreak = !isArchive ? parseInt(localStorage.getItem(streakKey) || "0") : 0;
  const streakMsg = !isArchive && (currentStreak > 1 ? `🔥 ${currentStreak} day streak` : currentStreak === 1 ? "🔥 Streak started!" : "");

  return (
    <div className="fade-up">
      {progressBar}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>{emoji}</div>
        <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 4, transition: "color 0.2s" }}>{correctCount}/{totalQ} + {connResult === "correct" ? "link ✓" : "link ✗"}</div>
        {hardMode && <div style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 4, padding: "2px 10px", display: "inline-block", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4 }}>😈 HARD MODE</div>}
        {streakMsg && <div style={{ fontSize: 13, color: t.textMuted, transition: "color 0.2s" }}>{streakMsg}</div>}
      </div>

      <div style={{ background: t.recapBg, border: `1px solid ${t.recapBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 12, textAlign: "center", transition: "background 0.2s" }}>
        <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.2s" }}>The link word was</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.12em" }}>{puzzle.connector.answer}</p>
      </div>

      <Card t={t}>
        {puzzle.questions.map((q, i) => {
          const displayAnswer = (q.displayAnswer || "").trim();
          const note = (q.connectionNote || "").trim();
          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < puzzle.questions.length - 1 ? 14 : 0, alignItems: "flex-start" }}>
              <span style={{ fontSize: 14, marginTop: 2, flexShrink: 0 }}>{answers[i]?.isCorrect ? "🟩" : "🟥"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>
                  {displayAnswer ? renderHighlighted(displayAnswer, t.text, "#f59e0b") : <span style={{ color: t.text }}>{q.answers[q.correct]}</span>}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5, transition: "color 0.2s" }}>
                  {note ? renderHighlighted(note, t.textMuted, "#f59e0b") : q.fact}
                </div>
              </div>
            </div>
          );
        })}
        {(puzzle.connector.reveal || "").trim() && (
          <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 12, marginTop: 14 }}>
            <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6, transition: "color 0.2s" }}>{connResult === "correct" ? "🔗✅" : "🔗❌"} {puzzle.connector.reveal}</p>
          </div>
        )}
      </Card>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={handleShare} style={{
          flex: 1, padding: "13px",
          background: copied ? "rgba(16,185,129,0.15)" : t.sharePreviewBg,
          border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : t.sharePreviewBorder}`,
          borderRadius: 10, color: copied ? "#6ee7b7" : t.text,
          fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
        }}>{copied ? "✓ Copied!" : "Share 📲"}</button>

        {!isArchive && (
          <button onClick={onOpenArchive} style={{ flex: 1, padding: "13px", background: t.btnBg, border: `1px solid ${t.btnBorder}`, borderRadius: 10, color: t.text, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
            Archive 📅
          </button>
        )}

        {isArchive && (
          <button onClick={onBackToArchive} style={{ flex: 1, padding: "13px", background: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.25)", borderRadius: 10, color: "#f59e0b", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
            ← Archive
          </button>
        )}
      </div>

      {!isArchive && <p style={{ fontSize: 12, color: t.textFaint, textAlign: "center", marginTop: 14, lineHeight: 1.6, transition: "color 0.2s" }}>Come back tomorrow for a new puzzle.</p>}
      {!isArchive && <Countdown t={t} />}

      {!isArchive && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="https://buymeacoffee.com/bradleywithane" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block",
            padding: "7px 16px",
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 20, textDecoration: "none",
            color: "#f59e0b", fontSize: 11, fontWeight: 600,
            transition: "all 0.15s",
          }}>
            Enjoying linqed? Buy me a coffee ☕
          </a>
        </div>
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Card({ children, t }) {
  return <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: "18px 16px", marginBottom: 12, transition: "background 0.2s" }}>{children}</div>;
}

function Tag({ children, accent, t }) {
  return <div style={{ display: "inline-block", marginBottom: 14, background: accent ? "rgba(245,158,11,0.1)" : t.tagBg, border: `1px solid ${accent ? "rgba(245,158,11,0.3)" : t.tagBorder}`, borderRadius: 5, padding: "3px 9px", fontSize: 10, fontWeight: 600, color: accent ? "#f59e0b" : t.tagColor, letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.2s" }}>{children}</div>;
}

function GoldBtn({ children, onClick }) {
  return <button onClick={onClick} style={{ width: "100%", padding: "13px", background: "#f59e0b", border: "none", borderRadius: 10, color: "#07070d", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em" }}>{children}</button>;
}

function Countdown({ t }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function calc() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: 6 }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: t.textFaint, letterSpacing: "0.1em" }}>{timeLeft}</span>
    </div>
  );
}

function Footer({ t }) {
  return (
    <div style={{ textAlign: "center", paddingBottom: 28, transition: "color 0.2s" }}>
      <p style={{ fontSize: 11, color: t.textFaint, letterSpacing: "0.04em" }}>
        A game by <a href="https://bsky.app/profile/bradleywithane.com" target="_blank" rel="noopener noreferrer" style={{ color: "#f59e0b", fontWeight: 600, textDecoration: "none" }}>Bradley Miller</a>
      </p>
    </div>
  );
}


function HardModePromo({ onClose, t }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: t.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "fadeIn 0.2s ease forwards" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, background: t.modalBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.35)", overflow: "hidden", transition: "background 0.2s" }}>
        <div style={{ padding: "24px 20px 8px", textAlign: "center", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", right: 16, top: 16, width: 28, height: 28, borderRadius: "50%", background: t.btnBg, border: "none", color: t.btnColor, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <div style={{ fontSize: 32, marginBottom: 10 }}>😈</div>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 8, transition: "color 0.2s" }}>Try Hard Mode</div>
          <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7, marginBottom: 16, transition: "color 0.2s" }}>
            No feedback on your trivia answers. Go in blind — then find the link. Each guess gets its own row in your share card.
          </p>
        </div>
        {/* Mock share card */}
        <div style={{ margin: "0 20px 20px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 2 }}>
          <div style={{ fontSize: 11, color: "rgba(245,158,11,0.6)", letterSpacing: "0.08em", marginBottom: 6 }}>EXAMPLE SHARE CARD</div>
          <div>🧩 linqed 😈 — today</div>
          <div>🟥🟥🟩🟩 🔗❌</div>
          <div>🟩🟥🟩🟩 🔗❌</div>
          <div>🟩🟩🟩🟩 🔗✅</div>
        </div>
        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onClose} style={{ width: "100%", padding: "13px", background: "#f59e0b", border: "none", borderRadius: 10, color: "#07070d", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em" }}>Try it today →</button>
          <button onClick={onClose} style={{ width: "100%", padding: "11px", background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 10, color: t.textMuted, fontSize: 13, cursor: "pointer" }}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}

function HowToPlay({ onClose, t }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: t.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease forwards" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: t.modalBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px 16px 0 0", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.35)", transition: "background 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: t.divider }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 12px", borderBottom: `1px solid ${t.divider}`, flexShrink: 0 }}>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 17, fontWeight: 700, color: t.text, transition: "color 0.2s" }}>How to Play</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: t.btnBg, border: "none", color: t.btnColor, fontSize: 16, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "16px 16px 20px", overflowY: "auto", flex: 1 }}>
          <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7, marginBottom: 20 }}>
            linqed is a daily connection-making trivia game. Answer four questions, and then find the word that connects it all together.
          </p>
          {[
            { num: "1", title: "Answer four trivia questions", desc: "Each one is a clue. Want a challenge? Try Hard Mode!" },
            { num: "2", title: "Find the link word", desc: "Type the single word that connects all the answers together." },
            { num: "3", title: "Share your results", desc: "Challenge your friends and see how they do!" },
          ].map(({ num, title, desc }) => (
            <div key={num} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "rgba(245,158,11,0.15)", border: "1.5px solid rgba(245,158,11,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: "#f59e0b" }}>{num}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 3, transition: "color 0.2s" }}>{title}</div>
                <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5, transition: "color 0.2s" }}>{desc}</div>
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 14, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.7, marginBottom: 6 }}>A new puzzle drops every day, whether you like it or not.</p>
            <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.7 }}>Miss a day? Check out the archive after the daily puzzle.</p>
          </div>
          <button onClick={onClose} style={{ width: "100%", padding: "13px", background: "#f59e0b", border: "none", borderRadius: 10, color: "#07070d", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em" }}>Let's Play →</button>
        </div>
      </div>
    </div>
  );
}
