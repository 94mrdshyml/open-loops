// Converts Tiptap/ProseMirror JSON to HTML without requiring any Tiptap runtime.
// Works in Cloudflare Workers, Node, and the browser.

interface TiptapMark {
	type: string;
	attrs?: Record<string, unknown>;
}

interface TiptapNode {
	type: string;
	attrs?: Record<string, unknown>;
	content?: TiptapNode[];
	marks?: TiptapMark[];
	text?: string;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Only web, email and phone links, or links within the site, are let through. Anything else
 * (`javascript:`, `data:` and so on) comes back empty. Browsers ignore spaces and line breaks inside
 * a link's scheme, so those are removed before looking at it.
 */
function safeUrl(raw: string): string {
	const url = raw.trim();
	const probe = Array.from(url)
		.filter((ch) => {
			const code = ch.charCodeAt(0);
			return code > 0x20 && (code < 0x7f || code > 0x9f);
		})
		.join('');
	if (/^(https?:|mailto:|tel:)/i.test(probe)) return url;
	// Within the site: /path, #section or ?query, but not //other-site
	if (/^[/#?]/.test(probe) && !probe.startsWith('//')) return url;
	return '';
}

function applyMarks(text: string, marks: TiptapMark[]): string {
	let out = text;
	for (const mark of marks) {
		switch (mark.type) {
			case 'bold':
				out = `<strong>${out}</strong>`;
				break;
			case 'italic':
				out = `<em>${out}</em>`;
				break;
			case 'strike':
				out = `<s>${out}</s>`;
				break;
			case 'code':
				out = `<code>${out}</code>`;
				break;
			case 'link': {
				const safeHref = safeUrl(String(mark.attrs?.href ?? ''));
				// A link that is not safe is shown as plain text
				if (!safeHref) break;
				const href = escapeHtml(safeHref);
				const target = mark.attrs?.target
					? ` target="${escapeHtml(String(mark.attrs.target))}"`
					: '';
				const rel = target ? ' rel="noopener noreferrer"' : '';
				out = `<a href="${href}"${target}${rel}>${out}</a>`;
				break;
			}
		}
	}
	return out;
}

function serializeNode(node: TiptapNode): string {
	if (node.type === 'text') {
		const escaped = escapeHtml(node.text ?? '');
		return node.marks?.length ? applyMarks(escaped, node.marks) : escaped;
	}

	const inner = (node.content ?? []).map(serializeNode).join('');

	switch (node.type) {
		case 'doc':
			return inner;
		case 'paragraph':
			return `<p>${inner}</p>`;
		case 'heading': {
			const level = Number(node.attrs?.level ?? 2);
			return `<h${level}>${inner}</h${level}>`;
		}
		case 'blockquote':
			return `<blockquote>${inner}</blockquote>`;
		case 'bulletList':
			return `<ul>${inner}</ul>`;
		case 'orderedList':
			return `<ol>${inner}</ol>`;
		case 'listItem':
			return `<li>${inner}</li>`;
		case 'hardBreak':
			return '<br>';
		case 'horizontalRule':
			return '<hr>';
		case 'codeBlock':
			return `<pre><code>${inner}</code></pre>`;
		case 'image': {
			// Pictures must come from a web address or from this site
			const safeSrc = safeUrl(String(node.attrs?.src ?? ''));
			if (!safeSrc || /^(mailto:|tel:)/i.test(safeSrc)) return '';
			const src = escapeHtml(safeSrc);
			const alt = escapeHtml(String(node.attrs?.alt ?? ''));
			return `<img src="${src}" alt="${alt}" loading="lazy">`;
		}
		default:
			return inner;
	}
}

export function tiptapToHtml(content: unknown): string {
	if (!content || typeof content !== 'object') return '';
	try {
		return serializeNode(content as TiptapNode);
	} catch {
		return '';
	}
}
