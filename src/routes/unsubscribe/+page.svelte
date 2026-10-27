<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let working = $state(false);
</script>

<svelte:head>
	<title>Unsubscribe — Open Tabs</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="shell">
	<div class="card">
		<a href="/" class="wordmark">Open Tabs</a>
		<div class="content">
			{#if form?.done}
				<h1 class="heading">You've been unsubscribed.</h1>
				<p class="body">You won't receive newsletter emails from Open Tabs anymore.</p>
			{:else if data.valid}
				<h1 class="heading">Unsubscribe from the newsletter?</h1>
				<p class="body">You will stop getting newsletter emails from Open Tabs.</p>
				{#if form?.error}
					<p class="body error" role="alert">{form.error}</p>
				{/if}
				<form
					method="POST"
					use:enhance={() => {
						working = true;
						return async ({ update }) => {
							working = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="token" value={data.token} />
					<button type="submit" class="confirm" disabled={working}>
						{working ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
					</button>
				</form>
			{:else}
				<h1 class="heading">This link doesn't work.</h1>
				<p class="body">
					Please use the unsubscribe link in your latest email from us. If you have an account, you
					can also change this in your profile.
				</p>
			{/if}
			<a href="/" class="back-link">← Back to Open Tabs</a>
		</div>
	</div>
</main>

<style>
	.shell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		background: var(--cream);
		padding: 1.5rem;
	}

	.card {
		width: 100%;
		max-width: 22rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.wordmark {
		font-family: var(--serif);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--ink);
		text-decoration: none;
		font-style: italic;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.heading {
		font-family: var(--serif);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--ink);
		margin: 0;
	}

	.body {
		font-family: var(--ui);
		font-size: 0.875rem;
		color: var(--ink-60);
		margin: 0;
	}

	.back-link {
		font-family: var(--ui);
		font-size: 0.875rem;
		color: var(--ink-60);
		text-decoration: none;
		margin-top: 0.5rem;
	}

	.back-link:hover {
		color: var(--ink);
	}

	.error {
		color: var(--accent);
		font-weight: 600;
	}

	.confirm {
		min-height: 44px;
		padding: 0 1.25rem;
		font-family: var(--ui);
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--cream);
		background: var(--ink);
		border: 0;
		border-radius: 10px;
		cursor: pointer;
		margin-top: 0.5rem;
	}

	.confirm:disabled {
		opacity: 0.6;
		cursor: wait;
	}
</style>
