"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowLeft } from "lucide-react";
import { GoldButton, GhostButton } from "@/components/ui";

export default function LoginScreen({ teams, configError }) {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null | 'team' | 'admin'
  const [teamId, setTeamId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(role) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, teamId, pin }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      router.replace(data.redirect);
      router.refresh();
    } catch {
      setError("No connection. Check the phone's wifi and try again.");
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setMode(null);
    setPin("");
    setError("");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink p-6">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold">
            <MapPin className="h-6 w-6 text-gold" />
          </div>
          <h1 className="font-serif text-3xl text-parchment">Constructor Quest</h1>
          <p className="mt-1 text-sm text-muted">Constructor University · Uni Games 2026</p>
        </header>

        {configError && (
          <div className="mb-5 rounded-lg border border-rust/50 bg-rust/10 p-4 text-xs text-[#e6a494]">
            <p className="mb-1 font-semibold text-[#f0b5a5]">The database isn&apos;t reachable.</p>
            <p className="mb-2 font-mono text-[11px] leading-relaxed">{configError}</p>
            <p>
              Copy <span className="font-mono">.env.example</span> to{" "}
              <span className="font-mono">.env.local</span>, fill in the Supabase values, run{" "}
              <span className="font-mono">supabase/schema.sql</span>, then restart the server.
            </p>
          </div>
        )}

        {!mode && (
          <div className="flex flex-col gap-3">
            <GoldButton className="py-3 text-base" onClick={() => setMode("team")}>
              Enter as a team
            </GoldButton>
            <GhostButton className="py-3 text-base" onClick={() => setMode("admin")}>
              Enter as HQ
            </GhostButton>
          </div>
        )}

        {mode === "team" && (
          <div className="rounded-lg bg-parchment p-5">
            <BackLink onClick={back} />
            <fieldset>
              <legend className="mb-2 text-xs uppercase tracking-wider text-ink-soft">
                Your college
              </legend>
              <div className="mb-4 flex flex-col gap-2">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTeamId(t.id)}
                    aria-pressed={teamId === t.id}
                    className={
                      "rounded-md border px-3 py-2.5 text-left text-sm text-[#14181f] transition " +
                      (teamId === t.id
                        ? "border-gold bg-gold/15 font-medium"
                        : "border-[#d8cfb2] hover:border-gold/60")
                    }
                  >
                    {t.name}
                  </button>
                ))}
                {teams.length === 0 && (
                  <p className="text-sm text-[#8b8266]">
                    No teams found — has the schema been run yet?
                  </p>
                )}
              </div>
            </fieldset>

            <label
              htmlFor="team-pin"
              className="mb-1 block text-xs uppercase tracking-wider text-ink-soft"
            >
              Passport code
            </label>
            <input
              id="team-pin"
              className="field mb-3"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit("team")}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="4-digit code"
            />
            {error && <p className="mb-3 text-xs text-rust">{error}</p>}
            <GoldButton className="w-full py-2.5" disabled={busy} onClick={() => submit("team")}>
              {busy ? "Checking…" : "Begin the quest"}
            </GoldButton>
          </div>
        )}

        {mode === "admin" && (
          <div className="rounded-lg bg-parchment p-5">
            <BackLink onClick={back} />
            <label
              htmlFor="admin-pin"
              className="mb-1 block text-xs uppercase tracking-wider text-ink-soft"
            >
              HQ code
            </label>
            <input
              id="admin-pin"
              className="field mb-3"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit("admin")}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Admin code"
            />
            {error && <p className="mb-3 text-xs text-rust">{error}</p>}
            <GoldButton className="w-full py-2.5" disabled={busy} onClick={() => submit("admin")}>
              {busy ? "Checking…" : "Open HQ dashboard"}
            </GoldButton>
          </div>
        )}
      </div>
    </main>
  );
}

function BackLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex items-center gap-1 text-xs text-ink-soft hover:underline"
    >
      <ArrowLeft className="h-3 w-3" /> back
    </button>
  );
}
