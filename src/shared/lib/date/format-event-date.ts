const WEEKDAYS_ES = [
  "DOMINGO",
  "LUNES",
  "MARTES",
  "MIÉRCOLES",
  "JUEVES",
  "VIERNES",
  "SÁBADO",
] as const;

const MONTHS_ES = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
] as const;

/**
 * Formats an ISO date string into a human-readable uppercase event date label.
 *
 * - Returns null if eventDate is null
 * - Returns "HOY" if date matches today (local time)
 * - Returns "MAÑANA" if date matches tomorrow (local time)
 * - Returns Spanish weekday name in UPPERCASE if within next 6 days
 * - Returns "DD MMM" format (e.g. "12 MAR") for dates further away
 */
export function formatEventDate(eventDate: string | null): string | null {
  if (eventDate === null) return null;

  // Parse the date parts from the ISO string to avoid timezone shifts
  // eventDate is expected as "YYYY-MM-DD"
  const [yearStr, monthStr, dayStr] = eventDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed
  const day = Number(dayStr);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const eventLocal = new Date(year, month, day);
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffDays = Math.round(
    (eventLocal.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "HOY";
  if (diffDays === 1) return "MAÑANA";
  if (diffDays > 1 && diffDays <= 6) return WEEKDAYS_ES[eventLocal.getDay()];

  const dd = String(day).padStart(2, "0");
  const mmm = MONTHS_ES[month];
  return `${dd} ${mmm}`;
}
