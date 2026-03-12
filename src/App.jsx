import { useState, useEffect, useRef } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Renders *asterisk-wrapped* words in gold, everything else in baseColor
function renderHighlighted(text, baseColor = "#f0efe8", highlightColor = "#f59e0b") {
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | no-puzzle | error
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local timezone
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

    // Show instructions on first ever visit; remember they've seen it
    const seen = localStorage.getItem("linqed_seen_instructions");
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem("linqed_seen_instructions", "1");
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#07070d",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070d; }
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
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 24px 0", position: "relative",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: 28, fontWeight: 700, color: "#f5f0e8", letterSpacing: "-0.03em",
          }}>
            lin<span style={{ color: "#f59e0b" }}>q</span>ed
          </div>
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em", marginTop: 2,
          }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
          </div>
        </div>

        {/* ? button — top right */}
        <button
          onClick={() => setShowHelp(true)}
          title="How to play"
          style={{
            position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)",
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
        >?</button>
      </div>

      {/* Body */}
      <div style={{
        display: "flex", justifyContent: "center",
        padding: "28px 16px 60px",
      }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          {status === "loading" && <LoadingScreen />}
          {status === "error"   && <MessageScreen emoji="⚠️" title="Couldn't load today's puzzle" sub="Try refreshing the page." />}
          {status === "no-puzzle" && <MessageScreen emoji="📭" title="No puzzle today" sub="Check back tomorrow!" />}
          {status === "ready" && puzzle && <Game puzzle={puzzle} />}
        </div>
      </div>

      {/* How to play modal */}
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}

// ─── Game ─────────────────────────────────────────────────────────────────────

function Game({ puzzle }) {
  const today = getTodayKey();
  const storageKey = `linqed_played_${today}`;
  const streakKey  = "linqed_streak";

  const [step, setStep]               = useState(STEPS.TRIVIA);
  const [qIndex, setQIndex]           = useState(0);
  const [answers, setAnswers]         = useState([]);
  const [connInput, setConnInput]     = useState("");
  const [connResult, setConnResult]   = useState(null);
  const [shake, setShake]             = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [sharePreview, setSharePreview] = useState(false);
  const [streak, setStreak]           = useState(0);
  const inputRef = useRef(null);

  // Restore completed game from localStorage
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

  const q          = puzzle.questions[qIndex];
  const totalQ     = puzzle.questions.length;
  const answered   = answers[qIndex];
  const correctCount = answers.filter(a => a.isCorrect).length;
  const allCorrect   = correctCount === totalQ && connResult === "correct";

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

    // Streak logic
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yk = yesterday.toISOString().slice(0, 10);
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
    const score = `${correctCount}/4 + ${connResult === "correct" ? "connection ✓" : "connection ✗"}`;
    // TODO: replace with your real URL once deployed
    return `🧩 linqed — ${today}\n\n${dots} ${conn}\n${score}\n\nplaylinqed.com`;
  }

  function handleShare() {
    navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Progress bar ────────────────────────────────────────────────────────────
  const progressBar = (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {puzzle.questions.map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2, transition: "background 0.3s",
          background: step !== STEPS.TRIVIA || i < qIndex ? "#f59e0b"
            : i === qIndex ? "rgba(245,158,11,0.35)"
            : "rgba(255,255,255,0.08)",
        }} />
      ))}
      <div style={{
        flex: 0.3, height: 3, borderRadius: 2, transition: "background 0.3s",
        background: step === STEPS.CONNECTOR ? "rgba(245,158,11,0.35)"
          : step === STEPS.DONE ? (connResult === "correct" ? "#10b981" : "#ef4444")
          : "rgba(255,255,255,0.08)",
      }} />
    </div>
  );

  // ── Trivia ──────────────────────────────────────────────────────────────────
  if (step === STEPS.TRIVIA) return (
    <div className="fade-up" key={qIndex}>
      {progressBar}

      <Tag>Question {qIndex + 1} of {totalQ}</Tag>

      <Card>
        <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(16px,3.5vw,20px)", fontWeight: 700, color: "#f0efe8", margin: "0 0 20px", lineHeight: 1.45 }}>
          {q.question}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.answers.map((ans, idx) => {
            let bg = "rgba(255,255,255,0.04)", border = "rgba(255,255,255,0.1)", color = "#e8e8e4", opacity = 1;
            if (answered) {
              if (idx === q.correct) { bg = "rgba(16,185,129,0.15)"; border = "#10b981"; color = "#6ee7b7"; }
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
                <span style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
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
            background: answered.isCorrect ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${answered.isCorrect ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
            borderRadius: 10, padding: "14px 16px", marginBottom: 10,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{answered.isCorrect ? "🎯" : "💡"}</span>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{q.fact}</p>
          </div>
          <GoldBtn onClick={handleNext}>
            {qIndex + 1 < totalQ ? "Next Question →" : "Find the Connection →"}
          </GoldBtn>
        </div>
      )}

      {!answered && (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 14, letterSpacing: "0.03em" }}>
          After 4 answers, guess the connecting word.
        </p>
      )}
    </div>
  );

  // ── Connector ───────────────────────────────────────────────────────────────
  if (step === STEPS.CONNECTOR) return (
    <div className="fade-up">
      {progressBar}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Tag accent>Final Round</Tag>
        <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 700, color: "#f0efe8", lineHeight: 1.3, marginBottom: 8 }}>
          What's the<br /><span style={{ color: "#f59e0b" }}>connection?</span>
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 320, margin: "0 auto 20px" }}>
          {puzzle.connector.prompt || "What single word secretly connects all four answers?"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {answers.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "9px 14px" }}>
              <span style={{ fontSize: 13, color: a.isCorrect ? "#6ee7b7" : "#fca5a5" }}>{a.isCorrect ? "✓" : "✗"}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{puzzle.questions[i].answers[a.correct]}</span>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Type the connecting word:
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input ref={inputRef} value={connInput}
            onChange={e => setConnInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConnectorSubmit()}
            placeholder="e.g. GOLD" disabled={!!connResult}
            style={{
              flex: 1, padding: "12px 14px",
              background: "rgba(255,255,255,0.05)",
              border: `1.5px solid ${connResult === "correct" ? "#10b981" : connResult === "wrong" ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 8, color: "#f0efe8",
              fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase",
              animation: shake ? "shake 0.4s ease" : "none",
              transition: "border-color 0.2s",
            }}
          />
          <button onClick={handleConnectorSubmit} disabled={!connInput.trim() || !!connResult} style={{
            background: connInput.trim() && !connResult ? "#f59e0b" : "rgba(255,255,255,0.08)",
            border: "none", borderRadius: 8, padding: "12px 18px",
            color: connInput.trim() && !connResult ? "#07070d" : "rgba(255,255,255,0.3)",
            fontSize: 18, fontWeight: 700,
            cursor: connInput.trim() && !connResult ? "pointer" : "default",
            transition: "all 0.15s",
          }}>→</button>
        </div>

        {!connResult && !hintRevealed && (
          <button onClick={() => setHintRevealed(true)} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, padding: "7px 14px",
            color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer",
          }}>💡 Show Hint</button>
        )}
        {hintRevealed && !connResult && (
          <div className="pop" style={{ marginTop: 10, padding: "10px 13px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 7 }}>
            <p style={{ fontSize: 13, color: "rgba(245,158,11,0.8)", lineHeight: 1.5 }}>💡 {puzzle.connector.hint}</p>
          </div>
        )}
        {connResult === "wrong" && (
          <div className="pop" style={{ marginTop: 10, padding: "10px 13px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7 }}>
            <p style={{ fontSize: 13, color: "#fca5a5" }}>Not quite — heading to results...</p>
          </div>
        )}
      </Card>
    </div>
  );

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === STEPS.DONE) return (
    <div className="fade-up">
      {progressBar}

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>
          {allCorrect ? "🎯" : correctCount >= 3 && connResult === "correct" ? "🔥" : correctCount >= 3 ? "👀" : "💀"}
        </div>
        <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 700, color: "#f0efe8", marginBottom: 6 }}>
          {allCorrect ? "Perfect game!" : connResult === "correct" ? "Got the connection!" : `${correctCount} of 4 — close!`}
        </h2>
        {streak > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "4px 12px" }}>
            <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>🔥 {streak} day streak</span>
          </div>
        )}
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 10 }}>
          The connection was <strong style={{ color: "#f59e0b" }}>{puzzle.connector.answer}</strong>
        </p>
      </div>

      <Card style={{ marginBottom: 12 }}>
        {puzzle.questions.map((q, i) => {
          const displayAnswer = (q.displayAnswer || "").trim();
          const note = (q.connectionNote || "").trim();
          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < puzzle.questions.length - 1 ? 14 : 0, alignItems: "flex-start" }}>
              <span style={{ fontSize: 14, marginTop: 2, flexShrink: 0 }}>{answers[i]?.isCorrect ? "🟩" : "🟥"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>
                  {displayAnswer
                    ? renderHighlighted(displayAnswer, "#f0efe8", "#f59e0b")
                    : <span style={{ color: "#f0efe8" }}>{q.answers[q.correct]}</span>
                  }
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                  {note ? renderHighlighted(note, "rgba(255,255,255,0.4)", "#f59e0b") : q.fact}
                </div>
              </div>
            </div>
          );
        })}
        {(puzzle.connector.reveal || "").trim() && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12, marginTop: 14 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
              {connResult === "correct" ? "🔗✅" : "🔗❌"} {puzzle.connector.reveal}
            </p>
          </div>
        )}
      </Card>

      {sharePreview && (
        <div className="pop" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
          <pre style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
            {buildShareText()}
          </pre>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setSharePreview(p => !p)} style={{
          flex: 0, padding: "13px 16px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer",
        }}>{sharePreview ? "▲" : "👁"}</button>
        <button onClick={handleShare} style={{
          flex: 1, padding: "13px",
          background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 10, color: copied ? "#6ee7b7" : "#e8e8e4",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          letterSpacing: "0.05em", textTransform: "uppercase", transition: "all 0.2s",
        }}>{copied ? "✓ Copied!" : "📋 Share Results"}</button>
      </div>

      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 20, letterSpacing: "0.03em" }}>
        Come back tomorrow for a new puzzle.
      </p>
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px", marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

function Tag({ children, accent }) {
  return (
    <div style={{
      display: "inline-block", marginBottom: 14,
      background: accent ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${accent ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: 5, padding: "3px 9px",
      fontSize: 10, fontWeight: 600, color: accent ? "#f59e0b" : "rgba(255,255,255,0.4)",
      letterSpacing: "0.1em", textTransform: "uppercase",
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

function HowToPlay({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        animation: "fadeIn 0.2s ease forwards",
      }}
    >
      {/* Card — stop clicks inside from closing */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420,
          background: "#111118",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, fontWeight: 700, color: "#f0efe8" }}>
            How to Play
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "none", color: "rgba(255,255,255,0.5)",
              fontSize: 16, cursor: "pointer", lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Modal body */}
        <div style={{ padding: "20px 20px 24px" }}>

          {/* Steps */}
          {[
            {
              num: "1",
              title: "Answer 4 trivia questions",
              desc: "Each correct answer is a clue. A fun fact reveals after every answer — right or wrong.",
            },
            {
              num: "2",
              title: "Find the connection",
              desc: "After all 4 questions, type the single word that secretly links all four answers together.",
              note: "Stuck? Hit \"Show Hint\" for a nudge.",
            },
            {
              num: "3",
              title: "Share your result",
              desc: "See how you scored and share a spoiler-free emoji grid with friends.",
            },
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
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f0efe8", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>{desc}</div>
                {note && (
                  <div style={{ fontSize: 12, color: "rgba(245,158,11,0.6)", marginTop: 5, lineHeight: 1.5 }}>
                    💡 {note}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Example row */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "14px 16px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Example
            </div>
            {[
              { answer: "Lining", note: "→ the bright side of a bad situation" },
              { answer: "Screen", note: "→ where a film is projected in a theater" },
              { answer: "Bullet", note: "→ the only thing that kills a werewolf" },
              { answer: "Tongue", note: "→ how a snake senses its environment" },
            ].map(({ answer, note }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 3 ? 6 : 0 }}>
                <span style={{ fontSize: 13, color: "#6ee7b7" }}>✓</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{answer}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{note}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              The connection: <strong style={{ color: "#f59e0b", letterSpacing: "0.06em" }}>SILVER</strong>
            </div>
          </div>

          {/* Streak note */}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, textAlign: "center" }}>
            A new puzzle drops every day at midnight. 🔥 Build your streak by playing daily.
          </div>

          {/* CTA */}
          <button
            onClick={onClose}
            style={{
              width: "100%", marginTop: 18, padding: "13px",
              background: "#f59e0b", border: "none", borderRadius: 10,
              color: "#07070d", fontSize: 14, fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.03em",
            }}
          >
            Let's Play →
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>
        Loading today's puzzle...
      </div>
    </div>
  );
}

function MessageScreen({ emoji, title, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, textAlign: "center" }}>
      <div style={{ fontSize: 40 }}>{emoji}</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{title}</p>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{sub}</p>
    </div>
  );
}
