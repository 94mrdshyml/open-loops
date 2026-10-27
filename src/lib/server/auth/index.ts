import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db/client';

const enc = new TextEncoder();

async function pbkdf2Hash(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
		key,
		256
	);
	const saltHex = Array.from(salt)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	const hashHex = Array.from(new Uint8Array(bits))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return `pbkdf2:${saltHex}:${hashHex}`;
}

async function pbkdf2Verify({
	hash,
	password
}: {
	hash: string;
	password: string;
}): Promise<boolean> {
	const parts = hash.split(':');
	if (parts[0] !== 'pbkdf2' || parts.length !== 3) return false;
	const salt = new Uint8Array(parts[1].match(/.{2}/g)!.map((h) => parseInt(h, 16)));
	const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
		key,
		256
	);
	const hashHex = Array.from(new Uint8Array(bits))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return hashHex === parts[2];
}

type Auth = ReturnType<typeof betterAuth>;

let _auth: Auth | null = null;

function getInstance(): Auth {
	if (!_auth) {
		_auth = betterAuth({
			baseURL: env.BETTER_AUTH_URL ?? env.ORIGIN,
			secret: env.BETTER_AUTH_SECRET,
			database: drizzleAdapter(db, { provider: 'pg' }),
			emailAndPassword: { enabled: true, password: { hash: pbkdf2Hash, verify: pbkdf2Verify } },
			plugins: [sveltekitCookies(getRequestEvent)],
			user: {
				additionalFields: {
					firstName: { type: 'string', required: false, input: false },
					lastName: { type: 'string', required: false, input: false },
					username: { type: 'string', required: false, input: false },
					role: { type: 'string', required: false, defaultValue: 'reader', input: false },
					avatarUrl: { type: 'string', required: false, input: false },
					isNewsletterSubscriber: {
						type: 'boolean',
						required: false,
						defaultValue: false,
						input: false
					},
					resendContactId: { type: 'string', required: false, input: false }
				}
			}
		});
	}
	return _auth;
}

export const auth: Auth = new Proxy({} as Auth, {
	get(_, prop) {
		return getInstance()[prop as keyof Auth];
	}
});

export type Session = Auth['$Infer']['Session']['session'];
export type User = Auth['$Infer']['Session']['user'];
