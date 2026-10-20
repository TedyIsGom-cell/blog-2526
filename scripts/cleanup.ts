import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const now = new Date();
  const [sessions, limits] = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.authRateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);
  console.log(`만료 세션 ${sessions.count}개, 만료 로그인 제한 ${limits.count}개 정리`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
