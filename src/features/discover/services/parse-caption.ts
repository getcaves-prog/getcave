/**
 * No-AI heuristic parser for Instagram captions.
 *
 * Extracts a best-effort event date, time, and place from free-form Spanish
 * caption text using simple regex heuristics. Pure and server-safe: no I/O, no
 * dependencies, never throws.
 *
 * The date resolver is deterministic via the injectable `opts.now` so tests
 * don't depend on the wall clock. When no year is given, it resolves to the
 * NEXT occurrence on/after `now`.
 */

export interface ParsedCaption {
  /** Event date as YYYY-MM-DD, or null when none could be parsed. */
  eventDate: string | null;
  /** Short, consistent time label like "9:00 PM", or null. */
  eventTime: string | null;
  /** Venue / place text, or null. */
  place: string | null;
}

export interface ParseCaptionOptions {
  /** Reference "now" used to resolve year-less and relative dates. */
  now?: Date;
}

/** Spanish month names → 1-based month number. Includes common abbreviations. */
const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/** Spanish weekday names → JS day index (0 = Sunday). */
const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

/**
 * Parse a caption into a best-effort `{ eventDate, eventTime, place }`.
 * Never throws — any malformed input yields nulls for the affected field.
 */
export function parseCaption(
  caption: string,
  opts: ParseCaptionOptions = {}
): ParsedCaption {
  if (typeof caption !== "string" || caption.trim().length === 0) {
    return { eventDate: null, eventTime: null, place: null };
  }

  const now = opts.now ?? new Date();

  try {
    return {
      eventDate: parseDate(caption, now),
      eventTime: parseTime(caption),
      place: parsePlace(caption),
    };
  } catch {
    // Defensive: heuristics must never bubble up an error.
    return { eventDate: null, eventTime: null, place: null };
  }
}

/** Lowercase + strip accents so matching is accent/case-insensitive. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Format a UTC year/month/day triple as YYYY-MM-DD. */
function isoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** True when (month, day) is a valid calendar day. */
function isValidDay(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

/**
 * Pick the next occurrence of (month, day) on/after `now`. If that date already
 * passed this year, roll to next year.
 */
function nextOccurrence(now: Date, month: number, day: number): string {
  const year = now.getFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day));
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const finalYear = candidate.getTime() < today.getTime() ? year + 1 : year;
  return isoDate(finalYear, month, day);
}

