<script lang="ts">
	import { page } from '$app/state';

	const status = $derived(page.status);
	const is404 = $derived(status === 404);
</script>

<svelte:head>
	<title>{is404 ? '404 — Page not found' : `${status} — Error`} · Open Tabs</title>
</svelte:head>

<div class="error-page">
	<p class="code">{status}</p>
	<h1 class="heading">
		{is404 ? 'This tab has closed.' : 'This tab stopped loading.'}
	</h1>
	<p class="body">
		{is404
			? 'The story may have been moved or unpublished, or the link is wrong. Head back and pick another.'
			: 'An unexpected error occurred. Reload the page, or try again in a few minutes.'}
	</p>
	<a href="/" class="back-link">← Back to Open Tabs</a>
</div>

<style>
	.error-page {
		min-height: calc(100dvh - var(--nav-h));
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		text-align: center;
	}

	.code {
		font-family: var(--serif);
		font-size: 6rem;
		font-weight: 700;
		line-height: 1;
		color: var(--accent-ink);
		margin: 0 0 16px;
	}

	.heading {
		font-family: var(--serif);
		font-size: clamp(1.25rem, 3vw, 1.75rem);
		font-weight: 500;
		color: var(--ink);
		margin: 0 0 12px;
		letter-spacing: -0.01em;
	}

	.body {
		font-family: var(--ui);
		font-size: 0.9375rem;
		color: var(--ink-60);
		max-width: 380px;
		line-height: 1.6;
		margin: 0 0 32px;
	}

	.back-link {
		font-family: var(--ui);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--accent-ink);
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.back-link:hover {
		opacity: 0.75;
	}
</style>
