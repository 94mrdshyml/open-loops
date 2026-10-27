<script lang="ts">
	import { toastStore, toast } from '$lib/stores/toast';
</script>

<div class="toast-stack" aria-live="polite" aria-atomic="false">
	{#each $toastStore as item (item.id)}
		<div class="toast toast--{item.type}" role="alert">
			<span class="toast-icon" aria-hidden="true">
				{#if item.type === 'success'}✓{:else if item.type === 'error'}✕{:else}ℹ{/if}
			</span>
			<span class="toast-msg">{item.message}</span>
			<button
				class="toast-close"
				onclick={() => toast.dismiss(item.id)}
				aria-label="Dismiss notification">×</button
			>
			<div class="toast-progress"></div>
		</div>
	{/each}
</div>

<style>
	.toast-stack {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 9999;
		pointer-events: none;
	}

	/* Inverted paper: ink background, with a bar and icon that say what happened */
	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem 0.875rem 1.125rem;
		border-radius: 10px;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 500;
		background: var(--color-admin-text);
		color: var(--color-admin-bg);
		min-width: 260px;
		max-width: 400px;
		box-shadow: var(--shadow-lg);
		pointer-events: auto;
		position: relative;
		overflow: hidden;
		animation: slide-in 0.2s ease;
	}

	.toast::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 4px;
		background: var(--color-admin-accent);
	}

	.toast--success::before {
		background: var(--color-toast-success);
	}

	.toast--error::before {
		background: var(--color-toast-error);
	}

	@keyframes slide-in {
		from {
			transform: translateX(110%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
		.toast-progress {
			animation: none;
		}
	}

	.toast-icon {
		flex-shrink: 0;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.toast-msg {
		flex: 1;
		line-height: 1.4;
	}

	.toast-close {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		margin: -6px -4px -6px 0;
		background: none;
		border: none;
		border-radius: 8px;
		color: inherit;
		opacity: 0.7;
		font-size: 1.125rem;
		cursor: pointer;
		line-height: 1;
	}

	.toast-close:hover {
		opacity: 1;
	}

	.toast-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 2px;
		width: 100%;
		background: currentColor;
		opacity: 0.25;
		animation: shrink 4s linear forwards;
		transform-origin: left;
	}

	@keyframes shrink {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(0);
		}
	}

	@media (max-width: 767px) {
		.toast-stack {
			left: 1rem;
			right: 1rem;
			bottom: 1rem;
		}

		.toast {
			min-width: 0;
			max-width: none;
		}
	}
</style>
