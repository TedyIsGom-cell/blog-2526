import React from 'react';

// 글 내용을 한 줄씩 살펴보면서
// - ![](이미지주소) 형태의 줄은 사진으로
// - 유튜브 링크만 있는 줄은 영상으로
// - #, ##, ### 로 시작하면 제목으로
// - > 로 시작하면 인용구로
// - -, * 로 시작하면 목록으로
// - 그 외에는 텍스트로 (그 안에서 **굵게**, *기울임*, `코드`, [링크](주소) 지원)

const IMAGE_LINE = /^!\[([^\]]*)\]\((\S+)\)$/;
const YOUTUBE_LINE = /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})\S*$/;
const HEADING_LINE = /^(#{1,3})\s+(.*)$/;
const QUOTE_LINE = /^>\s?(.*)$/;
const LIST_LINE = /^[-*]\s+(.*)$/;

const INLINE_TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(INLINE_TOKEN).filter((p) => p !== '');

  return parts.map((part, i) => {
    let m;
    if ((m = part.match(/^\*\*([^*]+)\*\*$/)) || (m = part.match(/^__([^_]+)__$/))) {
      return <strong key={i}>{m[1]}</strong>;
    }
    if ((m = part.match(/^\*([^*]+)\*$/)) || (m = part.match(/^_([^_]+)_$/))) {
      return <em key={i}>{m[1]}</em>;
    }
    if ((m = part.match(/^`([^`]+)`$/))) {
      return (
        <code key={i} className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">
          {m[1]}
        </code>
      );
    }
    if ((m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/))) {
      return (
        <a
          key={i}
          href={m[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 underline"
        >
          {m[1]}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function PostContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let textBuffer: string[] = [];
  let listBuffer: string[] = [];
  let quoteBuffer: string[] = [];

  function flushText() {
    if (textBuffer.length === 0) return;
    blocks.push(
      <p key={blocks.length} className="leading-relaxed text-[17px] mb-4">
        {textBuffer.map((line, idx) => (
          <React.Fragment key={idx}>
            {renderInline(line)}
            {idx < textBuffer.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
    textBuffer = [];
  }

  function flushList() {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={blocks.length} className="list-disc pl-5 mb-4 space-y-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-[17px] leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  function flushQuote() {
    if (quoteBuffer.length === 0) return;
    blocks.push(
      <blockquote
        key={blocks.length}
        className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 mb-4"
      >
        {quoteBuffer.map((line, idx) => (
          <React.Fragment key={idx}>
            {renderInline(line)}
            {idx < quoteBuffer.length - 1 && <br />}
          </React.Fragment>
        ))}
      </blockquote>
    );
    quoteBuffer = [];
  }

  function flushAll() {
    flushText();
    flushList();
    flushQuote();
  }

  const headingClass: Record<number, string> = {
    1: 'text-2xl font-bold mt-6 mb-3',
    2: 'text-xl font-bold mt-5 mb-3',
    3: 'text-lg font-bold mt-4 mb-2',
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const imgMatch = trimmed.match(IMAGE_LINE);
    const ytMatch = trimmed.match(YOUTUBE_LINE);
    const headingMatch = trimmed.match(HEADING_LINE);
    const quoteMatch = trimmed.match(QUOTE_LINE);
    const listMatch = trimmed.match(LIST_LINE);

    if (imgMatch) {
      flushAll();
      blocks.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={blocks.length}
          src={imgMatch[2]}
          alt={imgMatch[1]}
          className="w-full rounded-lg mb-6"
        />
      );
    } else if (ytMatch) {
      flushAll();
      blocks.push(
        <div key={blocks.length} className="relative w-full mb-6" style={{ paddingTop: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}`}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allowFullScreen
            title="YouTube video"
          />
        </div>
      );
    } else if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      const Tag = (`h${level}` as unknown) as 'h1' | 'h2' | 'h3';
      blocks.push(
        <Tag key={blocks.length} className={headingClass[level]}>
          {renderInline(headingMatch[2])}
        </Tag>
      );
    } else if (quoteMatch) {
      flushText();
      flushList();
      quoteBuffer.push(quoteMatch[1]);
    } else if (listMatch) {
      flushText();
      flushQuote();
      listBuffer.push(listMatch[1]);
    } else {
      flushList();
      flushQuote();
      textBuffer.push(line);
    }
  });
  flushAll();

  return <>{blocks}</>;
}
