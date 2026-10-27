<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type FormState = 'idle' | 'loading' | 'success' | 'error' | 'has_account';
	let status = $state<FormState>('idle');
	let email = $state(data.email);

	const isLoggedIn = data.isLoggedIn;
	const alreadySubscribed = data.isSubscribed;

	async function handleLoggedInSubscribe() {
		if (status === 'loading') return;
		status = 'loading';
		try {
			const res = await fetch('/api/newsletter/subscribe-me', { method: 'POST' });
			const result = (await res.json()) as { status?: string };
			status =
				result.status === 'subscribed' || result.status === 'already_subscribed'
					? 'success'
					: 'error';
		} catch {
			status = 'error';
		}
	}

	async function handleAnonymousSubscribe(e: SubmitEvent) {
		e.preventDefault();
		if (status === 'loading') return;

		const trimmed = email.trim();
		if (!trimmed || !trimmed.includes('@')) {
			status = 'error';
			return;
		}

		status = 'loading';
		try {
			const res = await fetch('/api/newsletter/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: trimmed })
			});
			const result = (await res.json()) as { status?: string; email?: string };

			if (!res.ok && !result.status) {
				status = 'error';
				return;
			}
			if (result.status === 'already_subscribed' || result.status === 'subscribed') {
				status = 'success';
				return;
			}
			if (result.status === 'setup_required' && result.email) {
				await goto(`/newsletter/setup?email=${encodeURIComponent(result.email)}`);
				return;
			}
			if (result.status === 'has_account') {
				status = 'has_account';
				return;
			}
			status = 'error';
		} catch {
			status = 'error';
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLoggedIn) {
			void handleLoggedInSubscribe();
		} else {
			void handleAnonymousSubscribe(e);
		}
	}
</script>

<svelte:head>
	<title>Newsletter — Open Tabs</title>
	<meta
		name="description"
		content="Sharp, context-first explainers on business, politics, and geopolitics — twice a week, straight to your inbox. Subscribe to the Open Tabs newsletter."
	/>
</svelte:head>

