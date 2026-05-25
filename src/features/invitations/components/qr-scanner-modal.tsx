"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { checkinQrInvite } from "../services/invitation.service";
import type { CheckinResult } from "../types/invitation.types";

interface QrScannerModalProps {
  onClose: () => void;
}

export function QrScannerModal({ onClose }: QrScannerModalProps) {
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const containerId = "qr-scanner-container";
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let started = false;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (processing) return;
            setProcessing(true);
            setScanning(false);
            try {
              await scanner.stop();
              const checkin = await checkinQrInvite(decodedText);
              setResult(checkin);
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Error";
              if (msg.includes("invalid_qr_token")) {
                setError("QR inválido o no pertenece a este evento.");
              } else if (msg.includes("not_authorized")) {
                setError("No tenés permiso para hacer check-in en este evento.");
              } else {
                setError("No se pudo procesar el QR. Intentá de nuevo.");
              }
              setProcessing(false);
              setScanning(true);
              // Restart scanner on error
              try { await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, async () => {}, () => {}); } catch { /* ignore */ }
            }
          },
          () => { /* ignore decode errors */ }
        );
        started = true;
      } catch {
        setError("No se pudo acceder a la cámara. Verificá los permisos.");
        setScanning(false);
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current && started) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  function handleScanAgain() {
    setResult(null);
    setError(null);
    setScanning(true);
    setProcessing(false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col bg-cave-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 border-b border-cave-ash/40">
        <h2 className="text-sm font-bold text-cave-white uppercase tracking-widest font-[family-name:var(--font-space-mono)]">
          Escanear QR
        </h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-cave-rock text-cave-fog hover:text-cave-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="relative w-full max-w-[320px]">
          {/* Camera feed */}
          <div
            id={containerId}
            className="w-full rounded-2xl overflow-hidden bg-cave-rock"
            style={{ aspectRatio: "1" }}
          />
          {/* Scan frame overlay */}
          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[200px] h-[200px] border-2 border-neon-green rounded-xl" />
            </div>
          )}
        </div>

        {scanning && !error && (
          <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)] text-center">
            Apuntá la cámara al QR del asistente
          </p>
        )}

        {/* Error state */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="w-full max-w-[320px] p-4 rounded-2xl bg-[#FF2D7B]/10 border border-[#FF2D7B]/30"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <p className="text-sm text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-center">
                {error}
              </p>
              <button
                onClick={handleScanAgain}
                className="mt-3 w-full h-10 rounded-full border border-[#FF2D7B]/40 text-[#FF2D7B] text-xs uppercase tracking-widest font-[family-name:var(--font-space-mono)]"
              >
                Intentar de nuevo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success result */}
        <AnimatePresence>
          {result && (
            <motion.div
              className="w-full max-w-[320px] p-5 rounded-2xl bg-cave-stone border border-neon-green/30"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            >
              {/* Status badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 font-[family-name:var(--font-space-mono)] ${
                result.already_checked_in
                  ? "bg-cave-ash text-cave-fog"
                  : "bg-neon-green/15 text-neon-green border border-neon-green/30"
              }`}>
                {result.already_checked_in ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-cave-fog" /> Ya ingresó</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" /> Check-in exitoso</>
                )}
              </div>

              <p className="text-lg font-bold text-cave-white font-[family-name:var(--font-space-mono)]">
                {result.display_name}
              </p>
              {result.phone && (
                <p className="text-xs text-cave-fog mt-1">{result.phone}</p>
              )}
              <p className="text-[10px] text-cave-smoke mt-2 font-[family-name:var(--font-space-mono)]">
                {result.flyer_title}
              </p>

              <button
                onClick={handleScanAgain}
                className="mt-4 w-full h-[44px] rounded-full bg-neon-green text-cave-black font-bold uppercase tracking-widest text-xs font-[family-name:var(--font-space-mono)]"
              >
                Escanear otro
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
