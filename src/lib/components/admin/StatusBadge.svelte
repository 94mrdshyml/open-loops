<script lang="ts">
	interface Props {
		status: 'draft' | 'published' | 'scheduled' | 'archived' | 'pending' | 'approved' | 'rejected';
		/** A scheduled story whose time has passed but is not live yet. Shown in words, not just colour. */
		overdue?: boolean;
	}

	let { status, overdue = false }: Props = $props();

	const label = $derived(overdue && status === 'scheduled' ? 'overdue' : status);
</script>

<span class="badge badge-{label}">{label}</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.2em 0.65em 0.2em 0.55em;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		white-space: nowrap;
	}

	/* A dot as well as colour, so status never relies on colour alone */
	.badge::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}

	.badge-published::before {
		background: currentColor;
	}

	.badge-draft::before,
	.badge-archived::before,
	.badge-pending::before {
		background: transparent;
		box-shadow: inset 0 0 0 1.5px currentColor;
	}

	.badge-scheduled::before,
	.badge-overdue::before,
	.badge-rejected::before {
		border-radius: 1px;
		transform: rotate(45deg);
	}

	.badge-draft {
		color: var(--color-status-draft);
		background: var(--color-status-draft-bg);
	}

	.badge-published {
		color: var(--color-status-published);
		background: var(--color-status-published-bg);
	}

	.badge-scheduled {
		color: var(--color-status-scheduled);
		background: var(--color-status-scheduled-bg);
	}

	.badge-overdue {
		color: var(--color-status-error);
		background: var(--color-status-error-bg);
	}

	.badge-archived {
		color: var(--color-status-archived);
		background: var(--color-status-archived-bg);
	}

	/* Comment statuses reuse the same colours: waiting, approved, turned down */
	.badge-pending {
		color: var(--color-status-scheduled);
		background: var(--color-status-scheduled-bg);
	}

	.badge-approved {
		color: var(--color-status-published);
		background: var(--color-status-published-bg);
	}

	.badge-rejected {
		color: var(--color-status-error);
		background: var(--color-status-error-bg);
	}
</style>
