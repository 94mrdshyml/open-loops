import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth/index';
import { logger } from '$lib/server/logger';
import { checkDueStoriesSoon } from '$lib/server/scheduled-publish';
import { withSecurityHeaders } from '$lib/server/security-headers';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import type { UserRole } from '$lib/types/index';

const ADMIN_ONLY_ROUTES = [
	'/dashboard/settings',
	'/dashboard/authors',
	'/dashboard/categories',
	'/dashboard/tags',
	'/dashboard/comments',
	'/dashboard/users',
	'/dashboard/newsletter'
];

// The sign-in and sign-up pages call the auth code directly. Better Auth's own web addresses for the
// same jobs are not used by the site, and they would skip the sign-in lock and the sign-up limits.
const CLOSED_AUTH_PATHS = ['/api/auth/sign-in', '/api/auth/sign-up'];

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	try {
		const authSession = await auth.api.getSession({ headers: event.request.headers });

		if (authSession?.user) {
			const u = authSession.user as Record<string, unknown>;
			let role = (u.role as string | undefined) ?? null;

			// Existing sessions pre-migration won't have role — fetch from DB
			if (!role) {
				const [dbUser] = await db
					.select({
						role: userTable.role,
						firstName: userTable.firstName,
						lastName: userTable.lastName,
						username: userTable.username,
						avatarUrl: userTable.avatarUrl,
						createdAt: userTable.createdAt,
						isNewsletterSubscriber: userTable.isNewsletterSubscriber,
						resendContactId: userTable.resendContactId
					})
					.from(userTable)
					.where(eq(userTable.id, u.id as string))
					.limit(1);
				if (dbUser) {
					role = dbUser.role;
					u.firstName = dbUser.firstName;
					u.lastName = dbUser.lastName;
					u.username = dbUser.username;
					u.avatarUrl = dbUser.avatarUrl;
					u.createdAt = dbUser.createdAt;
					u.isNewsletterSubscriber = dbUser.isNewsletterSubscriber;
					u.resendContactId = dbUser.resendContactId;
				}
			}

			event.locals.user = {
				id: u.id as string,
				email: u.email as string,
				name: u.name as string,
				firstName: (u.firstName as string | null) ?? null,
				lastName: (u.lastName as string | null) ?? null,
				username: (u.username as string | null) ?? null,
				role: (role ?? 'reader') as UserRole,
				avatarUrl: (u.avatarUrl as string | null) ?? null,
				emailVerified: (u.emailVerified as boolean) ?? false,
				createdAt: (u.createdAt as Date) ?? new Date(),
				isNewsletterSubscriber: (u.isNewsletterSubscriber as boolean) ?? false,
				resendContactId: (u.resendContactId as string | null) ?? null
			};
			event.locals.session = authSession.session;
		} else {
			event.locals.user = null;
			event.locals.session = null;
		}
	} catch (e) {
		event.locals.user = null;
		event.locals.session = null;
		const hasCookie = event.request.headers.get('cookie')?.includes('better-auth');
		if (hasCookie) {
			const logPromise = logger.error('auth.session_validation_failed', { error: e });
			event.platform?.ctx.waitUntil(logPromise);
		}
	}

	const path = event.url.pathname;
	const user = event.locals.user;

	if (CLOSED_AUTH_PATHS.some((closed) => path === closed || path.startsWith(`${closed}/`))) {
		return withSecurityHeaders(
			new Response('Not found', { status: 404 }),
			event.url.protocol === 'https:'
		);
	}

	// Route protection
	if (path.startsWith('/dashboard')) {
		if (!user) redirect(302, '/login');
		if (user.role === 'reader') redirect(302, '/profile');
	}

	if (ADMIN_ONLY_ROUTES.some((r) => path.startsWith(r))) {
		if (user?.role !== 'admin') redirect(302, '/dashboard');
	}

	if (path.startsWith('/profile')) {
		if (!user) redirect(302, `/login?redirect=${encodeURIComponent(path)}`);
	}

	const response = await svelteKitHandler({ event, resolve, auth, building });
	return withSecurityHeaders(response, event.url.protocol === 'https:');
};

// Stories scheduled for later go live on the first visit after their time (the check is throttled).
const handleDueStories: Handle = async ({ event, resolve }) => {
	if (!building && event.request.method === 'GET' && event.url.pathname !== '/api/cron/publish') {
		checkDueStoriesSoon(event);
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleDueStories, handleBetterAuth);
