import { error } from '@sveltejs/kit';
import { getAuthorBySlug } from '$lib/server/queries/authors';
import { getPostsByAuthor } from '$lib/server/queries/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	let author;
	try {
		author = await getAuthorBySlug(params.slug);
	} catch (e) {
		console.error('DB error in author load:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	if (!author) throw error(404, 'Author not found');

	let posts;
	try {
		posts = await getPostsByAuthor(params.slug, { limit: 20 });
	} catch (e) {
		console.error('DB error loading posts for author:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	// Readers see the public name when one is set; the page address keeps the original slug.
	const shownName = author.publicName || author.displayName;
	const siteUrl = url.origin;
	const canonicalUrl = `${siteUrl}/authors/${author.slug}`;

	return {
		author: { ...author, displayName: shownName },
		posts,
		siteUrl,
		seo: {
			title: `${shownName} — Open Tabs`,
			description: author.bio ?? `Read all Open Tabs articles by ${shownName}.`,
			canonicalUrl,
			ogType: 'profile'
		}
	};
};
