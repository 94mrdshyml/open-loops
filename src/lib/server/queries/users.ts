import { eq, count } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable, bookmarks, comments } from '$lib/server/db/schema';
import type { UserRole } from '$lib/types';

export async function getUserById(id: string) {
	const [row] = await db
		.select({
			id: userTable.id,
			name: userTable.name,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			email: userTable.email,
			username: userTable.username,
			role: userTable.role,
			createdAt: userTable.createdAt,
			avatarUrl: userTable.avatarUrl,
			isNewsletterSubscriber: userTable.isNewsletterSubscriber
		})
		.from(userTable)
		.where(eq(userTable.id, id))
		.limit(1);

	if (!row) return null;

	const [bookmarkCount, commentCount] = await Promise.all([
		db.select({ n: count() }).from(bookmarks).where(eq(bookmarks.userId, id)),
		db.select({ n: count() }).from(comments).where(eq(comments.userId, id))
	]);

	return {
		...row,
		bookmarkCount: bookmarkCount[0]?.n ?? 0,
		commentCount: commentCount[0]?.n ?? 0
	};
}

export async function getAllUsers() {
	return db
		.select({
			id: userTable.id,
			name: userTable.name,
			email: userTable.email,
			username: userTable.username,
			role: userTable.role,
			createdAt: userTable.createdAt,
			isNewsletterSubscriber: userTable.isNewsletterSubscriber
		})
		.from(userTable)
		.orderBy(userTable.createdAt);
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
	await db.update(userTable).set({ role }).where(eq(userTable.id, userId));
}

export async function deleteUser(userId: string): Promise<void> {
	await db.delete(userTable).where(eq(userTable.id, userId));
}
