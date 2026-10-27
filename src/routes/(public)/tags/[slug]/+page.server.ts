import { error } from '@sveltejs/kit';
import { getTagBySlug } from '$lib/server/queries/tags';
import { getPostsByTag } from '$lib/server/queries/posts';
import { MIN_INDEXABLE_TAG_POSTS } from '$lib/utils/seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	let tag;
	try {
		tag = await getTagBySlug(params.slug);
	} catch (e) {
		console.error('DB error in tag load:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	if (!tag) throw error(404, 'Tag not found');

	let posts;
	try {
		posts = await getPostsByTag(params.slug, { limit: 20 });
	} catch (e) {
		console.error('DB error loading posts for tag:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	const siteUrl = url.origin;
	const canonicalUrl = `${siteUrl}/tags/${tag.slug}`;

	return {
		tag,
		posts,
		siteUrl,
		seo: {
			title: `${tag.name} — Open Tabs`,
			description: `All Open Tabs articles tagged ${tag.name}.`,
			canonicalUrl,
			// Thin tag pages stay usable for readers but are kept out of search results.
			...(posts.length < MIN_INDEXABLE_TAG_POSTS ? { robots: 'noindex, follow' } : {})
		}
	};
};
