import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	seo: {
		title: 'About — Open Tabs',
		description:
			'Open Tabs reads the reports, filings and numbers you have no time for, and turns them into one story that makes sense. Business, politics and geopolitics, through a money lens.'
	}
});
