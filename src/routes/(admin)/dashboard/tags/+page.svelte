<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { toast } from '$lib/stores/toast';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import SelectInput from '$lib/components/admin/SelectInput.svelte';
	import TextInput from '$lib/components/admin/TextInput.svelte';
	import { MIN_INDEXABLE_TAG_POSTS } from '$lib/utils/seo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set('Tags'));

	type TagRow = PageData['tags'][number];
	type ListRow = { key: string; letter: string; tag?: undefined } | { key: string; tag: TagRow };

	// Past this many rows, the list is broken up with a letter heading for each initial.
	const LETTER_THRESHOLD = 30;

	let filter = $state('');
	let thinOnly = $state(false);
	let sort = $state('name');
	const sortOptions = [
		{ value: 'name', label: 'A to Z' },
		{ value: 'stories', label: 'Most stories' }
	];

	let editingId = $state<string | null>(null);
	let editName = $state('');
	let mergeSource = $state<TagRow | null>(null);
	let mergeTargetId = $state('');
	let formError = $state<string | null>(null);
	let saving = $state(false);
	let deleteTarget = $state<TagRow | null>(null);
	let deleteFormEl: HTMLFormElement;

	const filtered = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		const list = data.tags.filter(
			(t) =>
				(!thinOnly || t.postCount < MIN_INDEXABLE_TAG_POSTS) &&
				(q.length === 0 || t.name.toLowerCase().includes(q))
		);
		return sort === 'stories'
			? list.toSorted((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name))
			: list.toSorted((a, b) => a.name.localeCompare(b.name));
	});

	const hasFilter = $derived(filter.trim().length > 0 || thinOnly);

	const rows = $derived.by((): ListRow[] => {
		if (sort !== 'name' || filtered.length <= LETTER_THRESHOLD) {
			return filtered.map((tag) => ({ key: tag.id, tag }));
		}
		const out: ListRow[] = [];
		let current = '';
		for (const tag of filtered) {
			const first = tag.name.trim().charAt(0).toUpperCase();
			const letter = /[A-Z]/.test(first) ? first : '#';
			if (letter !== current) {
				current = letter;
				out.push({ key: `letter-${letter}`, letter });
			}
			out.push({ key: tag.id, tag });
		}
		return out;
	});

	const mergeChoices = $derived(
		data.tags
			.filter((t) => t.id !== mergeSource?.id)
			.toSorted((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name))
			.map((t) => ({ value: t.id, label: `#${t.name} (${t.postCount})` }))
	);

	function storyCount(n: number): string {
		return n === 0 ? 'no stories' : `${n} ${n === 1 ? 'story' : 'stories'}`;
	}

	function errorOf(result: unknown, fallback: string): string {
		if (typeof result === 'object' && result !== null && 'error' in result) {
			const { error } = result as { error: unknown };
			if (typeof error === 'string' && error) return error;
		}
		return fallback;
	}

	function clearFilters() {
		filter = '';
		thinOnly = false;
	}

	// A filter change can hide the row being worked on, so close the open form.
	function closeOpenForms() {
		editingId = null;
		mergeSource = null;
		formError = null;
	}

	async function focusLater(id: string) {
		await tick();
		document.getElementById(id)?.focus();
	}

	function startEdit(tag: TagRow) {
		mergeSource = null;
		editingId = tag.id;
		editName = tag.name;
		formError = null;
	}

	function startMerge(tag: TagRow) {
		editingId = null;
		mergeSource = tag;
		mergeTargetId = '';
		formError = null;
	}

	function cancelForm() {
		const returnTo = editingId
			? `rename-${editingId}`
			: mergeSource
				? `merge-${mergeSource.id}`
				: '';
		closeOpenForms();
		if (returnTo) void focusLater(returnTo);
	}

	function focusFirstField(node: HTMLElement) {
		node.scrollIntoView({ block: 'center' });
		node.querySelector<HTMLElement>('input, select')?.focus({ preventScroll: true });
	}

	const saveRename: SubmitFunction = () => {
		saving = true;
		formError = null;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') {
				toast.success('Tag renamed');
				editingId = null;
				await invalidateAll();
			} else if (result.type === 'failure') {
				formError = errorOf(result.data, "Couldn't rename the tag. Check the name and try again.");
			} else {
				toast.error("Couldn't rename the tag. Check your connection and try again.");
			}
			await update({ reset: false });
		};
	};

	const saveMerge: SubmitFunction = () => {
		saving = true;
		formError = null;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') {
				toast.success('Tags merged');
				mergeSource = null;
				await invalidateAll();
			} else if (result.type === 'failure') {
				formError = errorOf(result.data, "Couldn't merge the tags. Try again.");
			} else {
				toast.error("Couldn't merge the tags. Check your connection and try again.");
			}
			await update({ reset: false });
		};
	};
