export type Role = 'READER' | 'WRITER' | 'ADMIN';
type Actor = { id: string; role: Role } | null;
export function isAdmin(user: Actor): boolean { return user?.role === 'ADMIN'; }
export function canWrite(user: Actor): boolean { return user?.role === 'ADMIN' || user?.role === 'WRITER'; }
export function canEditPost(user: Actor, authorId: string | null): boolean { return isAdmin(user) || (user?.role === 'WRITER' && user.id === authorId); }
