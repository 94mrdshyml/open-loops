<script lang="ts">
	import type { Snippet } from 'svelte';

	type Section = 'meta' | 'seo' | 'tldr';

	interface Props {
		active: Section;
		meta: Snippet;
		seo: Snippet;
		tldr: Snippet;
	}

	let { active = $bindable('meta'), meta, seo, tldr }: Props = $props();

	const TABS: { id: Section; label: string }[] = [
		{ id: 'meta', label: 'Meta' },
		{ id: 'seo', label: 'SEO' },
		{ id: 'tldr', label: 'TL;DR' }
	];

	let tablistEl: HTMLDivElement;

	// Arrow keys move between tabs. Every panel stays in the page, so each field is still saved.
	function onKeydown(e: KeyboardEvent, index: number) {
		const last = TABS.length - 1;
		const targets: Record<string, number> = {
			ArrowRight: index === last ? 0 : index + 1,
			ArrowLeft: index === 0 ? last : index - 1,
			Home: 0,
			End: last
		};
		const next = targets[e.key];
		if (next === undefined) return;
		e.preventDefault();
		active = TABS[next].id;
		tablistEl.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
	}
</script>

<div class="tabs">
	<div class="ad-tabs" role="tablist" aria-label="Story settings" bind:this={tablistEl}>
		{#each TABS as tab, i (tab.id)}
			<button
				type="button"
				role="tab"
				class="ad-tab"
				id="editor-tab-{tab.id}"
				aria-selected={active === tab.id}
				aria-controls="editor-panel-{tab.id}"
				tabindex={active === tab.id ? 0 : -1}
				onclick={() => (active = tab.id)}
				onkeydown={(e) => onKeydown(e, i)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<div
		class="panel"
		role="tabpanel"
		id="editor-panel-meta"
		aria-labelledby="editor-tab-meta"
		hidden={active !== 'meta'}
	>
		{@render meta()}
	</div>
	<div
		class="panel"
		role="tabpanel"
		id="editor-panel-seo"
		aria-labelledby="editor-tab-seo"
		hidden={active !== 'seo'}
	>
		{@render seo()}
	</div>
	<div
		class="panel"
		role="tabpanel"
		id="editor-panel-tldr"
		aria-labelledby="editor-tab-tldr"
		hidden={active !== 'tldr'}
	>
		{@render tldr()}
	</div>
</div>

<style>
	.tabs {
		display: flex;
		flex-direction: column;
	}

	/* Three equal tabs; the ring sits inside so the scrolling row never clips it */
	.tabs :global(.ad-tab) {
		flex: 1;
		justify-content: center;
	}

	.tabs :global(.ad-tab:focus-visible) {
		outline-offset: -3px;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-top: 1.25rem;
	}

	.panel[hidden] {
		display: none;
	}
</style>
