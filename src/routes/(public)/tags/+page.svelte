<script lang="ts">
	import PageHead from '$lib/components/blog/PageHead.svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { total, cloud, groups } = $derived(data);

	function storyCount(n: number): string {
		return `${n} ${n === 1 ? 'story' : 'stories'}`;
	}

	function letterId(letter: string): string {
		return letter === '#' ? 'letter-other' : `letter-${letter.toLowerCase()}`;
	}
</script>

<div class="page">
	<PageHead
		kicker="Index"
		title="Tags"
		dek="Every subject tag on Open Tabs. The bigger the word, the more stories it holds."
		count={total > 0 ? `${total} ${total === 1 ? 'tag' : 'tags'}` : null}
	/>

	{#if total === 0}
		<section aria-label="Tags">
			<SectionHead label="Tag cloud" flush />
			<p class="empty-state">No tags yet.</p>
		</section>
	{:else}
		{#if cloud.length > 0}
			<section aria-label="Tag cloud">
				<SectionHead label="Tag cloud" flush />
				<ul class="cloud">
					{#each cloud as tag (tag.slug)}
						<li class="tier-{tag.tier}">
							<a href="/tags/{encodeURIComponent(tag.slug)}"
								>{tag.name}<span class="sr-only">, {storyCount(tag.postCount)}</span><span
									class="n"
									aria-hidden="true">{tag.postCount}</span
								></a
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="az" aria-label="All tags, A to Z">
			<SectionHead label="A to Z" flush />

			<nav class="letters" aria-label="Jump to a letter">
				{#each groups as group (group.letter)}
					<a href="#{letterId(group.letter)}" class="letter-link">{group.letter}</a>
				{/each}
			</nav>

			{#each groups as group (group.letter)}
				<div class="group" id={letterId(group.letter)}>
					<h3
						class="letter"
						aria-label={group.letter === '#' ? 'Numbers and symbols' : group.letter}
					>
						{group.letter}
					</h3>
					<ul class="names">
						{#each group.tags as tag (tag.slug)}
							<li>
								<a href="/tags/{encodeURIComponent(tag.slug)}" class="row">
									<span class="name">{tag.name}</span>
									<span class="count">{storyCount(tag.postCount)}</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	.page {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
	}

	.empty-state {
		font-family: var(--serif);
		font-style: italic;
		font-size: 19px;
		color: var(--ink-60);
		padding: 40px 0;
		margin: 0;
	}

	/* ── Cloud ──
	   Words sit in a fixed, even mix of sizes and wrap around the centre of the page. */
	.cloud {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 2px 6px;
		list-style: none;
		margin: 0;
		padding: 52px 0 60px;
	}

	.cloud a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 2px 10px;
		font-family: var(--serif);
		font-weight: 400;
		line-height: 1.1;
		letter-spacing: -0.015em;
		color: var(--ink-60);
		text-decoration: none;
		transition: color 120ms ease;
	}

	.cloud a:hover {
		color: var(--accent);
	}

	.n {
		margin: 0.2em 0 0 3px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 12px;
		line-height: 1;
		letter-spacing: 0;
		color: var(--ink-60);
	}

	.cloud a:hover .n {
		color: var(--accent);
	}

	.tier-1 a {
		font-size: 20px;
	}

	.tier-2 a {
		font-size: 26px;
	}

	.tier-3 a {
		font-size: 34px;
		font-weight: 500;
		color: var(--ink);
	}

	.tier-4 a {
		font-size: 44px;
		font-weight: 500;
		color: var(--ink);
	}

	.tier-5 a {
		font-size: 60px;
		font-weight: 500;
		color: var(--accent);
	}

	/* ── A to Z ── */
	.az {
		margin-top: 24px;
	}

	.letters {
		display: flex;
		flex-wrap: wrap;
		gap: 0 4px;
		padding: 12px 0;
		border-bottom: 1px solid var(--border);
	}

	.letter-link {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		font-family: var(--serif);
		font-style: italic;
		font-weight: 500;
		font-size: 22px;
		color: var(--ink);
		text-decoration: none;
		transition: color 120ms ease;
	}

	.letter-link:hover {
		color: var(--accent);
	}

	.group {
		display: grid;
		grid-template-columns: 96px minmax(0, 1fr);
		gap: 24px;
		padding: 28px 0 24px;
		border-bottom: 1px solid var(--border);
		scroll-margin-top: 16px;
	}

	.letter {
		margin: 0;
		font-family: var(--serif);
		font-style: italic;
		font-weight: 300;
		font-size: 56px;
		line-height: 1;
		color: var(--ink-60);
	}

	.names {
		columns: 3;
		column-gap: 40px;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.names li {
		break-inside: avoid;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		min-height: 44px;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
		color: var(--ink);
		text-decoration: none;
	}

	.name {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 20px;
		line-height: 1.2;
		letter-spacing: -0.01em;
		transition: color 120ms ease;
	}

	.row:hover .name {
		color: var(--accent);
	}

	.count {
		flex-shrink: 0;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 13px;
		color: var(--ink-60);
		white-space: nowrap;
	}

	@media (max-width: 1023px) {
		.cloud {
			padding: 40px 0 48px;
		}

		.tier-1 a {
			font-size: 19px;
		}

		.tier-2 a {
			font-size: 24px;
		}

		.tier-3 a {
			font-size: 30px;
		}

		.tier-4 a {
			font-size: 38px;
		}

		.tier-5 a {
			font-size: 50px;
		}

		.group {
			grid-template-columns: 72px minmax(0, 1fr);
			gap: 16px;
		}

		.letter {
			font-size: 44px;
		}

		.names {
			columns: 2;
			column-gap: 32px;
		}
	}

	@media (max-width: 639px) {
		.page {
			width: calc(100% - 40px);
		}

		.cloud {
			gap: 0 2px;
			padding: 28px 0 36px;
		}

		.cloud a {
			padding: 2px 8px;
		}

		.tier-1 a {
			font-size: 17px;
		}

		.tier-2 a {
			font-size: 21px;
		}

		.tier-3 a {
			font-size: 26px;
		}

		.tier-4 a {
			font-size: 32px;
		}

		.tier-5 a {
			font-size: 40px;
		}

		.letters {
			gap: 0;
		}

		.group {
			grid-template-columns: minmax(0, 1fr);
			gap: 4px;
			padding: 20px 0 16px;
		}

		.letter {
			font-size: 36px;
		}

		.names {
			columns: 1;
		}
	}
</style>
