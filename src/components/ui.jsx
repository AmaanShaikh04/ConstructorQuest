"use client";

import { Stamp as StampIcon } from "lucide-react";

export function GoldButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink transition " +
        "hover:bg-[#d8b23c] disabled:cursor-not-allowed disabled:bg-[#8d8f97] disabled:opacity-60 " +
        className
      }
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "rounded-md border border-parchment-dim px-4 py-2 text-sm font-medium text-parchment " +
        "transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 " +
        className
      }
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = "" }) {
  return <div className={"rounded-lg bg-ink-soft p-4 " + className}>{children}</div>;
}

export function Parchment({ children, className = "" }) {
  return (
    <div className={"rounded-lg bg-parchment p-5 text-[#14181f] " + className}>{children}</div>
  );
}

export function Stamp({ filled, current }) {
  return (
    <div
      className={
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 " +
        (filled
          ? "border-solid border-gold bg-gold/15 stamp-filled"
          : current
            ? "border-dashed border-gold/80 bg-gold/5"
            : "border-dashed border-[#5b678c]")
      }
      aria-hidden="true"
    >
      {filled ? <StampIcon className="h-4 w-4 text-gold" /> : null}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p className="mt-2 rounded-md bg-rust/15 px-3 py-2 text-xs text-[#e08b78]" role="alert">
      {children}
    </p>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map(([id, label, badge]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-current={active === id}
          className={
            "flex items-center gap-1.5 rounded-full border border-gold px-3 py-1.5 text-xs font-medium transition " +
            (active === id ? "bg-gold text-ink" : "text-parchment hover:bg-gold/10")
          }
        >
          {label}
          {badge ? (
            <span
              className={
                "rounded-full px-1.5 text-[10px] font-bold " +
                (active === id ? "bg-ink text-gold" : "bg-gold text-ink")
              }
            >
              {badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
