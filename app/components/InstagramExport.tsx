'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatDateAndAgeDays } from '@/lib/format';
import { THEMES, type ThemeId } from '@/lib/theme';
import {
  drawInstagramCover, drawInstagramImageError, drawInstagramImagePage, drawInstagramTextPage,
  INSTAGRAM_BODY_SIZE, INSTAGRAM_HEIGHTS, INSTAGRAM_PIXEL_FONT, INSTAGRAM_SYSTEM_FONT,
  INSTAGRAM_WIDTH, instagramLinesPerPage, parseInstagramSegments, wrapInstagramText,
  type InstagramFormat,
} from '@/lib/instagram-themes';
import { useTheme } from './ThemeProvider';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => { image.src = ''; reject(new Error('이미지를 불러오는 시간이 초과되었습니다.')); }, 15000);
    image.crossOrigin = 'anonymous';
    image.onload = () => { window.clearTimeout(timer); resolve(image); };
    image.onerror = () => { window.clearTimeout(timer); reject(new Error('이미지를 불러올 수 없습니다.')); };
    image.src = url;
  });
}

async function prepareFont(theme: ThemeId): Promise<{ family: string; fallback: boolean }> {
  if (theme === 'classic') return { family: INSTAGRAM_SYSTEM_FONT, fallback: false };
  try {
    const loaded = await Promise.race([
      Promise.all([document.fonts.load('42px Galmuri11'), document.fonts.load('bold 60px Galmuri11')]),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('font timeout')), 3000)),
    ]);
    if (loaded.some(fonts => fonts.length > 0)) return { family: INSTAGRAM_PIXEL_FONT, fallback: false };
  } catch { /* Render with the available system font rather than blocking export. */ }
  return { family: INSTAGRAM_SYSTEM_FONT, fallback: true };
}

type Page = { type: 'cover' } | { type: 'text'; lines: string[] } | { type: 'image'; url: string };

