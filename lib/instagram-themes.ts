import type { ThemeId } from './theme';

export const INSTAGRAM_WIDTH = 1080;
export const INSTAGRAM_MARGIN = 190;
export const INSTAGRAM_TEXT_WIDTH = INSTAGRAM_WIDTH - INSTAGRAM_MARGIN * 2;
export const INSTAGRAM_BODY_SIZE = 42;
export const INSTAGRAM_LINE_HEIGHT = 62;
export type InstagramFormat = 'square' | 'portrait';
export const INSTAGRAM_HEIGHTS: Record<InstagramFormat, number> = { square: 1080, portrait: 1350 };
export const INSTAGRAM_SYSTEM_FONT = "'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, sans-serif";
export const INSTAGRAM_PIXEL_FONT = `'Galmuri11', ${INSTAGRAM_SYSTEM_FONT}`;

type Palette = { background: string; ink: string; muted: string; line: string; surface: string };
const PALETTES: Record<ThemeId, Palette> = {
  classic: { background: '#ffffff', ink: '#111827', muted: '#687382', line: '#dce1e7', surface: '#ffffff' },
  terminal: { background: '#020b05', ink: '#68ff90', muted: '#79bf8a', line: '#286e3c', surface: '#06140a' },
  farm: { background: '#dce9bc', ink: '#472c1c', muted: '#795439', line: '#bc8246', surface: '#ffe1a6' },
};

export type InstagramSegment = { type: 'text'; content: string } | { type: 'image'; url: string };

export function parseInstagramSegments(raw: string): InstagramSegment[] {
  const segments: InstagramSegment[] = [];
  let buffer: string[] = [];
  const flush = () => { if (buffer.length) segments.push({ type: 'text', content: buffer.join('\n') }); buffer = []; };
  raw.split('\n').forEach(line => {
    const trimmed = line.trim();
    const image = /^!\[[^\]]*\]\((\S+)\)$/.exec(trimmed);
    if (image) { flush(); segments.push({ type: 'image', url: image[1] }); }
    else if (/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(trimmed)) return;
    else buffer.push(line
      .replace(/^#{1,3}\s+/, '').replace(/^>\s?/, '').replace(/^[-*]\s+/, '· ')
      .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
  });
  flush();
  return segments;
}

/** Split at Unicode code points so emoji surrogate pairs stay intact. */
export function wrapInstagramText(ctx: CanvasRenderingContext2D, text: string, maxWidth = INSTAGRAM_TEXT_WIDTH): string[] {
  const result: string[] = [];
  text.split('\n').forEach(paragraph => {
    if (!paragraph.trim()) { result.push(''); return; }
    let current = '';
    for (const word of paragraph.split(' ')) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        result.push(current.trimEnd());
        current = word;
      } else current = candidate;
      let chars = Array.from(current);
      while (chars.length > 1 && ctx.measureText(current).width > maxWidth) {
        let low = 1;
        let high = chars.length;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          if (ctx.measureText(chars.slice(0, middle).join('')).width <= maxWidth) low = middle;
          else high = middle - 1;
        }
        result.push(chars.slice(0, low).join(''));
        chars = chars.slice(low);
        current = chars.join('');
      }
    }
    if (current) result.push(current.trimEnd());
  });
  return result;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth = INSTAGRAM_TEXT_WIDTH): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
  return chars.join('') + '…';
}

function limitedLines(ctx: CanvasRenderingContext2D, text: string, limit: number): { lines: string[]; truncated: boolean } {
  const all = wrapInstagramText(ctx, text);
  if (all.length <= limit) return { lines: all, truncated: false };
  const lines = all.slice(0, limit);
  lines[limit - 1] = ellipsize(ctx, lines[limit - 1] + '…');
  return { lines, truncated: true };
}

