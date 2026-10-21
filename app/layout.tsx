import './globals.css';
import './themes.css';
import type { Metadata } from 'next';
import { themeScript } from '@/lib/theme';
import ThemeProvider from './components/ThemeProvider';

export const metadata: Metadata = {
  title: '이산의 블로그',
  description: '이산의 작품과 글을 담은 공간',
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
