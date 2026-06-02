"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { InterestSelector } from "@/features/onboarding/components/interest-selector";

const STORAGE_KEY = "onboarding_seen";

// Step index for the interests screen (appended after the regular steps)
const INTERESTS_STEP_INDEX = 3;

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Welcome to Caves",
    description: "Discover events happening around you, shared by real people in your community.",
    icon: (
      <Image
        src="/Logo.png"
        alt="Caves"
        width={200}
        height={72}
        className="h-auto w-[200px]"
        priority
      />
    ),
  },
  {
    title: "Discover Events",
    description: "Drag to explore the canvas. Double-tap any flyer to see details, save it, or share with friends.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cave-white">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    title: "Share Your Events",
    description: "Upload flyers for your events. Set a location, pick categories, and let the community find you.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cave-white">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
];

// Total steps including the interests step
const TOTAL_STEPS = STEPS.length + 1;

interface OnboardingOverlayProps {
  onComplete: () => void;
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finish();
    }
  }, [currentStep, finish]);

  const handleSkip = useCallback(() => {
    finish();
  }, [finish]);

  if (!visible) return null;

  const isInterestsStep = currentStep === INTERESTS_STEP_INDEX;
  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "radial-gradient(ellipse at center, rgba(5,5,5,0.92) 0%, rgba(0,0,0,0.98) 100%)",
            WebkitBackdropFilter: "blur(40px)",
            backdropFilter: "blur(40px)",
          }}
        >
          {/* Skip button — visible on all steps except interests (has its own CTA) */}
          {!isInterestsStep && (
            <button
              onClick={handleSkip}
              className="absolute top-6 right-6 safe-area-top text-xs text-cave-smoke hover:text-cave-fog transition-colors font-[family-name:var(--font-space-mono)]"
            >
              Skip
            </button>
          )}

          {/* Step content */}
          <AnimatePresence mode="wait">
            {isInterestsStep ? (
              <motion.div
                key="interests"
                className="w-full max-w-[340px] overflow-y-auto max-h-[70dvh]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl text-cave-white font-[family-name:var(--font-space-mono)] mb-2 text-center">
                  Tus intereses
                </h2>
                <InterestSelector
                  ctaLabel="Empezar"
                  onSave={finish}
                />
                <button
                  onClick={finish}
                  className="mt-3 w-full text-xs text-cave-smoke hover:text-cave-fog transition-colors font-[family-name:var(--font-space-mono)] text-center"
                >
                  Saltar por ahora
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={currentStep}
                className="flex flex-col items-center text-center max-w-[300px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Icon */}
                <div className="mb-8 flex items-center justify-center w-24 h-24">
                  {STEPS[currentStep].icon}
                </div>

                {/* Title */}
                <h2 className="text-xl text-cave-white font-[family-name:var(--font-space-mono)] mb-3">
                  {STEPS[currentStep].title}
                </h2>

                {/* Description */}
                <p className="text-sm text-cave-fog leading-relaxed">
                  {STEPS[currentStep].description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress dots — always visible */}
          {!isInterestsStep && (
            <div className="flex items-center gap-2 mt-12 mb-8">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    i === currentStep ? "bg-cave-white" : "bg-cave-ash"
                  }`}
                />
              ))}
            </div>
          )}

          {/* CTA button — only for info steps */}
          {!isInterestsStep && (
            <button
              onClick={handleNext}
              className="min-h-[44px] px-8 py-3 rounded-full bg-cave-white text-cave-black text-sm font-medium font-[family-name:var(--font-space-mono)] hover:bg-cave-light transition-colors"
            >
              {isLastStep ? "Get Started" : "Next"}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
