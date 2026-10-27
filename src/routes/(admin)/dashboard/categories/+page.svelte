<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { toast } from '$lib/stores/toast';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import ColorPicker from '$lib/components/admin/ColorPicker.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import Textarea from '$lib/components/admin/Textarea.svelte';
	import TextInput from '$lib/components/admin/TextInput.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set('Categories'));

	type CatRow = PageData['categories'][number];

	// The colour a new category starts with, and the one the server falls back to.
	const DEFAULT_CATEGORY_COLOR = '#6b7280';
	const HOME_LIMIT = 5;

	let editingId = $state<string | null>(null);
	let addingNew = $state(false);
	let formName = $state('');
	let formSlug = $state('');
	let formDescription = $state('');
	let formColor = $state(DEFAULT_CATEGORY_COLOR);
	let formError = $state<string | null>(null);
	let saving = $state(false);

	let deleteTarget = $state<CatRow | null>(null);
	let deleteFormEl: HTMLFormElement;

	const homepageCount = $derived(data.categories.filter((c) => c.showOnHome).length);
	const atLimit = $derived(homepageCount >= HOME_LIMIT);

	// Drag-to-reorder state for pinned homepage categories
	const serverPinned = $derived(
		data.categories.filter((c) => c.showOnHome).toSorted((a, b) => a.homeOrder - b.homeOrder)
	);
	let dragOrder = $state<string[] | null>(null);
	const pinned = $derived(
		dragOrder
			? dragOrder
					.map((id) => serverPinned.find((c) => c.id === id))
					.filter((c): c is CatRow => c !== undefined)
			: serverPinned
	);
	let dragIndex = $state<number | null>(null);
	let overIndex = $state<number | null>(null);
	let reordering = $state(false);
	let reorderFormEl: HTMLFormElement;
	let reorderInputEl: HTMLInputElement;

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

	function commitOrder(ids: string[]) {
		dragOrder = ids;
		reorderInputEl.value = ids.join(',');
		reorderFormEl.requestSubmit();
	}

	function handleDragStart(i: number, e: DragEvent) {
		dragIndex = i;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(i));
		}
	}

	function handleDragOver(i: number, e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		overIndex = i;
	}

	function handleDrop(i: number, e: DragEvent) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === i) {
			dragIndex = null;
			overIndex = null;
			return;
		}
		const ids = pinned.map((c) => c.id);
		const [moved] = ids.splice(dragIndex, 1);
		ids.splice(i, 0, moved);
		dragIndex = null;
		overIndex = null;
		commitOrder(ids);
	}

	function handleDragEnd() {
		dragIndex = null;
		overIndex = null;
	}

	// The keyboard way to reorder: move one place earlier or later.
	function move(i: number, by: -1 | 1) {
		const ids = pinned.map((c) => c.id);
		const [moved] = ids.splice(i, 1);
		ids.splice(i + by, 0, moved);
		commitOrder(ids);
	}

	async function focusLater(id: string) {
		await tick();
		document.getElementById(id)?.focus();
	}

	function startEdit(cat: CatRow) {
		addingNew = false;
		editingId = cat.id;
		formName = cat.name;
		formColor = cat.color ?? DEFAULT_CATEGORY_COLOR;
		formSlug = cat.slug;
		formDescription = cat.description ?? '';
		formError = null;
	}

	function startAdd() {
		editingId = null;
		addingNew = true;
		formName = '';
		formColor = DEFAULT_CATEGORY_COLOR;
		formDescription = '';
		formError = null;
	}

	function closeForm() {
		const returnTo = editingId ? `edit-${editingId}` : 'add-category';
		editingId = null;
		addingNew = false;
		formError = null;
		void focusLater(returnTo);
	}

	function focusFirstField(node: HTMLElement) {
		node.scrollIntoView({ block: 'center' });
		node.querySelector<HTMLInputElement>('input[type="text"]')?.focus({ preventScroll: true });
	}

	const saveForm: SubmitFunction = () => {
		const wasEditing = editingId !== null;
		saving = true;
		formError = null;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') {
				toast.success(wasEditing ? 'Category updated' : 'Category created');
				closeForm();
				await invalidateAll();
			} else if (result.type === 'failure') {
				formError = errorOf(result.data, "Couldn't save. Check the details and try again.");
			} else {
				toast.error("Couldn't save. Check your connection and try again.");
			}
			await update({ reset: false });
		};
	};

	const toggleHome: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Home page updated');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error(errorOf(result.data, 'You can only pin up to 5 categories.'));
			}
			await update({ reset: false });
		};
	};
