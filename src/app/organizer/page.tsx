import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Declaración del Organizador | Caves",
  description:
    "Responsabilidades y compromisos de quienes publican eventos en Caves.",
  openGraph: {
    title: "Declaración del Organizador | Caves",
    description:
      "Responsabilidades y compromisos de quienes publican eventos en Caves.",
    url: "https://www.getcaves.com/organizer",
  },
};

const ITEMS = [
  "Eres responsable del evento publicado.",
  "Tienes autorización para organizarlo.",
  "La información proporcionada es veraz.",
  "Cumples con todas las leyes y regulaciones aplicables.",
  "Garantizas condiciones razonables de seguridad para los asistentes.",
];

export default function OrganizerPage() {
  return (
    <main className="min-h-dvh bg-cave-black px-6 py-16 text-cave-white">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10">

        {/* Header */}
        <div>
          <p className="mb-3 text-xs tracking-[0.35em] text-cave-fog uppercase font-[family-name:var(--font-space-mono)]">
            Caves
          </p>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-space-mono)] text-cave-white">
            Declaración del Organizador
          </h1>
        </div>

        {/* Intro */}
        <p className="text-sm leading-7 text-cave-fog font-[family-name:var(--font-inter)]">
          Al publicar un evento en CAVES, declarás que:
        </p>

        {/* Items */}
        <ul className="flex flex-col gap-3">
          {ITEMS.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm leading-6 text-cave-fog font-[family-name:var(--font-inter)]"
            >
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-cave-white" />
              {item}
            </li>
          ))}
        </ul>

        {/* Disclaimer */}
        <div className="rounded-2xl border border-cave-ash bg-cave-stone px-5 py-4">
          <p className="text-sm leading-7 text-cave-fog font-[family-name:var(--font-inter)]">
            Aceptás que CAVES no es responsable de la organización, ejecución o
            consecuencias del evento. CAVES se reserva el derecho de eliminar
            cualquier evento que incumpla estas condiciones.
          </p>
        </div>

        <div className="h-px bg-cave-ash/40" />

        {/* Links */}
        <div className="flex flex-col gap-3">
          <Link
            href="/content-policy"
            className="text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Política de contenido →
          </Link>
          <Link
            href="/terms"
            className="text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Términos y condiciones →
          </Link>
          <Link
            href="/"
            className="text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            ← Volver a la app
          </Link>
        </div>

      </div>
    </main>
  );
}
