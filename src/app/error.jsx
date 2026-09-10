"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Last line of defence on event day: if the database blinks, a team gets a
 * retry button rather than a stack trace.
 */
export default function Error({ error, reset }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink p-6">
      <div className="w-full max-w-sm text-center">
        <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-gold" />
        <h1 className="mb-2 font-serif text-2xl text-parchment">Something went wrong</h1>
        <p className="mb-5 text-sm text-muted">
          Your progress is saved on the server — nothing is lost. Try again, and if it keeps
          happening, find HQ.
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink"
        >
          Try again
        </button>
        {error?.digest && (
          <p className="mt-4 font-mono text-[11px] text-muted">ref {error.digest}</p>
        )}
      </div>
    </main>
  );
}
