/** A scheduled story whose time has passed but that is not live yet. */
export function isOverdue(
	status: string,
	publishedAt: Date | string | null,
	now = Date.now()
): boolean {
	return status === 'scheduled' && publishedAt !== null && new Date(publishedAt).getTime() <= now;
}
