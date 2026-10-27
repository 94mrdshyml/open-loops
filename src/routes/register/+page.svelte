<script lang="ts">
	import { enhance } from '$app/forms';
	import LogoMark from '$lib/components/blog/LogoMark.svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let newsletterOptIn = $state(true);

	let loading = $state(false);
	let showPassword = $state(false);
	let usernameStatus = $state<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
	let emailStatus = $state<'idle' | 'checking' | 'available' | 'taken'>('idle');
	let usernameTimeout: ReturnType<typeof setTimeout> | undefined;
	let emailTimeout: ReturnType<typeof setTimeout> | undefined;

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
				const data = (await res.json()) as { available: boolean; reason?: string };
				if (data.reason === 'invalid_format') {
					usernameStatus = 'invalid';
				} else if (data.reason === 'db_error' || !res.ok) {
					usernameStatus = 'idle';
				} else {
					usernameStatus = data.available ? 'available' : 'taken';
				}
			} catch {
				usernameStatus = 'idle';
			}
		}, 400);
	}

	function onEmailInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		clearTimeout(emailTimeout);

		if (!value.includes('@')) {
			emailStatus = 'idle';
			return;
		}

		emailStatus = 'checking';
		emailTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/check-email?email=${encodeURIComponent(value)}`);
				const data = (await res.json()) as { available: boolean; reason?: string };
				if (!res.ok || data.reason === 'db_error') {
					emailStatus = 'idle';
				} else {
					emailStatus = data.available ? 'available' : 'taken';
				}
			} catch {
				emailStatus = 'idle';
			}
		}, 400);
	}
</script>

<svelte:head>
	<title>Create account — Open Tabs</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="shell">
	<header class="auth-mast">
		<div class="auth-mast-inner"><LogoMark href="/" size="md" /></div>
	</header>

	<div class="card form-kit">
		<div class="ear"><h1>Create account</h1></div>
		<p class="tagline">Create your account.</p>

		<form
			method="POST"
			action="?/register"
			use:enhance={({ cancel }) => {
				if (
					usernameStatus === 'taken' ||
					usernameStatus === 'invalid' ||
					usernameStatus === 'checking' ||
					emailStatus === 'taken' ||
					emailStatus === 'checking'
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
			{#if form?.errors?.general}
				<p class="error-banner" role="alert">{form.errors.general}</p>
			{/if}

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

			<!-- Email -->
			<div class="field">
				<label for="email">Email</label>
				<div class="input-icon-wrap">
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						disabled={loading}
						oninput={onEmailInput}
						class:field-error={!!form?.errors?.email || emailStatus === 'taken'}
					/>
					{#if emailStatus === 'checking'}
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
					{:else if emailStatus === 'taken'}
						<span class="input-icon err" aria-label="Email taken">✕</span>
					{/if}
				</div>
				{#if emailStatus === 'taken'}
					<span class="field-err-msg"
						>An account with this email already exists. <a href="/login">Sign in?</a></span
					>
				{:else if form?.errors?.email}
					<span class="field-err-msg">{form.errors.email}</span>
				{/if}
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
					<span class="field-err-msg"
						>{form?.errors?.username ??
							'Only lowercase letters, numbers and underscores. 3–20 characters.'}</span
					>
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
						{#if showPassword}
							<svg
								width="20"
								height="20"
								viewBox="0 0 20 20"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								aria-hidden="true"
								><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" /><circle
									cx="10"
									cy="10"
									r="2.5"
								/><line x1="3" y1="17" x2="17" y2="3" /></svg
							>
						{:else}
							<svg
								width="20"
								height="20"
								viewBox="0 0 20 20"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								aria-hidden="true"
								><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" /><circle
									cx="10"
									cy="10"
									r="2.5"
								/></svg
							>
						{/if}
					</button>
				</div>
				{#if form?.errors?.password}
					<span class="field-err-msg">{form.errors.password}</span>
				{/if}
			</div>

			{#if data.askNewsletterOnRegister}
				<label class="newsletter-opt-in">
					<input type="hidden" name="newsletterOptIn" value={newsletterOptIn ? 'true' : 'false'} />
					<input
						type="checkbox"
						checked={newsletterOptIn}
						onchange={(e) => (newsletterOptIn = (e.target as HTMLInputElement).checked)}
						disabled={loading}
					/>
					<span>Send me Open Tabs stories in my inbox</span>
				</label>
			{/if}

			<button
				type="submit"
				class="btn-primary"
				disabled={loading ||
					usernameStatus === 'checking' ||
					usernameStatus === 'taken' ||
					usernameStatus === 'invalid' ||
					emailStatus === 'checking' ||
					emailStatus === 'taken'}
			>
				{loading ? 'Creating account…' : 'Create account'}
			</button>
		</form>

		<p class="switch">Already have an account? <a href="/login">Sign in</a></p>
	</div>
</main>

<style>
	.shell {
		min-height: 100dvh;
		background: var(--cream);
		padding-bottom: 64px;
	}

	/* The masthead band, without the tab strip */
	.auth-mast {
		background: var(--paper2);
		border-bottom: 1px solid var(--border);
	}

	.auth-mast-inner {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
		padding: 24px 0 18px;
	}

	.card {
		width: min(440px, 100% - 40px);
		margin: 64px auto 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.ear {
		display: flex;
		border-bottom: 2px solid var(--ink);
	}

	.ear h1 {
		margin: 0;
		padding: 10px 16px 8px;
		background: var(--ink);
		color: var(--cream);
		border-radius: 8px 8px 0 0;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		line-height: 1;
	}

	.tagline {
		margin: 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 19px;
		line-height: 1.45;
		color: var(--ink-60);
	}

	.switch {
		margin: 0;
		padding-top: 16px;
		border-top: 1px solid var(--border);
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		color: var(--ink-60);
	}

	.switch a {
		font-weight: 600;
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
	}

	.switch a:hover {
		color: var(--accent);
	}

	@media (max-width: 639px) {
		.auth-mast-inner {
			width: calc(100% - 40px);
			padding: 14px 0 12px;
		}

		.card {
			margin-top: 40px;
		}
	}

	.newsletter-opt-in {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		color: var(--ink);
		cursor: pointer;
	}

	.newsletter-opt-in input[type='checkbox'] {
		width: 20px;
		height: 20px;
		margin: 0;
		accent-color: var(--accent);
		flex-shrink: 0;
	}
</style>
