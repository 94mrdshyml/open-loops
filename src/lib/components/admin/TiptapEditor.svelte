<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Image from '@tiptap/extension-image';
	import Typography from '@tiptap/extension-typography';
	import Placeholder from '@tiptap/extension-placeholder';
	import CharacterCount from '@tiptap/extension-character-count';
	import Link from '@tiptap/extension-link';
	import BubbleMenu from '@tiptap/extension-bubble-menu';
	import { SvelteSet } from 'svelte/reactivity';
	import { uploadImage } from '$lib/utils/upload-image';

	interface Props {
		content: string;
		onchange?: (json: string) => void;
	}

	let { content, onchange }: Props = $props();

	type ToolId =
		| 'h2'
		| 'h3'
		| 'bold'
		| 'italic'
		| 'strike'
		| 'code'
		| 'link'
		| 'image'
		| 'alt'
		| 'blockquote'
		| 'pullQuote'
		| 'bulletList'
		| 'orderedList'
		| 'rule';

	interface Tool {
		id: ToolId;
		label: string;
		/** Shortcut shown in the tooltip, where Tiptap has one. */
		shortcut?: string;
		/** Toggles carry aria-pressed. One-off actions do not. */
		toggle: boolean;
	}

	interface ToolGroup {
		label: string;
		tools: Tool[];
	}

	const GROUPS: ToolGroup[] = [
		{
			label: 'Headings',
			tools: [
				{ id: 'h2', label: 'Heading 2', shortcut: 'Ctrl+Alt+2', toggle: true },
				{ id: 'h3', label: 'Heading 3', shortcut: 'Ctrl+Alt+3', toggle: true }
			]
		},
		{
			label: 'Text style',
			tools: [
				{ id: 'bold', label: 'Bold', shortcut: 'Ctrl+B', toggle: true },
				{ id: 'italic', label: 'Italic', shortcut: 'Ctrl+I', toggle: true },
				{ id: 'strike', label: 'Strikethrough', shortcut: 'Ctrl+Shift+S', toggle: true },
				{ id: 'code', label: 'Inline code', shortcut: 'Ctrl+E', toggle: true }
			]
		},
		{
			label: 'Insert',
			tools: [
				{ id: 'link', label: 'Link', toggle: true },
				{ id: 'image', label: 'Insert image', toggle: false },
				{ id: 'alt', label: 'Set alt text for the selected image', toggle: false }
			]
		},
		{
			label: 'Blocks',
			tools: [
				{ id: 'blockquote', label: 'Blockquote', shortcut: 'Ctrl+Shift+B', toggle: true },
				{ id: 'pullQuote', label: 'Pull quote', toggle: true },
				{ id: 'bulletList', label: 'Bullet list', toggle: true },
				{ id: 'orderedList', label: 'Numbered list', toggle: true },
				{ id: 'rule', label: 'Horizontal rule', toggle: false }
			]
		}
	];

	// The floating menu on a text selection offers the commonest of these.
	const BUBBLE_GROUPS: ToolId[][] = [
		['bold', 'italic', 'strike'],
		['h2', 'h3'],
		['link', 'blockquote'],
		['bulletList', 'orderedList']
	];

	const ALL_TOOLS: Tool[] = GROUPS.flatMap((g) => g.tools);
	const TOOL_BY_ID = new Map<ToolId, Tool>(ALL_TOOLS.map((t) => [t.id, t]));

	let editorEl: HTMLDivElement;
	let bubbleMenuEl: HTMLDivElement;
	let toolbarEl: HTMLDivElement;
	let editor: Editor | null = null;
	let wordCount = $state(0);
	let toolIndex = $state(0);
	const activeFormats = new SvelteSet<string>();

	function updateActiveFormats() {
		if (!editor) return;
		activeFormats.clear();
		if (editor.isActive('bold')) activeFormats.add('bold');
		if (editor.isActive('italic')) activeFormats.add('italic');
		if (editor.isActive('strike')) activeFormats.add('strike');
		if (editor.isActive('code')) activeFormats.add('code');
		if (editor.isActive('link')) activeFormats.add('link');
		if (editor.isActive('heading', { level: 2 })) activeFormats.add('h2');
		if (editor.isActive('heading', { level: 3 })) activeFormats.add('h3');
		if (editor.isActive('blockquote')) activeFormats.add('blockquote');
		if (editor.isActive('blockquote') && editor.getAttributes('blockquote').class === 'pull-quote')
			activeFormats.add('pullQuote');
		if (editor.isActive('bulletList')) activeFormats.add('bulletList');
		if (editor.isActive('orderedList')) activeFormats.add('orderedList');
	}

	onMount(() => {
		let initialContent: object;
		try {
			initialContent = content ? (JSON.parse(content) as object) : {};
		} catch {
			initialContent = {};
		}

		editor = new Editor({
			element: editorEl,
			extensions: [
				StarterKit,
				Image.configure({ inline: false, allowBase64: false }),
				Typography,
				Placeholder.configure({ placeholder: 'Start writing your article…' }),
				CharacterCount,
				Link.configure({ openOnClick: false, autolink: true }),
				BubbleMenu.configure({ element: bubbleMenuEl })
			],
			// The body takes the public article style, so the page reads as it will be published.
			editorProps: {
				attributes: {
					class: 'prose',
					role: 'textbox',
					'aria-multiline': 'true',
					'aria-label': 'Story text'
				}
			},
			content: initialContent,
			onUpdate({ editor: e }) {
				wordCount = e.storage.characterCount.words();
				onchange?.(JSON.stringify(e.getJSON()));
				updateActiveFormats();
			},
			onSelectionUpdate() {
				updateActiveFormats();
			}
		});

		wordCount = editor.storage.characterCount.words();
	});

	onDestroy(() => editor?.destroy());

	function cmd(action: () => void) {
		action();
		editor?.commands.focus();
	}

	function askAltText(current = ''): string | null {
		return window.prompt(
			'Alt text: describe this image for people who cannot see it (also helps search).',
			current
		);
	}

	function describeImage() {
		if (!editor || !editor.isActive('image')) {
			window.alert('Click an image in the editor first, then press ALT.');
			return;
		}
		const alt = askAltText(String(editor.getAttributes('image').alt ?? ''));
		if (alt === null) return;
		editor.chain().focus().updateAttributes('image', { alt: alt.trim() }).run();
	}

	function insertImage() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file || !editor) return;
			try {
				const url = await uploadImage(file);
				const alt = askAltText()?.trim() ?? '';
				editor.chain().focus().setImage({ src: url, alt }).run();
			} catch (e) {
				console.error('Image upload failed', e);
			}
		};
		input.click();
	}

	function setLink() {
		if (!editor) return;
		const prev = editor.getAttributes('link').href as string | undefined;
		const url = window.prompt('URL', prev ?? '');
		if (url === null) return;
		if (url === '') {
			editor.chain().focus().unsetLink().run();
		} else {
			editor.chain().focus().setLink({ href: url }).run();
		}
		updateActiveFormats();
	}

	function insertPullQuote() {
		editor
			?.chain()
			.focus()
			.insertContent({
				type: 'blockquote',
				attrs: { class: 'pull-quote' },
				content: [{ type: 'paragraph' }]
			})
			.run();
	}

	function runTool(id: ToolId) {
		if (!editor) return;
		switch (id) {
			case 'h2':
				return cmd(() => editor?.chain().focus().toggleHeading({ level: 2 }).run());
			case 'h3':
				return cmd(() => editor?.chain().focus().toggleHeading({ level: 3 }).run());
			case 'bold':
				return cmd(() => editor?.chain().focus().toggleBold().run());
			case 'italic':
				return cmd(() => editor?.chain().focus().toggleItalic().run());
			case 'strike':
				return cmd(() => editor?.chain().focus().toggleStrike().run());
			case 'code':
				return cmd(() => editor?.chain().focus().toggleCode().run());
			case 'link':
				return setLink();
			case 'image':
				return insertImage();
			case 'alt':
				return describeImage();
			case 'blockquote':
				return cmd(() => editor?.chain().focus().toggleBlockquote().run());
			case 'pullQuote':
				return cmd(insertPullQuote);
			case 'bulletList':
				return cmd(() => editor?.chain().focus().toggleBulletList().run());
			case 'orderedList':
				return cmd(() => editor?.chain().focus().toggleOrderedList().run());
			case 'rule':
				return cmd(() => editor?.chain().focus().setHorizontalRule().run());
		}
	}

	function titleFor(tool: Tool): string {
		return tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label;
	}

	function pressed(tool: Tool): boolean | undefined {
		return tool.toggle ? activeFormats.has(tool.id) : undefined;
	}

	// One tab stop for the whole toolbar. Arrow keys, Home and End move along it.
	function focusTool(index: number) {
		const buttons = toolbarEl.querySelectorAll<HTMLButtonElement>('button[data-tool]');
		const next = (index + buttons.length) % buttons.length;
		toolIndex = next;
		buttons[next]?.focus();
	}

	function onToolbarKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			focusTool(toolIndex + 1);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			focusTool(toolIndex - 1);
		} else if (e.key === 'Home') {
			e.preventDefault();
			focusTool(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			focusTool(ALL_TOOLS.length - 1);
		}
	}

	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items || !editor) return;
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				e.preventDefault();
				const file = item.getAsFile();
				if (!file) return;
				uploadImage(file)
					.then((url) => editor?.chain().focus().setImage({ src: url }).run())
					.catch((err) => console.error('Paste upload failed', err));
				return;
			}
		}
	}
