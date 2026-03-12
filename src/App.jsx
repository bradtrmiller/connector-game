import { useState, useEffect, useRef } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayKey() {
  return new Date().toLocaleDateString("en-CA");
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

const STEPS = { TRIVIA: "trivia", CONNECTOR: "connector", DONE: "done" };

// ─── Theme definitions ────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    bg:                 "#07070d",
    cardBg:             "rgba(255,255,255,0.04)",
    cardBorder:         "rgba(255,255,255,0.1)",
    modalBg:            "#111118",
    text:               "#f0efe8",
    textTitle:          "#f5f0e8",
    textSub:            "rgba(255,255,255,0.45)",
    textFaint:          "rgba(255,255,255,0.25)",
    textMuted:          "rgba(255,255,255,0.3)",
    btnBg:              "rgba(255,255,255,0.06)",
    btnBorder:          "rgba(255,255,255,0.15)",
    btnColor:           "rgba(255,255,255,0.45)",
    inputBg:            "rgba(255,255,255,0.05)",
    inputColor:         "#f0efe8",
    answerBg:           "rgba(255,255,255,0.04)",
    answerBorder:       "rgba(255,255,255,0.1)",
    answerColor:        "#e8e8e4",
    tagBg:              "rgba(255,255,255,0.05)",
    tagBorder:          "rgba(255,255,255,0.1)",
    tagColor:           "rgba(255,255,255,0.4)",
    progressEmpty:      "rgba(255,255,255,0.08)",
    exampleBg:          "rgba(255,255,255,0.03)",
    exampleBorder:      "rgba(255,255,255,0.08)",
    divider:            "rgba(255,255,255,0.07)",
    factBgOk:           "rgba(16,185,129,0.08)",
    factBorderOk:       "rgba(16,185,129,0.25)",
    factBgErr:          "rgba(239,68,68,0.08)",
    factBorderErr:      "rgba(239,68,68,0.25)",
    recapBg:            "rgba(255,255,255,0.04)",
    recapBorder:        "rgba(255,255,255,0.07)",
    sharePreviewBg:     "rgba(255,255,255,0.04)",
    sharePreviewBorder: "rgba(255,255,255,0.1)",
    sharePreviewColor:  "rgba(255,255,255,0.7)",
    overlay:            "rgba(0,0,0,0.75)",
    letterBadge:        "rgba(255,255,255,0.06)",
    letterBadgeColor:   "rgba(255,255,255,0.3)",
  },
  light: {
    bg:                 "#f5f3ee",
    cardBg:             "#ffffff",
    cardBorder:         "rgba(0,0,0,0.08)",
    modalBg:            "#ffffff",
    text:               "#1c1a16",
    textTitle:          "#1c1a16",
    textSub:            "rgba(0,0,0,0.5)",
    textFaint:          "rgba(0,0,0,0.35)",
    textMuted:          "rgba(0,0,0,0.4)",
    btnBg:              "rgba(0,0,0,0.05)",
    btnBorder:          "rgba(0,0,0,0.15)",
    btnColor:           "rgba(0,0,0,0.45)",
    inputBg:            "rgba(0,0,0,0.04)",
    inputColor:         "#1c1a16",
    answerBg:           "rgba(0,0,0,0.03)",
    answerBorder:       "rgba(0,0,0,0.1)",
    answerColor:        "#2a2820",
    tagBg:              "rgba(0,0,0,0.05)",
    tagBorder:          "rgba(0,0,0,0.1)",
    tagColor:           "rgba(0,0,0,0.45)",
    progressEmpty:      "rgba(0,0,0,0.1)",
    exampleBg:          "rgba(0,0,0,0.03)",
    exampleBorder:      "rgba(0,0,0,0.08)",
    divider:            "rgba(0,0,0,0.08)",
    factBgOk:           "rgba(16,185,129,0.08)",
    factBorderOk:       "rgba(16,185,129,0.35)",
    factBgErr:          "rgba(239,68,68,0.07)",
    factBorderErr:      "rgba(239,68,68,0.3)",
    recapBg:            "rgba(0,0,0,0.03)",
    recapBorder:        "rgba(0,0,0,0.07)",
    sharePreviewBg:     "rgba(0,0,0,0.03)",
    sharePreviewBorder: "rgba(0,0,0,0.1)",
    sharePreviewColor:  "rgba(0,0,0,0.6)",
    overlay:            "rgba(0,0,0,0.5)",
    letterBadge:        "rgba(0,0,0,0.06)",
    letterBadgeColor:   "rgba(0,0,0,0.35)",
  },
};

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [puzzle,   setPuzzle]   = useState(null);
  const [status,   setStatus]   = useState("loading");
  const [showHelp, setShowHelp] = useState(false);

  // Detect system preference, allow localStorage override
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

  // Keep body background in sync
  useEffect(() => {
    document.body.style.background = t.bg;
  }, [t.bg]);

  useEffect(() => {
    async function load() {
      try {
        const localDate = new Date().toLocaleDateString("en-CA");
        const res = await fetch(`/api/puzzle?date=${localDate}`);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        if (!data || !data.questions) { setStatus("no-puzzle"); return; }
        setPuzzle(data);
        setStatus("ready");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    }
    load();

    const seen = localStorage.getItem("linqed_seen_instructions");
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem("linqed_seen_instructions", "1");
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>
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
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 0", position: "relative" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, fontWeight: 700, color: t.textTitle, letterSpacing: "-0.03em", transition: "color 0.2s" }}>
            lin<span style={{ color: "#f59e0b" }}>q</span>ed
          </div>
          <div style={{ fontSize: 11, color: t.textFaint, letterSpacing: "0.1em", marginTop: 2, transition: "color 0.2s" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
          </div>
        </div>

        {/* Right-side buttons */}
        <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 8 }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{
            width: 30, height: 30, borderRadius: "50%",
            background: t.btnBg, border: `1.5px solid ${t.btnBorder}`,
            color: t.btnColor, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            {isDark ? "☀️" : "🌙"}
          </button>

          {/* How to play */}
          <button onClick={() => setShowHelp(true)} title="How to play" style={{
            width: 30, height: 30, borderRadius: "50%",
            background: t.btnBg, border: `1.5px solid ${t.btnBorder}`,
            color: t.btnColor, fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>?</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", justifyContent: "center", padding: "28px 16px 60px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          {status === "loading"   && <LoadingScreen t={t} />}
          {status === "error"     && <MessageScreen t={t} emoji="⚠️" title="Couldn't load today's puzzle" sub="Try refreshing the page." />}
          {status === "no-puzzle" && <MessageScreen t={t} emoji="📭" title="No puzzle today" sub="Check back tomorrow!" />}
          {status === "ready" && puzzle && <Game puzzle={puzzle} t={t} />}
        </div>
      </div>

      {showHelp && <HowToPlay t={t} onClose={() => setShowHelp(false)} />}
    </div>
  );
}

// ─── Game ─────────────────────────────────────────────────────────────────────

function Game({ puzzle, t }) {
  const today      = getTodayKey();
  const storageKey = `linqed_played_${today}`;
  const streakKey  = "linqed_streak";

  const [step,          setStep]          = useState(STEPS.TRIVIA);
  const [qIndex,        setQIndex]        = useState(0);
  const [answers,       setAnswers]       = useState([]);
  const [connInput,     setConnInput]     = useState("");
  const [connResult,    setConnResult]    = useState(null);
  const [shake,         setShake]         = useState(false);
  const [hintRevealed,  setHintRevealed]  = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [sharePreview,  setSharePreview]  = useState(false);
  const [streak,        setStreak]        = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const { answers: a, connResult: cr } = JSON.parse(saved);
      setAnswers(a);
      setConnResult(cr);
      setStep(STEPS.DONE);
    }
    setStreak(parseInt(localStorage.getItem(streakKey) || "0"));
  }, []);

  const q            = puzzle.questions[qIndex];
  const totalQ       = puzzle.questions.length;
  const answered     = answers[qIndex];
  const correctCount = answers.filter(a => a.isCorrect).length;

  function handleAnswer(idx) {
    if (answered) return;
    const isCorrect = idx === q.correct;
    setAnswers(prev => [...prev, { selected: idx, correct: q.correct, isCorrect }]);
  }

  function handleNext() {
    if (qIndex + 1 < totalQ) {
      setQIndex(qIndex + 1);
    } else {
      setStep(STEPS.CONNECTOR);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }

  function handleConnectorSubmit() {
    if (!connInput.trim() || connResult) return;
    const isCorrect = connInput.trim().toUpperCase() === puzzle.connector.answer.toUpperCase();
    if (!isCorrect) { setShake(true); setTimeout(() => setShake(false), 500); }
    const result = isCorrect ? "correct" : "wrong";
    setConnResult(result);

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yk = yesterday.toLocaleDateString("en-CA");
    const playedYesterday = !!localStorage.getItem(`linqed_played_${yk}`);
    const newStreak = isCorrect ? (playedYesterday ? streak + 1 : 1) : 0;
    setStreak(newStreak);
    localStorage.setItem(streakKey, String(newStreak));
    localStorage.setItem(storageKey, JSON.stringify({ answers, connResult: result }));

    setTimeout(() => setStep(STEPS.DONE), 500);
  }

  function buildShareText() {
    const dots  = answers.map(a => a.isCorrect ? "🟩" : "🟥").join("");
    const conn  = connResult === "correct" ? "🔗✅" : "🔗❌";
    const score = `${correctCount}/4 + ${connResult === "correct" ? "link ✓" : "link ✗"}`;
    return `🧩 linqed — ${today}\n\n${dots} ${conn}\n${score}\n\nplaylinqed.com`;
  }

  function handleShare() {
    navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Progress bar ─────────────────────────────────────────────────────────────
  const progressBar = (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {puzzle.questions.map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2, transition: "background 0.3s",
          background: step !== STEPS.TRIVIA || i < qIndex ? "#f59e0b"
            : i === qIndex ? "rgba(245,158,11,0.35)"
            : t.progressEmpty,
        }} />
      ))}
      <div style={{
        flex: 0.3, height: 3, borderRadius: 2, transition: "background 0.3s",
        background: step === STEPS.CONNECTOR ? "rgba(245,158,11,0.35)"
          : step === STEPS.DONE ? (connResult === "correct" ? "#10b981" : "#ef4444")
          : t.progressEmpty,
      }} />
    </div>
  );

  // ── Trivia ───────────────────────────────────────────────────────────────────
  if (step === STEPS.TRIVIA) return (
    <div className="fade-up" key={qIndex}>
      {progressBar}
      <Tag t={t}>Question {qIndex + 1} of {totalQ}</Tag>
      <Card t={t}>
        <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(16px,3.5vw,20px)", fontWeight: 700, color: t.text, margin: "0 0 20px", lineHeight: 1.45, transition: "color 0.2s" }}>
          {q.question}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.answers.map((ans, idx) => {
            let bg = t.answerBg, border = t.answerBorder, color = t.answerColor, opacity = 1;
            if (answered) {
              if (idx === q.correct)                              { bg = "rgba(16,185,129,0.15)"; border = "#10b981"; color = "#6ee7b7"; }
              else if (idx === answered.selected && !answered.isCorrect) { bg = "rgba(239,68,68,0.12)"; border = "#ef4444"; color = "#fca5a5"; }
              else if (idx !== q.correct) opacity = 0.35;
            }
            return (
              <button key={idx} onClick={() => handleAnswer(idx)} disabled={!!answered} style={{
                padding: "12px 15px", background: bg, border: `1.5px solid ${border}`,
                borderRadius: 9, color, opacity, fontSize: 14, textAlign: "left",
                cursor: answered ? "default" : "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ width: 20, height: 20, borderRadius: 5, background: t.letterBadge, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: t.letterBadgeColor, flexShrink: 0 }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {ans}
              </button>
            );
          })}
        </div>
      </Card>

      {answered && (
        <div className="pop">
          <div style={{
            background: answered.isCorrect ? t.factBgOk : t.factBgErr,
            border: `1px solid ${answered.isCorrect ? t.factBorderOk : t.factBorderErr}`,
            borderRadius: 10, padding: "14px 16px", marginBottom: 10,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{answered.isCorrect ? "🎯" : "💡"}</span>
            <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, transition: "color 0.2s" }}>{q.fact}</p>
          </div>
          <GoldBtn onClick={handleNext}>
            {qIndex + 1 < totalQ ? "Next Question →" : "Find the Link →"}
          </GoldBtn>
        </div>
      )}

      {!answered && (
        <p style={{ fontSize: 11, color: t.textFaint, textAlign: "center", marginTop: 14, letterSpacing: "0.03em", transition: "color 0.2s" }}>
          After 4 answers, find the link.
        </p>
      )}
    </div>
  );

  // ── Connector ────────────────────────────────────────────────────────────────
  if (step === STEPS.CONNECTOR) return (
    <div className="fade-up">
      {progressBar}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Tag t={t} accent>Final Round</Tag>
        <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 700, color: t.text, lineHeight: 1.3, marginBottom: 8, transition: "color 0.2s" }}>
          What's the<br /><span style={{ color: "#f59e0b" }}>link?</span>
        </h2>
        <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, maxWidth: 320, margin: "0 auto 20px", transition: "color 0.2s" }}>
          {puzzle.connector.prompt || "One word secretly links all four answers. What is it?"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {answers.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: t.recapBg, border: `1px solid ${t.recapBorder}`, borderRadius: 8, padding: "9px 14px", transition: "background 0.2s" }}>
              <span style={{ fontSize: 13, color: a.isCorrect ? "#6ee7b7" : "#fca5a5" }}>{a.isCorrect ? "✓" : "✗"}</span>
              <span style={{ fontSize: 13, color: t.textSub, transition: "color 0.2s" }}>{puzzle.questions[i].answers[a.correct]}</span>
            </div>
          ))}
        </div>
      </div>

      <Card t={t}>
        <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase", transition: "color 0.2s" }}>
          Type the link word:
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input ref={inputRef} value={connInput}
            onChange={e => setConnInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConnectorSubmit()}
            placeholder="e.g. GOLD" disabled={!!connResult}
            style={{
              flex: 1, padding: "12px 14px",
              background: t.inputBg,
              border: `1.5px solid ${connResult === "correct" ? "#10b981" : connResult === "wrong" ? "#ef4444" : t.cardBorder}`,
              borderRadius: 8, color: t.inputColor,
              fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase",
              animation: shake ? "shake 0.4s ease" : "none",
              transition: "border-color 0.2s, background 0.2s, color 0.2s",
            }}
          />
          <button onClick={handleConnectorSubmit} disabled={!connInput.trim() || !!connResult} style={{
            padding: "12px 18px", background: "#f59e0b", border: "none",
            borderRadius: 8, color: "#07070d", fontSize: 14, fontWeight: 700,
            cursor: connInput.trim() && !connResult ? "pointer" : "not-allowed",
            opacity: connInput.trim() && !connResult ? 1 : 0.4,
            transition: "opacity 0.15s",
          }}>Go</button>
        </div>
        {!connResult && puzzle.connector.hint && (
          hintRevealed
            ? <p style={{ fontSize: 13, color: "rgba(245,158,11,0.8)", lineHeight: 1.5 }}>💡 {puzzle.connector.hint}</p>
            : <button onClick={() => setHintRevealed(true)} style={{ fontSize: 12, color: t.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", transition: "color 0.2s" }}>
                Show Hint
              </button>
        )}
      </Card>
    </div>
  );

  // ── Done ─────────────────────────────────────────────────────────────────────
  const emoji     = correctCount === 4 && connResult === "correct" ? "🎯"
                  : correctCount >= 3  && connResult === "correct" ? "🔥"
                  : connResult === "correct"                        ? "👀"
                  : "💀";
  const streakMsg = streak > 1 ? `🔥 ${streak} day streak` : streak === 1 ? "🔥 Streak started!" : "";

  return (
    <div className="fade-up">
      {progressBar}

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>{emoji}</div>
        <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 4, transition: "color 0.2s" }}>
          {correctCount}/{totalQ} + {connResult === "correct" ? "link ✓" : "link ✗"}
        </div>
        {streakMsg && <div style={{ fontSize: 13, color: t.textMuted, transition: "color 0.2s" }}>{streakMsg}</div>}
      </div>

      <div style={{ background: t.recapBg, border: `1px solid ${t.recapBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 12, textAlign: "center", transition: "background 0.2s" }}>
        <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.2s" }}>The link word was</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.12em" }}>
          {puzzle.connector.answer}
        </p>
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
                  {displayAnswer
                    ? renderHighlighted(displayAnswer, t.text, "#f59e0b")
                    : <span style={{ color: t.text }}>{q.answers[q.correct]}</span>
                  }
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
            <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6, transition: "color 0.2s" }}>
              {connResult === "correct" ? "🔗✅" : "🔗❌"} {puzzle.connector.reveal}
            </p>
          </div>
        )}
      </Card>

      {sharePreview && (
        <div className="pop" style={{ background: t.sharePreviewBg, border: `1px solid ${t.sharePreviewBorder}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10, transition: "background 0.2s" }}>
          <pre style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: t.sharePreviewColor, whiteSpace: "pre-wrap", lineHeight: 1.8, transition: "color 0.2s" }}>
            {buildShareText()}
          </pre>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setSharePreview(p => !p)} style={{
          flex: 0, padding: "13px 16px",
          background: t.sharePreviewBg, border: `1px solid ${t.sharePreviewBorder}`,
          borderRadius: 10, color: t.textMuted, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
        }}>{sharePreview ? "▲" : "👁"}</button>
        <button onClick={handleShare} style={{
          flex: 1, padding: "13px",
          background: copied ? "rgba(16,185,129,0.15)" : t.sharePreviewBg,
          border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : t.sharePreviewBorder}`,
          borderRadius: 10, color: copied ? "#6ee7b7" : t.text,
          fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
        }}>{copied ? "✓ Copied!" : "📋 Copy Results"}</button>
      </div>

      <p style={{ fontSize: 12, color: t.textFaint, textAlign: "center", marginTop: 18, lineHeight: 1.6, transition: "color 0.2s" }}>
        Come back tomorrow for a new puzzle.
      </p>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Card({ children, t }) {
  return (
    <div style={{
      background: t.cardBg, border: `1px solid ${t.cardBorder}`,
      borderRadius: 12, padding: "18px 16px", marginBottom: 12, transition: "background 0.2s",
    }}>
      {children}
    </div>
  );
}

function Tag({ children, accent, t }) {
  return (
    <div style={{
      display: "inline-block", marginBottom: 14,
      background: accent ? "rgba(245,158,11,0.1)" : t.tagBg,
      border: `1px solid ${accent ? "rgba(245,158,11,0.3)" : t.tagBorder}`,
      borderRadius: 5, padding: "3px 9px",
      fontSize: 10, fontWeight: 600, color: accent ? "#f59e0b" : t.tagColor,
      letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.2s",
    }}>{children}</div>
  );
}

function GoldBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "13px", background: "#f59e0b",
      border: "none", borderRadius: 10, color: "#07070d",
      fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em",
    }}>{children}</button>
  );
}

// ─── How To Play modal ────────────────────────────────────────────────────────

function HowToPlay({ onClose, t }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: t.overlay,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      animation: "fadeIn 0.2s ease forwards",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 420,
        background: t.modalBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        transition: "background 0.2s",
      }}>
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 16px",
          borderBottom: `1px solid ${t.divider}`,
        }}>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, fontWeight: 700, color: t.text, transition: "color 0.2s" }}>
            How to Play
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: "50%",
            background: t.btnBg, border: "none", color: t.btnColor,
            fontSize: 16, cursor: "pointer", lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>✕</button>
        </div>

        {/* Modal body */}
        <div style={{ padding: "20px 20px 24px" }}>
          {[
            { num: "1", title: "Answer 4 trivia questions", desc: "Each correct answer is a clue. A fun fact reveals after every answer — right or wrong." },
            { num: "2", title: "Find the link", desc: "After all 4 questions, type the single word that secretly links all four answers together — that's the link word.", note: 'Stuck? Hit "Show Hint" for a nudge.' },
            { num: "3", title: "Share your result", desc: "See how you scored and share a spoiler-free emoji grid with friends." },
          ].map(({ num, title, desc, note }) => (
            <div key={num} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "rgba(245,158,11,0.15)",
                border: "1.5px solid rgba(245,158,11,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: "#f59e0b",
              }}>{num}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4, transition: "color 0.2s" }}>{title}</div>
                <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.55, transition: "color 0.2s" }}>{desc}</div>
                {note && <div style={{ fontSize: 12, color: "rgba(245,158,11,0.7)", marginTop: 5, lineHeight: 1.5 }}>💡 {note}</div>}
              </div>
            </div>
          ))}

          {/* Example */}
          <div style={{ background: t.exampleBg, border: `1px solid ${t.exampleBorder}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, transition: "background 0.2s" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textFaint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, transition: "color 0.2s" }}>
              Example
            </div>
            {[
              { answer: "Lining",  note: "→ the bright side of a bad situation" },
              { answer: "Screen",  note: "→ where a film is projected in a theater" },
              { answer: "Bullet",  note: "→ the only thing that kills a werewolf" },
              { answer: "Tongue",  note: "→ how a snake senses its environment" },
            ].map(({ answer, note }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 3 ? 6 : 0 }}>
                <span style={{ fontSize: 13, color: "#6ee7b7" }}>✓</span>
                <span style={{ fontSize: 13, color: t.text, fontWeight: 500, transition: "color 0.2s" }}>{answer}</span>
                <span style={{ fontSize: 12, color: t.textMuted, transition: "color 0.2s" }}>{note}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${t.divider}`, fontSize: 13, color: t.textSub, transition: "color 0.2s" }}>
              The link word: <strong style={{ color: "#f59e0b", letterSpacing: "0.06em" }}>SILVER</strong>
            </div>
          </div>

          <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6, textAlign: "center", transition: "color 0.2s" }}>
            A new puzzle drops every day at midnight. 🔥 Build your streak by playing daily.
          </div>

          <button onClick={onClose} style={{
            width: "100%", marginTop: 18, padding: "13px",
            background: "#f59e0b", border: "none", borderRadius: 10,
            color: "#07070d", fontSize: 14, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.03em",
          }}>Let's Play →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Utility screens ──────────────────────────────────────────────────────────

function LoadingScreen({ t }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ fontSize: 13, color: t.textFaint, letterSpacing: "0.08em", transition: "color 0.2s" }}>
        Loading today's puzzle...
      </div>
    </div>
  );
}

function MessageScreen({ emoji, title, sub, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, textAlign: "center" }}>
      <div style={{ fontSize: 40 }}>{emoji}</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: t.textSub, transition: "color 0.2s" }}>{title}</p>
      <p style={{ fontSize: 13, color: t.textMuted, transition: "color 0.2s" }}>{sub}</p>
    </div>
  );
}
