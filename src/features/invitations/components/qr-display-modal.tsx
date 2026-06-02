"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";

interface QrDisplayModalProps {
  qrToken: string;
  displayName: string;
  flyerTitle: string | null;
  alreadyExisted: boolean;
  onClose: () => void;
}

export function QrDisplayModal({
  qrToken,
  displayName,
  flyerTitle,
  alreadyExisted,
  onClose,
}: QrDisplayModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  async function handleSaveImage() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        const link = document.createElement("a");
        link.download = `cave-invite-${qrToken.slice(0, 8)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    } catch {
      // Fallback: share via Web Share API
      if (navigator.share) {
        await navigator.share({ title: "Mi invitación Cave", text: qrToken });
      }
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90" />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="text-center">
          {alreadyExisted && (
            <p className="text-[10px] text-cave-fog uppercase tracking-widest mb-1 font-[family-name:var(--font-space-mono)]">
              Ya tenías tu QR
            </p>
          )}
          <h2 className="text-xl font-bold text-cave-white font-[family-name:var(--font-space-mono)]">
            {displayName}
          </h2>
          {flyerTitle && (
            <p className="text-xs text-cave-fog mt-1 font-[family-name:var(--font-space-mono)]">
              {flyerTitle}
            </p>
          )}
        </div>

        {/* QR Code */}
        <div
          ref={qrRef}
          className="p-5 bg-white rounded-2xl shadow-2xl"
        >
          <QRCode
            value={qrToken}
            size={220}
            level="M"
            style={{ display: "block" }}
          />
        </div>

        {/* Info */}
        <p className="text-[10px] text-cave-fog text-center font-[family-name:var(--font-space-mono)] max-w-[240px] leading-relaxed">
          Mostrá este QR en la entrada del evento. Es de uso único.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleSaveImage}
            className="h-[52px] w-full rounded-full bg-neon-green text-cave-black font-bold uppercase tracking-[0.2em] text-sm font-[family-name:var(--font-space-mono)]"
          >
            Guardar en fotos
          </button>
          <button
            onClick={onClose}
            className="h-[44px] w-full rounded-full border border-cave-ash text-cave-fog hover:text-cave-white transition-colors text-sm font-[family-name:var(--font-space-mono)] uppercase tracking-widest"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
