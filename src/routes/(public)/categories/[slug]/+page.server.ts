import { error } from '@sveltejs/kit';
import { getCategoryBySlug, getPosts, getPostCount } from '$lib/server/queries/posts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ params, url }) => {
	let category;
	try {
		category = await getCategoryBySlug(params.slug);
	} catch (e) {
		console.error('DB error in category load:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	if (!category) throw error(404, 'Category not found');

	const rawPage = parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
	const offset = (page - 1) * PAGE_SIZE;

	let posts;
	let totalCount;
	try {
		[posts, totalCount] = await Promise.all([
			getPosts({ categorySlug: params.slug, limit: PAGE_SIZE, offset }),
			getPostCount({ categorySlug: params.slug })
		]);
	} catch (e) {
		console.error('DB error in category load:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	const totalPages = Math.ceil(totalCount / PAGE_SIZE);

	return {
		category,
		posts,
		totalCount,
		page,
		totalPages,
		seo: {
			title: `${category.name} — Open Tabs`,
			description:
				category.description ?? `Explore all stories filed under ${category.name} on Open Tabs.`
		}
	};
};
