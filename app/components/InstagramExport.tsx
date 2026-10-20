'use client';

import { useState, useRef } from 'react';

const WIDTH = 1080;
const MARGIN = 190;
const MAX_WIDTH = WIDTH - MARGIN * 2;
const BODY_FONT_SIZE = 42;
const BODY_LINE_HEIGHT = 62;
const FONT_FAMILY = "'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, sans-serif";

type Format = 'square' | 'portrait' | 'story';

const HEIGHTS: Record<Format, number> = {
  square: 1080,
  portrait: 1350,
  story: 1920,
};

type Segment = { type: 'text'; content: string } | { type: 'image'; url: string };

const IMAGE_LINE = /^!\[[^\]]*\]\((\S+)\)$/;
const YOUTUBE_LINE = /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/;

function cleanMarkdown(line: string): string {
  return line
    .replace(/^#{1,3}\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/^[-*]\s+/, '· ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function parseSegments(raw: string): Segment[] {
  const lines = raw.split('\n');
  const segments: Segment[] = [];
  let buffer: string[] = [];

  function flush() {
    if (buffer.length > 0) {
      segments.push({ type: 'text', content: buffer.join('\n') });
      buffer = [];
    }
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    const imgMatch = trimmed.match(IMAGE_LINE);
    if (imgMatch) {
      flush();
      segments.push({ type: 'image', url: imgMatch[1] });
    } else if (YOUTUBE_LINE.test(trimmed)) {
      // 영상은 정지 이미지로 캡처할 수 없어서 건너뜁니다.
      return;
    } else {
      buffer.push(cleanMarkdown(line));
    }
  });
  flush();

  return segments;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    if (paragraph.trim() === '') {
      lines.push('');
      return;
    }
    const words = paragraph.split(' ');
    let current = '';

    words.forEach((word) => {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
      while (ctx.measureText(current).width > maxWidth && current.length > 1) {
        let i = current.length - 1;
        while (i > 0 && ctx.measureText(current.slice(0, i)).width > maxWidth) i--;
        lines.push(current.slice(0, i));
        current = current.slice(i);
      }
    });
    lines.push(current);
  });

  return lines;
}

function fillBackground(ctx: CanvasRenderingContext2D, height: number) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  height: number,
  title: string,
  category: string,
  dateLabel: string
) {
  fillBackground(ctx, height);

  ctx.font = `bold 60px ${FONT_FAMILY}`;
  const titleLines = wrapText(ctx, title, MAX_WIDTH).slice(0, 8);

  const CATEGORY_H = 60;
  const GAP_1 = 40;
  const TITLE_LINE_H = 76;
  const GAP_2 = 60;
  const DATE_H = 40;

  const titleBlockHeight = titleLines.length * TITLE_LINE_H;
  const totalHeight = CATEGORY_H + GAP_1 + titleBlockHeight + GAP_2 + DATE_H;

  // 어떤 비율로 잘려도 안전하도록, 전체 내용을 캔버스 정중앙에 배치합니다.
  let y = Math.max(MARGIN, (height - totalHeight) / 2);

  ctx.fillStyle = '#9ca3af';
  ctx.font = `32px ${FONT_FAMILY}`;
  y += CATEGORY_H;
  ctx.fillText(category, MARGIN, y);
  y += GAP_1;

  ctx.fillStyle = '#111827';
  ctx.font = `bold 60px ${FONT_FAMILY}`;
  titleLines.forEach((line) => {
    y += TITLE_LINE_H;
    ctx.fillText(line, MARGIN, y);
  });
  y += GAP_2;

  ctx.fillStyle = '#9ca3af';
  ctx.font = `30px ${FONT_FAMILY}`;
  y += DATE_H;
  ctx.fillText(dateLabel, MARGIN, y);
}

function drawTextPage(
  ctx: CanvasRenderingContext2D,
  height: number,
  title: string,
  lines: string[],
  pageNum: number,
  totalPages: number
) {
  fillBackground(ctx, height);

  ctx.fillStyle = '#9ca3af';
  ctx.font = `28px ${FONT_FAMILY}`;
  const shortTitle = title.length > 20 ? title.slice(0, 20) + '…' : title;
  ctx.fillText(shortTitle, MARGIN, MARGIN);

  ctx.fillStyle = '#111827';
  ctx.font = `${BODY_FONT_SIZE}px ${FONT_FAMILY}`;
  let y = MARGIN + 100;
  lines.forEach((line) => {
    ctx.fillText(line, MARGIN, y);
    y += BODY_LINE_HEIGHT;
  });

  ctx.fillStyle = '#d1d5db';
  ctx.font = `28px ${FONT_FAMILY}`;
  ctx.fillText(`${pageNum} / ${totalPages}`, WIDTH - MARGIN - 90, height - MARGIN + 40);
}

