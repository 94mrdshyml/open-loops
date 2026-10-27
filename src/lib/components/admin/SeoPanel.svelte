<script lang="ts">
	import { env } from '$env/dynamic/public';
	import SectionHeading from './SectionHeading.svelte';

	interface Props {
		excerpt: string;
		ogTitle: string;
		ogDescription: string;
		twitterTitle: string;
		twitterDescription: string;
		postTitle?: string;
		slug?: string;
		coverImageUrl?: string | null;
		onchange?: (field: string, val: string) => void;
	}

	let {
		excerpt = $bindable(''),
		ogTitle = $bindable(''),
		ogDescription = $bindable(''),
		twitterTitle = $bindable(''),
		twitterDescription = $bindable(''),
		postTitle = '',
		slug = '',
		coverImageUrl = null,
		onchange
	}: Props = $props();

	let openSection = $state<'og' | 'twitter' | null>('og');

	const GOOGLE_TITLE_MAX = 60;
	const GOOGLE_DESC_MAX = 160;

	const siteHost = $derived.by(() => {
		try {
			return new URL(env.PUBLIC_SITE_URL ?? '').host;
		} catch {
			return 'blog.indexdaily.in';
		}
	});

	// Fallback order: platform field, then the post's own title, excerpt and cover image.
	const defaultTitle = $derived(postTitle.trim() || 'Post title');
	const defaultDesc = $derived(excerpt.trim());
	const ogTitleShown = $derived(ogTitle.trim() || defaultTitle);
	const ogDescShown = $derived(ogDescription.trim() || defaultDesc);
	const twitterTitleShown = $derived(twitterTitle.trim() || ogTitleShown);
	const twitterDescShown = $derived(twitterDescription.trim() || ogDescShown);

	const excerptOver = $derived(excerpt.length > GOOGLE_DESC_MAX);

	function truncate(text: string, max: number): string {
		return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
	}

	function toggle(section: 'og' | 'twitter') {
		openSection = openSection === section ? null : section;
	}

	function emit(field: string, val: string) {
		onchange?.(field, val);
	}
</script>

