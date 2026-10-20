import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/format';

export async function GET(
  _req: Request,
  { params }: { params: { name: string } }
) {
  const category = decodeURIComponent(params.name);

  const posts = await prisma.post.findMany({
    where: { published: true, category },
    orderBy: { createdAt: 'asc' },
  });

  if (posts.length === 0) {
    return NextResponse.json({ error: '해당 카테고리에 글이 없습니다.' }, { status: 404 });
  }

  const divider = '\n\n' + '='.repeat(40) + '\n\n';

  const text = posts
    .map((post) => {
      return `${post.title}\n(${formatDateTime(post.createdAt)})\n\n${post.content}`;
    })
    .join(divider);

  const header = `카테고리: ${category}\n총 ${posts.length}개의 글\n\n`;

  const filename = `${category}.txt`;

  return new NextResponse(header + text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
