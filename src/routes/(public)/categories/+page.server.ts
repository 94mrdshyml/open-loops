import { error } from '@sveltejs/kit';
import { getCategories } from '$lib/server/queries/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let categories;
	try {
		categories = await getCategories();
	} catch (e) {
		console.error('DB error in categories load:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	return {
		categories,
		seo: {
			title: 'Categories — Open Tabs',
			description: 'Browse all topics covered on Open Tabs.'
		}
	};
};
