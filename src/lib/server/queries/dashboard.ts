import { and, count, desc, eq, gte } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { authors, emailSends, posts, user } from '$lib/server/db/schema';
import { logger, startTimer } from '$lib/server/logger';

const SLOW_QUERY_MS = 500;

export interface RecentPost {
	id: string;
	title: string;
	status: string;
	publishedAt: Date | null;
	updatedAt: Date;
}

export interface DashboardStats {
	publishedPosts: number;
	draftPosts: number;
	scheduledPosts: number;
	recentPosts: RecentPost[];
}

/**
 * Story counts and the five most recently edited stories. Pass an author's user id to count
 * only that author's own stories.
 */
export async function getDashboardStats(authorUserId?: string): Promise<DashboardStats> {
	const elapsed = startTimer();
	const own = authorUserId ? eq(authors.userId, authorUserId) : undefined;

	const countWhere = (status: 'published' | 'draft' | 'scheduled') =>
		db
			.select({ n: count() })
			.from(posts)
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(and(eq(posts.status, status), own));

	const [publishedResult, draftResult, scheduledResult, recentResult] = await Promise.all([
		countWhere('published'),
		countWhere('draft'),
		countWhere('scheduled'),
		db
			.select({
				id: posts.id,
				title: posts.title,
				status: posts.status,
				publishedAt: posts.publishedAt,
				updatedAt: posts.updatedAt
			})
			.from(posts)
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(own)
			.orderBy(desc(posts.updatedAt))
			.limit(6)
	]);

	const ms = elapsed();
	if (ms > SLOW_QUERY_MS) {
		logger.warn('db.slow_query', { durationMs: ms, meta: { fn: 'getDashboardStats' } });
	}

	return {
		publishedPosts: publishedResult[0]?.n ?? 0,
		draftPosts: draftResult[0]?.n ?? 0,
		scheduledPosts: scheduledResult[0]?.n ?? 0,
		recentPosts: recentResult
	};
}

export interface UserStats {
	totalUsers: number;
	newUsers: number;
	totalSubscribers: number;
	newSubscribers: number;
}

export async function getUserStats(days: number = 30): Promise<UserStats> {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const [totalUsersR, newUsersR, totalSubsR, newSubsR] = await Promise.all([
		db.select({ n: count() }).from(user),
		db.select({ n: count() }).from(user).where(gte(user.createdAt, since)),
		db.select({ n: count() }).from(user).where(eq(user.isNewsletterSubscriber, true)),
		db
			.select({ n: count() })
			.from(user)
			.where(and(eq(user.isNewsletterSubscriber, true), gte(user.newsletterSubscribedAt, since)))
	]);
	return {
		totalUsers: totalUsersR[0]?.n ?? 0,
		newUsers: newUsersR[0]?.n ?? 0,
		totalSubscribers: totalSubsR[0]?.n ?? 0,
		newSubscribers: newSubsR[0]?.n ?? 0
	};
}

export interface EmailStats {
	totalSent: number;
	deliveredCount: number;
	bouncedCount: number;
}

export async function getEmailStats(days: number = 30): Promise<EmailStats> {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const rows = await db
		.select({ n: count(), event: emailSends.lastEvent })
		.from(emailSends)
		.where(gte(emailSends.sentAt, since))
		.groupBy(emailSends.lastEvent);
	let totalSent = 0;
	let deliveredCount = 0;
	let bouncedCount = 0;
	for (const row of rows) {
		totalSent += row.n;
		// An email that was opened or clicked was delivered first
		if (row.event === 'delivered' || row.event === 'opened' || row.event === 'clicked') {
			deliveredCount += row.n;
		}
		if (row.event === 'bounced' || row.event === 'bounce') bouncedCount += row.n;
	}
	return { totalSent, deliveredCount, bouncedCount };
}