/** Resolve a date from the caption using prioritized heuristics. */
function parseDate(caption: string, now: Date): string | null {
  const text = normalize(caption);

  // 1. Explicit numeric: DD/MM or DD-MM, optionally /YYYY.
  const numeric = text.match(
    /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/
  );
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    if (isValidDay(month, day)) {
      if (numeric[3]) {
        let year = Number(numeric[3]);
        if (year < 100) year += 2000;
        return isoDate(year, month, day);
      }
      return nextOccurrence(now, month, day);
    }
  }

  // 2. "DD de <mes>".
  const dayMonth = text.match(/\b(\d{1,2})\s+de\s+([a-z]+)\b/);
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = MONTHS[dayMonth[2]];
    if (month && isValidDay(month, day)) {
      return nextOccurrence(now, month, day);
    }
  }

  // 3. "<weekday> DD" — day number drives the date in the upcoming window.
  const weekdayDay = text.match(
    /\b(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\s+(\d{1,2})\b/
  );
  if (weekdayDay) {
    const day = Number(weekdayDay[2]);
    return nextMatchingDayOfMonth(now, day);
  }

  // 4. Relative: hoy / mañana.
  if (/\bhoy\b/.test(text)) {
    return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
  if (/\bmanana\b/.test(text)) {
    const t = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    );
    return isoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }

  // 5. Relative weekday: "este/proximo <weekday>".
  const relWeekday = text.match(
    /\b(?:este|proximo|proxima)\s+(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/
  );
  if (relWeekday) {
    return nextWeekday(now, WEEKDAYS[relWeekday[1]]);
  }
  // Bare "<weekday>" relative (e.g. caption just says "viernes").
  const bareWeekday = text.match(
    /\b(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/
  );
  if (bareWeekday) {
    return nextWeekday(now, WEEKDAYS[bareWeekday[1]]);
  }

  return null;
}

/**
 * Next date whose day-of-month equals `day`, on/after today. If `day` already
 * passed this month, use next month.
 */
function nextMatchingDayOfMonth(now: Date, day: number): string | null {
  if (day < 1 || day > 31) return null;
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-based
  if (day < now.getDate()) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  // Advance month until the day is valid (handles e.g. Feb 30).
  for (let i = 0; i < 12; i++) {
    if (isValidDay(month, day)) return isoDate(year, month, day);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return null;
}

/** Next date (on/after now) that falls on the given weekday (0 = Sunday). */
function nextWeekday(now: Date, target: number): string {
  const base = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const current = base.getUTCDay();
  let delta = (target - current + 7) % 7;
  // "next" weekday: if today matches, jump a full week forward.
  if (delta === 0) delta = 7;
  const result = new Date(base.getTime() + delta * 86_400_000);
  return isoDate(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    result.getUTCDate()
  );
}

/** Resolve a short, consistent time label like "9:00 PM" from the caption. */
function parseTime(caption: string): string | null {
  const text = normalize(caption);

  // 12-hour with explicit am/pm: "9:00 pm", "8pm", "8 pm".
  const ampm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (ampm) {
    const hour = Number(ampm[1]);
    const minute = ampm[2] ? Number(ampm[2]) : 0;
    if (hour >= 1 && hour <= 12 && minute < 60) {
      return formatLabel(hour, minute, ampm[3] as "am" | "pm");
    }
  }

  // 24-hour with optional minutes + hs/hrs/horas suffix: "21:00", "21hs".
  const h24 = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:hs|hrs|horas|h)\b/);
  if (h24) {
    const hour = Number(h24[1]);
    const minute = h24[2] ? Number(h24[2]) : 0;
    if (hour >= 0 && hour <= 23 && minute < 60) {
      return from24(hour, minute);
    }
  }

  // Bare 24-hour "HH:MM" (no suffix).
  const bare = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (bare) {
    const hour = Number(bare[1]);
    const minute = Number(bare[2]);
    if (hour >= 0 && hour <= 23 && minute < 60) {
      return from24(hour, minute);
    }
  }

  return null;
}

/** Convert a 24-hour time to the "h:MM AM/PM" label. */
function from24(hour: number, minute: number): string {
  const period: "am" | "pm" = hour >= 12 ? "pm" : "am";
  let twelve = hour % 12;
  if (twelve === 0) twelve = 12;
  return formatLabel(twelve, minute, period);
}

/** Build the canonical "9:00 PM" label. */
function formatLabel(hour12: number, minute: number, period: "am" | "pm"): string {
  const mm = String(minute).padStart(2, "0");
  return `${hour12}:${mm} ${period.toUpperCase()}`;
}

/** Extract a place: 📍 line first, then "Lugar:/Ubicación:/Dónde:" labels. */
function parsePlace(caption: string): string | null {
  const lines = caption.split("\n");

  // 1. Line containing a 📍 pin emoji → take the text after the pin.
  for (const line of lines) {
    const pinIndex = line.indexOf("\u{1F4CD}");
    if (pinIndex !== -1) {
      const after = cleanPlace(line.slice(pinIndex + 2));
      if (after) return after;
    }
  }

  // 2. Label lines: "Lugar:", "Ubicación:", "Dónde:" (accent-insensitive).
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const label = normalize(line.slice(0, colon)).trim();
    if (label === "lugar" || label === "ubicacion" || label === "donde") {
      const value = cleanPlace(line.slice(colon + 1));
      if (value) return value;
    }
  }

  return null;
}

/** Trim surrounding whitespace/emoji punctuation; reject hashtags/mentions. */
function cleanPlace(raw: string): string | null {
  const trimmed = raw
    .replace(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}•·\-—|]+/u, "")
    .replace(/[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}•·\-—|]+$/u, "")
    .trim();
  if (trimmed.length === 0) return null;
  if (trimmed.startsWith("#") || trimmed.startsWith("@")) return null;
  return trimmed;
}
