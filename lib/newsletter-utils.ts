import { formatDateWithAge } from './format';

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

export function excerpt(content: string, max = 320) {
  const text = content.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '')
    .replace(/[#>*_`~]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// A new Korean sending week begins Monday at 09:00 KST (Monday 00:00 UTC).
export function weeklyIssueKey(now = new Date()) {
  const korea = new Date(now.getTime());
  const daysSinceMonday = (korea.getUTCDay() + 6) % 7;
  korea.setUTCDate(korea.getUTCDate() - daysSinceMonday);
  return `weekly:${korea.toISOString().slice(0, 10)}`;
}

export function canRetry(firstAttemptAt: Date | null, now = new Date()) {
  return !firstAttemptAt || now.getTime() - firstAttemptAt.getTime() < 23 * 60 * 60 * 1000;
}

type DigestPost = { id: number; title: string; content: string; createdAt?: Date | string; author: { name: string; birthDate?: Date | string | null } | null };
export function buildDigest(posts: DigestPost[], siteUrl: string, date = new Date()) {
  const title = `함께 쓴 글 · ${date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} 뉴스레터`;
  const entries = posts.map((post) => {
    const author = post.author?.name || '기존 글';
    const url = `${siteUrl}/posts/${post.id}`;
    const dateLabel = post.createdAt ? formatDateWithAge(post.createdAt, post.author?.birthDate) : null;
    return {
      html: `<article style="margin:28px 0"><h2 style="font-size:21px"><a href="${escapeHtml(url)}">${escapeHtml(post.title)}</a></h2><p style="color:#64748b">${escapeHtml(author)}${dateLabel ? ` · ${escapeHtml(dateLabel)}` : ''}</p><p style="line-height:1.8">${escapeHtml(excerpt(post.content))}</p><a href="${escapeHtml(url)}">전체 글 읽기 →</a></article>`,
      text: `${post.title}\n글쓴이: ${author}${dateLabel ? `\n${dateLabel}` : ''}\n${excerpt(post.content)}\n${url}`,
    };
  });
  return {
    title,
    html: `<main style="max-width:640px;margin:auto;font-family:Arial,sans-serif;color:#172033;padding:24px"><h1>${escapeHtml(title)}</h1><p>여러 집필자의 새로운 글을 모았습니다.</p>${entries.map((entry) => entry.html).join('')}</main>`,
    text: `${title}\n여러 집필자의 새로운 글을 모았습니다.\n\n${entries.map((entry) => entry.text).join('\n\n')}`,
  };
}

