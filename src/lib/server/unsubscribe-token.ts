// The link in a newsletter email carries a token made from the person's email and the site's secret.
// Only the site can make one, so nobody can unsubscribe someone else by guessing. No imports, so
// it can be tested on its own.

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
	try {
		const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
		return new Uint8Array(Array.from(atob(padded), (c) => c.charCodeAt(0)));
	} catch {
		return null;
	}
}

async function signingKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		[usage]
	);
}

/** `<email>.<signature>`, both safe to put in a web address. */
export async function makeUnsubscribeToken(email: string, secret: string): Promise<string> {
	const clean = email.trim().toLowerCase();
	const body = toBase64Url(encoder.encode(clean));
	const signature = await crypto.subtle.sign(
		'HMAC',
		await signingKey(secret, 'sign'),
		encoder.encode(body)
	);
	return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** The email inside a genuine token, or null for anything else. */
export async function readUnsubscribeToken(token: string, secret: string): Promise<string | null> {
	const [body, signature, ...rest] = token.split('.');
	if (!body || !signature || rest.length > 0) return null;
	const signatureBytes = fromBase64Url(signature);
	const bodyBytes = fromBase64Url(body);
	if (!signatureBytes || !bodyBytes) return null;
	const ok = await crypto.subtle.verify(
		'HMAC',
		await signingKey(secret, 'verify'),
		signatureBytes,
		encoder.encode(body)
	);
	return ok ? new TextDecoder().decode(bodyBytes) : null;
}
