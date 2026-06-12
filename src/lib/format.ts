export function formatGel(value: number) {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replaceAll(",", " ")
    .replace(".", ",");

  return `${amount} ₾`;
}

export function formatUpdated(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return `${partMap.get("day")}.${partMap.get("month")}.${partMap.get("year")}, ${partMap.get("hour")}:${partMap.get("minute")}`;
}

export function formatRelativeUpdated(value: string | Date, now = new Date()) {
  const updatedAt = new Date(value);
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 60000));

  if (elapsedMinutes < 1) return "განახლდა ახლა";
  if (elapsedMinutes < 60) return `განახლდა ${elapsedMinutes} წუთის წინ`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 8) return `განახლდა ${elapsedHours} საათის წინ`;
  if (dayKey(updatedAt) === dayKey(now)) return "განახლდა დღეს";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(updatedAt) === dayKey(yesterday)) return "განახლდა გუშინ";

  return `განახლდა ${formatCompactDate(updatedAt)}`;
}

// Bare relative timestamp for admin feeds ("ახლა", "5 წთ წინ", "3 სთ წინ").
export function formatRelativeTime(value: string | Date, now = new Date()) {
  const at = new Date(value);
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60000));
  if (minutes < 1) return "ახლა";
  if (minutes < 60) return `${minutes} წთ წინ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} სთ წინ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} დღის წინ`;
  return formatCompactDate(at);
}

export function formatDurationMs(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}წმ`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}წთ ${seconds % 60}წმ`;
  return `${Math.floor(minutes / 60)}სთ ${minutes % 60}წთ`;
}

export function formatCompactDate(value: string | Date) {
  const parts = new Map(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tbilisi",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );

  return `${parts.get("day")}.${parts.get("month")}.${parts.get("year")}`;
}

function dayKey(value: Date) {
  return formatCompactDate(value);
}
