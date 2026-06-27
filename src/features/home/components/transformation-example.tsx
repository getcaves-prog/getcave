"use client";

import { CaveFlyerCard } from "./cave-flyer-card";

/** Extracted fields shown in the middle "ANÁLISIS IA" column. */
const EXTRACTED_FIELDS: { label: string; value: string }[] = [
  { label: "Tipo", value: "Hiking" },
  { label: "Fecha", value: "Domingo" },
  { label: "Hora", value: "7:00 AM" },
  { label: "Lugar", value: "HEB Valle Alto" },
  { label: "Nivel", value: "Principiante" },
  { label: "Asistentes", value: "35+" },
  {
    label: "Descripción",
    value: "Ruta a la cascada Estanzuela. Llevar agua y calzado de trail.",
  },
];

function ColumnLabel({ children }: { children: string }) {
  return (
    <p className="mb-3 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-[0.25em] text-cave-fog">
      {children}
    </p>
  );
}

export function TransformationExample() {
  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center font-[family-name:var(--font-space-mono)] text-xs uppercase tracking-[0.3em] text-cave-fog">
          Ejemplo de transformación
        </h2>

        <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
          {/* Column 1 — Original Facebook post (mock). */}
          <div className="flex flex-col">
            <ColumnLabel>Original (Facebook)</ColumnLabel>
            <div className="flex-1 rounded-2xl border border-cave-ash bg-cave-stone p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cave-ash text-sm">
                  🥾
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    Hiking Monterrey
                  </p>
                  <p className="text-[11px] text-cave-fog">Grupo público</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-cave-light">
                Ruta Estanzuela este domingo 🥾 Nos vemos 7:00 AM en HEB Valle
                Alto. Nivel principiante, llevar agua y calzado de trail. ¡Los
                esperamos!
              </p>
              <div className="mt-3 flex gap-4 text-[11px] text-cave-fog">
                <span>👍 128</span>
                <span>💬 35</span>
                <span>↗ 12</span>
              </div>
            </div>
          </div>

          {/* Column 2 — IA analysis (extracted fields). */}
          <div className="flex flex-col">
            <ColumnLabel>Análisis IA</ColumnLabel>
            <div className="flex-1 rounded-2xl border border-cave-ash bg-cave-stone p-4">
              <ul className="space-y-2.5">
                {EXTRACTED_FIELDS.map((field) => (
                  <li
                    key={field.label}
                    className="flex flex-col gap-0.5 border-b border-cave-ash/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-cave-fog">
                      {field.label}
                    </span>
                    <span className="text-sm text-white">{field.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 3 — Result in CAVES (the template). */}
          <div className="flex flex-col">
            <ColumnLabel>Resultado en CAVES</ColumnLabel>
            <div className="flex-1">
              <CaveFlyerCard
                imageUrl="https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80"
                title="Ruta Estanzuela"
                dateLabel="19 MAY"
                dayLabel="Domingo"
                timeLabel="7:00 AM"
                place="HEB Valle Alto"
                level="Principiante"
                communityName="Hiking Monterrey"
                attendees="35+"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
