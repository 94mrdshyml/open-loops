import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth/index';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import { clientKey, countHit } from '$lib/server/rate-limit';
import {
	syncUserToResend,
	sendRegistrationWelcome,
	sendNewsletterWelcome
} from '$lib/server/resend';
import { getSettingValue } from '$lib/server/queries/settings';
import type { Actions, PageServerLoad } from './$types';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type FieldErrors = {
	firstName?: string;
	lastName?: string;
	email?: string;
	username?: string;
	password?: string;
	general?: string;
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		const role = locals.user.role;
		if (role === 'admin' || role === 'author') redirect(302, '/dashboard');
		redirect(302, '/profile');
	}
	const askNewsletter = await getSettingValue('ask_newsletter_on_register').catch(() => null);
	return { askNewsletterOnRegister: askNewsletter !== 'false' };
};

export const actions: Actions = {
	register: async ({ request, platform, getClientAddress }) => {
		const data = await request.formData();

		// Bots fill in the hidden box. Sign-ups are also limited per address, so one person or
		// script cannot create accounts, or send welcome emails to strangers, in bulk.
		if (data.get('website')?.toString()) {
			return fail(400, {
				errors: { general: 'Registration failed. Please try again.' } as FieldErrors
			});
		}
		const signupState = await countHit(`signup:${clientKey(getClientAddress)}`, 5, 60 * 60 * 1000);
		if (signupState.blocked) {
			return fail(429, {
				errors: {
					general: 'Too many sign-ups from this connection. Please try again in an hour.'
				} as FieldErrors
			});
		}

		const firstName = data.get('firstName')?.toString().trim() ?? '';
		const lastName = data.get('lastName')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const username = data.get('username')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';
		const newsletterOptIn = data.get('newsletterOptIn') === 'true';

		const errors: FieldErrors = {};

		if (!firstName) errors.firstName = 'First name is required.';
		if (!lastName) errors.lastName = 'Last name is required.';
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email required.';
		if (!USERNAME_RE.test(username))
			errors.username = 'Only lowercase letters, numbers and underscores. 3–20 characters.';
		if (!password || password.length < 8)
			errors.password = 'Password must be at least 8 characters.';

		if (Object.keys(errors).length > 0) return fail(400, { errors });

		// Username uniqueness check
		let existingUsername: { id: string } | undefined;
		try {
			[existingUsername] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.username, username))
				.limit(1);
		} catch {
			return fail(500, {
				errors: { general: 'Service temporarily unavailable. Please try again.' } as FieldErrors
			});
		}

		if (existingUsername) {
			return fail(400, { errors: { username: 'Username is taken.' } as FieldErrors });
		}

		// Create user via Better Auth
		let userId: string;
		try {
			const result = await auth.api.signUpEmail({
				body: {
					name: `${firstName} ${lastName}`,
					email,
					password
				}
			});
			userId = result.user.id;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			logger.error('auth.register.failed', { route: '/register', meta: { error: msg } });
			if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('duplicate')) {
				return fail(400, {
					errors: { general: 'An account already exists. Try signing in.' } as FieldErrors
				});
			}
			return fail(500, {
				errors: { general: 'Registration failed. Please try again.' } as FieldErrors
			});
		}

		// Update extra fields that Better Auth didn't set
		await db
			.update(userTable)
			.set({
				firstName,
				lastName,
				username,
				role: 'reader',
				isNewsletterSubscriber: newsletterOptIn,
				newsletterSubscribedAt: newsletterOptIn ? new Date() : null,
				newsletterSource: newsletterOptIn ? 'registration' : null
			})
			.where(eq(userTable.id, userId));

		// waitUntil keeps this alive past the redirect response — plain
		// fire-and-forget gets killed by the Workers runtime once it's sent.
		platform?.ctx.waitUntil(
			(async () => {
				const contactId = await syncUserToResend({
					email,
					firstName,
					lastName,
					isNewsletterSubscriber: newsletterOptIn
				});
				if (contactId) {
					await db
						.update(userTable)
						.set({ resendContactId: contactId })
						.where(eq(userTable.id, userId));
				}
			})()
		);

		void logger.info('auth.register.success', {
			route: '/register',
			userId,
			meta: { newsletterOptIn }
		});

		await sendRegistrationWelcome({
			to: email,
			firstName,
			siteUrl: env.PUBLIC_SITE_URL ?? undefined,
			userId
		});

		if (newsletterOptIn) {
			await sendNewsletterWelcome({
				to: email,
				firstName,
				siteUrl: env.PUBLIC_SITE_URL ?? undefined,
				userId
			});
		}

		redirect(302, '/profile?welcome=1');
	}
};
