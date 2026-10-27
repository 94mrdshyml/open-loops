<script lang="ts">
	import { goto } from '$app/navigation';

	interface Props {
		isSubscribed?: boolean;
		user?: { id: string; name: string } | null;
	}

	let { isSubscribed = false, user = null }: Props = $props();

	type FormState = 'idle' | 'loading' | 'success' | 'error' | 'has_account';
	let status = $state<FormState>('idle');
	let email = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed || !trimmed.includes('@')) {
			status = 'error';
			return;
		}
		if (status === 'loading') return;
		status = 'loading';
		try {
			const res = await fetch('/api/newsletter/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: trimmed })
			});
			const data = (await res.json()) as { status?: string; email?: string; error?: string };
			if (!res.ok && !data.status) {
				status = 'error';
				return;
			}
			if (data.status === 'already_subscribed' || data.status === 'subscribed') {
				status = 'success';
				return;
			}
			if (data.status === 'setup_required' && data.email) {
				await goto(`/newsletter/setup?email=${encodeURIComponent(data.email)}`);
				return;
			}
			if (data.status === 'has_account') {
				status = 'has_account';
				return;
			}
			status = 'error';
		} catch {
			status = 'error';
		}
	}

	async function handleLoggedInSubscribe() {
		if (status === 'loading') return;
		status = 'loading';
		try {
			const res = await fetch('/api/newsletter/subscribe-me', { method: 'POST' });
			const data = (await res.json()) as { status?: string };
			if (data.status === 'subscribed' || data.status === 'already_subscribed') {
				status = 'success';
			} else {
				status = 'error';
			}
		} catch {
			status = 'error';
		}
	}
</script>

{#if !isSubscribed}
	<div class="nl-block">
		{#if status === 'success'}
			<div class="success-inner">
				<span class="nl-label">Subscribed ✓</span>
				<p class="success-heading">You're on the list. Good reads incoming.</p>
				<p class="success-sub">Check your inbox for a welcome note.</p>
			</div>
		{:else if status === 'has_account'}
			<div class="has-account-inner">
				<p class="has-account-msg">
					That email already has an Open Tabs account.
					<a href="/login" class="has-account-link">Log in to subscribe →</a>
				</p>
				<button
					class="nl-reset"
					onclick={() => {
						status = 'idle';
						email = '';
					}}
				>
					Use a different email
				</button>
			</div>
		{:else if user}
			<div class="idle-inner">
				<h2 class="nl-heading">
					The week's best reads,<br />straight to you.
				</h2>

				<p class="nl-desc">
					Concise explainers on business, politics, and geopolitics — every week. No noise.
				</p>

				<button
					class="nl-btn nl-btn-standalone"
					onclick={handleLoggedInSubscribe}
					disabled={status === 'loading'}
				>
					{status === 'loading' ? 'Subscribing…' : 'Subscribe'}
				</button>

				{#if status === 'error'}
					<p class="nl-fine nl-fine-error">Something went wrong. Please try again.</p>
				{/if}
			</div>
		{:else}
			<div class="idle-inner">
				<h2 class="nl-heading">
					The week's best reads,<br />straight to you.
				</h2>

				<p class="nl-desc">
					Concise explainers on business, politics, and geopolitics — every week. No noise.
				</p>

				<form class="nl-form" onsubmit={handleSubmit}>
					<input
						type="email"
						bind:value={email}
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
			</div>
		{/if}
	</div>
{/if}

<style>
	.nl-block {
		border-top: 2px solid var(--ink);
		border-bottom: 1px solid var(--border);
		padding: 52px 24px 48px;
		text-align: center;
	}

	/* ── Success ─────────────────────────────────── */
	.success-inner {
		max-width: 480px;
		margin: 0 auto;
	}

	.success-heading {
		font-family: var(--serif);
		font-style: italic;
		font-weight: 400;
		font-size: 1.5rem;
		line-height: 1.35;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 16px 0 10px;
	}

	.success-sub {
		font-family: var(--ui);
		font-size: 13.5px;
		color: var(--ink-60);
		line-height: 1.6;
		margin: 0;
	}

	/* ── Has account ─────────────────────────────── */
	.has-account-inner {
		max-width: 480px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
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

	/* ── Idle ────────────────────────────────────── */
	.idle-inner {
		max-width: 520px;
		margin: 0 auto;
	}

	.nl-label {
		font-family: var(--mono);
		font-size: 9.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--accent-ink);
		display: block;
	}

	.nl-heading {
		font-family: var(--serif);
		font-weight: 400;
		font-style: italic;
		font-size: clamp(1.6rem, 3vw, 2.25rem);
		line-height: 1.25;
		letter-spacing: -0.02em;
		color: var(--ink);
		margin: 14px 0 12px;
	}

	.nl-desc {
		font-family: var(--ui);
		font-size: 14px;
		color: var(--ink-60);
		line-height: 1.65;
		margin: 0 0 32px;
	}

	/* ── Form ────────────────────────────────────── */
	.nl-form {
		display: flex;
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
		padding: 11px 14px;
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
		padding: 11px 22px;
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

	/* ── Standalone button (logged-in mode) ──────── */
	.nl-btn-standalone {
		border-radius: 2px;
		padding: 12px 32px;
		flex-shrink: unset;
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
