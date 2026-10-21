import Link from 'next/link';

export default function MyInfoLink() {
  return <Link href="/my" className="text-sm text-gray-400 hover:text-gray-700 whitespace-nowrap">내 정보</Link>;
}
