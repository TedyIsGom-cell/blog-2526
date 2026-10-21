import './globals.css';
import './themes.css';
import type { Metadata } from 'next';
import { themeScript } from '@/lib/theme';
import ThemeProvider from './components/ThemeProvider';

export const metadata: Metadata = {
  title: '20년대식',
  description: '여러 사람이 함께 쓰고 읽는 글과 생각의 공간',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-theme="classic" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
