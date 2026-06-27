"use client";

import { Fragment } from "react";

interface Step {
  icon: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: "📥",
    title: "EXTRAER CONTENIDO",
    description:
      "Apify obtiene publicaciones, eventos, imágenes y comentarios de distintas fuentes.",
  },
  {
    icon: "🧠",
    title: "ENTENDER CON IA",
    description:
      "Se analiza el texto e imágenes para extraer información clave y entender el contexto.",
  },
  {
    icon: "🗂️",
    title: "ESTRUCTURAR",
    description:
      "La información se organiza en datos: fecha, hora, lugar, tipo, comunidad, descripción, etc.",
  },
  {
    icon: "🎨",
    title: "DISEÑO CAVES",
    description:
      "Se aplica el sistema visual de CAVES para crear un flyer con estilo consistente y auténtico.",
  },
  {
    icon: "🚀",
    title: "EVENTO EN CAVES",
    description:
      "El evento se publica en CAVES con toda la info lista para descubrirse.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center font-[family-name:var(--font-space-mono)] text-xs uppercase tracking-[0.3em] text-cave-fog">
          Así funciona
        </h2>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-9 lg:items-stretch lg:gap-2 lg:overflow-visible">
          {STEPS.map((step, i) => (
            <Fragment key={step.title}>
              <div className="flex min-w-[200px] snap-start flex-col rounded-2xl border border-cave-ash bg-cave-stone p-4 lg:col-span-2 lg:min-w-0">
                <span className="text-2xl" aria-hidden>
                  {step.icon}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-space-mono)] text-xs font-bold uppercase tracking-wide text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-cave-fog">
                  {step.description}
                </p>
              </div>

              {/* Arrow between cards (desktop only). */}
              {i < STEPS.length - 1 && (
                <div className="hidden items-center justify-center text-cave-smoke lg:flex">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
