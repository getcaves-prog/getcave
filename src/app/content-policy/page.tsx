import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Contenido | Caves",
  description:
    "Qué tipo de contenido está permitido y qué está prohibido en Caves.",
  openGraph: {
    title: "Política de Contenido | Caves",
    description:
      "Qué tipo de contenido está permitido y qué está prohibido en Caves.",
    url: "https://www.getcaves.com/content-policy",
  },
};

const PROHIBITED = [
  "Actividades ilegales o no autorizadas.",
  "Eventos que promuevan violencia o riesgo físico.",
  "Información falsa o engañosa.",
  "Eventos sin autorización del organizador.",
];

export default function ContentPolicyPage() {
  return (
    <main className="min-h-dvh bg-cave-black px-6 py-16 text-cave-white">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10">

        {/* Header */}
        <div>
          <p className="mb-3 text-xs tracking-[0.35em] text-cave-fog uppercase font-[family-name:var(--font-space-mono)]">
            Caves
          </p>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-space-mono)] text-cave-white">
            Política de Contenido
          </h1>
        </div>

        {/* What is Caves */}
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-7 text-cave-fog font-[family-name:var(--font-inter)]">
            CAVES es una plataforma para descubrir eventos y planes. Los eventos
            son organizados por terceros — CAVES no controla ni garantiza las
            actividades publicadas. Cada usuario participa bajo su propia
            responsabilidad.
          </p>
        </div>

        {/* Prohibited */}
        <div className="flex flex-col gap-4">
          <h2 className="font-[family-name:var(--font-space-mono)] text-sm font-bold text-cave-white tracking-wide uppercase">
            No está permitido publicar
          </h2>
          <ul className="flex flex-col gap-3">
            {PROHIBITED.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm leading-6 text-cave-fog font-[family-name:var(--font-inter)]"
              >
                <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-cave-white" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Enforcement */}
        <div className="rounded-2xl border border-cave-ash bg-cave-stone px-5 py-4">
          <p className="text-sm leading-7 text-cave-fog font-[family-name:var(--font-inter)]">
            CAVES podrá eliminar contenido y suspender cuentas que incumplan
            estas reglas, sin previo aviso.
          </p>
        </div>

        <div className="h-px bg-cave-ash/40" />

        {/* Links */}
        <div className="flex flex-col gap-3">
          <Link
            href="/organizer"
            className="text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Declaración del organizador →
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
