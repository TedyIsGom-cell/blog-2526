export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// 2007년 1월 21일을 기준으로 며칠째인지 계산 (나이 세는 방식과 동일하게 그날을 1일로 셈)
const BASE_DATE = new Date('2007-01-21T00:00:00+09:00');

export function daysSinceBase(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = d.getTime() - BASE_DATE.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}
