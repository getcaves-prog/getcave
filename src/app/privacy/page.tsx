import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | Caves",
  description:
    "Cómo Caves recopila, usa y protege datos personales en la app y en la web.",
  openGraph: {
    title: "Política de Privacidad | Caves",
    description:
      "Cómo Caves recopila, usa y protege datos personales en la app y en la web.",
    url: "https://www.getcaves.com/privacy",
  },
};

const SECTIONS = [
  {
    number: "1",
    title: "Datos que recopilamos",
    items: [
      "Datos de cuenta: nombre, correo y autenticación.",
      "Datos de uso: eventos vistos, interacciones y acciones dentro de la app.",
      "Datos de ubicación: si el usuario habilita geolocalización para mostrar eventos cercanos.",
      "Datos de cámara: solo para escanear QR dentro de la app.",
      "Token de notificaciones: para enviar push notifications si el usuario las acepta.",
    ],
  },
  {
    number: "2",
    title: "Cómo usamos los datos",
    items: [
      "Autenticar usuarios y mantener su sesión.",
      "Mostrar contenido y eventos relevantes.",
      "Procesar check-ins por QR y funciones de invitación.",
      "Enviar notificaciones push cuando el usuario las habilita.",
      "Mejorar la experiencia y el funcionamiento general de la app.",
    ],
  },
  {
    number: "3",
    title: "Compartición de datos",
    content:
      "No vendemos datos personales. Compartimos información solo con proveedores necesarios para operar la app, como autenticación, base de datos, geocodificación, notificaciones o infraestructura.",
  },
  {
    number: "4",
    title: "Permisos del dispositivo",
    items: [
      "Ubicación: para mostrar eventos cercanos y mejorar recomendaciones.",
      "Cámara: para escanear QR de invitaciones y check-ins.",
      "Notificaciones: para alertas y recordatorios, solo si el usuario las acepta.",
    ],
  },
  {
    number: "5",
    title: "Retención y seguridad",
    content:
      "Guardamos los datos solo el tiempo necesario para brindar el servicio o cumplir obligaciones legales. Aplicamos medidas razonables de seguridad, aunque ningún sistema es 100% invulnerable.",
  },
  {
    number: "6",
    title: "Derechos del usuario",
    items: [
      "Acceder, corregir o eliminar datos personales cuando corresponda.",
      "Revocar permisos del dispositivo desde iPhone en cualquier momento.",
      "Desactivar notificaciones desde la app o desde iOS.",
    ],
  },
  {
    number: "7",
    title: "Contacto",
    content:
      "Si querés consultar o pedir la eliminación de datos, escribinos a soporte@getcaves.com.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-cave-black px-6 py-16 text-cave-white">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10">
        <div>
          <p className="mb-3 text-xs tracking-[0.35em] text-cave-fog uppercase font-[family-name:var(--font-space-mono)]">
            Caves
          </p>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-space-mono)] text-cave-white">
            Política de Privacidad
          </h1>
          <p className="mt-2 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
            Última actualización: mayo 2026
          </p>
        </div>

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
              </div>
            </div>
          ))}
        </div>

        <div className="h-px bg-cave-ash/40" />

        <div className="flex flex-col gap-3">
          <Link
            href="/terms"
            className="text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Términos y condiciones →
          </Link>
          <Link
            href="/content-policy"
            className="text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Política de contenido →
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
