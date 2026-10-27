import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { settings } from '$lib/server/db/schema';
import type { SiteSettings } from '$lib/types/index';

export async function getSettings(): Promise<SiteSettings | null> {
	const rows = await db.select().from(settings);
	if (rows.length === 0) return null;
	return Object.fromEntries(rows.map((r) => [r.key, r.value])) as SiteSettings;
}

export async function updateSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
	const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [string, string][];
	if (entries.length > 0) {
		await Promise.all(
			entries.map(([key, value]) =>
				db
					.insert(settings)
					.values({ key, value, updatedAt: new Date() })
					.onConflictDoUpdate({
						target: settings.key,
						set: { value, updatedAt: new Date() }
					})
			)
		);
	}
	return (await getSettings()) ?? {};
}

export async function getSettingValue(key: keyof SiteSettings): Promise<string | null> {
	const rows = await db
		.select({ value: settings.value })
		.from(settings)
		.where(eq(settings.key, key))
		.limit(1);
	return rows[0]?.value ?? null;
}
