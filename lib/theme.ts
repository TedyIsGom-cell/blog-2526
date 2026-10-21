export const THEMES = [
  {
    id: 'classic',
    name: '기본',
    caption: 'CLASSIC',
    description: '하얀 여백과 단정한 글씨. 익숙한 모습으로 글에 집중하세요.',
  },
  {
    id: 'terminal',
    name: '레트로 초록',
    caption: 'GREEN TERMINAL',
    description: '검은 화면에 빛나는 초록 글씨. 오래된 컴퓨터의 감성을 담았어요.',
  },
  {
    id: 'farm',
    name: '픽셀 농장',
    caption: 'PIXEL FARM',
    description: '따뜻한 나무 테두리와 도트 장식. 작은 농장 같은 공간을 만나보세요.',
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

// Reuse the previous theme key. Legacy light/dark values resolve to classic,
// keeping the selector at exactly three UI styles.
export const THEME_STORAGE_KEY = 'theme';
export const DEFAULT_THEME: ThemeId = 'classic';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function resolveTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

// Apply before content paints; blocked storage still gets the default UI.
export const themeScript = `
(function () {
  var value = null;
  try { value = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch (e) {}
  var themes = ${JSON.stringify(THEMES.map((theme) => theme.id))};
  document.documentElement.setAttribute('data-theme', themes.indexOf(value) !== -1 ? value : ${JSON.stringify(DEFAULT_THEME)});
  document.documentElement.classList.remove('dark');
})();
`;
