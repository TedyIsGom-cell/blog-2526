import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('ADMIN_EMAIL을 설정해주세요.');
  const admin = await db.user.findUnique({ where: { email } });
  if (admin?.role !== 'ADMIN') throw new Error('먼저 ADMIN_EMAIL로 관리자 계정을 가입해주세요.');
  const result = await db.post.updateMany({ where: { authorId: null }, data: { authorId: admin.id } });
  console.log(`작성자 미지정 글 ${result.count}개를 ${admin.name}에게 귀속했습니다.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
