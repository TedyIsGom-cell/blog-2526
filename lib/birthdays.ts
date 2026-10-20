const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Birthdays are civil dates, stored at UTC midnight in PostgreSQL DATE. */
export function validateBirthDate(value: unknown, now = new Date()): { date: Date | null; error?: string } {
  if (value === null || value === undefined || value === '') return { date: null };
  if (typeof value !== 'string') return { date: null, error: '생일은 YYYY-MM-DD 형식으로 입력해주세요.' };
  const match = DATE_ONLY.exec(value);
  if (!match) return { date: null, error: '생일은 YYYY-MM-DD 형식으로 입력해주세요.' };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { date: null, error: '실제로 존재하는 생일을 입력해주세요.' };
  }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  if (value > today) return { date: null, error: '미래 날짜를 생일로 등록할 수 없습니다.' };
  return { date };
}

export function formatBirthDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}
