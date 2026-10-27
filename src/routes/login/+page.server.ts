import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth/index';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import { ensureAuthorProfile } from '$lib/server/queries/authors';
import { checkLimit, clearLimit, clientKey, countHit } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const role = locals.user.role;
		if (role === 'admin' || role === 'author') redirect(302, '/dashboard');
		redirect(302, '/profile');
	}
	return { redirectTo: url.searchParams.get('redirect') ?? null };
};

// Wrong passwords: 5 for one email, or 30 from one address (guessing across many emails),
// within 15 minutes, and that email or address is locked until the time is up.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_ADDRESS = 30;

function waitText(seconds: number): string {
	const minutes = Math.max(1, Math.ceil(seconds / 60));
	return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

export const actions: Actions = {
	default: async ({ request, url, getClientAddress }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();
		const redirectTo = data.get('redirectTo')?.toString() ?? null;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.' });
		}

		const emailKey = `login:${email.trim().toLowerCase()}`;
		const addressKey = `login-ip:${clientKey(getClientAddress)}`;
		const [emailState, addressState] = await Promise.all([
			checkLimit(emailKey, MAX_FAILURES_PER_EMAIL, LOGIN_WINDOW_MS),
			checkLimit(addressKey, MAX_FAILURES_PER_ADDRESS, LOGIN_WINDOW_MS)
		]);
		if (emailState.blocked || addressState.blocked) {
			const seconds = Math.max(emailState.retryAfterSeconds, addressState.retryAfterSeconds);
			logger.warn('auth.login.locked', { route: '/login', statusCode: 429 });
			return fail(429, {
				error: `Too many wrong tries. Please wait ${waitText(seconds)} and try again.`
			});
		}

		let userId: string;
		let userName: string;
		try {
			const result = await auth.api.signInEmail({ body: { email, password } });
			userId = result.user.id;
			userName = result.user.name;
			logger.info('auth.login.success', { route: '/login', userId });
		} catch {
			await Promise.all([
				countHit(emailKey, MAX_FAILURES_PER_EMAIL, LOGIN_WINDOW_MS),
				countHit(addressKey, MAX_FAILURES_PER_ADDRESS, LOGIN_WINDOW_MS)
			]);
			logger.warn('auth.login.failed', {
				route: '/login',
				statusCode: 401,
				meta: { reason: 'invalid_credentials' }
			});
			return fail(401, { error: 'Invalid email or password.' });
		}

		await clearLimit(emailKey);

		// Fetch role from DB for redirect decision
		const [dbUser] = await db
			.select({ role: userTable.role })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.limit(1);

		const role = dbUser?.role ?? 'reader';

		if (role === 'admin' || role === 'author') {
			await ensureAuthorProfile(userId, userName);
		}

		// Safe redirect param — only /profile paths
		if (redirectTo && redirectTo.startsWith('/profile')) {
			redirect(302, redirectTo);
		}

		if (role === 'admin' || role === 'author') {
			redirect(302, '/dashboard');
		}

		// Suppress unused url warning
		void url;
		redirect(302, '/profile');
	}
};
