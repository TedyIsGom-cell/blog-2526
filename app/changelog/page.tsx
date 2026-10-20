import Link from 'next/link';
import { changelog } from '@/lib/changelog';

export default function ChangelogPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">
        ← 홈으로
      </Link>
      <h1 className="text-2xl font-bold mt-6 mb-8">업데이트 기록</h1>

      <div className="space-y-6">
        {changelog.map((entry, i) => (
          <div key={i} className="border-l-2 border-gray-200 pl-4">
            <p className="text-sm text-gray-400 mb-1">{entry.date}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{entry.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
