<script lang="ts">
	interface Action {
		label: string;
		href: string;
	}

	interface Props {
		message: string;
		sublabel?: string;
		action?: Action;
	}

	let { message, sublabel, action }: Props = $props();
</script>

<div class="empty">
	<p class="empty-message">{message}</p>
	{#if sublabel}
		<p class="empty-sublabel">{sublabel}</p>
	{/if}
	{#if action}
		<a href={action.href} class="empty-action">{action.label}</a>
	{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3.5rem 1.5rem;
		text-align: center;
		gap: 0.375rem;
	}

	.empty-message {
		font-family: var(--serif);
		font-size: 1.375rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		color: var(--color-admin-text);
	}

	.empty-sublabel {
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
		max-width: 38ch;
	}

	.empty-action {
		margin-top: 1rem;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 1.125rem;
		background: var(--color-admin-text);
		color: var(--color-admin-bg);
		font-size: var(--text-sm);
		font-weight: 600;
		border-radius: 10px;
		text-decoration: none;
		transition: background-color 0.15s;
	}

	.empty-action:hover {
		background: var(--color-admin-accent);
	}
</style>
