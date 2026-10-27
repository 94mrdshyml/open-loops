export interface ImageOptions {
	width?: number;
	height?: number;
	fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
	format?: 'webp' | 'avif' | 'auto';
	quality?: number;
}

const PRESETS = {
	heroImage: { width: 1200, height: 630, fit: 'cover', format: 'webp', quality: 85 },
	cardImage: { width: 640, height: 360, fit: 'cover', format: 'webp', quality: 80 },
	thumbnailImage: { width: 320, height: 180, fit: 'cover', format: 'webp', quality: 75 },
	avatarImage: { width: 128, height: 128, fit: 'cover', format: 'webp', quality: 80 }
} satisfies Record<string, Required<ImageOptions>>;

export type ImagePreset = keyof typeof PRESETS;

export function getOptimizedImageUrl(
	url: string | null | undefined,
	preset: ImagePreset | ImageOptions
): string | null {
	if (!url) return null;

	// Only optimize Cloudflare R2 / assets URLs — pass through external URLs unchanged
	if (!url.includes('indexdaily.in') && !url.includes('r2.cloudflarestorage.com')) {
		return url;
	}

	const opts: ImageOptions = typeof preset === 'string' ? PRESETS[preset] : preset;
	const params: string[] = [];

	if (opts.width) params.push(`width=${opts.width}`);
	if (opts.height) params.push(`height=${opts.height}`);
	if (opts.fit) params.push(`fit=${opts.fit}`);
	if (opts.format) params.push(`format=${opts.format}`);
	if (opts.quality) params.push(`quality=${opts.quality}`);

	if (params.length === 0) return url;

	// Cloudflare Image Resizing: /cdn-cgi/image/<options>/<original-url>
	try {
		const parsed = new URL(url);
		return `${parsed.origin}/cdn-cgi/image/${params.join(',')}${parsed.pathname}`;
	} catch {
		return url;
	}
}

export const heroImage = (url: string | null | undefined) => getOptimizedImageUrl(url, 'heroImage');
export const cardImage = (url: string | null | undefined) => getOptimizedImageUrl(url, 'cardImage');
export const thumbnailImage = (url: string | null | undefined) =>
	getOptimizedImageUrl(url, 'thumbnailImage');
export const avatarImage = (url: string | null | undefined) =>
	getOptimizedImageUrl(url, 'avatarImage');
