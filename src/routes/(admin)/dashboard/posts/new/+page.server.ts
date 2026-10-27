import { fail, redirect } from '@sveltejs/kit';

function calcReadingTime(contentJson: string): number {
	try {
		const text = JSON.stringify(JSON.parse(contentJson)).replace(/<[^>]+>/g, '');
		const words = text.trim().split(/\s+/).filter(Boolean).length;
		return Math.max(1, Math.round(words / 200));
	} catch {
		return 1;
	}
}
import { generateRandom } from '$lib/server/db/generate-id';
import { db } from '$lib/server/db/client';
import { posts } from '$lib/server/db/schema';
import {
	getAllCategoriesAdmin,
	createPost,
	getStoryPublicInfo,
	setPostTldr,
	upsertPostTags
} from '$lib/server/queries/posts';
import { getAllTags, upsertTag } from '$lib/server/queries/tags';
import { getAllAuthors } from '$lib/server/queries/authors';
import { notifyIndexNow, pathsForStory } from '$lib/server/indexnow';
import { ensureTldr, parseSubmittedTldr } from '$lib/server/tldr';
import { slugify } from '$lib/utils/slugify';
import { eq } from 'drizzle-orm';
import type { PostStatus } from '$lib/server/db/schema';
import { instrumentAction } from '$lib/server/instrument-action';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [categories, allTags, allAuthors] = await Promise.all([
		getAllCategoriesAdmin(),
		getAllTags(),
		getAllAuthors()
	]);

	const defaultAuthorId = locals.user
		? (allAuthors.find((a) => a.userId === locals.user!.id)?.id ?? null)
		: null;

	return { categories, allTags, authors: allAuthors, defaultAuthorId };
};

export const actions: Actions = {
	save: async ({ request, locals, url, platform }) => {
		const data = await request.formData();

		const title = (data.get('title') as string | null)?.trim() ?? '';
		if (!title) return fail(400, { error: 'Title is required' });

		const authorId = (data.get('authorId') as string | null)?.trim() ?? '';
		if (!authorId) return fail(400, { error: 'Author is required' });

		// A writer can only publish under their own name. Admins can choose any author.
		if (locals.user?.role === 'author') {
			const own = (await getAllAuthors()).find((a) => a.userId === locals.user?.id);
			if (own?.id !== authorId) return fail(403, { error: 'You can only write as yourself' });
		}

		const rawSlug = (data.get('slug') as string | null)?.trim();
		const slug = rawSlug ? slugify(rawSlug) : slugify(title) + '-' + generateRandom().slice(0, 6);

		const existing = await db
			.select({ id: posts.id })
			.from(posts)
			.where(eq(posts.slug, slug))
			.limit(1);
		if (existing.length > 0) return fail(409, { error: 'Slug already in use' });

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
		const tagNameList = tagNames.split(',').filter(Boolean);

		return instrumentAction('createPost', '/dashboard/posts/new', locals.user?.id, async () => {
			const postId = await createPost({
				title,
				subtitle: (data.get('subtitle') as string | null) || null,
				slug,
				excerpt: (data.get('excerpt') as string | null) || null,
				content,
				featuredImage: coverImageUrl,
				isFeatured: data.get('isFeatured') === 'true',
				status,
				publishedAt,
				authorId,
				categoryId: (data.get('categoryId') as string | null) || null,
				readingTime: calcReadingTime(content)
			});

			if (tagNameList.length > 0) {
				const tagObjects = await Promise.all(
					tagNameList.map(async (n) => {
						const trimmed = n.trim();
						if (trimmed.startsWith('new:')) return upsertTag(trimmed.slice(4));
						return upsertTag(trimmed);
					})
				);
				await upsertPostTags(
					postId,
					tagObjects.map((t) => t.id)
				);
			}

			// Points the writer typed are saved as they are. Otherwise a story created as published
			// gets its TL;DR now. A failure never undoes the publish; the editor opened next has a
			// Generate button.
			const typedTldr = parseSubmittedTldr(data.get('tldr'));
			if (typedTldr.length > 0) await setPostTldr(postId, typedTldr);
			if (status === 'published') {
				await ensureTldr(postId, locals.user?.id, url.origin);
				if (data.get('autosave') !== '1') {
					notifyIndexNow({ url, platform }, pathsForStory(await getStoryPublicInfo(postId)));
				}
			}

			redirect(303, `/dashboard/posts/${postId}/edit`);
		});
	}
};
