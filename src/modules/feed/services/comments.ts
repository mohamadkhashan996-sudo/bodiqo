import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const include = { author: { select: { id: true, handle: true, name: true, image: true } } };
export async function addComment(authorId: string, postId: string, body: string, parentId?: string) {
  if (!body.trim()) throw new AppError("Comment cannot be empty", 400);
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findFirst({ where: { id: postId, deletedAt: null, commentsEnabled: true } });
    if (!post) throw new AppError("Comments are unavailable", 404);
    if (parentId) { const parent = await tx.comment.findFirst({ where: { id: parentId, postId, deletedAt: null } }); if (!parent) throw new AppError("Parent comment not found", 404); }
    const comment = await tx.comment.create({ data: { authorId, postId, body: body.trim(), parentId }, include });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    return comment;
  });
}
export async function editComment(authorId: string, id: string, body: string) {
  if (!body.trim()) throw new AppError("Comment cannot be empty", 400);
  const comment = await prisma.comment.findFirst({ where: { id, authorId, deletedAt: null } });
  if (!comment) throw new AppError("Comment not found", 404);
  return prisma.comment.update({ where: { id }, data: { body: body.trim() }, include });
}
export async function deleteComment(authorId: string, id: string) {
  const comment = await prisma.comment.findFirst({ where: { id, authorId, deletedAt: null } });
  if (!comment) throw new AppError("Comment not found", 404);
  return prisma.$transaction([prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } }), prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } })]);
}
export async function likeComment(userId: string, commentId: string) {
  return prisma.$transaction(async (tx) => { const c = await tx.comment.findFirst({ where: { id: commentId, deletedAt: null } }); if (!c) throw new AppError("Comment not found", 404); const old = await tx.commentLike.findUnique({ where: { commentId_userId: { commentId, userId } } }); if (old) return old; const like = await tx.commentLike.create({ data: { commentId, userId } }); await tx.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }); return like; });
}
export async function unlikeComment(userId: string, commentId: string) {
  return prisma.$transaction(async (tx) => { const like = await tx.commentLike.findUnique({ where: { commentId_userId: { commentId, userId } } }); if (!like) return { deleted: false }; await tx.commentLike.delete({ where: { id: like.id } }); await tx.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }); return { deleted: true }; });
}
export async function listComments(postId: string, cursor?: string, limit = 30) {
  const take = Math.min(Math.max(limit, 1), 50);
  const comments = await prisma.comment.findMany({ where: { postId, deletedAt: null, parentId: null }, include: { ...include, replies: { where: { deletedAt: null }, include, take: 3, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" }, take: take + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  return { comments: comments.slice(0, take), nextCursor: comments.length > take ? comments[take].id : null };
}
