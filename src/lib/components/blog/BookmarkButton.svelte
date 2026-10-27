<script lang="ts">
	import { enhance } from '$app/forms';

	interface Props {
		postSlug: string;
		isSaved: boolean;
		user: { id: string } | null;
	}

	let { postSlug, isSaved = $bindable(), user }: Props = $props();

	let saving = $state(false);
</script>

{#if user}
	<form
		method="POST"
		action="?/toggleSave"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success' && result.data && 'isSaved' in result.data) {
					isSaved = result.data.isSaved as boolean;
				} else {
					await update();
				}
			};
		}}
	>
		<button
			type="submit"
			class="bookmark-btn"
			class:saved={isSaved}
			disabled={saving}
			aria-label={isSaved ? 'Remove bookmark' : 'Save for later'}
			title={isSaved ? 'Remove bookmark' : 'Save for later'}
		>
			{#if isSaved}
				<!-- Filled bookmark -->
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12l-5-2.5L3 14V2z" />
				</svg>
			{:else}
				<!-- Outline bookmark -->
				<svg
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12l-5-2.5L3 14V2z" />
				</svg>
			{/if}
		</button>
	</form>
{:else}
	<a
		href="/login?redirect=/posts/{postSlug}"
		class="bookmark-btn"
		aria-label="Sign in to save"
		title="Sign in to save for later"
	>
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			aria-hidden="true"
		>
			<path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12l-5-2.5L3 14V2z" />
		</svg>
	</a>
{/if}

<style>
	.bookmark-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--ink-60);
		text-decoration: none;
		transition: color 0.15s;
		flex-shrink: 0;
	}

	.bookmark-btn:hover:not(:disabled) {
		color: var(--ink);
	}

	.bookmark-btn.saved {
		color: var(--accent-ink);
	}

	.bookmark-btn.saved:hover:not(:disabled) {
		color: var(--ink);
	}

	.bookmark-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
