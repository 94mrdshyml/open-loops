<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Small label above the title, e.g. "Topic" or "Tag". */
		kicker?: string;
		title: string;
		/** Italic line under the title. */
		dek?: string | null;
		/** Shown after the kicker, e.g. "12 stories". */
		count?: string | null;
		/** Category colour, shown as a small dot before the kicker. */
		markColor?: string | null;
		/** Extra content before the text block, such as an avatar. */
		lead?: Snippet;
	}

	let { kicker, title, dek = null, count = null, markColor = null, lead }: Props = $props();
</script>

<header class="page-head" class:has-lead={!!lead}>
	{#if lead}
		<div class="lead">{@render lead()}</div>
	{/if}
	<div class="text">
		{#if kicker || count}
			<div class="meta">
				{#if kicker}
					<span class="kicker">
						{#if markColor}<span class="mark" style="background: {markColor}" aria-hidden="true"
							></span>{/if}{kicker}
					</span>
				{/if}
				{#if kicker && count}<span aria-hidden="true">·</span>{/if}
				{#if count}<span>{count}</span>{/if}
			</div>
		{/if}
		<h1 class="title">{title}</h1>
		{#if dek}
			<p class="dek">{dek}</p>
		{/if}
	</div>
</header>

<style>
	.page-head {
		padding: 64px 0 40px;
	}

	.has-lead {
		display: flex;
		gap: 28px;
		align-items: flex-start;
	}

	.lead {
		flex-shrink: 0;
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: 18px;
		min-width: 0;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1;
		color: var(--ink-60);
	}

	.kicker {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--accent);
		font-weight: 600;
	}

	.mark {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.title {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 56px;
		line-height: 1.03;
		letter-spacing: -0.025em;
		max-width: 860px;
		text-wrap: balance;
		color: var(--ink);
		overflow-wrap: anywhere;
	}

	.dek {
		margin: 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 21px;
		line-height: 1.45;
		color: var(--ink-60);
		max-width: var(--article-w);
		text-wrap: pretty;
	}

	@media (max-width: 1023px) {
		.page-head {
			padding: 48px 0 32px;
		}

		.title {
			font-size: 44px;
			line-height: 1.05;
			letter-spacing: -0.022em;
		}

		.dek {
			font-size: 19px;
		}
	}

	@media (max-width: 639px) {
		.page-head {
			padding: 32px 0 24px;
		}

		.has-lead {
			flex-direction: column;
			gap: 20px;
		}

		.text {
			gap: 14px;
		}

		.meta {
			font-size: 14px;
			gap: 8px;
		}

		.title {
			font-size: 36px;
			line-height: 1.06;
			letter-spacing: -0.02em;
			text-wrap: pretty;
		}

		.dek {
			font-size: 18px;
		}
	}
</style>