function pixelSprout(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const unit = 5;
  ctx.fillStyle = '#3a6537';
  ctx.fillRect(x + 5 * unit, y + 4 * unit, 2 * unit, 7 * unit);
  ctx.fillRect(x, y, 4 * unit, 3 * unit);
  ctx.fillRect(x + unit, y + 3 * unit, 4 * unit, 2 * unit);
  ctx.fillRect(x + 8 * unit, y, 4 * unit, 3 * unit);
  ctx.fillRect(x + 7 * unit, y + 3 * unit, 4 * unit, 2 * unit);
  ctx.fillStyle = '#7eaa52';
  ctx.fillRect(x + unit, y + unit, 2 * unit, unit);
  ctx.fillRect(x + 9 * unit, y + unit, 2 * unit, unit);
}

export function drawInstagramBackground(ctx: CanvasRenderingContext2D, height: number, theme: ThemeId) {
  const p = PALETTES[theme];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, INSTAGRAM_WIDTH, height);
  if (theme === 'terminal') {
    ctx.fillStyle = p.surface;
    ctx.fillRect(48, 48, INSTAGRAM_WIDTH - 96, height - 96);
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, INSTAGRAM_WIDTH - 96, height - 96);
    ctx.fillStyle = '#43f578';
    ctx.fillRect(48, 48, INSTAGRAM_WIDTH - 96, 4);
    for (let i = 0; i < 3; i++) ctx.fillRect(78 + i * 25, 82, 10, 10);
    ctx.fillStyle = p.line;
    ctx.fillRect(72, 118, INSTAGRAM_WIDTH - 144, 2);
    ctx.fillRect(72, height - 120, INSTAGRAM_WIDTH - 144, 2);
    ctx.fillStyle = '#43f578';
    ctx.fillRect(INSTAGRAM_WIDTH - 110, height - 94, 18, 5);
  } else if (theme === 'farm') {
    ctx.fillStyle = '#89502b';
    ctx.fillRect(44, 44, INSTAGRAM_WIDTH - 88, height - 88);
    ctx.fillStyle = '#f4bd71';
    ctx.fillRect(51, 51, INSTAGRAM_WIDTH - 102, height - 102);
    ctx.fillStyle = '#ca8f4d';
    ctx.fillRect(60, 60, INSTAGRAM_WIDTH - 120, height - 120);
    ctx.fillStyle = p.surface;
    ctx.fillRect(69, 69, INSTAGRAM_WIDTH - 138, height - 138);
    ctx.fillStyle = '#89502b';
    for (const x of [55, INSTAGRAM_WIDTH - 67]) for (const y of [55, height - 67]) ctx.fillRect(x, y, 12, 12);
    pixelSprout(ctx, INSTAGRAM_WIDTH - 162, 101);
    ctx.fillStyle = '#a46a3a';
    ctx.fillRect(96, height - 113, INSTAGRAM_WIDTH - 192, 6);
    ctx.fillStyle = '#87a65b';
    for (let x = 100; x < INSTAGRAM_WIDTH - 100; x += 24) {
      ctx.fillRect(x, height - 103, 5, 13);
      ctx.fillRect(x + 5, height - 99, 5, 9);
    }
  }
}

