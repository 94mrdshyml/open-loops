import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { generateFromEmail } from 'unique-username-generator';
import { auth } from '$lib/server/auth/index';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import { clientKey, countHit } from '$lib/server/rate-limit';
import { syncUserToResend, sendNewsletterWelcome } from '$lib/server/resend';
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

async function generateAvailableUsername(email: string): Promise<string> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const digitCount = attempt === 0 ? 2 : attempt + 2;
		const raw = generateFromEmail(email, digitCount)
			.toLowerCase()
			.replace(/[^a-z0-9_]/g, '');
		// Truncate from the front (name portion), not the back — the trailing
		// digits are what vary between retry attempts and must survive.
		const candidate =
			raw.length > 20 ? raw.slice(0, 20 - digitCount) + raw.slice(-digitCount) : raw;
		if (!USERNAME_RE.test(candidate)) continue;

		const [existing] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.username, candidate))
			.limit(1);
		if (!existing) return candidate;
	}
	return `reader${Date.now().toString(36)}`.slice(0, 20);
}

export const load: PageServerLoad = async ({ url, locals }) => {
	if (locals.user) redirect(302, '/profile');

	const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';

	if (email) {
		const [existing] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.email, email))
			.limit(1);
		if (existing) redirect(302, `/login?redirect=/profile`);
	}

	const username = email ? await generateAvailableUsername(email) : '';

	return { email, username };
};

export const actions: Actions = {
	setup: async ({ request, platform, getClientAddress }) => {
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
		const email = data.get('email')?.toString().trim().toLowerCase() ?? '';
		const username = data.get('username')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';

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
				body: { name: `${firstName} ${lastName}`, email, password }
			});
			userId = result.user.id;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			logger.error('auth.register.failed', {
				route: '/newsletter/setup',
				meta: { error: msg }
			});
			if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('duplicate')) {
				return fail(400, {
					errors: {
						general: 'An account already exists with this email. Try signing in.'
					} as FieldErrors
				});
			}
			return fail(500, {
				errors: { general: 'Registration failed. Please try again.' } as FieldErrors
			});
		}

		await db
			.update(userTable)
			.set({
				firstName,
				lastName,
				username,
				role: 'reader',
				isNewsletterSubscriber: true,
				newsletterSubscribedAt: new Date(),
				newsletterSource: 'subscribe_form'
			})
			.where(eq(userTable.id, userId));

		// waitUntil keeps these alive past the redirect response — plain
		// fire-and-forget gets killed by the Workers runtime once it's sent.
		platform?.ctx.waitUntil(
			(async () => {
				const contactId = await syncUserToResend({
					email,
					firstName,
					lastName,
					isNewsletterSubscriber: true
				});
				if (contactId) {
					await db
						.update(userTable)
						.set({ resendContactId: contactId })
						.where(eq(userTable.id, userId));
				}
			})()
		);

		platform?.ctx.waitUntil(
			sendNewsletterWelcome({
				to: email,
				firstName,
				siteUrl: env.PUBLIC_SITE_URL ?? undefined,
				userId
			}).catch((err) => {
				void logger.warn('email.send.failed', { route: '/newsletter/setup', error: err });
			})
		);

		redirect(302, '/profile?welcome=1&subscribed=1');
	}
};