</script>

{#snippet iconRename()}
	<svg
		class="ico"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
		<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
	</svg>
{/snippet}

{#snippet iconMerge()}
	<svg
		class="ico"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle
			cx="18"
			cy="12"
			r="2.5"
		/>
		<path d="M8.5 6c4 0 5 3 7 6M8.5 18c4 0 5-3 7-6" />
	</svg>
{/snippet}

{#snippet iconDelete()}
	<svg
		class="ico"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
		<path d="M10 11v6M14 11v6M9 6V4h6v2" />
	</svg>
{/snippet}

<div class="page">
	<section aria-label="All tags">
		<SectionHeading
			label="All tags"
			meta="{data.tags.length} {data.tags.length === 1 ? 'tag' : 'tags'}"
		/>

		{#if data.tags.length === 0}
			<EmptyState
				message="No tags yet"
				sublabel="Tags appear here once you add them to a story. They help readers find related stories."
			/>
		{:else}
			<div class="ad-toolbar">
				<div class="search">
					<label for="tag-search" class="sr-only">Search tags</label>
					<TextInput
						id="tag-search"
						bind:value={filter}
						placeholder="Search tags"
						oninput={closeOpenForms}
					/>
				</div>
				<div class="sort">
					<label for="tag-sort" class="sr-only">Sort tags</label>
					<SelectInput id="tag-sort" bind:value={sort} options={sortOptions} />
				</div>
				<label class="check">
					<input type="checkbox" bind:checked={thinOnly} onchange={closeOpenForms} />
					Under {MIN_INDEXABLE_TAG_POSTS} stories
				</label>
				{#if hasFilter}
					<button type="button" class="ad-btn ad-btn--quiet ad-btn--sm" onclick={clearFilters}>
						Clear filters
					</button>
				{/if}
			</div>

			<p class="status" aria-live="polite">
				{#if hasFilter}
					Showing {filtered.length} of {data.tags.length} tags.
				{:else}
					Showing all {data.tags.length} tags.
				{/if}
				{#if thinOnly}
					Search engines are asked to skip tags with fewer than {MIN_INDEXABLE_TAG_POSTS} stories. Merge
					or delete the ones you do not need.
				{/if}
			</p>

			{#if filtered.length > 0}
				<div class="tag-table">
					<AdminTable columns={['Name', 'Web address', 'Stories', 'Actions']}>
						{#each rows as row (row.key)}
							{#if row.tag === undefined}
								<tr class="letter-row">
									<td colspan={4}>{row.letter === '#' ? '0 to 9' : row.letter}</td>
								</tr>
							{:else}
								{@const tag = row.tag}
								<tr>
									<td class="c-name">
										<span class="hash" aria-hidden="true">#</span>{tag.name}
									</td>
									<td class="c-slug">{tag.slug}</td>
									<td class="c-count">
										<span class="n">{tag.postCount}</span><span class="unit"
											>&nbsp;{tag.postCount === 1 ? 'story' : 'stories'}</span
										>
									</td>
									<td class="c-actions">
										<div class="actions">
											<button
												type="button"
												id="rename-{tag.id}"
												class="row-action"
												title="Rename"
												onclick={() => startEdit(tag)}
											>
												{@render iconRename()}<span class="lbl">Rename</span><span class="sr-only">
													#{tag.name}</span
												>
											</button>
											<button
												type="button"
												id="merge-{tag.id}"
												class="row-action"
												title="Merge into another tag"
												onclick={() => startMerge(tag)}
											>
												{@render iconMerge()}<span class="lbl">Merge</span><span class="sr-only">
													#{tag.name} into another tag</span
												>
											</button>
											<button
												type="button"
												class="row-action row-action--danger"
												title="Delete"
												onclick={() => (deleteTarget = tag)}
											>
												{@render iconDelete()}<span class="lbl">Delete</span><span class="sr-only">
													#{tag.name}</span
												>
											</button>
										</div>
									</td>
								</tr>

								{#if editingId === tag.id}
									<tr class="form-row">
										<td colspan={4}>
											<form
												method="POST"
												action="?/update"
												class="editor"
												use:enhance={saveRename}
												use:focusFirstField
											>
												<input type="hidden" name="id" value={tag.id} />
												<div class="editor-row">
													<div class="editor-field">
														<FormField
															label="New name for #{tag.name}"
															required
															fieldId="tag-rename"
															error={formError}
															hint="Renaming also changes the tag's web address."
														>
															<TextInput
																id="tag-rename"
																name="name"
																bind:value={editName}
																required
															/>
														</FormField>
													</div>
													<div class="editor-actions">
														<button type="submit" class="ad-btn" disabled={saving}>
															{saving ? 'Saving…' : 'Save name'}
														</button>
														<button type="button" class="ad-btn ad-btn--quiet" onclick={cancelForm}>
															Cancel
														</button>
													</div>
												</div>
											</form>
										</td>
									</tr>
								{/if}

								{#if mergeSource?.id === tag.id}
									<tr class="form-row">
										<td colspan={4}>
											<form
												method="POST"
												action="?/merge"
												class="editor"
												use:enhance={saveMerge}
												use:focusFirstField
											>
												<input type="hidden" name="sourceId" value={tag.id} />
												<p class="editor-title">Merge #{tag.name} into another tag</p>
												<p class="editor-text">
													{#if tag.postCount === 0}
														No stories use #{tag.name}, so it will simply be removed.
													{:else}
														The {storyCount(tag.postCount)} tagged #{tag.name} will move to the tag you
														choose.
													{/if}
													Then #{tag.name} is removed. This cannot be undone.
												</p>
												<div class="editor-row">
													<div class="editor-field">
														<FormField
															label="Move stories into"
															required
															fieldId="tag-merge-target"
															error={formError}
														>
															<SelectInput
																id="tag-merge-target"
																name="targetId"
																bind:value={mergeTargetId}
																options={mergeChoices}
																placeholder="Choose a tag"
															/>
														</FormField>
													</div>
													<div class="editor-actions">
														<button
															type="submit"
															class="ad-btn"
															disabled={!mergeTargetId || saving}
														>
															{saving ? 'Merging…' : 'Merge and remove'}
														</button>
														<button type="button" class="ad-btn ad-btn--quiet" onclick={cancelForm}>
															Cancel
														</button>
													</div>
												</div>
											</form>
										</td>
									</tr>
								{/if}
							{/if}
						{/each}
					</AdminTable>
				</div>
			{:else}
				<EmptyState
					message="No tags match"
					sublabel={filter.trim()
						? `Nothing is called "${filter.trim()}". Check the spelling, or try a shorter word.`
						: `Every tag has ${MIN_INDEXABLE_TAG_POSTS} or more stories.`}
				/>
				<div class="empty-action">
					<button type="button" class="ad-btn ad-btn--quiet" onclick={clearFilters}>
						Clear filters
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>

<!-- Hidden delete form -->
<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/delete"
	class="hidden"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				toast.error(errorOf(result.data, "Couldn't delete the tag. Try again."));
			} else {
				toast.success('Tag deleted');
				await invalidateAll();
			}
			await update({ reset: false });
		};
	}}
>
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>

<ConfirmModal
	open={deleteTarget !== null}
	title="Delete tag"
	message={deleteTarget
		? `Delete the tag #${deleteTarget.name}? ${
				deleteTarget.postCount > 0
					? `It will be taken off ${storyCount(deleteTarget.postCount)}. The stories stay.`
					: 'No stories use it.'
			} This cannot be undone.`
		: ''}
	confirmLabel="Delete tag"
	danger
	onConfirm={() => {
		deleteFormEl.requestSubmit();
		deleteTarget = null;
	}}
	onCancel={() => (deleteTarget = null)}
/>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.hidden {
		display: none;
	}

	.search {
		flex: 1 1 16rem;
		max-width: 24rem;
	}

	.sort {
		flex: 0 1 13rem;
	}

	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 40px;
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.check input {
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: var(--color-admin-accent);
	}

	.status {
		margin: -0.25rem 0 0.75rem;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		max-width: 70ch;
	}

	.empty-action {
		display: flex;
		justify-content: center;
	}

	/* A dense list: shorter rows than the other tables */
	.tag-table :global(.table-wrap tbody td) {
		padding-top: 0.4375rem;
		padding-bottom: 0.4375rem;
	}

	.c-name {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.hash {
		margin-right: 1px;
		color: var(--color-admin-accent);
		font-weight: 700;
	}

	.c-slug {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	.c-count {
		font-variant-numeric: tabular-nums;
	}

	.unit {
		display: none;
	}

	.letter-row td {
		padding-top: 1.25rem;
		padding-bottom: 0.25rem;
		font-family: var(--serif);
		font-size: 1.375rem;
		font-weight: 500;
		line-height: 1;
	}

	.tag-table :global(.table-wrap tbody tr.letter-row:hover) {
		background: transparent;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	.row-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		min-height: 32px;
		padding: 0 0.625rem;
		font-family: var(--ui);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
		background: transparent;
		border: 0;
		border-radius: 8px;
		cursor: pointer;
	}

	.row-action:hover {
		background: var(--color-admin-surface-hover);
	}

	.row-action--danger {
		color: var(--color-admin-text-muted);
	}

	.row-action--danger:hover {
		color: var(--color-status-error);
	}

	.ico {
		display: none;
	}

	/* Rename and merge forms, sitting under the tag they belong to */
	.tag-table :global(.table-wrap tbody tr.form-row),
	.tag-table :global(.table-wrap tbody tr.form-row:hover) {
		background: var(--color-admin-surface);
	}

	.tag-table :global(.table-wrap tbody tr.form-row td) {
		padding: 1rem;
	}

	.editor-title {
		margin: 0 0 0.375rem;
		font-family: var(--serif);
		font-size: 1.1875rem;
		font-weight: 500;
	}

	.editor-text {
		margin: 0 0 0.875rem;
		max-width: 60ch;
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
	}

	.editor-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.75rem 1rem;
	}

	.editor-field {
		flex: 1 1 18rem;
		max-width: 28rem;
	}

	.editor-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-top: 1.625rem;
	}

	@media (max-width: 1023px) {
		.row-action {
			min-height: 44px;
		}

		.check {
			min-height: 44px;
		}
	}

	/* Stacked rows on a phone: name and story count first, actions as icons */
	@media (max-width: 767px) {
		.search {
			flex: 1 1 100%;
			max-width: none;
		}

		.sort {
			flex: 1 1 8rem;
		}

		.tag-table :global(thead) {
			display: none;
		}

		.tag-table :global(table),
		.tag-table :global(tbody) {
			display: block;
		}

		.tag-table :global(tbody tr:not(.form-row):not(.letter-row)) {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				'name count'
				'slug actions';
			align-items: center;
			gap: 0 0.75rem;
			padding: 0.5rem 0;
		}

		.tag-table :global(tbody tr:not(.form-row):not(.letter-row) td) {
			padding: 0;
			border: 0;
		}

		.tag-table :global(tbody tr.letter-row),
		.tag-table :global(tbody tr.letter-row td),
		.tag-table :global(tbody tr.form-row),
		.tag-table :global(tbody tr.form-row td) {
			display: block;
		}

		.tag-table :global(.table-wrap tbody tr.form-row td) {
			padding: 1rem 0;
		}

		.tag-table :global(.table-wrap tbody tr.letter-row td) {
			padding-left: 0;
		}

		.tag-table .c-name {
			grid-area: name;
			overflow-wrap: anywhere;
		}

		.tag-table .c-count {
			grid-area: count;
			text-align: right;
			font-size: var(--text-xs);
			color: var(--color-admin-text-muted);
		}

		.unit {
			display: inline;
		}

		.tag-table .c-slug {
			grid-area: slug;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.tag-table .c-actions {
			grid-area: actions;
			justify-self: end;
		}

		.row-action {
			width: 44px;
			padding: 0;
		}

		.ico {
			display: block;
		}

		.lbl {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
		}

		.editor-field {
			flex-basis: 100%;
			max-width: none;
		}

		.editor-actions {
			flex: 1 1 100%;
			padding-top: 0;
		}

		.editor-actions :global(.ad-btn) {
			flex: 1;
		}
	}
</style>
