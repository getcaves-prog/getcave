"use client";

import { useState } from "react";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { SeedStepA } from "./seed-step-a";
import { SeedStepB } from "./seed-step-b";
import { SeedStepC } from "./seed-step-c";
import { SeedStepD } from "./seed-step-d";
import type { Tables } from "@/shared/types/database.types";

type Community = Tables<"communities">;

type Step = "A" | "B" | "C" | "D";

const STEPS: { id: Step; label: string; desc: string }[] = [
  { id: "A", label: "Crear comunidad", desc: "Datos base + imágenes" },
  { id: "B", label: "Sembrar eventos", desc: "Flyers con fecha" },
  { id: "C", label: "Mensaje oficial", desc: "Conversación inicial" },
  { id: "D", label: "Listo", desc: "Ver comunidad" },
];

export function SeedCommunityWorkflow() {
  const [currentStep, setCurrentStep] = useState<Step>("A");
  const [community, setCommunity] = useState<Community | null>(null);

  const activeIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="px-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-[family-name:var(--font-space-mono)] text-xl text-cave-white">
          Sembrar comunidad
        </h1>
        <p className="text-sm text-cave-fog">
          Crea y popula una comunidad real desde una plataforma externa.
        </p>
      </div>

      {/* Step indicators */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isActive = step.id === currentStep;
          const isLocked = idx > activeIndex && !(community && idx === 1);

          return (
            <button
              key={step.id}
              type="button"
              disabled={isLocked || (!community && idx > 0)}
              onClick={() => {
                if (!isLocked && (community || idx === 0)) {
                  setCurrentStep(step.id);
                }
              }}
              className={`flex min-w-[140px] flex-col rounded-xl border p-3 text-left transition-colors ${
                isActive
                  ? "border-cave-white bg-cave-stone"
                  : isDone
                    ? "border-cave-ash bg-cave-stone/50 opacity-70 hover:opacity-100"
                    : "border-cave-ash bg-cave-stone/20 opacity-40 cursor-not-allowed"
              }`}
            >
              <span className="mb-0.5 flex items-center gap-1.5 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-cave-fog">
                {isDone ? (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-cave-white"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${isActive ? "bg-cave-white" : "bg-cave-ash"}`}
                  />
                )}
                Paso {idx + 1}
              </span>
              <span
                className={`text-xs font-medium ${isActive ? "text-cave-white" : "text-cave-fog"}`}
              >
                {step.label}
              </span>
              <span className="mt-0.5 text-[10px] text-cave-smoke">
                {step.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active step */}
      <div>
        {currentStep === "A" && (
          <StepWrapper label="A" title="Crear comunidad seeded">
            <SeedStepA
              onSuccess={(c) => {
                setCommunity(c);
                setCurrentStep("B");
              }}
            />
          </StepWrapper>
        )}

        {currentStep === "B" && community && (
          <StepWrapper label="B" title={`Sembrar eventos — ${community.name}`}>
            <SeedStepB
              community={community}
              onContinue={() => setCurrentStep("C")}
            />
          </StepWrapper>
        )}

        {currentStep === "C" && community && (
          <StepWrapper
            label="C"
            title={`Mensaje oficial — ${community.name}`}
          >
            <SeedStepC
              community={community}
              onContinue={() => setCurrentStep("D")}
            />
          </StepWrapper>
        )}

        {currentStep === "D" && community && (
          <StepWrapper label="D" title="Comunidad creada">
            <SeedStepD community={community} onReset={() => {
              setCommunity(null);
              setCurrentStep("A");
            }} />
          </StepWrapper>
        )}
      </div>
    </div>
  );
}

function StepWrapper({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionHeading trailing={`Paso ${label}`}>{title}</SectionHeading>
      {children}
    </div>
  );
}
