import { error, fail } from '@sveltejs/kit';
import { getPostBySlug, getRelatedPosts } from '$lib/server/queries/posts';
import { getSettings } from '$lib/server/queries/settings';
import { recordReadHistory } from '$lib/server/queries/read-history';
import { getApprovedComments, addComment } from '$lib/server/queries/comments';
import { isPostSaved, savePost, unsavePost } from '$lib/server/queries/bookmarks';
import { tiptapToHtml } from '$lib/utils/tiptap-to-html';
import { clipText, META_DESCRIPTION_MAX } from '$lib/utils/seo';
import type { Actions, PageServerLoad } from './$types';

/** Excerpt first, then subtitle, then the opening of the article itself. */
function metaDescription(post: {
	excerpt: string | null;
	subtitle: string | null;
	content: string;
}) {
	const own = post.excerpt?.trim() || post.subtitle?.trim();
	if (own) return clipText(own, META_DESCRIPTION_MAX);
	try {
		const html = tiptapToHtml(JSON.parse(post.content));
		return clipText(html.replace(/<[^>]+>/g, ' '), META_DESCRIPTION_MAX);
	} catch {
		return '';
	}
}

export const load: PageServerLoad = async ({ params, url, locals }) => {
	let post;
	try {
		post = await getPostBySlug(params.slug);
	} catch (e) {
		console.error('DB error loading post:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	if (!post) {
		error(404, 'Post not found');
	}

	// Fire-and-forget — never awaited, never delays page
	if (locals.user) {
		void recordReadHistory(locals.user.id, {
			slug: post.slug,
			title: post.title,
			coverImageUrl: post.coverImageUrl
		});
	}

	const [relatedPosts, settings, approvedComments, isSaved] = await Promise.all([
		getRelatedPosts(post.id, post.categoryId).catch(() => []),
		getSettings().catch(() => null),
		getApprovedComments(post.slug).catch(() => []),
		locals.user ? isPostSaved(locals.user.id, post.slug).catch(() => false) : Promise.resolve(false)
	]);

	const siteUrl = url.origin;
	const canonicalUrl = `${siteUrl}/posts/${post.slug}`;

	return {
		post,
		relatedPosts,
		approvedComments,
		isSaved,
		user: locals.user
			? {
					id: locals.user.id,
					name: locals.user.name,
					firstName: locals.user.firstName,
					avatarUrl: locals.user.avatarUrl,
					username: locals.user.username
				}
			: null,
		siteUrl,
		seo: {
			title: post.title,
			description: metaDescription(post),
			ogType: 'article',
			ogImageUrl: post.coverImageUrl ?? settings?.og_image_url ?? null,
			canonicalUrl,
			publishedTime: post.publishedAt?.toISOString() ?? null,
			modifiedTime: post.updatedAt?.toISOString() ?? null,
			authorName: post.author?.name ?? 'Open Tabs'
		}
	};
};

export const actions: Actions = {
	toggleSave: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(401, { saveError: 'Sign in to save posts.' });
		}
		const slug = params.slug;
		const saved = await isPostSaved(locals.user.id, slug).catch(() => false);
		if (saved) {
			await unsavePost(locals.user.id, slug);
			return { isSaved: false };
		}
		const post = await getPostBySlug(slug);
		if (!post) return fail(404, { saveError: 'Post not found.' });
		await savePost(locals.user.id, slug, post.title, post.coverImageUrl);
		return { isSaved: true };
	},

	addComment: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { commentError: 'You must be signed in to comment.' });
		}

		const data = await request.formData();
		const body = (data.get('body') as string | null)?.trim() ?? '';

		if (body.length < 10) {
			return fail(400, { commentError: 'Comment must be at least 10 characters.' });
		}
		if (body.length > 1000) {
			return fail(400, { commentError: 'Comment must be under 1000 characters.' });
		}

		try {
			await addComment(locals.user.id, params.slug, body);
		} catch (e) {
			console.error('Failed to add comment:', e);
			return fail(500, { commentError: 'Failed to submit comment. Please try again.' });
		}

		return { commentSuccess: true };
	}
};