/** Returns whether any cover metadata had to be shortened to fit the safe area. */
export function drawInstagramCover(ctx: CanvasRenderingContext2D, height: number, theme: ThemeId, family: string, title: string, category: string, dateLabel: string): boolean {
  drawInstagramBackground(ctx, height, theme);
  const p = PALETTES[theme];
  ctx.font = `30px ${family}`;
  const categoryBlock = limitedLines(ctx, category, 2);
  const dates = limitedLines(ctx, dateLabel, 4);
  const categoryHeight = categoryBlock.lines.length * 42;
  const dateHeight = dates.lines.length * 42;
  const available = height - INSTAGRAM_MARGIN * 2;
  const gaps = 32 + 48;
  let size = 60;
  let titles: string[] = [];
  for (; size >= 36; size -= 2) {
    ctx.font = `bold ${size}px ${family}`;
    titles = wrapInstagramText(ctx, title || '제목 없는 글');
    if (categoryHeight + dateHeight + gaps + titles.length * Math.ceil(size * 1.3) <= available) break;
  }
  size = Math.max(size, 36);
  ctx.font = `bold ${size}px ${family}`;
  const titleLineHeight = Math.ceil(size * 1.3);
  const maxTitleLines = Math.max(1, Math.floor((available - categoryHeight - dateHeight - gaps) / titleLineHeight));
  const titleBlock = limitedLines(ctx, title || '제목 없는 글', maxTitleLines);
  const totalHeight = categoryHeight + dateHeight + gaps + titleBlock.lines.length * titleLineHeight;
  let y = INSTAGRAM_MARGIN + Math.max(0, (available - totalHeight) / 2);
  ctx.fillStyle = p.muted;
  ctx.font = `30px ${family}`;
  for (const line of categoryBlock.lines) { ctx.fillText(line, INSTAGRAM_MARGIN, y); y += 42; }
  y += 32;
  ctx.fillStyle = p.ink;
  ctx.font = `bold ${size}px ${family}`;
  for (const line of titleBlock.lines) { ctx.fillText(line, INSTAGRAM_MARGIN, y); y += titleLineHeight; }
  y += 48;
  ctx.fillStyle = p.muted;
  ctx.font = `30px ${family}`;
  for (const line of dates.lines) { ctx.fillText(line, INSTAGRAM_MARGIN, y); y += 42; }
  return categoryBlock.truncated || dates.truncated || titleBlock.truncated;
}

export function instagramLinesPerPage(height: number): number {
  const top = INSTAGRAM_MARGIN + 96;
  const bottom = height - INSTAGRAM_MARGIN - 32;
  return Math.max(1, Math.floor((bottom - top - INSTAGRAM_BODY_SIZE) / INSTAGRAM_LINE_HEIGHT) + 1);
}

export function drawInstagramTextPage(ctx: CanvasRenderingContext2D, height: number, theme: ThemeId, family: string, title: string, lines: string[], page: number, total: number) {
  drawInstagramBackground(ctx, height, theme);
  const p = PALETTES[theme];
  ctx.font = `28px ${family}`;
  ctx.fillStyle = p.muted;
  ctx.fillText(ellipsize(ctx, title), INSTAGRAM_MARGIN, INSTAGRAM_MARGIN);
  ctx.fillStyle = p.line;
  ctx.fillRect(INSTAGRAM_MARGIN, INSTAGRAM_MARGIN + 58, INSTAGRAM_TEXT_WIDTH, 2);
  ctx.font = `${INSTAGRAM_BODY_SIZE}px ${family}`;
  ctx.fillStyle = p.ink;
  lines.forEach((line, i) => ctx.fillText(line, INSTAGRAM_MARGIN, INSTAGRAM_MARGIN + 96 + i * INSTAGRAM_LINE_HEIGHT));
  ctx.font = `28px ${family}`;
  ctx.fillStyle = p.muted;
  const label = `${page} / ${total}`;
  ctx.fillText(label, INSTAGRAM_WIDTH - INSTAGRAM_MARGIN - ctx.measureText(label).width, height - INSTAGRAM_MARGIN + 24);
}

export function drawInstagramImagePage(ctx: CanvasRenderingContext2D, height: number, theme: ThemeId, image: CanvasImageSource & { width: number; height: number }) {
  drawInstagramBackground(ctx, height, theme);
  const inset = theme === 'classic' ? 100 : 150;
  const scale = Math.min((INSTAGRAM_WIDTH - inset * 2) / image.width, (height - inset * 2) / image.height);
  const width = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, (INSTAGRAM_WIDTH - width) / 2, (height - drawHeight) / 2, width, drawHeight);
}

export function drawInstagramImageError(ctx: CanvasRenderingContext2D, height: number, theme: ThemeId, family: string) {
  drawInstagramBackground(ctx, height, theme);
  ctx.font = `32px ${family}`;
  ctx.fillStyle = PALETTES[theme].muted;
  const lines = wrapInstagramText(ctx, '이 사진은 불러올 수 없어 건너뛰었어요.');
  lines.forEach((line, i) => ctx.fillText(line, INSTAGRAM_MARGIN, height / 2 + i * 46));
}
