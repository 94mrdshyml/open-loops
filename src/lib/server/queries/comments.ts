import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';
import { generateId } from '$lib/server/db/generate-id';
import { db } from '$lib/server/db/client';
import { comments } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { posts } from '$lib/server/db/schema';
import type { SQL } from 'drizzle-orm';
import type { CommentAdminView, CommentStatus, CommentWithUser, UserComment } from '$lib/types';

const commentUserSelect = {
	id: comments.id,
	postSlug: comments.postSlug,
	body: comments.body,
	status: comments.status,
	createdAt: comments.createdAt,
	userName: user.name,
	userUsername: user.username,
	userAvatarUrl: user.avatarUrl
};

export async function getApprovedComments(postSlug: string): Promise<CommentWithUser[]> {
	const rows = await db
		.select(commentUserSelect)
		.from(comments)
		.innerJoin(user, eq(comments.userId, user.id))
		.where(and(eq(comments.postSlug, postSlug), eq(comments.status, 'approved')))
		.orderBy(asc(comments.createdAt));
	return rows as CommentWithUser[];
}

export async function addComment(userId: string, postSlug: string, body: string): Promise<void> {
	await db.insert(comments).values({
		id: generateId('cmt'),
		postSlug,
		userId,
		body: body.trim(),
		status: 'pending',
		createdAt: new Date(),
		updatedAt: new Date()
	});
}

export async function getAllComments({
	status,
	search,
	limit = 50,
	offset = 0
}: {
	status?: CommentStatus;
	search?: string;
	limit?: number;
	offset?: number;
} = {}): Promise<{ rows: CommentAdminView[]; total: number }> {
	const conditions: (SQL | undefined)[] = [];
	if (status) conditions.push(eq(comments.status, status));
	if (search) conditions.push(ilike(comments.body, `%${search}%`));
	const where = and(...conditions);

	const [rows, [totalRow]] = await Promise.all([
		db
			.select({
				...commentUserSelect,
				postTitle: posts.title
			})
			.from(comments)
			.innerJoin(user, eq(comments.userId, user.id))
			.leftJoin(posts, eq(comments.postSlug, posts.slug))
			.where(where)
			.orderBy(desc(comments.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count(comments.id) })
			.from(comments)
			.where(where)
	]);

	return { rows: rows as CommentAdminView[], total: totalRow?.total ?? 0 };
}

export async function approveComment(id: string): Promise<void> {
	await db
		.update(comments)
		.set({ status: 'approved', updatedAt: new Date() })
		.where(eq(comments.id, id));
}

export async function rejectComment(id: string): Promise<void> {
	await db
		.update(comments)
		.set({ status: 'rejected', updatedAt: new Date() })
		.where(eq(comments.id, id));
}

export async function deleteComment(id: string): Promise<void> {
	await db.delete(comments).where(eq(comments.id, id));
}

export async function getUserComments(userId: string): Promise<UserComment[]> {
	const rows = await db
		.select({
			id: comments.id,
			postSlug: comments.postSlug,
			postTitle: posts.title,
			body: comments.body,
			status: comments.status,
			createdAt: comments.createdAt
		})
		.from(comments)
		.leftJoin(posts, eq(comments.postSlug, posts.slug))
		.where(eq(comments.userId, userId))
		.orderBy(desc(comments.createdAt))
		.limit(20);
	return rows as UserComment[];
}

export async function getPendingCommentCount(): Promise<number> {
	const [result] = await db
		.select({ total: count(comments.id) })
		.from(comments)
		.where(eq(comments.status, 'pending'));
	return result?.total ?? 0;
}
