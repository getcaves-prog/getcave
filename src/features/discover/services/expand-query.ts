// Server-safe, pure: no I/O, no dependencies. Expands a free-text discovery
// query into the original term PLUS a few curated, domain-related terms so the
// Apify scrape covers nearby concepts (e.g. "salsa" → also "baile", "bachata").

/** Max number of terms returned by expandQuery (original + related). */
const MAX_TERMS = 4;

/**
 * Curated themes for the CAVES nightlife/events domain. Each theme maps a set of
 * trigger keywords to a list of related search terms. Matching is
 * accent/case-insensitive: a query matches a theme when ANY keyword appears as a
 * whole token (or substring) of the normalized query.
 */
interface Theme {
  keywords: string[];
  related: string[];
}

const THEMES: Theme[] = [
  {
    keywords: ["salsa", "bachata", "baile", "cumbia", "kizomba", "merengue"],
    related: ["baile", "salsa", "bachata", "clases de baile"],
  },
  {
    keywords: ["techno", "house", "rave", "electronica", "edm", "dj"],
    related: ["techno", "electrónica", "house", "rave"],
  },
  {
    keywords: ["rock", "banda", "concierto", "vivo", "metal", "punk"],
    related: ["concierto", "banda en vivo", "rock"],
  },
  {
    keywords: ["arte", "expo", "galeria", "taller", "exposicion", "muestra"],
    related: ["arte", "expo", "taller"],
  },
  {
    keywords: ["comida", "food", "gastro", "gastronomia", "feria", "mercado"],
    related: ["gastronomía", "food", "feria"],
  },
  {
    keywords: ["comedia", "standup", "stand up", "humor"],
    related: ["stand up", "comedia"],
  },
];

/** Lowercase + strip accents so theme matching ignores case and diacritics. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Expand a query into the original term plus related terms for a matched theme.
 *
 * - The original query (trimmed, original casing) is always FIRST.
 * - Related terms come from the first matching theme, appended after.
 * - Deduped accent/case-insensitively (the original wins over a related dupe).
 * - Capped at MAX_TERMS total.
 * - When nothing matches → `[query]` (just the original).
 */
export function expandQuery(query: string): string[] {
  const original = query.trim();
  const normalizedQuery = normalize(original);

  const theme = THEMES.find((t) =>
    t.keywords.some((kw) => normalizedQuery.includes(normalize(kw)))
  );

  const result: string[] = [original];

  if (theme) {
    const seen = new Set<string>([normalizedQuery]);
    for (const term of theme.related) {
      if (result.length >= MAX_TERMS) break;
      const key = normalize(term);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(term);
    }
  }

  return result.slice(0, MAX_TERMS);
}