<section class="block">
	<SectionHeading label="Search result" />

	<div class="field">
		<label for="excerpt" class="field-label">Excerpt</label>
		<textarea
			id="excerpt"
			bind:value={excerpt}
			oninput={() => emit('excerpt', excerpt)}
			rows={3}
			placeholder="A short description for search results and story cards"
			aria-describedby="excerpt-count"
			class="control"
		></textarea>
		<p class="count" class:over={excerptOver} id="excerpt-count">
			{excerpt.length} of {GOOGLE_DESC_MAX} characters.
			{#if excerptOver}Search engines may cut the end off.{/if}
		</p>
	</div>

	<div class="preview-block">
		<p class="preview-label">How it looks on Google</p>
		<div class="preview-card google-preview">
			<div class="g-site">
				<span class="g-favicon" aria-hidden="true">{siteHost.charAt(0).toUpperCase()}</span>
				<span class="g-site-text">
					<span class="g-site-name">Open Tabs</span>
					<span class="g-url">{siteHost} › posts{slug ? ` › ${slug}` : ''}</span>
				</span>
			</div>
			<div class="g-title">{truncate(defaultTitle, GOOGLE_TITLE_MAX)}</div>
			<div class="g-desc">
				{truncate(
					defaultDesc || 'Add an excerpt to control the description shown here.',
					GOOGLE_DESC_MAX
				)}
			</div>
		</div>
	</div>
</section>

<section class="block">
	<SectionHeading label="Social cards" />

	<div class="accordion">
		<h3 class="accordion-title">
			<button
				type="button"
				class="accordion-head"
				aria-expanded={openSection === 'og'}
				aria-controls="seo-og"
				onclick={() => toggle('og')}
			>
				<span>Facebook and LinkedIn</span>
				<span class="chevron" class:open={openSection === 'og'} aria-hidden="true">▾</span>
			</button>
		</h3>
		{#if openSection === 'og'}
			<div class="accordion-body" id="seo-og">
				<div class="field">
					<label for="og-title" class="field-label">Card title</label>
					<input
						id="og-title"
						type="text"
						bind:value={ogTitle}
						oninput={() => emit('ogTitle', ogTitle)}
						class="control"
						placeholder="Uses the post title if left empty"
					/>
				</div>
				<div class="field">
					<label for="og-desc" class="field-label">Card description</label>
					<textarea
						id="og-desc"
						bind:value={ogDescription}
						oninput={() => emit('ogDescription', ogDescription)}
						rows={2}
						class="control"
						placeholder="Uses the excerpt if left empty"
					></textarea>
				</div>
				<div class="preview-card og-preview">
					<div class="preview-img og-img">
						{#if coverImageUrl}
							<img src={coverImageUrl} alt="" class="preview-thumb" />
						{:else}
							<span class="preview-img-placeholder">No cover image</span>
						{/if}
					</div>
					<div class="og-text">
						<div class="og-domain">{siteHost}</div>
						<div class="og-title">{ogTitleShown}</div>
						{#if ogDescShown}
							<div class="og-desc">{ogDescShown}</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<div class="accordion">
		<h3 class="accordion-title">
			<button
				type="button"
				class="accordion-head"
				aria-expanded={openSection === 'twitter'}
				aria-controls="seo-twitter"
				onclick={() => toggle('twitter')}
			>
				<span>Twitter / X</span>
				<span class="chevron" class:open={openSection === 'twitter'} aria-hidden="true">▾</span>
			</button>
		</h3>
		{#if openSection === 'twitter'}
			<div class="accordion-body" id="seo-twitter">
				<div class="field">
					<label for="tw-title" class="field-label">Card title</label>
					<input
						id="tw-title"
						type="text"
						bind:value={twitterTitle}
						oninput={() => emit('twitterTitle', twitterTitle)}
						class="control"
						placeholder="Uses the Facebook title, then the post title"
					/>
				</div>
				<div class="field">
					<label for="tw-desc" class="field-label">Card description</label>
					<textarea
						id="tw-desc"
						bind:value={twitterDescription}
						oninput={() => emit('twitterDescription', twitterDescription)}
						rows={2}
						class="control"
						placeholder="Uses the Facebook description, then the excerpt"
					></textarea>
				</div>
				<div class="preview-card tw-preview">
					<div class="preview-img tw-img">
						{#if coverImageUrl}
							<img src={coverImageUrl} alt="" class="preview-thumb" />
						{:else}
							<span class="preview-img-placeholder">No cover image</span>
						{/if}
						<span class="tw-title-chip">{twitterTitleShown}</span>
					</div>
					<div class="tw-text">
						{#if twitterDescShown}
							<div class="tw-desc">{twitterDescShown}</div>
						{/if}
						<div class="tw-domain">From {siteHost}</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.block {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.block :global(.section-heading) {
		margin-bottom: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
	}

	.control {
		width: 100%;
		min-height: 40px;
		padding: 0.5rem 0.75rem;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--color-admin-text);
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		resize: vertical;
		transition: border-color 0.15s;
	}

	.control::placeholder {
		color: var(--color-admin-text-muted);
		opacity: 1;
	}

	.control:hover {
		border-color: var(--color-admin-text-muted);
	}

	.control:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
		border-color: var(--color-admin-accent);
	}

	.count {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.count.over {
		color: var(--color-status-error);
		font-weight: 600;
	}

	/* ── Accordion ────────────────────────────────────────────── */
	.accordion {
		border-top: 1px solid var(--color-admin-border-strong);
	}

	.accordion:last-child {
		border-bottom: 1px solid var(--color-admin-border-strong);
	}

	.accordion-title {
		margin: 0;
		font-size: inherit;
	}

	.accordion-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		min-height: 44px;
		padding: 0;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
		background: none;
		border: 0;
		cursor: pointer;
		text-align: left;
	}

	.accordion-head:hover {
		color: var(--color-admin-accent);
	}

	.chevron {
		transition: transform 0.2s;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.accordion-body {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding: 0.25rem 0 1rem;
	}

	/* ── Previews ─────────────────────────────────────────────── */
	/* Each is a plain sketch of the platform card, drawn in the dashboard's own colours. */
	.preview-block {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.preview-label {
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
	}

	.preview-card {
		background: var(--color-admin-surface);
		color: var(--color-admin-text);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		overflow: hidden;
		font-family: var(--font-sans);
	}

	.preview-img {
		position: relative;
		background: var(--color-admin-surface-hover);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.preview-thumb {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.preview-img-placeholder {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	/* Google */
	.google-preview {
		padding: 0.75rem 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.g-site {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.g-favicon {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-admin-surface-hover);
		border: 1px solid var(--color-admin-border);
		display: grid;
		place-items: center;
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-admin-text-muted);
	}

	.g-site-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.3;
	}

	.g-site-name {
		font-size: var(--text-xs);
		color: var(--color-admin-text);
	}

	.g-url {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.g-title {
		font-size: 1.125rem;
		line-height: 1.3;
		color: var(--color-admin-accent);
		overflow-wrap: anywhere;
	}

	.g-desc {
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--color-admin-text-muted);
		overflow-wrap: anywhere;
	}

	/* Facebook and LinkedIn */
	.og-preview {
		display: flex;
		flex-direction: column;
	}

	.og-img {
		aspect-ratio: 1.91 / 1;
	}

	.og-text {
		padding: 0.5rem 0.75rem 0.625rem;
		background: var(--color-admin-surface-hover);
		border-top: 1px solid var(--color-admin-border);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.og-domain {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-admin-text-muted);
	}

	.og-title {
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-admin-text);
		overflow-wrap: anywhere;
	}

	.og-desc {
		font-size: var(--text-sm);
		line-height: 1.4;
		color: var(--color-admin-text-muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		overflow-wrap: anywhere;
	}

	/* Twitter / X summary card with large image */
	.tw-preview {
		display: flex;
		flex-direction: column;
		border-radius: 14px;
	}

	.tw-img {
		aspect-ratio: 2 / 1;
	}

	.tw-title-chip {
		position: absolute;
		left: 8px;
		bottom: 8px;
		max-width: calc(100% - 16px);
		padding: 2px 8px;
		border-radius: 4px;
		background: var(--color-admin-text);
		color: var(--color-admin-bg);
		font-size: var(--text-xs);
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tw-text {
		padding: 0.5rem 0.75rem 0.625rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.tw-desc {
		font-size: var(--text-sm);
		line-height: 1.4;
		color: var(--color-admin-text-muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		overflow-wrap: anywhere;
	}

	.tw-domain {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	@media (max-width: 1023px) {
		.control {
			min-height: 44px;
		}
	}
</style>
