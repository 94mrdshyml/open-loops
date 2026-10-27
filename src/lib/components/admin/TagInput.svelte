<script lang="ts">
	import { MAX_TAGS_PER_POST, MIN_INDEXABLE_TAG_POSTS } from '$lib/utils/seo';
	import type { Tag } from '$lib/types/index';

	interface Props {
		value: Tag[];
		allTags: Tag[];
		/** Category names. A tag may not repeat one, since the category page already covers it. */
		blockedNames?: string[];
		inputId?: string;
		onchange?: (tags: Tag[]) => void;
	}

	let { value = $bindable([]), allTags, blockedNames = [], inputId, onchange }: Props = $props();

	let inputVal = $state('');
	let showDropdown = $state(false);
	let inputEl: HTMLInputElement;
	let chipsEl: HTMLDivElement;
	let dropdownStyle = $state('');

	const selectedIds = $derived(new Set(value.map((t) => t.id)));
	const atLimit = $derived(value.length >= MAX_TAGS_PER_POST);
	const blocked = $derived(new Set(blockedNames.map((n) => n.toLowerCase())));
	const matchesCategory = $derived(blocked.has(inputVal.trim().toLowerCase()));

	const filtered = $derived(
		atLimit
			? []
			: allTags.filter(
					(t) =>
						!selectedIds.has(t.id) &&
						!blocked.has(t.name.toLowerCase()) &&
						t.name.toLowerCase().includes(inputVal.toLowerCase().trim())
				)
	);

	const canCreate = $derived(
		!atLimit &&
			!matchesCategory &&
			inputVal.trim().length > 0 &&
			!allTags.some((t) => t.name.toLowerCase() === inputVal.trim().toLowerCase())
	);

	function add(tag: Tag) {
		value = [...value, tag];
		onchange?.(value);
		inputVal = '';
		inputEl?.focus();
	}

	function createNew() {
		const name = inputVal.trim();
		if (!name) return;
		const tempTag: Tag = {
			id: `new:${name}`,
			name,
			slug: name
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^\w-]/g, ''),
			createdAt: new Date(),
			updatedAt: new Date()
		};
		add(tempTag);
	}

	function remove(id: string) {
		value = value.filter((t) => t.id !== id);
		onchange?.(value);
	}

	// The list is fixed to the screen, so it is placed by hand: under the field, or above it when
	// the field is near the bottom of the screen, and never taller than the room it has (it scrolls
	// inside). It follows the field when the page or the side panel scrolls.
	const GAP = 4;
	const EDGE = 8;
	const MAX_LIST_HEIGHT = 288;

	function placeDropdown() {
		if (!showDropdown || !chipsEl) return;
		const rect = chipsEl.getBoundingClientRect();
		const below = window.innerHeight - rect.bottom - GAP - EDGE;
		const above = rect.top - GAP - EDGE;
		const up = below < 180 && above > below;
		const room = Math.max(120, Math.min(MAX_LIST_HEIGHT, up ? above : below));
		const side = `left:${rect.left}px;width:${rect.width}px;max-height:${room}px`;
		dropdownStyle = up
			? `bottom:${window.innerHeight - rect.top + GAP}px;${side}`
			: `top:${rect.bottom + GAP}px;${side}`;
	}

	$effect(() => {
		if (showDropdown && (filtered.length > 0 || canCreate)) placeDropdown();
	});

	const hintId = $derived(inputId ? `${inputId}-hint` : undefined);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (filtered.length > 0) {
				add(filtered[0]);
			} else if (canCreate) {
				createNew();
			}
		} else if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
			remove(value[value.length - 1].id);
		} else if (e.key === 'Escape') {
			showDropdown = false;
		}
	}
</script>

<svelte:window onscrollcapture={placeDropdown} onresize={placeDropdown} />