</script>

<div class="page">
	<section aria-label="Home page sections">
		<SectionHeading label="On the home page" meta="{homepageCount} of {HOME_LIMIT} in use" />
		<p class="note">
			{#if pinned.length === 0}
				No categories are pinned yet. Pin up to {HOME_LIMIT} from the list below to give them a section
				on the home page.
			{:else if atLimit}
				All {HOME_LIMIT} places are in use. Unpin one before you pin another.
				{#if pinned.length > 1}Drag to reorder, or use the arrows.{/if}
			{:else if pinned.length > 1}
				Sections appear in this order. Drag to reorder, or use the arrows.
			{:else}
				This category has its own section on the home page.
			{/if}
		</p>

		{#if pinned.length > 0}
			<div class="pinned" role="list" aria-label="Home page sections, in order">
				{#each pinned as cat, i (cat.id)}
					<div
						class="pinned-item"
						class:dragging={dragIndex === i}
						class:drag-over={overIndex === i && dragIndex !== null && dragIndex !== i}
						role="listitem"
						draggable={pinned.length > 1}
						ondragstart={(e) => handleDragStart(i, e)}
						ondragover={(e) => handleDragOver(i, e)}
						ondrop={(e) => handleDrop(i, e)}
						ondragend={handleDragEnd}
					>
						{#if pinned.length > 1}
							<svg
								class="grip"
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								<circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
								<circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
								<circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
							</svg>
						{/if}
						<span class="pinned-num">{i + 1}</span>
						<span
							class="dot"
							style:background={cat.color ?? 'var(--color-admin-text-muted)'}
							aria-hidden="true"
						></span>
						<span class="pinned-name">{cat.name}</span>
						{#if pinned.length > 1}
							<span class="pinned-moves">
								<button
									type="button"
									class="move-btn"
									disabled={i === 0 || reordering}
									aria-label="Move {cat.name} earlier"
									onclick={() => move(i, -1)}
								>
									<svg
										class="chev chev-prev"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg
									>
								</button>
								<button
									type="button"
									class="move-btn"
									disabled={i === pinned.length - 1 || reordering}
									aria-label="Move {cat.name} later"
									onclick={() => move(i, 1)}
								>
									<svg
										class="chev chev-next"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg
									>
								</button>
							</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section aria-label="All categories">
		<SectionHeading
			label="All categories"
			meta="{data.categories.length} {data.categories.length === 1 ? 'category' : 'categories'}"
		>
			{#snippet actions()}
				<button
					type="button"
					id="add-category"
					class="ad-btn ad-btn--sm"
					onclick={startAdd}
					disabled={addingNew}
				>
					Add category
				</button>
			{/snippet}
		</SectionHeading>

		{#if data.categories.length === 0 && !addingNew}
			<EmptyState
				message="No categories yet"
				sublabel="Add one to start grouping your stories. Readers browse the site by category."
			/>
		{:else}
			<div class="cat-table">
				<AdminTable columns={['Name', 'Web address', 'Stories', 'Home page', 'Actions']}>
					{#if addingNew}
						<tr class="form-row">
							<td colspan={5}>
								{@render editor(null)}
							</td>
						</tr>
					{/if}

					{#each data.categories as cat (cat.id)}
						{#if editingId === cat.id}
							<tr class="form-row">
								<td colspan={5}>
									{@render editor(cat)}
								</td>
							</tr>
						{:else}
							<tr>
								<td class="c-name">
									<span
										class="dot"
										style:background={cat.color ?? 'var(--color-admin-text-muted)'}
										aria-hidden="true"
									></span>
									<span class="name">{cat.name}</span>
								</td>
								<td class="c-slug">{cat.slug}</td>
								<td class="c-count">
									<span class="n">{cat.postCount}</span><span class="unit"
										>&nbsp;{cat.postCount === 1 ? 'story' : 'stories'}</span
									>
								</td>
								<td class="c-home">
									<form method="POST" action="?/toggleHome" use:enhance={toggleHome}>
										<input type="hidden" name="categoryId" value={cat.id} />
										<button
											type="submit"
											class="pin-btn"
											class:on={cat.showOnHome}
											disabled={!cat.showOnHome && atLimit}
											title={!cat.showOnHome && atLimit
												? 'All 5 places are in use. Unpin another category first.'
												: undefined}
										>
											{cat.showOnHome ? 'Pinned' : 'Pin'}<span class="sr-only">
												{cat.name}
												{cat.showOnHome
													? 'is on the home page. Unpin it.'
													: 'to the home page'}</span
											>
										</button>
									</form>
								</td>
								<td class="c-actions">
									<div class="actions">
										<button
											type="button"
											id="edit-{cat.id}"
											class="row-action"
											onclick={() => startEdit(cat)}
										>
											Edit<span class="sr-only"> {cat.name}</span>
										</button>
										<button
											type="button"
											class="row-action row-action--danger"
											onclick={() => (deleteTarget = cat)}
										>
											Delete<span class="sr-only"> {cat.name}</span>
										</button>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</AdminTable>
			</div>
		{/if}
	</section>
</div>

{#snippet editor(cat: CatRow | null)}
	<form
		method="POST"
		action={cat ? '?/update' : '?/create'}
		class="editor"
		use:enhance={saveForm}
		use:focusFirstField
	>
		{#if cat}<input type="hidden" name="id" value={cat.id} />{/if}
		<input type="hidden" name="color" value={formColor} />

		<p class="editor-title">{cat ? `Edit ${cat.name}` : 'New category'}</p>

		<div class="editor-fields" class:has-slug={cat !== null}>
			<FormField label="Name" required fieldId="category-name" error={formError}>
				<TextInput id="category-name" name="name" bind:value={formName} required />
			</FormField>

			{#if cat}
				<FormField
					label="Web address"
					fieldId="category-slug"
					hint="Changing this breaks links people already have to this category."
				>
					<TextInput id="category-slug" name="slug" bind:value={formSlug} />
				</FormField>
			{/if}

			<div class="description-field">
				<FormField
					label="Short description"
					fieldId="category-description"
					hint="One or two plain lines shown under the category title. Optional. Up to 200 characters."
				>
					<Textarea
						id="category-description"
						name="description"
						bind:value={formDescription}
						rows={2}
						maxlength={200}
					/>
				</FormField>
			</div>

			<div class="colour-field" role="group" aria-labelledby="category-colour-label">
				<span class="field-label" id="category-colour-label">Colour</span>
				<ColorPicker bind:value={formColor} />
			</div>
		</div>

		<div class="editor-actions">
			<button type="submit" class="ad-btn" disabled={saving}>
				{#if saving}Saving…{:else if cat}Save changes{:else}Add category{/if}
			</button>
			<button type="button" class="ad-btn ad-btn--quiet" onclick={closeForm}>Cancel</button>
		</div>
	</form>
{/snippet}

<!-- Hidden reorder form -->
<form
	bind:this={reorderFormEl}
	method="POST"
	action="?/reorderHome"
	class="hidden"
	use:enhance={() => {
		reordering = true;
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Order updated');
				await invalidateAll();
			} else {
				toast.error("Couldn't change the order. Try again.");
			}
			dragOrder = null;
			reordering = false;
			await update({ reset: false });
		};
	}}
>
	<input bind:this={reorderInputEl} type="hidden" name="order" value="" />
</form>

<!-- Hidden delete form -->
<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/delete"
	class="hidden"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				toast.error(errorOf(result.data, "Couldn't delete the category. Try again."));
			} else {
				toast.success('Category deleted');
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
	title="Delete category"
	message={deleteTarget
		? `Delete the category "${deleteTarget.name}"? It holds ${storyCount(deleteTarget.postCount)}. ${
				deleteTarget.postCount > 0
					? 'The stories are kept, but they will have no category until you choose another.'
					: 'This cannot be undone.'
			}`
		: ''}
	confirmLabel="Delete category"
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

	.note {
		margin: -0.25rem 0 1rem;
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
		max-width: 60ch;
	}

	/* The category colour appears only as this small dot */
	.dot {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid var(--color-admin-border-strong);
		flex-shrink: 0;
	}

	/* Home page order */
	.pinned {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pinned-item {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		min-height: 44px;
		padding: 0 0.25rem 0 0.875rem;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		background: var(--color-admin-surface);
		user-select: none;
	}

	.pinned-item[draggable='true'] {
		cursor: grab;
	}

	.pinned-item:active[draggable='true'] {
		cursor: grabbing;
	}

	.pinned-item.dragging {
		opacity: 0.45;
	}

	.pinned-item.drag-over {
		border-color: var(--color-admin-accent);
		outline: 2px dashed var(--color-admin-accent);
		outline-offset: 2px;
	}

	.grip {
		color: var(--color-admin-text-muted);
		flex-shrink: 0;
	}

	.pinned-num {
		font-family: var(--serif);
		font-size: 1.125rem;
		font-weight: 500;
		color: var(--color-admin-accent);
		font-variant-numeric: tabular-nums;
	}

	.pinned-name {
		font-size: var(--text-sm);
		font-weight: 600;
		white-space: nowrap;
	}

	.pinned-moves {
		display: inline-flex;
		margin-left: 0.25rem;
	}

	.move-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		color: var(--color-admin-text);
		background: transparent;
		border: 0;
		border-radius: 8px;
		cursor: pointer;
	}

	.move-btn:hover:not(:disabled) {
		background: var(--color-admin-surface-hover);
	}

	.move-btn:disabled {
		color: var(--color-admin-text-muted);
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* Table cells */
	.c-name {
		white-space: nowrap;
	}

	.c-name .dot {
		margin-right: 0.625rem;
		vertical-align: baseline;
	}

	.name {
		font-family: var(--serif);
		font-size: 1.0625rem;
		font-weight: 500;
		letter-spacing: -0.005em;
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

	.pin-btn {
		min-height: 32px;
		padding: 0 0.75rem;
		font-family: var(--ui);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-admin-text-muted);
		background: transparent;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		cursor: pointer;
	}

	.pin-btn:hover:not(:disabled) {
		color: var(--color-admin-text);
		background: var(--color-admin-surface-hover);
	}

	.pin-btn.on {
		color: var(--color-admin-accent);
		background: var(--color-admin-accent-light);
		border-color: var(--color-admin-accent);
	}

	.pin-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.row-action {
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

	/* Add and edit form, sitting in the row it belongs to */
	.form-row,
	:global(.cat-table .table-wrap tbody tr.form-row:hover) {
		background: var(--color-admin-surface);
	}

	.editor-title {
		margin: 0 0 0.75rem;
		font-family: var(--serif);
		font-size: 1.1875rem;
		font-weight: 500;
	}

	.editor-fields {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1rem 1.5rem;
		align-items: start;
		max-width: 44rem;
	}

	.editor-fields.has-slug {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
		max-width: 60rem;
	}

	.description-field {
		grid-column: 1 / -1;
	}

	.colour-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.editor-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	@media (max-width: 1023px) {
		.row-action,
		.pin-btn,
		.move-btn {
			min-height: 44px;
		}

		.move-btn {
			width: 44px;
		}
	}

	/* Stacked rows on a phone: the name and story count first */
	@media (max-width: 767px) {
		.cat-table :global(thead) {
			display: none;
		}

		.cat-table :global(table),
		.cat-table :global(tbody) {
			display: block;
		}

		.cat-table :global(tbody tr:not(.form-row)) {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				'name count'
				'slug slug'
				'home actions';
			align-items: center;
			gap: 0.125rem 1rem;
			padding: 0.875rem 0;
		}

		.cat-table :global(tbody tr:not(.form-row) td) {
			padding: 0;
			border: 0;
		}

		.cat-table :global(tbody tr.form-row),
		.cat-table :global(tbody tr.form-row td) {
			display: block;
		}

		.cat-table :global(tbody tr.form-row td) {
			padding: 1rem 0;
		}

		.c-name {
			grid-area: name;
		}

		.name {
			font-size: 1.1875rem;
		}

		.c-count {
			grid-area: count;
			text-align: right;
			font-size: var(--text-sm);
			color: var(--color-admin-text-muted);
		}

		.unit {
			display: inline;
		}

		.cat-table .c-slug {
			grid-area: slug;
			padding-left: 1.375rem;
		}

		.c-home {
			grid-area: home;
			margin-top: 0.5rem;
		}

		.c-actions {
			grid-area: actions;
			margin-top: 0.5rem;
			justify-self: end;
		}

		.editor-fields,
		.editor-fields.has-slug {
			grid-template-columns: minmax(0, 1fr);
		}

		.editor-actions :global(.ad-btn) {
			flex: 1;
		}

		.pinned {
			flex-direction: column;
		}

		.pinned-item {
			display: flex;
			padding-right: 0.25rem;
		}

		.pinned-name {
			flex: 1;
		}

		.chev {
			transform: rotate(90deg);
		}
	}
</style>
