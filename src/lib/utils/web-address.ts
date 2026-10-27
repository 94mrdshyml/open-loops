/** True for a web address that starts with https:// and is not unreasonably long. */
export function isSecureWebAddress(value: string, maxLength = 500): boolean {
	if (value.length > maxLength) return false;
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

/** Shapes of the tracking IDs saved in Settings. An ID is put into the page's code, so it must be plain. */
const TRACKING_ID_SHAPES = {
	gtm: /^GTM-[A-Z0-9]{4,12}$/,
	ga4: /^G-[A-Z0-9]{4,14}$/,
	metaPixel: /^[0-9]{8,20}$/,
	umamiWebsite: /^[0-9a-fA-F-]{36}$/
} as const;

export type TrackingIdKind = keyof typeof TRACKING_ID_SHAPES;

export function isTrackingId(kind: TrackingIdKind, value: string): boolean {
	return TRACKING_ID_SHAPES[kind].test(value);
}
