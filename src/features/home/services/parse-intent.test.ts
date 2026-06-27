import { describe, it, expect } from "vitest";
import { parseIntent } from "./parse-intent";

describe("parseIntent", () => {
  it("extracts keywords and a date hint from a natural phrase", () => {
    expect(parseIntent("quiero ir a bailar salsa mañana")).toEqual({
      query: "bailar salsa",
      dateHint: "mañana",
    });
  });

  it("detects 'hoy' as a date hint and strips it from the query", () => {
    expect(parseIntent("me gustaría una expo hoy")).toEqual({
      query: "expo",
      dateHint: "hoy",
    });
  });

  it("detects 'fin de semana' as a date hint", () => {
    expect(parseIntent("quiero un concierto el fin de semana")).toEqual({
      query: "concierto",
      dateHint: "fin de semana",
    });
  });

  it("returns null dateHint when no temporal word is present", () => {
    expect(parseIntent("rave techno")).toEqual({
      query: "rave techno",
      dateHint: null,
    });
  });

  it("strips common Spanish filler words and stopwords", () => {
    expect(parseIntent("quiero ir a una fiesta de la comunidad")).toEqual({
      query: "fiesta comunidad",
      dateHint: null,
    });
  });

  it("handles empty input", () => {
    expect(parseIntent("")).toEqual({ query: "", dateHint: null });
  });

  it("trims and collapses whitespace", () => {
    expect(parseIntent("   bailar   cumbia   ")).toEqual({
      query: "bailar cumbia",
      dateHint: null,
    });
  });

  it("is accent and case insensitive for stopwords and date hints", () => {
    expect(parseIntent("QUIERO IR A bailar MAÑANA")).toEqual({
      query: "bailar",
      dateHint: "mañana",
    });
  });
});
