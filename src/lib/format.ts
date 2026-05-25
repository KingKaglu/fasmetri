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
