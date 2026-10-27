<script lang="ts">
	import { enhance } from '$app/forms';
	import LogoMark from '$lib/components/blog/LogoMark.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let showPassword = $state(false);
</script>

<svelte:head>
	<title>Sign in — Open Tabs</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="shell">
	<header class="auth-mast">
		<div class="auth-mast-inner"><LogoMark href="/" size="md" /></div>
	</header>

	<div class="card form-kit">
		<div class="ear"><h1>Sign in</h1></div>
		<p class="tagline">Sign in to your account.</p>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			{#if form?.error}
				<p class="error-banner" role="alert">{form.error}</p>
			{/if}

			<div class="field">
				<label for="email">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					disabled={loading}
				/>
			</div>

			<div class="field">
				<label for="password">Password</label>
				<div class="input-icon-wrap">
					<input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="current-password"
						required
						disabled={loading}
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
			</div>

			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? 'Signing in…' : 'Sign in'}
			</button>
		</form>

		<p class="switch">No account? <a href="/register">Create one</a></p>
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
</style>
