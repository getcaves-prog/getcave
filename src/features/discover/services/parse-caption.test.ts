import { describe, it, expect } from "vitest";
import { parseCaption } from "./parse-caption";

// Fixed "now" so date resolution is deterministic across runs.
// 2026-06-01 is a Monday.
const NOW = new Date("2026-06-01T12:00:00.000Z");

describe("parseCaption — date", () => {
  it("extracts the live-run example (11 DE JUNIO → this year) and the place", () => {
    const caption =
      "⚡️🔊 Monterrey, ¿listos para algo diferente?\n\n" +
      "Este JUEVEX 11 DE JUNIO llega PHUNKADELICA a X Discoteca. 🖤🔥\n" +
      "House, techno y una experiencia cuadrafónica...\n\n" +
      "📍 Barrio Antiguo\n" +
      "🎧 Jona • Carballo • Patto Terreros\n\n" +
      "#XDiscoteca #TechnoMonterrey";

    const result = parseCaption(caption, { now: NOW });

    expect(result.eventDate).toBe("2026-06-11");
    expect(result.place).toBe("Barrio Antiguo");
  });

  it("parses numeric DD/MM (no year → next occurrence)", () => {
    expect(parseCaption("Fiesta 15/08", { now: NOW }).eventDate).toBe(
      "2026-08-15"
    );
  });

  it("parses numeric DD-MM", () => {
    expect(parseCaption("Evento 20-09 imperdible", { now: NOW }).eventDate).toBe(
      "2026-09-20"
    );
  });

  it("parses numeric DD/MM/YYYY with an explicit year", () => {
    expect(parseCaption("Save the date 03/01/2027", { now: NOW }).eventDate).toBe(
      "2027-01-03"
    );
  });

  it("rolls a passed DD/MM to next year", () => {
    // March 10 already passed relative to June 1.
    expect(parseCaption("Aniversario 10/03", { now: NOW }).eventDate).toBe(
      "2027-03-10"
    );
  });

  it("parses 'DD de <mes>' (accent/case-insensitive)", () => {
    expect(parseCaption("Nos vemos el 5 de Septiembre", { now: NOW }).eventDate).toBe(
      "2026-09-05"
    );
    expect(parseCaption("11 de junio", { now: NOW }).eventDate).toBe(
      "2026-06-11"
    );
  });

  it("parses '<weekday> DD' (viernes 22)", () => {
    // June 2026: 22nd is a Monday, but weekday name is just a hint here;
    // the day number drives the date within the upcoming window.
    expect(parseCaption("viernes 22 en el bar", { now: NOW }).eventDate).toBe(
      "2026-06-22"
    );
  });

  it("resolves 'hoy'", () => {
    expect(parseCaption("La fiesta es hoy", { now: NOW }).eventDate).toBe(
      "2026-06-01"
    );
  });

  it("resolves 'mañana'", () => {
    expect(parseCaption("Mañana arrancamos", { now: NOW }).eventDate).toBe(
      "2026-06-02"
    );
  });

  it("resolves 'este sábado' to the next saturday on/after now", () => {
    // 2026-06-01 is Monday → next Saturday is 2026-06-06.
    expect(parseCaption("Este sábado en vivo", { now: NOW }).eventDate).toBe(
      "2026-06-06"
    );
  });

  it("resolves 'próximo viernes'", () => {
    // Monday 2026-06-01 → next Friday is 2026-06-05.
    expect(parseCaption("Próximo viernes party", { now: NOW }).eventDate).toBe(
      "2026-06-05"
    );
  });

  it("returns null date when nothing date-like is present", () => {
    const result = parseCaption("Cumbia Fest 2026\nNos vemos en Fundidora", {
      now: NOW,
    });
    expect(result.eventDate).toBeNull();
  });
});

describe("parseCaption — time", () => {
  it("parses '9:00 PM'", () => {
    expect(parseCaption("Abrimos 9:00 PM", { now: NOW }).eventTime).toBe(
      "9:00 PM"
    );
  });

  it("parses '7:00 AM'", () => {
    expect(parseCaption("Brunch 7:00 AM", { now: NOW }).eventTime).toBe(
      "7:00 AM"
    );
  });

  it("parses '8pm'", () => {
    expect(parseCaption("Show 8pm", { now: NOW }).eventTime).toBe("8:00 PM");
  });

  it("parses 24h '21:00'", () => {
    expect(parseCaption("Inicio 21:00", { now: NOW }).eventTime).toBe("9:00 PM");
  });

  it("parses '21hs'", () => {
    expect(parseCaption("Desde las 21hs", { now: NOW }).eventTime).toBe(
      "9:00 PM"
    );
  });

  it("parses '21 hrs'", () => {
    expect(parseCaption("Arranca 21 hrs", { now: NOW }).eventTime).toBe(
      "9:00 PM"
    );
  });

  it("returns null time when none present", () => {
    expect(parseCaption("Sin horario aún", { now: NOW }).eventTime).toBeNull();
  });
});

describe("parseCaption — place", () => {
  it("prefers text after a 📍 pin emoji", () => {
    expect(parseCaption("📍 Barrio Antiguo\n🎧 Jona", { now: NOW }).place).toBe(
      "Barrio Antiguo"
    );
  });

  it("uses 'Lugar:' label", () => {
    expect(parseCaption("Lugar: Club Vibra", { now: NOW }).place).toBe(
      "Club Vibra"
    );
  });

  it("uses 'Ubicación:' label", () => {
    expect(
      parseCaption("Ubicación: Parque Fundidora", { now: NOW }).place
    ).toBe("Parque Fundidora");
  });

  it("uses 'Dónde:' label (accent-insensitive)", () => {
    expect(parseCaption("Donde: La Terraza", { now: NOW }).place).toBe(
      "La Terraza"
    );
  });

  it("does not pick up hashtags or mentions as a place", () => {
    expect(
      parseCaption("Gran fiesta #fiesta @djset", { now: NOW }).place
    ).toBeNull();
  });

  it("returns null place when none present", () => {
    expect(parseCaption("Solo texto sin lugar", { now: NOW }).place).toBeNull();
  });
});

describe("parseCaption — defensive", () => {
  it("returns all nulls for an empty caption", () => {
    expect(parseCaption("", { now: NOW })).toEqual({
      eventDate: null,
      eventTime: null,
      place: null,
    });
  });

  it("returns all nulls for garbage and never throws", () => {
    expect(() => parseCaption("¡@#$%^&*()_+", { now: NOW })).not.toThrow();
    expect(parseCaption("¡@#$%^&*()_+", { now: NOW })).toEqual({
      eventDate: null,
      eventTime: null,
      place: null,
    });
  });

  it("works without opts (uses real now) without throwing", () => {
    expect(() => parseCaption("hola mundo")).not.toThrow();
  });
});
