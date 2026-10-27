import { error, fail } from '@sveltejs/kit';

function calcReadingTime(contentJson: string): number {
	try {
		const text = JSON.stringify(JSON.parse(contentJson)).replace(/<[^>]+>/g, '');
		const words = text.trim().split(/\s+/).filter(Boolean).length;
		return Math.max(1, Math.round(words / 200));
	} catch {
		return 1;
	}
}
import { db } from '$lib/server/db/client';
import { posts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	getAdminPostById,
	getAllCategoriesAdmin,
	getPostOwnerUserId,
	getStoryPublicInfo,
	getPostTldrSource,
	setPostTldr,
	updatePost,
	upsertPostTags
} from '$lib/server/queries/posts';
import { notifyIndexNow, pathsForStory } from '$lib/server/indexnow';
import { ensureTldr, generateTldr, parseSubmittedTldr, tldrErrorText } from '$lib/server/tldr';
import { getAllTags, upsertTag } from '$lib/server/queries/tags';
import { getAllAuthors } from '$lib/server/queries/authors';
import { slugify } from '$lib/utils/slugify';
import type { PostStatus } from '$lib/server/db/schema';
import { instrumentAction } from '$lib/server/instrument-action';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [post, categories, allTags, authors] = await Promise.all([
		getAdminPostById(params.id),
		getAllCategoriesAdmin(),
		getAllTags(),
		getAllAuthors()
	]);

	if (!post) error(404, 'Post not found');

	if (locals.user?.role === 'author' && post.authorUserId !== locals.user.id) {
		error(403, 'Forbidden');
	}

	return { post, categories, allTags, authors };
};

export const actions: Actions = {
	save: async ({ request, params, locals, url, platform }) => {
		if (locals.user?.role === 'author') {
			const ownerUserId = await getPostOwnerUserId(params.id);
			if (ownerUserId !== locals.user.id) error(403, 'Forbidden');
		}

		const data = await request.formData();
		const id = params.id;

		const title = (data.get('title') as string | null)?.trim() ?? '';
		if (!title) return fail(400, { error: 'Title is required' });

		const rawSlug = (data.get('slug') as string | null)?.trim();
		const newSlug = rawSlug ? slugify(rawSlug) : slugify(title);

		const existing = await db
			.select({ id: posts.id })
			.from(posts)
			.where(eq(posts.slug, newSlug))
			.limit(1);
		if (existing.length > 0 && existing[0].id !== id) {
			return fail(409, { error: 'Slug already in use' });
		}

		const status = ((data.get('status') as string | null) ?? 'draft') as PostStatus;
		const rawPublishedAt = data.get('publishedAt') as string | null;
		const publishedAt =
			status === 'published' && !rawPublishedAt
				? new Date()
				: rawPublishedAt
					? new Date(rawPublishedAt)
					: null;

		const content = (data.get('content') as string | null) ?? '';
		const coverImageUrl = (data.get('featuredImage') as string | null) || null;
		const tagNames = (data.get('tags') as string | null) ?? '';
		const names = tagNames
			.split(',')
			.map((n) => n.trim())
			.filter(Boolean);

		// Needed to tell a first publish from an ordinary save (the editor autosaves every 3 s).
		const before = await getPostTldrSource(id);
		const beforePublic = await getStoryPublicInfo(id);

		return instrumentAction(
			'updatePost',
			`/dashboard/posts/${id}/edit`,
			locals.user?.id,
			async () => {
				await updatePost(id, {
					title,
					subtitle: (data.get('subtitle') as string | null) || null,
					slug: newSlug,
					excerpt: (data.get('excerpt') as string | null) || null,
					content,
					featuredImage: coverImageUrl,
					isFeatured: data.get('isFeatured') === 'true',
					status,
					publishedAt,
					categoryId: (data.get('categoryId') as string | null) || null,
					readingTime: calcReadingTime(content)
				});

				if (names.length > 0) {
					const tagObjects = await Promise.all(
						names.map(async (n) => {
							if (n.startsWith('new:')) return upsertTag(n.slice(4));
							return upsertTag(n);
						})
					);
					await upsertPostTags(
						id,
						tagObjects.map((t) => t.id)
					);
				} else {
					await upsertPostTags(id, []);
				}

				// Bullets the writer edited by hand are saved as sent. The editor only marks them
				// as edited after a keystroke, so an autosave never overwrites a generated TL;DR.
				if (data.get('tldrDirty') === '1') {
					await setPostTldr(id, parseSubmittedTldr(data.get('tldr')));
				}

				// The first time a story goes live, write its TL;DR. A failure never undoes the publish.
				let tldrError: string | undefined;
				if (status === 'published' && before?.status !== 'published') {
					const result = await ensureTldr(id, locals.user?.id, url.origin);
					if (result && !result.ok) tldrError = tldrErrorText(result);
				}

				// Tell search engines about a story that went live, changed while live, or came down.
				// An auto-save never does: it would fire every few seconds while writing.
				if (
					data.get('autosave') !== '1' &&
					(status === 'published' || before?.status === 'published')
				) {
					notifyIndexNow({ url, platform }, [
						...pathsForStory(beforePublic),
						...pathsForStory(await getStoryPublicInfo(id))
					]);
				}

				const current = await getPostTldrSource(id);
				return { success: true, tldr: current?.tldr ?? [], tldrError };
			}
		);
	},

	generateTldr: async ({ request, params, locals }) => {
		if (locals.user?.role === 'author') {
			const ownerUserId = await getPostOwnerUserId(params.id);
			if (ownerUserId !== locals.user.id) error(403, 'Forbidden');
		}

		// The editor sends its current text, so unsaved changes are included.
		const data = await request.formData();
		const content = (data.get('content') as string | null) ?? '';

		return instrumentAction(
			'generateTldr',
			`/dashboard/posts/${params.id}/edit`,
			locals.user?.id,
			async () => {
				const result = await generateTldr(content, locals.user?.id);
				if (!result.ok) return fail(502, { tldrError: tldrErrorText(result) });

				await setPostTldr(params.id, result.points);
				return { tldr: result.points };
			}
		);
	},

	delete: async ({ params, locals, url, platform }) => {
		if (locals.user?.role === 'author') {
			const ownerUserId = await getPostOwnerUserId(params.id);
			if (ownerUserId !== locals.user.id) error(403, 'Forbidden');
		}

		return instrumentAction(
			'deletePost',
			`/dashboard/posts/${params.id}/edit`,
			locals.user?.id,
			async () => {
				const info = await getStoryPublicInfo(params.id);
				await db.delete(posts).where(eq(posts.id, params.id));
				if (info?.status === 'published') notifyIndexNow({ url, platform }, pathsForStory(info));
				return { deleted: true };
			}
		);
	}
};
