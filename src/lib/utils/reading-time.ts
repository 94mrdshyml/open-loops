const WORDS_PER_MINUTE = 200;

function extractText(node: unknown): string {
	if (!node || typeof node !== 'object') return '';
	const n = node as Record<string, unknown>;
	if (n.type === 'text' && typeof n.text === 'string') return n.text;
	if (Array.isArray(n.content)) {
		return (n.content as unknown[]).map(extractText).join(' ');
	}
	return '';
}

export function calculateReadingTime(content: unknown): number {
	if (!content) return 1;
	let text = '';
	if (typeof content === 'string') {
		text = content.replace(/<[^>]+>/g, ' ');
	} else if (typeof content === 'object') {
		text = extractText(content);
	}
	const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
