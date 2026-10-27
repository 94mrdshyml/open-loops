import { error } from '@sveltejs/kit';
import { getPublishedTagCounts } from '$lib/server/queries/tags';
import { buildTagCloud, groupTagsByLetter } from '$lib/utils/tag-cloud';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let all;
	try {
		all = await getPublishedTagCounts();
	} catch (e) {
		console.error('DB error in tags load:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}

	return {
		total: all.length,
		cloud: buildTagCloud(all),
		groups: groupTagsByLetter(all),
		seo: {
			title: 'Tags — Open Tabs',
			description: 'Every subject tag on Open Tabs. The bigger the word, the more stories it holds.'
		}
	};
};
