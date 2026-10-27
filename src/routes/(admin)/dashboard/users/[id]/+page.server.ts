import { redirect } from '@sveltejs/kit';
import { getUserById } from '$lib/server/queries/users';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/dashboard');

	const user = await getUserById(params.id);
	if (!user) redirect(302, '/dashboard/users');

	return { targetUser: user };
};
