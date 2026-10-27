<script lang="ts">
	interface Props {
		points: string[];
	}

	let { points }: Props = $props();
</script>

<section class="tldr" aria-labelledby="in-brief">
	<h2 id="in-brief" class="tab">In brief</h2>
	<ul class="panel" role="list">
		{#each points as point (point)}
			<li>{point}</li>
		{/each}
	</ul>
</section>

<style>
	.tldr {
		margin: 0 0 40px;
	}

	/* Same open tab as the section headings, so the box reads as one of the site's own parts */
	.tab {
		display: inline-block;
		margin: 0;
		font-family: var(--ui);
		font-weight: 700;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--cream);
		background: var(--ink);
		padding: 9px 18px 8px;
		border-radius: 9px 9px 0 0;
	}

	.panel {
		list-style: none;
		margin: 0;
		padding: 20px 24px 22px;
		display: grid;
		gap: 14px;
		background: var(--accent-light);
		border: 1px solid var(--ink);
		border-radius: 0 6px 6px 6px;
	}

	li {
		position: relative;
		padding-left: 22px;
		font-family: var(--serif);
		font-size: 1.0625rem;
		line-height: 1.6;
		color: var(--ink);
	}

	li::before {
		content: '';
		position: absolute;
		left: 2px;
		top: 0.62em;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--accent);
	}

	@media (max-width: 767px) {
		.tldr {
			margin-bottom: 32px;
		}

		.panel {
			padding: 16px 18px 18px;
			gap: 12px;
		}

		li {
			font-size: 1rem;
		}
	}
</style>