function drawImagePage(ctx: CanvasRenderingContext2D, height: number, img: HTMLImageElement) {
  fillBackground(ctx, height);
  const scale = Math.min(WIDTH / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (WIDTH - w) / 2;
  const y = (height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

function drawErrorPage(ctx: CanvasRenderingContext2D, height: number) {
  fillBackground(ctx, height);
  ctx.fillStyle = '#9ca3af';
  ctx.font = `32px ${FONT_FAMILY}`;
  ctx.fillText('이 사진은 불러올 수 없어 건너뛰었어요', MARGIN, height / 2);
}

export default function InstagramExport({
  title,
  category,
  createdAt,
  content,
}: {
  title: string;
  category: string;
  createdAt: string;
  content: string;
}) {
  const [format, setFormat] = useState<Format>('square');
  const [slides, setSlides] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [warning, setWarning] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function generate() {
    setGenerating(true);
    setWarning('');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const height = HEIGHTS[format];
    canvas.width = WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dateLabel = new Date(createdAt).toLocaleDateString('ko-KR');
    const results: string[] = [];
    let imageLoadFailed = false;

    drawCover(ctx, height, title, category, dateLabel);
    results.push(canvas.toDataURL('image/png'));

    const segments = parseSegments(content);

    for (const segment of segments) {
      if (segment.type === 'image') {
        try {
          const img = await loadImage(segment.url);
          drawImagePage(ctx, height, img);
          results.push(canvas.toDataURL('image/png'));
        } catch {
          imageLoadFailed = true;
          drawErrorPage(ctx, height);
          results.push(canvas.toDataURL('image/png'));
        }
      } else {
        ctx.font = `${BODY_FONT_SIZE}px ${FONT_FAMILY}`;
        const allLines = wrapText(ctx, segment.content, MAX_WIDTH).filter(
          (l, i, arr) => !(l === '' && i === 0) && !(l === '' && i === arr.length - 1)
        );
        if (allLines.length === 0) continue;

        const availableHeight = height - MARGIN * 2 - 20;
        const linesPerPage = Math.max(1, Math.floor(availableHeight / BODY_LINE_HEIGHT));

        const pages: string[][] = [];
        for (let i = 0; i < allLines.length; i += linesPerPage) {
          pages.push(allLines.slice(i, i + linesPerPage));
        }

        pages.forEach((pageLines, i) => {
          drawTextPage(ctx, height, title, pageLines, i + 1, pages.length);
          results.push(canvas.toDataURL('image/png'));
        });
      }
    }

    if (imageLoadFailed) {
      setWarning('일부 사진은 다른 사이트에서 가져온 링크라 캡처하지 못했어요. 사진 첨부 버튼으로 올린 사진은 정상적으로 들어가요.');
    }

    setSlides(results);
    setGenerating(false);
  }

  function downloadAll() {
    slides.forEach((dataUrl, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${title}-${i + 1}.png`;
        a.click();
      }, i * 300);
    });
  }

  return (
    <div className="border rounded-lg p-4">
      <canvas ref={canvasRef} className="hidden" />

      {slides.length === 0 ? (
        <div className="flex items-center gap-3">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
            className="text-sm border rounded-full px-3 py-2 text-gray-600"
          >
            <option value="square">정사각형 (1080×1080)</option>
            <option value="portrait">세로형 (1080×1350)</option>
          </select>
          <button
            onClick={generate}
            disabled={generating}
            className="text-sm border rounded-full px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {generating ? '만드는 중...' : '📷 인스타용 이미지로 만들기'}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{slides.length}장의 이미지가 만들어졌어요</p>
            <button
              onClick={downloadAll}
              className="text-sm bg-black text-white rounded-full px-4 py-2"
            >
              전체 다운로드
            </button>
          </div>
          {warning && <p className="text-xs text-amber-600 mb-3">{warning}</p>}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {slides.map((src, i) => (
              <a key={i} href={src} download={`${title}-${i + 1}.png`} className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`slide-${i + 1}`}
                  className="w-28 h-28 object-cover border rounded"
                />
              </a>
            ))}
          </div>
          <button
            onClick={() => setSlides([])}
            className="text-xs text-gray-400 hover:text-gray-600 mt-3"
          >
            다시 만들기
          </button>
        </div>
      )}
    </div>
  );
}
