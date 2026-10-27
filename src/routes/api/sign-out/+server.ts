import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth/index';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	await auth.api.signOut({ headers: request.headers });

	let redirectTo = '/login';
	try {
		const formData = await request.formData();
		const requested = formData.get('redirectTo');
		// Only allow same-origin relative paths — never trust an absolute URL
		// or protocol-relative "//host" value here (open-redirect risk).
		if (typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//')) {
			redirectTo = requested;
		}
	} catch {
		// no form body present — fall back to default
	}

	redirect(302, redirectTo);
};
