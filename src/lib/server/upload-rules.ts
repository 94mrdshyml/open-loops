// Rules for pictures sent to /api/upload. No imports, so the rules can be tested on their own.

const MB = 1024 * 1024;

/** Picture types let through, with the file ending used for each. */
export const IMAGE_EXTENSIONS = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/avif': 'avif'
} as const;

export type ImageType = keyof typeof IMAGE_EXTENSIONS;

export interface UploadLimits {
	/** Largest single picture, in bytes. */
	maxBytes: number;
	/** Most pictures one person may have in storage, or null for no limit. */
	maxFiles: number | null;
}

/**
 * Writers send cover pictures and article images, and are trusted accounts. Anyone can sign up as
 * a reader, and a reader only needs a profile picture, so readers get a small cap.
 */
export function uploadLimitsFor(role: string): UploadLimits {
	return role === 'admin' || role === 'author'
		? { maxBytes: 5 * MB, maxFiles: null }
		: { maxBytes: 5 * MB, maxFiles: 20 };
}

function startsWith(bytes: Uint8Array, text: string, offset = 0): boolean {
	for (let i = 0; i < text.length; i++) {
		if (bytes[offset + i] !== text.charCodeAt(i)) return false;
	}
	return true;
}

/** Looks at the first bytes of the file, not at what the sender says it is. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'image/jpeg';
	}
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		startsWith(bytes, 'PNG', 1) &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) {
		return 'image/png';
	}
	if (bytes.length >= 6 && (startsWith(bytes, 'GIF87a') || startsWith(bytes, 'GIF89a'))) {
		return 'image/gif';
	}
	if (bytes.length >= 12 && startsWith(bytes, 'RIFF') && startsWith(bytes, 'WEBP', 8)) {
		return 'image/webp';
	}
	if (
		bytes.length >= 12 &&
		startsWith(bytes, 'ftyp', 4) &&
		(startsWith(bytes, 'avif', 8) || startsWith(bytes, 'avis', 8))
	) {
		return 'image/avif';
	}
	return null;
}

/**
 * A folder name for one person's uploads. It is made from their id but does not show it, since
 * the folder name is part of the public picture address.
 */
export async function ownerFolder(userId: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
	const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
	return `uploads/u-${hex.slice(0, 16)}`;
}
