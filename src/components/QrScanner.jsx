"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanLine, Check, X, Keyboard } from "lucide-react";
import { GoldButton } from "@/components/ui";

const READER_ID = "qr-reader";

/**
 * Camera QR scanner with a deliberate scan → confirm → submit flow.
 *
 * The scan never submits on its own. A team that walks up to the wrong
 * checkpoint and scans its code sees the decoded value first and can back out,
 * instead of burning a wrong attempt and getting a confusing rejection.
 *
 * @param {(code: string) => Promise<{ok: boolean, error?: string}>} onSubmit
 */
export default function QrScanner({ onSubmit, disabled }) {
  const [phase, setPhase] = useState("idle"); // idle | starting | scanning | confirm | sending
  const [decoded, setDecoded] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");

  const scannerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      // isScanning is html5-qrcode's own flag; stop() throws if it isn't running.
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      /* the camera was already released */
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setCameraError("");
    setPhase("starting");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!mountedRef.current) return;

      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1,
        },
        async (text) => {
          // Freeze on the first read: release the camera, hold the value, and
          // wait for the team to confirm. Stopping before the state change
          // matters — the confirm view unmounts the video element.
          if (!mountedRef.current) return;
          const value = String(text).trim();
          await stopCamera();
          if (!mountedRef.current) return;
          setDecoded(value);
          setPhase("confirm");
        },
        () => {
          /* per-frame "no QR in view" — normal, ignore */
        }
      );

      if (mountedRef.current) setPhase("scanning");
    } catch (e) {
      if (!mountedRef.current) return;
      setPhase("idle");
      setCameraError(describeCameraError(e));
    }
  }, [stopCamera]);

  async function confirmSubmit(code) {
    const value = String(code || "").trim();
    if (!value) return;

    setPhase("sending");
    setError("");
    const result = await onSubmit(value);

    if (!mountedRef.current) return;
    if (result?.ok) {
      setDecoded("");
      setManualCode("");
      setManual(false);
      setPhase("idle");
    } else {
      setError(result?.error || "That didn't work. Try again.");
      setPhase("confirm");
    }
  }

  function cancel() {
    setDecoded("");
    setError("");
    setPhase("idle");
  }

  /* ---------------- confirm step ---------------- */

  if (phase === "confirm" || phase === "sending") {
    return (
      <div className="rounded-md border border-[#d8cfb2] bg-parchment-dim p-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-ink-soft">Scanned code</p>
        <p className="mb-1 break-all font-mono text-lg font-semibold text-[#14181f]">{decoded}</p>
        <p className="mb-4 text-xs text-[#8b8266]">
          Check this is the checkpoint you&apos;re standing at. Nothing is recorded until you
          confirm.
        </p>

        {error && (
          <p className="mb-3 rounded bg-rust/10 px-3 py-2 text-xs text-rust" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <GoldButton
            className="flex-1"
            disabled={phase === "sending"}
            onClick={() => confirmSubmit(decoded)}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Check className="h-4 w-4" />
              {phase === "sending" ? "Recording…" : "Confirm & submit"}
            </span>
          </GoldButton>
          <button
            onClick={cancel}
            disabled={phase === "sending"}
            className="flex items-center gap-1 rounded-md border border-[#c3b894] px-3 py-2 text-sm text-ink-soft disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- camera / idle ---------------- */

  return (
    <div>
      {/* html5-qrcode mounts the video into this node, so it must stay in the
          tree — and visible — from the moment the camera starts, since the
          library measures the element to size the video stream. */}
      <div
        id={READER_ID}
        className={phase === "starting" || phase === "scanning" ? "mb-3" : "hidden"}
      />

      {phase === "scanning" ? (
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs text-ink-soft">
            <ScanLine className="h-3.5 w-3.5 animate-pulse" /> Point at the volunteer&apos;s QR
          </p>
          <button
            onClick={() => {
              stopCamera();
              setPhase("idle");
            }}
            className="text-xs text-ink-soft underline"
          >
            Stop camera
          </button>
        </div>
      ) : (
        <>
          <GoldButton className="w-full py-3" disabled={disabled || phase === "starting"} onClick={startCamera}>
            <span className="flex items-center justify-center gap-2">
              <Camera className="h-4 w-4" />
              {phase === "starting" ? "Opening camera…" : "Scan checkpoint QR"}
            </span>
          </GoldButton>

          {cameraError && (
            <div className="mt-3 rounded-md bg-rust/10 p-3 text-xs text-rust">
              <p className="mb-1 flex items-center gap-1.5 font-semibold">
                <CameraOff className="h-3.5 w-3.5" /> Camera unavailable
              </p>
              <p>{cameraError}</p>
            </div>
          )}

          <button
            onClick={() => setManual((m) => !m)}
            className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft underline"
          >
            <Keyboard className="h-3.5 w-3.5" />
            {manual ? "Hide manual entry" : "Camera not working? Type the code instead"}
          </button>

          {manual && (
            <div className="mt-2">
              <div className="flex gap-2">
                <input
                  className="field flex-1"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setDecodedFromManual()}
                  placeholder="Code printed under the QR"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {/* A solid dark button, not a GhostButton: this sits on the
                    parchment panel, where GhostButton's pale text disappears. */}
                <button
                  type="button"
                  onClick={setDecodedFromManual}
                  className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-parchment transition hover:bg-ink-soft"
                >
                  Check
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-[#8b8266]">
                Typing it still goes through the same check — it only skips the camera, not the
                verification.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );

  function setDecodedFromManual() {
    const value = manualCode.trim();
    if (!value) return;
    setDecoded(value.toUpperCase());
    setPhase("confirm");
  }
}

function describeCameraError(e) {
  const name = e?.name || "";
  const message = String(e?.message || e || "");

  if (name === "NotAllowedError" || /permission|denied/i.test(message)) {
    return "Camera permission was blocked. Allow it in the browser's site settings (on iOS: aA → Website Settings → Camera), then tap scan again.";
  }
  if (name === "NotFoundError" || /no camera|not found/i.test(message)) {
    return "No camera was found on this device. Use manual entry below.";
  }
  if (/secure|https/i.test(message)) {
    return "Browsers only allow camera access over HTTPS. Open the deployed https:// address rather than a plain http:// one.";
  }
  return message || "The camera could not be started. Use manual entry below.";
}