</script>

{#snippet glyph(id: ToolId)}
	{#if id === 'h2'}H2
	{:else if id === 'h3'}H3
	{:else if id === 'bold'}<strong>B</strong>
	{:else if id === 'italic'}<em class="glyph-italic">I</em>
	{:else if id === 'strike'}<s>S</s>
	{:else if id === 'code'}<span class="glyph-code">&lt;/&gt;</span>
	{:else if id === 'alt'}ALT
	{:else}
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{#if id === 'link'}
				<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
				<path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
			{:else if id === 'image'}
				<rect x="3" y="4" width="18" height="16" rx="2" />
				<circle cx="9" cy="10" r="1.6" />
				<path d="M21 16l-5-5-8 8" />
			{:else if id === 'blockquote'}
				<g transform="rotate(180 12 12)">
					<path d="M4 17h4l2-4V7H4v6h3" />
					<path d="M14 17h4l2-4V7h-6v6h3" />
				</g>
			{:else if id === 'pullQuote'}
				<line x1="4" y1="4" x2="20" y2="4" />
				<g transform="rotate(180 12 12)">
					<path d="M6 17h3l1.5-3V9H6v5h2" />
					<path d="M13.5 17h3l1.5-3V9h-4.5v5h2" />
				</g>
				<line x1="4" y1="20" x2="20" y2="20" />
			{:else if id === 'bulletList'}
				<circle cx="5" cy="7" r="1" />
				<circle cx="5" cy="12" r="1" />
				<circle cx="5" cy="17" r="1" />
				<line x1="10" y1="7" x2="20" y2="7" />
				<line x1="10" y1="12" x2="20" y2="12" />
				<line x1="10" y1="17" x2="20" y2="17" />
			{:else if id === 'orderedList'}
				<line x1="10" y1="6" x2="21" y2="6" />
				<line x1="10" y1="12" x2="21" y2="12" />
				<line x1="10" y1="18" x2="21" y2="18" />
				<path d="M4 6h1v4" />
				<path d="M4 10h2" />
				<path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
			{:else if id === 'rule'}
				<line x1="3" y1="12" x2="21" y2="12" />
				<path d="M8 7l4-3 4 3" />
				<path d="M8 17l4 3 4-3" />
			{/if}
		</svg>
	{/if}
{/snippet}

<!-- Floating menu, shown on a text selection -->
<div class="bubble-menu" bind:this={bubbleMenuEl} role="group" aria-label="Format selection">
	{#each BUBBLE_GROUPS as ids, g (g)}
		{#if g > 0}<div class="bm-sep" aria-hidden="true"></div>{/if}
		{#each ids as id (id)}
			{@const tool = TOOL_BY_ID.get(id)}
			{#if tool}
				<button
					type="button"
					class:active={activeFormats.has(id)}
					aria-label={tool.label}
					aria-pressed={pressed(tool)}
					title={titleFor(tool)}
					onclick={() => runTool(id)}
				>
					{@render glyph(id)}
				</button>
			{/if}
		{/each}
	{/each}
</div>

<div class="editor-wrap">
	<div
		class="toolbar"
		role="toolbar"
		aria-label="Formatting"
		tabindex="-1"
		bind:this={toolbarEl}
		onkeydown={onToolbarKeydown}
	>
		{#each GROUPS as group (group.label)}
			<div class="group" role="group" aria-label={group.label}>
				{#each group.tools as tool (tool.id)}
					{@const index = ALL_TOOLS.indexOf(tool)}
					<button
						type="button"
						class="tool"
						class:active={activeFormats.has(tool.id)}
						data-tool={tool.id}
						aria-label={tool.label}
						aria-pressed={pressed(tool)}
						title={titleFor(tool)}
						tabindex={index === toolIndex ? 0 : -1}
						onfocus={() => (toolIndex = index)}
						onclick={() => runTool(tool.id)}
					>
						{@render glyph(tool.id)}
					</button>
				{/each}
			</div>
		{/each}
		<span class="word-count word-count-bar">{wordCount} words</span>
	</div>

	<div class="editor-body" bind:this={editorEl} onpaste={handlePaste}></div>
	<p class="word-count word-count-foot">{wordCount} words</p>
</div>

<style>
	.editor-wrap {
		display: flex;
		flex-direction: column;
		min-height: 30rem;
	}

	/* ── Toolbar ──────────────────────────────────────────────── */
	.toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 4px;
		border-top: 2px solid var(--color-admin-text);
		border-bottom: 1px solid var(--color-admin-border-strong);
		background: var(--color-admin-bg);
		position: sticky;
		top: 0;
		z-index: 10;
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.group {
		display: flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}

	.group + .group {
		padding-left: 6px;
		border-left: 1px solid var(--color-admin-border-strong);
	}

	.tool,
	.bubble-menu button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 32px;
		padding: 0 6px;
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		line-height: 1;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition:
			background-color 0.12s,
			color 0.12s,
			border-color 0.12s;
	}

	.tool {
		color: var(--color-admin-text-muted);
		background: transparent;
	}

	.tool:hover {
		color: var(--color-admin-text);
		background: var(--color-admin-surface-hover);
	}

	.tool:focus-visible {
		outline-offset: -2px;
	}

	/* The open format is an inked key, so it reads without relying on colour */
	.tool.active {
		color: var(--color-admin-bg);
		background: var(--color-admin-text);
		border-color: var(--color-admin-text);
	}

	.glyph-italic {
		font-family: var(--serif);
		font-size: 1rem;
	}

	.glyph-code {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}

	.word-count {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.word-count-bar {
		margin-left: auto;
		padding: 0 8px 0 12px;
		flex-shrink: 0;
	}

	.word-count-foot {
		display: none;
		margin: 0.5rem 0 0;
		text-align: right;
	}

	/* ── Writing area ─────────────────────────────────────────── */
	/* A left rule in the accent marks the page while you are writing in it */
	.editor-body {
		flex: 1;
		padding: 2rem 0 4rem 1rem;
		border-left: 2px solid transparent;
		cursor: text;
	}

	.editor-body:focus-within {
		border-left-color: var(--color-admin-accent);
	}

	:global(.editor-body .ProseMirror) {
		outline: none;
		min-height: 24rem;
	}

	:global(.editor-body .ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--color-admin-text-muted);
		pointer-events: none;
		height: 0;
	}

	:global(.editor-body .ProseMirror > :first-child) {
		margin-top: 0;
	}

	:global(.editor-body .ProseMirror-selectednode) {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 3px;
	}

	:global(.editor-body .ProseMirror img) {
		height: auto;
	}

	:global(.editor-body .ProseMirror code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
		color: var(--color-admin-text);
		background: var(--color-admin-surface-hover);
		padding: 0.1em 0.4em;
		border-radius: 4px;
	}

	:global(.editor-body .ProseMirror pre) {
		font-size: 0.9rem;
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border);
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
		margin-bottom: 1.5rem;
	}

	:global(.editor-body .ProseMirror pre code) {
		background: none;
		padding: 0;
	}

	:global(.editor-body .ProseMirror s) {
		text-decoration-thickness: 1.5px;
	}

	/* ── Bubble menu ──────────────────────────────────────────── */
	/* Hidden until Tiptap places it on a selection. */
	.bubble-menu {
		position: absolute;
		visibility: hidden;
		opacity: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px;
		max-width: calc(100vw - 2rem);
		padding: 4px;
		background: var(--color-admin-text);
		border: 1px solid var(--color-admin-text);
		border-radius: 10px;
		z-index: 20;
	}

	.bubble-menu button {
		color: var(--color-admin-bg);
		background: transparent;
	}

	.bubble-menu button:hover {
		background: color-mix(in srgb, var(--color-admin-bg) 22%, transparent);
	}

	.bubble-menu button:focus-visible {
		outline: 2px solid var(--color-admin-bg);
		outline-offset: -3px;
	}

	.bubble-menu button.active {
		color: var(--color-admin-bg);
		background: var(--color-admin-accent);
	}

	.bm-sep {
		width: 1px;
		height: 20px;
		background: color-mix(in srgb, var(--color-admin-bg) 35%, transparent);
		margin: 0 3px;
	}

	/* ── Touch screens ────────────────────────────────────────── */
	@media (max-width: 1023px) {
		.tool,
		.bubble-menu button {
			min-width: 44px;
			height: 44px;
		}
	}

	@media (max-width: 767px) {
		/* On a phone the selection menu wraps to two rows, so the separators go */
		.bm-sep {
			display: none;
		}

		/* Sits under the sticky top bar of the dashboard */
		.toolbar {
			top: 60px;
		}

		.word-count-bar {
			display: none;
		}

		.word-count-foot {
			display: block;
		}

		.editor-body {
			padding: 1.5rem 0 3rem;
			border-left: 0;
		}
	}
</style>
