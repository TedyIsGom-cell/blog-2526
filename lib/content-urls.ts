// Post bodies come from multiple authors and email. Never render active URL schemes.
export function safeContentUrl(value: string, image = false): string | null {
  const url = value.trim();
  if (!url || /[\u0000-\u0020\u007f\\]/.test(url)) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return url;
    if (!image && parsed.protocol === 'mailto:') return url;
  } catch { /* Plain text is retained for invalid links. */ }
  return null;
}
