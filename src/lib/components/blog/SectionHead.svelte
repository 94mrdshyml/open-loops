<script lang="ts">
	interface Props {
		label: string;
		href?: string;
		actionLabel?: string;
		/** Drop the gap under the rule, for lists whose rows carry their own padding. */
		flush?: boolean;
	}

	let { label, href, actionLabel = 'See all →', flush = false }: Props = $props();
</script>

<div class="section-head" class:flush>
	<h2 class="label">{label}</h2>
	{#if href}
		<a {href} class="action">{actionLabel}</a>
	{/if}
</div>

<style>
	/* The section ear: a dark tab hanging off a heavy rule */
	.section-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 14px;
		margin-bottom: 28px;
		border-bottom: 2px solid var(--ink);
	}

	.section-head.flush {
		margin-bottom: 0;
	}

	.label {
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		line-height: 1;
		color: var(--cream);
		background: var(--ink);
		padding: 10px 16px 8px;
		border-radius: 8px 8px 0 0;
		flex-shrink: 0;
		margin: 0;
	}

	.action {
		display: flex;
		align-items: center;
		min-height: 44px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 14px;
		line-height: 1;
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 5px;
		flex-shrink: 0;
	}

	.action:hover {
		color: var(--accent);
	}

	@media (max-width: 639px) {
		.label {
			font-size: 14px;
			padding: 9px 14px 7px;
		}
	}
</style>
