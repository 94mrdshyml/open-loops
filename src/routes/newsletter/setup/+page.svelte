<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let loading = $state(false);
	let showPassword = $state(false);
	let usernameStatus = $state<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
		data.username ? 'available' : 'idle'
	);
	let usernameTimeout: ReturnType<typeof setTimeout> | undefined;

	function onUsernameInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		clearTimeout(usernameTimeout);

		if (value.length < 3) {
			usernameStatus = 'idle';
			return;
		}

		usernameStatus = 'checking';
		usernameTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/check-username?username=${encodeURIComponent(value)}`);
				const result = (await res.json()) as { available: boolean; reason?: string };
				if (result.reason === 'invalid_format') {
					usernameStatus = 'invalid';
				} else if (result.reason === 'db_error' || !res.ok) {
					usernameStatus = 'idle';
				} else {
					usernameStatus = result.available ? 'available' : 'taken';
				}
			} catch {
				usernameStatus = 'idle';
			}
		}, 400);
	}
</script>

<svelte:head>
	<title>Complete your subscription — Open Tabs</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="shell">
	<div class="card">
		<a href="/" class="wordmark">Open Tabs</a>

		<div class="heading-block">
			<h1 class="page-heading">One last step.</h1>
			<p class="page-sub">Tell us a bit about yourself to complete your subscription.</p>
		</div>

		<form
			method="POST"
			action="?/setup"
			use:enhance={({ cancel }) => {
				if (
					usernameStatus === 'taken' ||
					usernameStatus === 'invalid' ||
					usernameStatus === 'checking'
				) {
					cancel();
					return;
				}
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<!-- Bots fill in every box. A person never sees this one, so a filled box means a bot. -->
			<div class="sr-only" aria-hidden="true">
				<label
					>Leave this empty <input
						type="text"
						name="website"
						tabindex="-1"
						autocomplete="off"
					/></label
				>
			</div>
			{#if form?.errors?.general}
				<p class="error-banner" role="alert">{form.errors.general}</p>
			{/if}

			<!-- Email chip — read-only display + hidden input -->
			<div class="email-section">
				<span class="email-chip">{data.email}</span>
				<input type="hidden" name="email" value={data.email} />
				<a href="/" class="email-change">Use a different email</a>
			</div>

			<!-- First + Last name -->
			<div class="name-row">
				<div class="field">
					<label for="firstName">First name</label>
					<input
						id="firstName"
						name="firstName"
						type="text"
						autocomplete="given-name"
						required
						disabled={loading}
						class:field-error={!!form?.errors?.firstName}
					/>
					{#if form?.errors?.firstName}
						<span class="field-err-msg">{form.errors.firstName}</span>
					{/if}
				</div>
				<div class="field">
					<label for="lastName">Last name</label>
					<input
						id="lastName"
						name="lastName"
						type="text"
						autocomplete="family-name"
						required
						disabled={loading}
						class:field-error={!!form?.errors?.lastName}
					/>
					{#if form?.errors?.lastName}
						<span class="field-err-msg">{form.errors.lastName}</span>
					{/if}
				</div>
			</div>

			<!-- Username with availability check -->
			<div class="field">
				<label for="username">Username</label>
				<div class="input-icon-wrap">
					<input
						id="username"
						name="username"
						type="text"
						autocomplete="username"
						value={data.username}
						required
						disabled={loading}
						oninput={onUsernameInput}
						class:field-error={!!form?.errors?.username ||
							usernameStatus === 'taken' ||
							usernameStatus === 'invalid'}
						class:field-ok={usernameStatus === 'available'}
					/>
					{#if usernameStatus === 'checking'}
						<span class="input-icon spinner" aria-label="Checking…">
							<svg
								width="14"
								height="14"
								viewBox="0 0 14 14"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								class="spin"
							>
								<circle cx="7" cy="7" r="5" stroke-dasharray="20" stroke-dashoffset="5" />
							</svg>
						</span>
					{:else if usernameStatus === 'available'}
						<span class="input-icon ok" aria-label="Available">✓</span>
					{:else if usernameStatus === 'taken' || usernameStatus === 'invalid'}
						<span class="input-icon err" aria-label="Unavailable">✕</span>
					{/if}
				</div>
				{#if usernameStatus === 'available'}
					<span class="field-ok-msg">Username available</span>
				{:else if usernameStatus === 'taken'}
					<span class="field-err-msg">Username is taken</span>
				{:else if usernameStatus === 'invalid' || form?.errors?.username}
					<span class="field-err-msg">
						{form?.errors?.username ??
							'Only lowercase letters, numbers and underscores. 3–20 characters.'}
					</span>
				{/if}
			</div>

			<!-- Password -->
			<div class="field">
				<label for="password">Password</label>
				<div class="input-icon-wrap">
					<input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						minlength="8"
						required
						disabled={loading}
						class:field-error={!!form?.errors?.password}
					/>
					<button
						type="button"
						class="input-icon show-hide"
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{showPassword ? '🙈' : '👁'}
					</button>
				</div>
				{#if form?.errors?.password}
					<span class="field-err-msg">{form.errors.password}</span>
				{/if}
			</div>

			<button
				type="submit"
				class="btn-primary"
				disabled={loading ||
					usernameStatus === 'checking' ||
					usernameStatus === 'taken' ||
					usernameStatus === 'invalid'}
			>
				{loading ? 'Completing subscription…' : 'Complete subscription'}
			</button>
		</form>

		<p class="switch">Already have an account? <a href="/login">Log in →</a></p>
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
		max-width: 26rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.wordmark {
		font-family: var(--serif);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--ink);
		text-decoration: none;
		font-style: italic;
	}

	.heading-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.page-heading {
		font-family: var(--serif);
		font-size: 1.625rem;
		font-weight: 400;
		font-style: italic;
		letter-spacing: -0.02em;
		color: var(--ink);
		margin: 0;
	}

	.page-sub {
		font-family: var(--ui);
		font-size: 0.875rem;
		color: var(--ink-60);
		margin: 0;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.error-banner {
		font-size: 0.8125rem;
		color: #c0392b;
		background: #fdf0ef;
		border: 1px solid #f5c6c2;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
	}

	/* ── Email chip ──────────────────────────────── */
	.email-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.email-chip {
		display: inline-block;
		background: var(--ink-10);
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 5px 14px;
		font-family: var(--mono);
		font-size: 12px;
		color: var(--ink-60);
	}

	.email-change {
		font-family: var(--ui);
		font-size: 12px;
		color: var(--ink-30);
		text-decoration: underline;
		display: block;
		text-align: center;
	}

	/* ── Fields (shared with register page style) ── */
	.name-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	@media (max-width: 400px) {
		.name-row {
			grid-template-columns: 1fr;
		}
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	label {
		font-family: var(--ui);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--ink-60);
	}

	input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-family: var(--ui);
		color: var(--ink);
		background: var(--cream);
		border: 1.5px solid var(--border);
		border-radius: 6px;
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}

	input:focus {
		border-color: var(--ink-60);
	}

	input.field-error {
		border-color: #c0392b;
	}

	input.field-ok {
		border-color: #27ae60;
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.input-icon-wrap {
		position: relative;
	}

	.input-icon-wrap input {
		padding-right: 2.25rem;
	}

	.input-icon {
		position: absolute;
		right: 0.625rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.8125rem;
		pointer-events: none;
		display: flex;
		align-items: center;
	}

	.input-icon.spinner {
		color: var(--ink-30);
	}

	.input-icon.ok {
		color: #27ae60;
		font-weight: 700;
	}

	.input-icon.err {
		color: #c0392b;
		font-weight: 700;
	}

	.input-icon.show-hide {
		pointer-events: all;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0;
		line-height: 1;
	}

	.field-err-msg {
		font-size: 0.75rem;
		color: #c0392b;
	}

	.field-ok-msg {
		font-size: 0.75rem;
		color: #27ae60;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.spin {
		animation: spin 0.8s linear infinite;
	}

	.btn-primary {
		width: 100%;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		font-family: var(--ui);
		color: var(--cream);
		background: var(--ink);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.85;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.switch {
		font-family: var(--ui);
		font-size: 0.8125rem;
		color: var(--ink-60);
		text-align: center;
	}

	.switch a {
		color: var(--ink);
		text-decoration: underline;
	}
</style>
