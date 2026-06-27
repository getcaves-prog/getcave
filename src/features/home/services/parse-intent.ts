/** Coarse temporal hint extracted from a free-text search intent. */
export type DateHint = "hoy" | "mañana" | "fin de semana" | null;

export interface ParsedIntent {
  /** Meaningful keywords, filler/stopwords stripped. */
  query: string;
  /** Coarse date hint if a temporal word was found, else null. */
  dateHint: DateHint;
}

/**
 * Common Spanish filler words and stopwords to drop from a search intent.
 * Kept deliberately small and high-signal — this is a heuristic parser, not an
 * NLP pipeline. All entries are accent-stripped + lowercased for matching.
 */
const STOPWORDS = new Set([
  // verbs of intent
  "quiero",
  "quisiera",
  "gustaria",
  "me",
  "ir",
  "ver",
  "hacer",
  "buscar",
  "busco",
  "encontrar",
  // articles / prepositions / connectors
  "a",
  "al",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "para",
  "por",
  "en",
  "con",
  "y",
  "o",
  "que",
  "este",
  "esta",
  "esto",
]);

/**
 * Multi-word date hints, checked before tokenization so phrases like
 * "fin de semana" survive stopword stripping.
 */
const PHRASE_DATE_HINTS: { phrase: string; hint: Exclude<DateHint, null> }[] = [
  { phrase: "fin de semana", hint: "fin de semana" },
  { phrase: "finde", hint: "fin de semana" },
];

/** Single-word date hints (accent-stripped keys → canonical labels). */
const WORD_DATE_HINTS: Record<string, Exclude<DateHint, null>> = {
  hoy: "hoy",
  manana: "mañana",
};

/** Lowercases and strips accents/diacritics for robust matching. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses a free-text Spanish search intent into meaningful keywords plus a
 * coarse date hint. No AI — a small stopword/heuristic parser.
 *
 * @example
 * parseIntent("quiero ir a bailar salsa mañana")
 * // → { query: "bailar salsa", dateHint: "mañana" }
 */
export function parseIntent(text: string): ParsedIntent {
  const normalized = normalize(text);
  if (!normalized) return { query: "", dateHint: null };

  let working = normalized;
  let dateHint: DateHint = null;

  // 1. Strip multi-word date phrases first (so they don't fragment).
  for (const { phrase, hint } of PHRASE_DATE_HINTS) {
    if (working.includes(phrase)) {
      dateHint = hint;
      working = working.replace(phrase, " ");
    }
  }

  // 2. Tokenize, drop stopwords and single-word date hints.
  const keywords: string[] = [];
  for (const token of working.split(" ")) {
    if (!token) continue;
    if (token in WORD_DATE_HINTS) {
      dateHint = WORD_DATE_HINTS[token];
      continue;
    }
    if (STOPWORDS.has(token)) continue;
    keywords.push(token);
  }

  return { query: keywords.join(" "), dateHint };
}
