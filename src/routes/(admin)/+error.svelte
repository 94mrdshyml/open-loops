<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle } from '$lib/stores/admin-page-title';

	const status = $derived(page.status);

	const headline = $derived(
		status === 404
			? 'Page not found'
			: status === 403
				? "You can't open this"
				: status === 401
					? 'Please sign in again'
					: 'Something went wrong'
	);

	const sentence = $derived(
		status === 404
			? "The page you asked for isn't here. It may have moved, or the link may be wrong."
			: status === 403
				? "Your account doesn't have access to this page. If you think it should, ask an admin."
				: status === 401
					? 'Your session has ended. Sign in again to carry on.'
					: "We couldn't load this page. Wait a moment and try again. If it keeps happening, tell an admin."
	);

	// The dashboard shell shows this as the page title above
	$effect(() => pageTitle.set(headline));
</script>

<svelte:head>
	<title>{headline} | Open Tabs</title>
</svelte:head>

<div class="problem">
	<p class="status" aria-hidden="true">{status}</p>
	<div class="body">
		<p class="sentence">{sentence}</p>
		{#if status >= 500 && page.error?.message}
			<p class="detail">Reference: {page.error.message}</p>
		{/if}
		<div class="actions">
			{#if status === 401}
				<a href="/login" class="ad-btn">Sign in</a>
			{:else}
				<a href="/dashboard" class="ad-btn">Back to the dashboard</a>
			{/if}
		</div>
	</div>
</div>

<style>
	.problem {
		display: flex;
		align-items: flex-start;
		gap: 2.5rem;
		max-width: 40rem;
		padding-top: 1rem;
	}

	.status {
		margin: 0;
		font-family: var(--serif);
		font-size: 5.5rem;
		font-weight: 400;
		line-height: 0.9;
		letter-spacing: -0.04em;
		color: var(--color-admin-border-strong);
		font-variant-numeric: lining-nums;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
		padding-top: 0.25rem;
	}

	.sentence {
		margin: 0;
		font-family: var(--serif);
		font-size: 1.375rem;
		line-height: 1.4;
		color: var(--color-admin-text);
	}

	.detail {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		overflow-wrap: anywhere;
	}

	.actions {
		margin-top: 0.75rem;
	}

	@media (max-width: 599px) {
		.problem {
			flex-direction: column;
			gap: 1rem;
		}

		.status {
			font-size: 4rem;
		}
	}
</style>
