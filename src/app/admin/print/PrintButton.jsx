"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

export default function PrintButton() {
  const [loading, setLoading] = useState(false);

  async function handlePrint() {
    setLoading(true);
    // Wait for every poster image to finish loading before opening print dialog
    const imgs = Array.from(document.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => { img.onload = res; img.onerror = res; })
      )
    );
    setLoading(false);
    window.print();
  }

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      <Printer className="h-4 w-4" />
      {loading ? "Loading images…" : "Print / Save as PDF"}
    </button>
  );
}
