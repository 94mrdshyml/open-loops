import { desc, eq, count } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailSends } from '$lib/server/db/schema';
import { generateId } from '$lib/server/db/generate-id';
import type { EmailSend } from '$lib/types/index';

export async function logEmailSend(data: {
	type: string;
	toEmail: string;
	userId?: string | null;
	subject: string;
	resendEmailId?: string | null;
}): Promise<void> {
	await db.insert(emailSends).values({
		id: generateId('eml'),
		resendEmailId: data.resendEmailId ?? null,
		type: data.type,
		toEmail: data.toEmail,
		userId: data.userId ?? null,
		subject: data.subject,
		sentAt: new Date(),
		updatedAt: new Date()
	});
}

export async function getEmailSendById(id: string): Promise<EmailSend | undefined> {
	const [row] = await db.select().from(emailSends).where(eq(emailSends.id, id)).limit(1);
	return row;
}

export async function getEmailSends(limit = 50, offset = 0): Promise<EmailSend[]> {
	return db.select().from(emailSends).orderBy(desc(emailSends.sentAt)).limit(limit).offset(offset);
}

export async function getEmailSendStats(): Promise<{
	total: number;
	delivered: number;
	opened: number;
	clicked: number;
	bounced: number;
}> {
	const rows = await db
		.select({ lastEvent: emailSends.lastEvent, cnt: count() })
		.from(emailSends)
		.groupBy(emailSends.lastEvent);

	const stats = { total: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
	for (const row of rows) {
		stats.total += row.cnt;
		if (row.lastEvent === 'delivered') stats.delivered += row.cnt;
		else if (row.lastEvent === 'opened') stats.opened += row.cnt;
		else if (row.lastEvent === 'clicked') stats.clicked += row.cnt;
		else if (row.lastEvent === 'bounced') stats.bounced += row.cnt;
	}
	return stats;
}

export async function updateEmailEvent(resendEmailId: string, lastEvent: string): Promise<void> {
	await db
		.update(emailSends)
		.set({ lastEvent, updatedAt: new Date() })
		.where(eq(emailSends.resendEmailId, resendEmailId));
}
