import { daysOldAt } from '@/lib/format';

// Deliberately exclude passwords, email addresses and unneeded account fields.
export const publicCommentSelect = {
  id: true, author: true, content: true, createdAt: true, updatedAt: true,
  likeCount: true, parentId: true, user: { select: { birthDate: true } },
} as const;

type CommentForDisplay = {
  id: number; author: string; content: string; createdAt: Date; updatedAt: Date;
  likeCount: number; parentId: number | null; user: { birthDate: Date | null } | null;
};

export function serializeComment(comment: CommentForDisplay) {
  return {
    id: comment.id, author: comment.author, content: comment.content,
    createdAt: comment.createdAt, updatedAt: comment.updatedAt,
    likeCount: comment.likeCount, parentId: comment.parentId,
    ageDays: daysOldAt(comment.user?.birthDate, comment.createdAt),
  };
}