<main class="shell">
	<div class="page">
		<a href="/" class="wordmark">Open Tabs</a>

		{#if alreadySubscribed}
			<div class="already-block">
				<h1 class="already-heading">You're already subscribed ✓</h1>
				<p class="already-sub">
					Good reads are already headed to your inbox. Manage your subscription anytime from your
					profile.
				</p>
				<a href="/profile" class="already-link">Go to profile →</a>
			</div>
		{:else if status === 'success'}
			<div class="success-block">
				<span class="eyebrow">Subscribed ✓</span>
				<h1 class="success-heading">You're on the list.</h1>
				<p class="success-sub">Good reads incoming. Check your inbox for a welcome note.</p>
			</div>
		{:else}
			<div class="hero">
				<h1 class="hero-heading">The week's best reads,<br />straight to your inbox.</h1>
				<p class="hero-desc">
					Sharp, context-first explainers on business, politics, and geopolitics. No noise, no hot
					takes — just the signal. Twice a week, free.
				</p>

				{#if status === 'has_account'}
					<div class="has-account-inner">
						<p class="has-account-msg">
							That email already has an Open Tabs account.
							<a href="/login" class="has-account-link">Log in to subscribe →</a>
						</p>
						<button
							class="nl-reset"
							onclick={() => {
								status = 'idle';
								email = isLoggedIn ? data.email : '';
							}}
						>
							Use a different email
						</button>
					</div>
				{:else}
					<form class="nl-form" onsubmit={handleSubmit}>
						<input
							type="email"
							bind:value={email}
							readonly={isLoggedIn}
							placeholder="your@email.com"
							class="nl-input"
							class:nl-input-error={status === 'error'}
							disabled={status === 'loading'}
							aria-label="Email address"
							oninput={() => {
								if (status === 'error') status = 'idle';
							}}
						/>
						<button type="submit" class="nl-btn" disabled={status === 'loading'}>
							{status === 'loading' ? 'Subscribing…' : 'Subscribe'}
						</button>
					</form>

					<p class="nl-fine" class:nl-fine-error={status === 'error'}>
						{status === 'error'
							? 'Please enter a valid email address.'
							: 'No spam. Unsubscribe at any time.'}
					</p>
				{/if}

				<ul class="expect-list">
					<li>Sharp, context-first explainers</li>
					<li>No noise, no hot takes — just the signal</li>
					<li>Twice a week, in your inbox</li>
				</ul>
			</div>
		{/if}
	</div>
</main>

<style>
	.shell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		background: var(--cream);
		padding: 2rem 1.5rem;
	}

	.page {
		width: 100%;
		max-width: 42rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2.5rem;
		text-align: center;
	}

	.wordmark {
		font-family: var(--serif);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--ink);
		text-decoration: none;
		font-style: italic;
	}

	.eyebrow {
		font-family: var(--mono);
		font-size: 10.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--accent-ink);
		display: block;
	}

	/* ── Hero ────────────────────────────────────── */
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		width: 100%;
	}

	.hero-heading {
		font-family: var(--serif);
		font-weight: 400;
		font-style: italic;
		font-size: clamp(2rem, 5vw, 3.25rem);
		line-height: 1.2;
		letter-spacing: -0.02em;
		color: var(--ink);
		margin: 16px 0 14px;
	}

	.hero-desc {
		font-family: var(--ui);
		font-size: 15px;
		color: var(--ink-60);
		line-height: 1.7;
		max-width: 34rem;
		margin: 0 0 36px;
	}

	/* ── Form ────────────────────────────────────── */
	.nl-form {
		display: flex;
		width: 100%;
		max-width: 420px;
		margin: 0 auto;
	}

	.nl-input {
		flex: 1;
		font-family: var(--ui);
		font-size: 14px;
		letter-spacing: -0.01em;
		color: var(--ink);
		background: var(--cream);
		border: 1px solid var(--border);
		border-right: none;
		border-radius: 2px 0 0 2px;
		padding: 12px 14px;
		outline: none;
		transition: border-color 0.15s;
		min-width: 0;
	}

	.nl-input:focus {
		border-color: var(--ink);
	}

	.nl-input.nl-input-error {
		border-color: var(--accent);
	}

	.nl-input:disabled {
		opacity: 0.6;
	}

	.nl-btn {
		background: var(--ink);
		color: var(--cream);
		border: 1px solid var(--ink);
		border-radius: 0 2px 2px 0;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 12px 24px;
		cursor: pointer;
		flex-shrink: 0;
		white-space: nowrap;
		transition: opacity 0.15s;
	}

	.nl-btn:hover:not(:disabled) {
		opacity: 0.8;
	}

	.nl-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.nl-fine {
		font-family: var(--mono);
		font-size: 9.5px;
		letter-spacing: 0.05em;
		color: var(--ink-30);
		margin: 12px 0 0;
		transition: color 0.15s;
	}

	.nl-fine.nl-fine-error {
		color: var(--accent-ink);
	}

	/* ── Has account ─────────────────────────────── */
	.has-account-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		width: 100%;
	}

	.has-account-msg {
		font-family: var(--ui);
		font-size: 14px;
		color: var(--ink-60);
		line-height: 1.6;
		margin: 0;
	}

	.has-account-link {
		color: var(--ink);
		font-weight: 600;
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
	}

	.nl-reset {
		font-family: var(--mono);
		font-size: 9.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-30);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 0.15s;
	}

	.nl-reset:hover {
		color: var(--ink-60);
	}

	/* ── Expect list ─────────────────────────────── */
	.expect-list {
		list-style: none;
		margin: 40px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.expect-list li {
		font-family: var(--serif);
		font-style: italic;
		font-size: 15px;
		color: var(--ink-60);
	}

	.expect-list li::before {
		content: '→ ';
		color: var(--accent-ink);
		font-style: normal;
	}

	/* ── Success / already-subscribed ─────────────── */
	.success-block,
	.already-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.success-heading,
	.already-heading {
		font-family: var(--serif);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		line-height: 1.3;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 16px 0 10px;
	}

	.success-sub,
	.already-sub {
		font-family: var(--ui);
		font-size: 14px;
		color: var(--ink-60);
		line-height: 1.65;
		max-width: 30rem;
		margin: 0;
	}

	.already-link {
		font-family: var(--ui);
		font-size: 13.5px;
		font-weight: 600;
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
		margin-top: 20px;
	}

	/* ── Mobile ──────────────────────────────────── */
	@media (max-width: 520px) {
		.nl-form {
			flex-direction: column;
		}

		.nl-input {
			border-right: 1px solid var(--border);
			border-bottom: none;
			border-radius: 2px 2px 0 0;
		}

		.nl-input.nl-input-error {
			border-color: var(--accent);
		}

		.nl-btn {
			border-radius: 0 0 2px 2px;
			width: 100%;
		}
	}
</style>