export default function InstagramExport({ title, category, createdAt, content, authorName, ageDays }: {
  title: string; category: string; createdAt: string; content: string; authorName: string; ageDays: number | null;
}) {
  const { theme } = useTheme();
  const [chosenTheme, setChosenTheme] = useState<ThemeId | null>(null);
  const exportTheme = chosenTheme ?? theme;
  const [format, setFormat] = useState<InstagramFormat>('square');
  const [slides, setSlides] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const id = useId();
  const themeName = THEMES.find(option => option.id === exportTheme)!.name;

  useEffect(() => {
    generation.current++;
    setSlides([]);
    setWarning('');
    setError('');
  }, [exportTheme, format, title, category, createdAt, content, authorName, ageDays]);
  useEffect(() => () => { generation.current++; }, []);

  async function generate() {
    if (busy.current) return;
    busy.current = true;
    const run = ++generation.current;
    setGenerating(true);
    setSlides([]);
    setWarning('');
    setError('');
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('이미지를 만들 화면을 준비하지 못했습니다. 다시 시도해주세요.');
      const height = INSTAGRAM_HEIGHTS[format];
      canvas.width = INSTAGRAM_WIDTH;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('이 브라우저에서 이미지 생성을 지원하지 않습니다.');
      const { family, fallback } = await prepareFont(exportTheme);
      if (run !== generation.current) return;
      const warnings: string[] = fallback ? ['픽셀 글꼴을 불러오지 못해 기본 글꼴로 만들었습니다.'] : [];
      const plans: Page[] = [{ type: 'cover' }];
      for (const segment of parseInstagramSegments(content)) {
        if (segment.type === 'image') plans.push(segment);
        else {
          ctx.font = `${INSTAGRAM_BODY_SIZE}px ${family}`;
          const lines = wrapInstagramText(ctx, segment.content);
          while (lines[0] === '') lines.shift();
          while (lines[lines.length - 1] === '') lines.pop();
          const count = instagramLinesPerPage(height);
          for (let i = 0; i < lines.length; i += count) plans.push({ type: 'text', lines: lines.slice(i, i + count) });
        }
      }
      const results: string[] = [];
      let imageFailed = false;
      for (let i = 0; i < plans.length; i++) {
        if (run !== generation.current) return;
        const page = plans[i];
        if (page.type === 'cover') {
          const clipped = drawInstagramCover(ctx, height, exportTheme, family, title, category, `${authorName} · ${formatDateAndAgeDays(createdAt, ageDays)}`);
          if (clipped) warnings.push('긴 제목이나 표지 정보의 일부를 생략했습니다. 본문 내용은 모두 포함됩니다.');
        } else if (page.type === 'text') {
          drawInstagramTextPage(ctx, height, exportTheme, family, title, page.lines, i + 1, plans.length);
        } else {
          try {
            const image = await loadImage(page.url);
            if (run !== generation.current) return;
            drawInstagramImagePage(ctx, height, exportTheme, image);
            results.push(canvas.toDataURL('image/png'));
            continue;
          } catch {
            if (run !== generation.current) return;
            imageFailed = true;
            // Reset the backing surface too, in case a remote image tainted it.
            canvas.width = INSTAGRAM_WIDTH;
            drawInstagramImageError(ctx, height, exportTheme, family);
          }
        }
        results.push(canvas.toDataURL('image/png'));
      }
      if (imageFailed) warnings.push('일부 사진을 불러오지 못했습니다. 직접 첨부한 사진이나 접근 가능한 이미지 주소를 사용해주세요.');
      if (run === generation.current) { setSlides(results); setWarning(warnings.join(' ')); }
    } catch (reason) {
      if (run === generation.current) setError(reason instanceof Error ? reason.message : '이미지를 만들지 못했습니다. 다시 시도해주세요.');
    } finally {
      busy.current = false;
      setGenerating(false);
    }
  }

  function filename(index: number) {
    const cleanTitle = Array.from(title.replace(/[\\/:*?"<>|]/g, '-')).slice(0, 80).join('') || '글';
    return `${cleanTitle}-${exportTheme}-${index + 1}.png`;
  }

  function downloadAll() {
    slides.forEach((src, index) => window.setTimeout(() => {
      const anchor = document.createElement('a');
      anchor.href = src;
      anchor.download = filename(index);
      anchor.click();
    }, index * 300));
  }

  return <section className="border rounded-lg p-4" aria-label="인스타용 이미지 만들기">
    <canvas ref={canvasRef} className="hidden" />
    <div className="flex flex-wrap items-end gap-3">
      <label htmlFor={`${id}-theme`} className="block text-sm text-gray-600">이미지 UI
        <select id={`${id}-theme`} value={exportTheme} disabled={generating} onChange={event => setChosenTheme(event.target.value as ThemeId)} className="block mt-1 text-sm border rounded px-3 py-2">
          {THEMES.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label>
      <label htmlFor={`${id}-format`} className="block text-sm text-gray-600">이미지 크기
        <select id={`${id}-format`} value={format} disabled={generating} onChange={event => setFormat(event.target.value as InstagramFormat)} className="block mt-1 text-sm border rounded px-3 py-2">
          <option value="square">정사각형 (1080×1080)</option>
          <option value="portrait">세로형 (1080×1350)</option>
        </select>
      </label>
      <button type="button" onClick={generate} disabled={generating} className="text-sm border rounded px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50">{generating ? '만드는 중…' : slides.length ? '이미지 다시 만들기' : '인스타용 이미지로 만들기'}</button>
    </div>
    <p className="text-xs text-gray-500 mt-3">이미지 UI는 블로그 화면과 별도로 고를 수 있어요.</p>
    {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
    {warning && <p role="status" className="text-xs text-amber-600 mt-3">{warning}</p>}
    {slides.length > 0 && <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p role="status" className="text-sm text-gray-500">‘{themeName}’ UI로 {slides.length}장을 만들었어요.</p>
        <button type="button" onClick={downloadAll} className="text-sm bg-black text-white rounded px-4 py-2">전체 다운로드</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {slides.map((src, index) => <a key={index} href={src} download={filename(index)} className="flex-shrink-0" aria-label={`${index + 1}번째 이미지 다운로드`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${themeName} 인스타 이미지 ${index + 1}`} className="w-28 h-auto border rounded" />
        </a>)}
      </div>
    </div>}
  </section>;
}
