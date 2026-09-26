"use client";

import { useEffect, useState, useRef } from "react";

const POLL_MS = 5_000;
const COUNTDOWN_S = 10;

function elapsed(startedAt, finishedAt, now, gameEndAt) {
  if (!startedAt) return null;
  const gameEndMs = gameEndAt ? new Date(gameEndAt).getTime() : Infinity;
  const endMs = finishedAt
    ? Math.min(new Date(finishedAt).getTime(), gameEndMs)
    : Math.min(now, gameEndMs);
  return endMs - new Date(startedAt).getTime();
}

function fmt(ms) {
  if (ms == null || ms < 0) return "—";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`;
}

export default function LiveLeaderboard() {
  const [rows, setRows] = useState([]);
  const [countdownAt, setCountdownAt] = useState(null);
  const [gameEndAt, setGameEndAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/public/leaderboard", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setRows(data.rows);
        setCountdownAt(data.countdownAt ?? null);
        setGameEndAt(data.gameEndAt ?? null);
      }
    } catch { /* offline */ }
  }

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, POLL_MS);
    // Tick every second for live clocks
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(timerRef.current); };
  }, []);

  const countdownSec = countdownAt
    ? Math.max(0, COUNTDOWN_S - Math.floor((now - new Date(countdownAt).getTime()) / 1000))
    : null;
  const showCountdown = countdownSec !== null && countdownSec > 0;
  const gameStarted = countdownAt && (now - new Date(countdownAt).getTime()) >= COUNTDOWN_S * 1000;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 40%, #1A2560 0%, #0A0F2E 100%)",
        color: "#F4EFE1",
        fontFamily: "Georgia, serif",
        padding: "48px 40px 40px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <p style={{ fontSize: 18, letterSpacing: 6, color: "#D4AF37", textTransform: "uppercase", marginBottom: 8 }}>
          Uni Games 2026
        </p>
        <h1 style={{ fontSize: 52, fontWeight: "bold", color: "#D4AF37", letterSpacing: 4, margin: 0 }}>
          Constructor Quest
        </h1>
        <div style={{ height: 2, background: "#D4AF37", opacity: 0.4, margin: "20px auto", width: 400 }} />
        <p style={{ fontSize: 22, color: "#C3C9DB", letterSpacing: 2, margin: 0 }}>
          Live Leaderboard
        </p>
      </div>

      {/* Countdown overlay */}
      {showCountdown && (
        <div style={{
          textAlign: "center",
          padding: "60px 0",
        }}>
          <p style={{ fontSize: 28, color: "#C3C9DB", letterSpacing: 3, marginBottom: 16 }}>
            GAME STARTS IN
          </p>
          <p style={{
            fontSize: 140,
            fontWeight: "bold",
            color: "#D4AF37",
            lineHeight: 1,
            textShadow: "0 0 60px rgba(212,175,55,0.5)",
          }}>
            {countdownSec}
          </p>
        </div>
      )}

      {/* Waiting state */}
      {!showCountdown && !gameStarted && rows.every(r => !r.startedAt) && (
        <p style={{ textAlign: "center", color: "#7A8FC4", fontSize: 22, marginTop: 60 }}>
          Waiting for the event to begin…
        </p>
      )}

      {/* Leaderboard table */}
      {(!showCountdown) && (
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr 140px 160px 180px",
            gap: "0 24px",
            padding: "0 24px 12px",
            borderBottom: "1px solid rgba(212,175,55,0.3)",
            marginBottom: 12,
          }}>
            {["#", "College", "Score", "Riddle", "Time"].map((h) => (
              <span key={h} style={{ fontSize: 14, letterSpacing: 3, color: "#7A8FC4", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
                {h}
              </span>
            ))}
          </div>

          {rows.map((row) => {
            const ms = elapsed(row.startedAt, row.finishedAt, now, gameEndAt);
            const isFinished = row.finished;
            return (
              <div
                key={row.id ?? row.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 140px 160px 180px",
                  gap: "0 24px",
                  alignItems: "center",
                  padding: "20px 24px",
                  marginBottom: 8,
                  borderRadius: 12,
                  background: row.rank === 1
                    ? "rgba(212,175,55,0.12)"
                    : "rgba(255,255,255,0.04)",
                  border: row.rank === 1
                    ? "1px solid rgba(212,175,55,0.4)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Rank */}
                <span style={{
                  fontSize: 28,
                  fontWeight: "bold",
                  color: row.rank === 1 ? "#D4AF37" : row.rank === 2 ? "#C0C0C0" : row.rank === 3 ? "#CD7F32" : "#4A5580",
                }}>
                  {row.rank}
                </span>

                {/* Name */}
                <span style={{ fontSize: 28, fontWeight: "bold", color: "#F4EFE1" }}>
                  {row.name}
                </span>

                {/* Score */}
                <span style={{ fontSize: 32, fontWeight: "bold", color: "#D4AF37" }}>
                  {row.score}
                  <span style={{ fontSize: 14, color: "#7A8FC4", marginLeft: 4 }}>pts</span>
                </span>

                {/* Riddle # */}
                <span style={{ fontSize: 22, color: isFinished ? "#4CAF50" : "#C3C9DB", fontFamily: "Arial, sans-serif" }}>
                  {isFinished
                    ? "✓ Finished"
                    : row.riddleNum
                    ? `Riddle ${row.riddleNum} / 7`
                    : "—"}
                </span>

                {/* Elapsed time */}
                <span style={{ fontSize: 22, color: "#7A8FC4", fontFamily: "monospace" }}>
                  {ms != null ? fmt(ms) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <p style={{
        textAlign: "center",
        fontSize: 13,
        color: "#2A3060",
        position: "fixed",
        bottom: 16,
        left: 0,
        right: 0,
        letterSpacing: 2,
      }}>
        constructorquest.netlify.app · LIVE
      </p>
    </main>
  );
}
