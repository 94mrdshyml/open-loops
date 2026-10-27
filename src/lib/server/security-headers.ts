// Safety headers sent with every page. No imports, so the rules can be tested on their own.

/**
 * What a page may load. Scripts may run inline because the analytics snippets are inline, so
 * this does not stop injected inline code; it stops pages being framed, plug-ins, forms posting
 * to other sites, a changed base address, and scripts or requests going to sites that are not
 * listed. The list is the analytics tools the site can be set up to use.
 */
const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://*.umami.is https://www.googletagmanager.com https://connect.facebook.net https://static.cloudflareinsights.com",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' data: https://fonts.gstatic.com",
	// Cover pictures and profile pictures can come from any web address
	"img-src 'self' data: blob: https:",
	"connect-src 'self' https://*.umami.is https://api-gateway.umami.dev https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.google.com https://*.g.doubleclick.net https://*.facebook.com https://cloudflareinsights.com",
	'frame-src https://www.googletagmanager.com',
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'"
].join('; ');

/** The headers every response gets, whether it is a page or a file. */
export const BASE_SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()'
};

export function securityHeaders(isHttps: boolean): Record<string, string> {
	return {
		...BASE_SECURITY_HEADERS,
		// Pages that are not HTML (feeds, JSON) ignore this one, so it is safe to send everywhere
		'Content-Security-Policy': isHttps
			? `${CONTENT_SECURITY_POLICY}; upgrade-insecure-requests`
			: CONTENT_SECURITY_POLICY,
		// One year. Only sent over HTTPS, and not for sub-sites, so nothing else is affected.
		...(isHttps ? { 'Strict-Transport-Security': 'max-age=31536000' } : {})
	};
}

export function withSecurityHeaders(response: Response, isHttps: boolean): Response {
	const headers = securityHeaders(isHttps);
	const set = (target: Response) => {
		for (const [name, value] of Object.entries(headers)) target.headers.set(name, value);
		return target;
	};
	try {
		return set(response);
	} catch {
		// Some responses (for example ones passed on from another request) have read-only headers
		return set(new Response(response.body, response));
	}
}
