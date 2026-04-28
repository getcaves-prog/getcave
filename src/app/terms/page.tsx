import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Caves",
  description: "Términos y condiciones de uso de Caves.",
};

const SECTIONS = [
  {
    number: "1",
    title: "Naturaleza del servicio",
    content:
      "CAVES es una plataforma digital que permite a usuarios descubrir, compartir y guardar eventos, actividades y planes. CAVES no organiza, produce ni controla los eventos publicados, salvo que se indique expresamente.",
  },
  {
    number: "2",
    title: "Responsabilidad de los eventos",
    content: null,
    items: [
      "Cada evento es responsabilidad exclusiva del organizador que lo publica.",
      "CAVES no garantiza la veracidad, seguridad, calidad o legalidad de los eventos.",
    ],
  },
  {
    number: "3",
    title: "Uso bajo propio riesgo",
    content: null,
    items: [
      "El usuario reconoce que su asistencia a cualquier evento es bajo su propio riesgo.",
      "CAVES no será responsable por daños, lesiones, pérdidas o cualquier incidente derivado de la participación en eventos.",
    ],
  },
  {
    number: "4",
    title: "Conducta del usuario",
    intro: "El usuario se compromete a:",
    items: [
      "Actuar de forma respetuosa y legal.",
      "No poner en riesgo a terceros.",
      "No utilizar la plataforma para fines ilícitos.",
    ],
  },
  {
    number: "5",
    title: "Publicación de eventos",
    intro: "Quien publique eventos declara que:",
    items: [
      "Tiene autorización para organizarlos.",
      "La información es veraz.",
      "Cumple con leyes aplicables.",
      "Asume total responsabilidad sobre el evento.",
    ],
  },
  {
    number: "6",
    title: "Contenido prohibido",
    intro: "Se prohíbe publicar:",
    items: [
      "Actividades ilegales.",
      "Eventos peligrosos.",
      "Información falsa o engañosa.",
    ],
    footer:
      "CAVES se reserva el derecho de eliminar contenido sin previo aviso.",
  },
  {
    number: "7",
    title: "Limitación de responsabilidad",
    intro: "CAVES no será responsable por:",
    items: [
      "Conductas de usuarios u organizadores.",
      "Cancelaciones o cambios de eventos.",
      "Daños directos o indirectos derivados del uso de la plataforma.",
    ],
  },
  {
    number: "8",
    title: "Modificaciones",
    content:
      "CAVES puede modificar estos términos en cualquier momento.",
  },
  {
    number: "9",
    title: "Aceptación",
    content:
      "El uso de la plataforma implica aceptación de estos términos.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-cave-black px-6 py-16 text-cave-white">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10">

        {/* Header */}
        <div>
          <p className="mb-3 text-xs tracking-[0.35em] text-cave-fog uppercase font-[family-name:var(--font-space-mono)]">
            Caves
          </p>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-space-mono)] text-cave-white">
            Términos y Condiciones de Uso
          </h1>
          <p className="mt-2 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
            Última actualización: abril 2026
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-7">
          {SECTIONS.map((s) => (
            <div key={s.number} className="flex gap-4">
              <span className="mt-0.5 shrink-0 font-[family-name:var(--font-space-mono)] text-xs text-cave-ash">
                {s.number}.
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="font-[family-name:var(--font-space-mono)] text-sm font-bold text-cave-white tracking-wide">
                  {s.title}
                </h2>

                {s.content && (
                  <p className="text-sm leading-7 text-cave-fog font-[family-name:var(--font-inter)]">
                    {s.content}
                  </p>
                )}

                {s.intro && (
                  <p className="text-sm leading-7 text-cave-fog font-[family-name:var(--font-inter)]">
                    {s.intro}
                  </p>
                )}

                {s.items && (
                  <ul className="flex flex-col gap-1.5 pl-1">
                    {s.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm leading-6 text-cave-fog font-[family-name:var(--font-inter)]"
                      >
                        <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-cave-ash" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {s.footer && (
                  <p className="text-sm leading-7 text-cave-smoke font-[family-name:var(--font-inter)]">
                    {s.footer}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-cave-ash/40" />

        {/* Back link */}
        <Link
          href="/"
          className="text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
        >
          ← Volver a la app
        </Link>
      </div>
    </main>
  );
}
