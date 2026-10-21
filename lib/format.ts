export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

const DAY_MS = 86_400_000;
const koreanDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

// A birthday is a calendar date, not an instant. PostgreSQL @db.Date is UTC midnight.
function birthDayNumber(value: Date | string): number | null {
  const raw = value instanceof Date ? (Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '') : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/.exec(raw);
  if (!match || Number(match[1]) < 1) return null;
  const [, y, m, d] = match;
  const day = new Date(0);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCFullYear(Number(y), Number(m) - 1, Number(d));
  if (day.getUTCFullYear() !== Number(y) || day.getUTCMonth() !== Number(m) - 1 || day.getUTCDate() !== Number(d)) return null;
  return day.getTime() / DAY_MS;
}

/** Age on the author's Korean calendar date of writing, with birth day counted as day 1. */
export function daysOldAt(birthDate: Date | string | null | undefined, date: Date | string): number | null {
  if (!birthDate) return null;
  const birth = birthDayNumber(birthDate);
  const writtenAt = typeof date === 'string' ? new Date(date) : date;
  if (birth === null || !Number.isFinite(writtenAt.getTime())) return null;
  const parts = koreanDay.formatToParts(writtenAt);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const writtenDay = birthDayNumber(`${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`);
  if (writtenDay === null || writtenDay < birth) return null;
  return writtenDay - birth + 1;
}

export function formatDateAndAgeDays(date: Date | string, ageDays: number | null | undefined): string {
  const label = typeof ageDays === 'number' && Number.isSafeInteger(ageDays) && ageDays > 0 ? `${ageDays} 일` : '생일 미등록';
  return `${formatDateTime(date)} (${label})`;
}

export function formatDateWithAge(date: Date | string, birthDate?: Date | string | null): string {
  return formatDateAndAgeDays(date, daysOldAt(birthDate, date));
}