<div class="tag-input-wrap">
	<div class="chips-row" bind:this={chipsEl} onclick={() => inputEl?.focus()} role="none">
		{#each value as tag (tag.id)}
			<span class="chip">
				{tag.name}
				<button
					type="button"
					onclick={() => remove(tag.id)}
					aria-label="Remove {tag.name}"
					class="chip-remove"
				>
					<svg
						width="10"
						height="10"
						viewBox="0 0 12 12"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						aria-hidden="true"
					>
						<path d="M2 2l8 8M10 2l-8 8" />
					</svg>
				</button>
			</span>
		{/each}
		<input
			bind:this={inputEl}
			bind:value={inputVal}
			id={inputId}
			type="text"
			placeholder={atLimit ? '' : value.length === 0 ? 'Add tags…' : ''}
			disabled={atLimit}
			class="tag-input"
			aria-describedby={hintId}
			onfocus={() => (showDropdown = true)}
			onblur={() => setTimeout(() => (showDropdown = false), 150)}
			onkeydown={onKeydown}
			autocomplete="off"
		/>
	</div>

	{#if showDropdown && (filtered.length > 0 || canCreate)}
		<div class="dropdown" style={dropdownStyle}>
			{#each filtered.slice(0, 8) as tag (tag.id)}
				<button type="button" class="dropdown-item" onmousedown={() => add(tag)}>
					{tag.name}
				</button>
			{/each}
			{#if canCreate}
				<button type="button" class="dropdown-item create" onmousedown={createNew}>
					Create new tag "<strong>{inputVal.trim()}</strong>"
				</button>
			{/if}
		</div>
	{/if}

	<p class="tag-hint" class:warn={atLimit || matchesCategory} id={hintId}>
		{#if matchesCategory}
			"{inputVal.trim()}" is already a category. Pick a different tag.
		{:else if atLimit}
			{MAX_TAGS_PER_POST} of {MAX_TAGS_PER_POST} tags. Remove one to add another.
		{:else}
			{value.length} of {MAX_TAGS_PER_POST} tags. Reuse an existing tag when you can. A tag page only
			shows in search once it has {MIN_INDEXABLE_TAG_POSTS} posts.
		{/if}
	</p>
</div>

<style>
	.tag-input-wrap {
		position: relative;
	}

	.tag-hint {
		margin: 0.375rem 0 0;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		line-height: 1.5;
	}

	.tag-hint.warn {
		color: var(--color-status-scheduled);
		font-weight: 600;
	}

	.chips-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		min-height: 40px;
		padding: 4px 8px;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		background: var(--color-admin-surface);
		cursor: text;
		transition: border-color 0.15s;
	}

	.chips-row:hover {
		border-color: var(--color-admin-text-muted);
	}

	.chips-row:focus-within {
		border-color: var(--color-admin-accent);
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		min-height: 28px;
		padding: 0 4px 0 10px;
		background: var(--color-admin-accent-light);
		color: var(--color-admin-text);
		border: 1px solid var(--color-admin-accent);
		border-radius: 999px;
		font-size: var(--text-xs);
		font-weight: 600;
	}

	.chip-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		color: inherit;
		background: none;
		border: 0;
		border-radius: 50%;
		cursor: pointer;
	}

	.chip-remove:hover {
		background: var(--color-admin-accent);
		color: var(--color-admin-bg);
	}

	.chip-remove:focus-visible {
		outline-offset: 0;
	}

	.tag-input {
		flex: 1;
		min-width: 6rem;
		min-height: 28px;
		border: none;
		outline: none;
		background: transparent;
		font-size: var(--text-sm);
		color: var(--color-admin-text);
		font-family: var(--font-sans);
	}

	.tag-input:disabled {
		cursor: not-allowed;
	}

	.dropdown {
		position: fixed;
		background: var(--color-admin-bg);
		border: 1px solid var(--color-admin-text);
		border-radius: 8px;
		z-index: 200;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		min-height: 40px;
		padding: 0 0.75rem;
		text-align: left;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		color: var(--color-admin-text);
		background: none;
		border: none;
		cursor: pointer;
	}

	.dropdown-item:hover {
		background: var(--color-admin-surface-hover);
	}

	.dropdown-item.create {
		font-weight: 600;
		border-top: 1px solid var(--color-admin-border);
	}

	@media (max-width: 1023px) {
		.chips-row {
			min-height: 44px;
		}

		.chip {
			min-height: 44px;
			padding-left: 0.75rem;
		}

		.chip-remove {
			width: 44px;
			height: 44px;
		}

		.tag-input {
			min-height: 36px;
		}

		.dropdown-item {
			min-height: 44px;
		}
	}
</style>
