import { eq, and, gte, count, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';

export interface NewsletterStats {
	total: number;
	newThisMonth: number;
	bySource: { source: string; count: number }[];
}

export interface NewsletterSubscriber {
	id: string;
	email: string;
	name: string;
	firstName: string | null;
	lastName: string | null;
	source: string | null;
	subscribedAt: Date | null;
}

export async function getNewsletterStats(): Promise<NewsletterStats> {
	const now = new Date();
	const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [totalRow, newThisMonthRow, bySourceRows] = await Promise.all([
		db.select({ count: count() }).from(userTable).where(eq(userTable.isNewsletterSubscriber, true)),
		db
			.select({ count: count() })
			.from(userTable)
			.where(
				and(
					eq(userTable.isNewsletterSubscriber, true),
					gte(userTable.newsletterSubscribedAt, firstOfMonth)
				)
			),
		db
			.select({
				source: sql<string>`COALESCE(${userTable.newsletterSource}, 'unknown')`,
				count: count()
			})
			.from(userTable)
			.where(eq(userTable.isNewsletterSubscriber, true))
			.groupBy(userTable.newsletterSource)
	]);

	return {
		total: totalRow[0]?.count ?? 0,
		newThisMonth: newThisMonthRow[0]?.count ?? 0,
		bySource: bySourceRows.map((r) => ({ source: r.source, count: r.count }))
	};
}

export async function getRecentSubscribers(limit = 20): Promise<NewsletterSubscriber[]> {
	const rows = await db
		.select({
			id: userTable.id,
			email: userTable.email,
			name: userTable.name,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			source: userTable.newsletterSource,
			subscribedAt: userTable.newsletterSubscribedAt
		})
		.from(userTable)
		.where(eq(userTable.isNewsletterSubscriber, true))
		.orderBy(sql`${userTable.newsletterSubscribedAt} DESC NULLS LAST`)
		.limit(limit);
	return rows;
}
