<script lang="ts">
	import { onMount } from 'svelte';

	type Field = 'title' | 'subtitle' | 'slug';

	interface Props {
		title: string;
		subtitle: string;
		slug: string;
		/** A save error to show above the title, tied to the field it names. */
		error?: string | null;
		oninput?: (field: Field) => void;
	}

	let {
		title = $bindable(''),
		subtitle = $bindable(''),
		slug = $bindable(''),
		error = null,
		oninput
	}: Props = $props();

	const titleInvalid = $derived(!!error && /title/i.test(error));
	const slugInvalid = $derived(!!error && /slug/i.test(error));

	let titleEl: HTMLTextAreaElement;
	let subtitleEl: HTMLTextAreaElement;

	// The title and subtitle wrap and grow, so a long headline is never cut off.
	function fit(node: HTMLTextAreaElement | undefined) {
		if (!node) return;
		node.style.height = 'auto';
		node.style.height = `${node.scrollHeight}px`;
	}

	function fitAll() {
		fit(titleEl);
		fit(subtitleEl);
	}

	$effect(() => {
		void title;
		fit(titleEl);
	});

	$effect(() => {
		void subtitle;
		fit(subtitleEl);
	});

	onMount(() => {
		void document.fonts?.ready.then(fitAll);
	});

	// A headline is one paragraph: Enter does not add a line break.
	function noNewline(e: KeyboardEvent) {
		if (e.key === 'Enter') e.preventDefault();
	}

	function handle(field: Field) {
		if (field === 'title') title = title.replace(/\s*\n+\s*/g, ' ');
		if (field === 'subtitle') subtitle = subtitle.replace(/\s*\n+\s*/g, ' ');
		oninput?.(field);
	}
</script>

<svelte:window onresize={fitAll} />

<div class="title-area">
	{#if error}
		<p class="error" id="editor-error" role="alert">Could not save. {error.replace(/\.$/, '')}.</p>
	{/if}

	<textarea
		name="title"
		bind:value={title}
		oninput={() => handle('title')}
		onkeydown={noNewline}
		bind:this={titleEl}
		rows="1"
		placeholder="Post title"
		aria-label="Title"
		aria-invalid={titleInvalid || undefined}
		aria-describedby={titleInvalid ? 'editor-error' : undefined}
		class="title-input"
		required
	></textarea>

	<textarea
		name="subtitle"
		bind:value={subtitle}
		oninput={() => handle('subtitle')}
		onkeydown={noNewline}
		bind:this={subtitleEl}
		rows="1"
		placeholder="Subtitle (optional)"
		aria-label="Subtitle"
		class="subtitle-input"
	></textarea>

	<div class="slug-row" class:invalid={slugInvalid}>
		<span class="slug-prefix" aria-hidden="true">/posts/</span>
		<input
			type="text"
			aria-label="Link address"
			name="slug"
			bind:value={slug}
			oninput={() => handle('slug')}
			placeholder="url-slug"
			aria-invalid={slugInvalid || undefined}
			aria-describedby={slugInvalid ? 'editor-error' : undefined}
			class="slug-input"
		/>
	</div>
</div>

<style>
	.title-area {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.error {
		margin: 0;
		padding: 0.625rem 0.875rem;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-admin-text);
		background: var(--color-admin-surface);
		border: 1px solid var(--color-status-error);
		border-left-width: 4px;
		border-radius: 8px;
	}

	.title-input,
	.subtitle-input {
		display: block;
		width: 100%;
		margin: 0;
		padding: 0 0 4px;
		color: var(--color-admin-text);
		background: transparent;
		border: 0;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		resize: none;
		overflow: hidden;
		text-wrap: balance;
	}

	.title-input {
		font-family: var(--serif);
		font-size: 2.75rem;
		font-weight: 500;
		line-height: 1.08;
		letter-spacing: -0.02em;
	}

	.subtitle-input {
		font-family: var(--serif);
		font-style: italic;
		font-size: 1.375rem;
		line-height: 1.4;
		color: var(--color-admin-text-muted);
		text-wrap: pretty;
	}

	.title-input::placeholder,
	.subtitle-input::placeholder {
		color: var(--color-admin-text-muted);
		opacity: 1;
	}

	/* The focus mark is an accent underline in place of the default ring */
	.title-input:focus-visible,
	.subtitle-input:focus-visible {
		outline: none;
		border-bottom-color: var(--color-admin-accent);
	}

	.title-input[aria-invalid='true'] {
		border-bottom-color: var(--color-status-error);
	}

	.slug-row {
		display: flex;
		align-items: stretch;
		min-height: 40px;
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		overflow: hidden;
	}

	.slug-row:focus-within {
		border-color: var(--color-admin-accent);
	}

	.slug-row.invalid {
		border-color: var(--color-status-error);
	}

	.slug-prefix {
		display: flex;
		align-items: center;
		padding: 0 0.75rem;
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		border-right: 1px solid var(--color-admin-border);
		white-space: nowrap;
	}

	.slug-input {
		flex: 1;
		min-width: 0;
		padding: 0 0.75rem;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-admin-text);
		background: transparent;
		border: 0;
	}

	.slug-input:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: -2px;
		border-radius: 0 8px 8px 0;
	}

	@media (max-width: 1023px) {
		.slug-row {
			min-height: 44px;
		}
	}

	@media (max-width: 767px) {
		.title-input {
			font-size: 2.125rem;
		}

		.subtitle-input {
			font-size: 1.1875rem;
		}
	}
</style>
