import type { Metadata } from 'next';
import Link from 'next/link';
import ThemeSettings from '../components/ThemeSettings';

export const metadata: Metadata = { title: '내 정보 | 이산의 블로그' };

export default function MyPage() {
  return (
    <main className="settings-page max-w-4xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">← 홈으로</Link>
      <header className="settings-page-header">
        <p className="settings-eyebrow">MAKE YOURSELF AT HOME</p>
        <h1 className="text-3xl font-bold">내 정보</h1>
        <p className="text-sm text-gray-500 mt-3">나에게 편안한 모습으로, 이 공간을 꾸며보세요.</p>
      </header>
      <ThemeSettings />
    </main>
  );
}
