export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-MX", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

export function formatPrice(
  price: number | null,
  currency: string = "MXN"
): string {
  if (price === null || price === 0) return "Gratis";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatEventDateRange(
  date: string,
  timeStart: string,
  timeEnd: string | null
): string {
  const formattedDate = formatDate(date);
  const formattedStart = formatTime(timeStart);
  if (!timeEnd) return `${formattedDate} · ${formattedStart}`;
  return `${formattedDate} · ${formattedStart} - ${formatTime(timeEnd)}`;
}
