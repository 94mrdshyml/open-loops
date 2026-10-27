import { error } from '@sveltejs/kit';
import { getDashboardStats, getEmailStats, getUserStats } from '$lib/server/queries/dashboard';
import { countPublishedMissingTldr } from '$lib/server/queries/posts';
import type { PageServerLoad } from './$types';

const VALID_DAYS = [7, 30, 90] as const;

export const load: PageServerLoad = async ({ url, locals }) => {
	const isAdmin = locals.user?.role === 'admin';
	const daysParam = parseInt(url.searchParams.get('days') ?? '30', 10);
	const days = (VALID_DAYS as readonly number[]).includes(daysParam) ? daysParam : 30;

	// Authors see their own stories only. People and email numbers are for admins.
	const [statsR, userStatsR, emailStatsR, missingTldrR] = await Promise.allSettled([
		getDashboardStats(isAdmin ? undefined : locals.user?.id),
		isAdmin ? getUserStats(days) : Promise.resolve(null),
		isAdmin ? getEmailStats(days) : Promise.resolve(null),
		isAdmin ? countPublishedMissingTldr() : Promise.resolve(0)
	]);

	if (statsR.status === 'rejected') {
		console.error('Dashboard DB error:', statsR.reason);
		error(500, 'Failed to load dashboard data');
	}

	return {
		days,
		stats: statsR.value,
		userStats: userStatsR.status === 'fulfilled' ? userStatsR.value : null,
		emailStats: emailStatsR.status === 'fulfilled' ? emailStatsR.value : null,
		missingTldr: missingTldrR.status === 'fulfilled' ? missingTldrR.value : 0
	};
};
