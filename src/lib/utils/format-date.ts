export function formatDate(date: Date | string | null): string {
	if (!date) return '';
	const d = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateShort(date: Date | string | null): string {
	if (!date) return '';
	const d = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

/** "7 Oct", or "7 Oct 2026" with the year. Used in story lists and meta lines. */
export function formatDateCompact(date: Date | string | null, withYear = false): string {
	if (!date) return '';
	const d = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		...(withYear ? { year: 'numeric' } : {})
	});
}
