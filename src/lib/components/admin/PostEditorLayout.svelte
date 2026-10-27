<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		editor: Snippet;
		sidebar: Snippet;
	}

	let { editor, sidebar }: Props = $props();
</script>

<!-- The writing column comes first. The sidebar sits beside it on wide screens and below it otherwise. -->
<div class="editor-layout">
	<div class="editor-col">
		{@render editor()}
	</div>
	<div class="sidebar-col">
		{@render sidebar()}
	</div>
</div>

<style>
	.editor-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2.5rem;
		align-items: start;
		/* Room for the fixed publish bar on small screens */
		padding-bottom: 5.5rem;
	}

	.editor-col {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.sidebar-col {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	@media (min-width: 1100px) {
		.editor-layout {
			grid-template-columns: minmax(0, 1fr) 320px;
			padding-bottom: 0;
		}

		/* The padding and negative margin keep focus rings from being clipped by the scroll area */
		.sidebar-col {
			position: sticky;
			top: 1.5rem;
			max-height: calc(100dvh - 3rem);
			overflow-y: auto;
			/* A scroll bar that can be seen, so it is clear this panel scrolls */
			scrollbar-width: thin;
			scrollbar-color: var(--color-admin-border-strong) transparent;
			padding: 4px;
			margin: -4px;
		}
	}
</style>
