"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface QrPasscodeModalProps {
  flyerTitle: string | null;
  onVerify: (passcode: string, displayName: string, phone: string | null) => Promise<void>;
  onClose: () => void;
}

export function QrPasscodeModal({ flyerTitle, onVerify, onClose }: QrPasscodeModalProps) {
  const [step, setStep] = useState<"passcode" | "data">("passcode");
  const [passcode, setPasscode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (step === "passcode") {
      if (!passcode.trim()) return;
      setStep("data");
      return;
    }

    if (!displayName.trim()) return;

    setLoading(true);
    try {
      await onVerify(passcode, displayName.trim(), phone.trim() || null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      if (msg.includes("invalid_passcode")) {
        setError("Código incorrecto. Verificá con el organizador.");
        setStep("passcode");
        setPasscode("");
      } else if (msg.includes("event_at_capacity")) {
        setError("El evento está lleno. No hay más lugares disponibles.");
      } else if (msg.includes("not_authenticated")) {
        setError("Necesitás iniciar sesión para generar tu QR.");
      } else {
        setError("Algo salió mal. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />

      <motion.div
        className="relative z-10 w-full max-w-md bg-cave-stone rounded-t-3xl sm:rounded-3xl border border-cave-ash/60 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <p className="text-[10px] text-cave-fog uppercase tracking-[0.2em] font-[family-name:var(--font-space-mono)] mb-1">
            Invitación QR
          </p>
          <h2 className="text-lg font-bold text-cave-white font-[family-name:var(--font-space-mono)] leading-tight">
            {flyerTitle ?? "Evento"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {step === "passcode" ? (
            <>
              <div>
                <label className="block text-[10px] text-cave-fog uppercase tracking-widest mb-2 font-[family-name:var(--font-space-mono)]">
                  Código de acceso
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••"
                  autoFocus
                  className="w-full h-12 px-4 rounded-xl bg-cave-rock border border-cave-ash text-cave-white placeholder:text-cave-smoke focus:outline-none focus:border-neon-green transition-colors font-[family-name:var(--font-space-mono)]"
                />
                <p className="mt-2 text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)]">
                  El organizador del evento te compartió este código.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] text-cave-fog uppercase tracking-widest mb-2 font-[family-name:var(--font-space-mono)]">
                  Tu nombre
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nombre completo"
                  autoFocus
                  className="w-full h-12 px-4 rounded-xl bg-cave-rock border border-cave-ash text-cave-white placeholder:text-cave-smoke focus:outline-none focus:border-neon-green transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-cave-fog uppercase tracking-widest mb-2 font-[family-name:var(--font-space-mono)]">
                  Teléfono <span className="text-cave-smoke normal-case">(opcional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 81 0000 0000"
                  className="w-full h-12 px-4 rounded-xl bg-cave-rock border border-cave-ash text-cave-white placeholder:text-cave-smoke focus:outline-none focus:border-neon-green transition-colors"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (step === "passcode" ? !passcode.trim() : !displayName.trim())}
            className="h-[52px] w-full rounded-full bg-neon-green text-cave-black font-bold uppercase tracking-[0.2em] text-sm disabled:opacity-40 transition-opacity font-[family-name:var(--font-space-mono)]"
          >
            {loading ? "Verificando..." : step === "passcode" ? "Continuar" : "Generar mi QR"}
          </button>

          <button
            type="button"
            onClick={step === "data" ? () => setStep("passcode") : onClose}
            className="text-[11px] text-cave-fog hover:text-cave-white transition-colors font-[family-name:var(--font-space-mono)] text-center"
          >
            {step === "data" ? "← Cambiar código" : "Cancelar"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
