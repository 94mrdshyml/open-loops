<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		danger?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmLabel = 'Delete',
		danger = true,
		onConfirm,
		onCancel
	}: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') onCancel();
	}

	// Focus lands on Cancel, so Enter never deletes by accident.
	function focusOnMount(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="backdrop" onclick={onCancel} role="presentation"></div>
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		aria-describedby="modal-desc"
	>
		<h2 class="modal-title" id="modal-title">{title}</h2>
		<p class="modal-message" id="modal-desc">{message}</p>
		<div class="modal-actions">
			<button type="button" class="btn-cancel" onclick={onCancel} use:focusOnMount>Cancel</button>
			<button type="button" class="btn-confirm" class:danger onclick={onConfirm}>
				{confirmLabel}
			</button>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-admin-overlay);
		z-index: 100;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 101;
		background: var(--color-admin-bg);
		border: 1px solid var(--color-admin-border-strong);
		border-top: 4px solid var(--color-admin-text);
		border-radius: 12px;
		padding: 1.5rem;
		width: min(440px, calc(100vw - 2rem));
		box-shadow: var(--shadow-lg);
	}

	.modal-title {
		font-family: var(--serif);
		font-size: 1.5rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		color: var(--color-admin-text);
		margin-bottom: 0.5rem;
	}

	.modal-message {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
		line-height: 1.55;
		margin-bottom: 1.5rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.btn-cancel,
	.btn-confirm {
		min-height: 44px;
		padding: 0 1.125rem;
		border-radius: 10px;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.btn-cancel {
		background: transparent;
		border: 1px solid var(--color-admin-border-strong);
		color: var(--color-admin-text);
	}

	.btn-cancel:hover {
		background: var(--color-admin-surface-hover);
	}

	.btn-confirm {
		background: var(--color-admin-text);
		border: 1px solid var(--color-admin-text);
		color: var(--color-admin-bg);
	}

	.btn-confirm:hover {
		background: var(--color-admin-accent);
		border-color: var(--color-admin-accent);
	}

	.btn-confirm.danger {
		background: var(--color-status-error);
		border-color: var(--color-status-error);
		color: var(--color-admin-bg);
	}

	.btn-confirm.danger:hover {
		filter: brightness(0.92);
	}
</style>
