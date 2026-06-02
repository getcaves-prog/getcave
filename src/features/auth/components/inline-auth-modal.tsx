"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { usePendingActionStore } from "@/features/auth/stores/pending-action.store";

export function InlineAuthModal() {
  const router = useRouter();
  const closeModal = usePendingActionStore((s) => s.closeModal);

  const handleSignup = () => {
    closeModal();
    router.push("/auth/signup");
  };

  const handleLogin = () => {
    closeModal();
    router.push("/auth/login");
  };

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex flex-col justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Bottom-sheet card */}
      <motion.div
        className="relative z-10 rounded-t-2xl bg-[#0A0A0A] p-6 flex flex-col gap-4"
        initial={{ translateY: 20, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        exit={{ translateY: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30, delay: 0.05 }}
      >
        {/* Drag handle */}
        <div className="mx-auto w-10 h-1 rounded-full bg-white/20" />

        {/* Title */}
        <h2
          className="text-xl font-bold uppercase tracking-widest text-white"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          guarda tu plan
        </h2>

        {/* Subtitle */}
        <p
          className="text-sm text-cave-fog"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          crea tu cuenta en segundos
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={handleSignup}
            className="w-full min-h-[44px] rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#050505] transition-opacity active:opacity-80"
            style={{
              backgroundColor: "#39FF14",
              fontFamily: "var(--font-space-mono)",
            }}
          >
            seguir
          </button>

          <button
            onClick={handleLogin}
            className="w-full min-h-[44px] rounded-xl border border-white/20 px-5 py-3 text-sm text-white/70 transition-colors hover:text-white active:opacity-70"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            ya tengo cuenta
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
