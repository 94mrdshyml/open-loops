import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { posts } from '$lib/server/db/schema';
import type { PostStatus } from '$lib/server/db/schema';
import {
	countPublishedMissingTldr,
	getAdminPosts,
	getCategories,
	getNextPostMissingTldr,
	getPostOwnerUserId,
	getStoryPublicInfo,
	setPostFeatured
} from '$lib/server/queries/posts';
import { notifyIndexNow, pathsForStory } from '$lib/server/indexnow';
import { ensureTldr, isRunStopper, tldrErrorText } from '$lib/server/tldr';
import { logger } from '$lib/server/logger';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url, locals }) => {
	const status = (url.searchParams.get('status') as PostStatus | null) || undefined;
	const category = url.searchParams.get('category') || undefined;
	const search = url.searchParams.get('search') || undefined;
	const tldrParam = url.searchParams.get('tldr');
	const tldr = tldrParam === 'missing' || tldrParam === 'present' ? tldrParam : undefined;
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));

	try {
		const authorId = locals.user?.role === 'author' ? locals.user.id : undefined;

		const [{ posts: postList, total }, categories, missingTldr] = await Promise.all([
			getAdminPosts({
				status,
				categorySlug: category,
				search,
				tldr,
				limit: PAGE_SIZE,
				offset: (page - 1) * PAGE_SIZE,
				authorId
			}),
			getCategories(),
			// Only admins can run the bulk writer, so only they need the number.
			locals.user?.role === 'admin' ? countPublishedMissingTldr() : Promise.resolve(0)
		]);

		return {
			posts: postList,
			missingTldr,
			totalCount: total,
			totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
			page,
			filters: {
				status: status ?? null,
				category: category ?? null,
				search: search ?? null,
				tldr: tldr ?? null
			},
			categories
		};
	} catch (e) {
		console.error('Admin posts load error:', e);
		error(500, 'Failed to load posts');
	}
};

export const actions: Actions = {
	/**
	 * Writes the TL;DR for the newest published story that has none, then returns. The page
	 * calls this again and again, so no single request has to outlast the model.
	 */
	generateNextTldr: async ({ request, locals, url }) => {
		if (locals.user?.role !== 'admin') return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const skip = String(data.get('skip') ?? '')
			.split(',')
			.filter(Boolean);

		const next = await getNextPostMissingTldr(skip);
		if (!next) return { finished: true as const };

		const result = await ensureTldr(next.id, locals.user.id, url.origin);
		if (!result || result.ok) {
			return { finished: false as const, ok: true as const, postId: next.id, title: next.title };
		}
		return {
			finished: false as const,
			ok: false as const,
			postId: next.id,
			title: next.title,
			message: tldrErrorText(result),
			stop: isRunStopper(result.reason)
		};
	},

	deletePost: async ({ request, locals, url, platform }) => {
		const data = await request.formData();
		const postId = data.get('postId');

		if (!postId || typeof postId !== 'string') {
			return fail(400, { message: 'Post ID required' });
		}

		if (locals.user?.role === 'author') {
			const ownerUserId = await getPostOwnerUserId(postId);
			if (ownerUserId !== locals.user.id) {
				return fail(403, { message: 'Forbidden' });
			}
		}

		try {
			const info = await getStoryPublicInfo(postId);
			await db.delete(posts).where(eq(posts.id, postId));
			if (info?.status === 'published') notifyIndexNow({ url, platform }, pathsForStory(info));
			logger.info('action.deletePost', {
				route: '/dashboard/posts',
				userId: locals.user?.id,
				meta: { targetId: postId }
			});
			return { success: true };
		} catch (e) {
			logger.error('action.deletePost.failed', {
				route: '/dashboard/posts',
				userId: locals.user?.id,
				meta: { targetId: postId },
				error: e
			});
			console.error('Delete post error:', e);
			return fail(500, { message: 'Failed to delete post' });
		}
	},

	toggleFeatured: async ({ request, locals }) => {
		const data = await request.formData();
		const postId = data.get('postId');
		const featured = data.get('featured') === 'true';

		if (!postId || typeof postId !== 'string') {
			return fail(400, { message: 'Post ID required' });
		}

		if (locals.user?.role === 'author') {
			const ownerUserId = await getPostOwnerUserId(postId);
			if (ownerUserId !== locals.user.id) {
				return fail(403, { message: 'Forbidden' });
			}
		}

		try {
			await setPostFeatured(postId, featured);
			logger.info('action.toggleFeatured', {
				route: '/dashboard/posts',
				userId: locals.user?.id,
				meta: { targetId: postId, featured }
			});
			return { success: true };
		} catch (e) {
			logger.error('action.toggleFeatured.failed', {
				route: '/dashboard/posts',
				userId: locals.user?.id,
				meta: { targetId: postId },
				error: e
			});
			console.error('Toggle featured error:', e);
			return fail(500, { message: 'Failed to update featured status' });
		}
	}
};
