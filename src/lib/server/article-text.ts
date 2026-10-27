/**
 * A story is stored as the editor's JSON. This turns it into plain text, for the TL;DR writers
 * and for search. No imports, so a plain script can use it too (the search backfill does).
 */

interface TiptapNode {
	type?: string;
	text?: string;
	content?: TiptapNode[];
}

function childrenToText(node: TiptapNode): string {
	return (node.content ?? []).map(nodeToText).join('');
}

function nodeToText(node: TiptapNode): string {
	switch (node.type) {
		case 'text':
			return node.text ?? '';
		case 'hardBreak':
			return '\n';
		case 'image':
		case 'horizontalRule':
			return '';
		case 'paragraph':
		case 'heading':
			return `${childrenToText(node)}\n\n`;
		case 'listItem':
			return `- ${childrenToText(node).trim()}\n`;
		case 'bulletList':
		case 'orderedList':
			return `${childrenToText(node)}\n`;
		default:
			return childrenToText(node);
	}
}

/** Turns the stored editor JSON into plain text. Pictures and formatting are dropped. */
export function articleToText(contentJson: string): string {
	try {
		const doc = JSON.parse(contentJson) as TiptapNode;
		return nodeToText(doc)
			.replace(/\n{3,}/g, '\n\n')
			.trim();
	} catch {
		return '';
	}
}
