<script lang="ts">
	import CoverImageUploader from './CoverImageUploader.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import SelectInput from './SelectInput.svelte';
	import TagInput from './TagInput.svelte';
	import type { Tag } from '$lib/types/index';

	interface Option {
		id: string;
		label: string;
	}

	interface Props {
		featuredImage: string | null;
		authorId: string;
		categoryId: string;
		selectedTags: Tag[];
		authors: Option[];
		categories: Option[];
		allTags: Tag[];
		/** Form field name of the author select. */
		authorFieldName: string;
		tagInputId: string;
	}

	let {
		featuredImage = $bindable(null),
		authorId = $bindable(''),
		categoryId = $bindable(''),
		selectedTags = $bindable([]),
		authors,
		categories,
		allTags,
		authorFieldName,
		tagInputId
	}: Props = $props();

	const authorOptions = $derived(authors.map((a) => ({ value: a.id, label: a.label })));
	const categoryOptions = $derived([
		{ value: '', label: 'None' },
		...categories.map((c) => ({ value: c.id, label: c.label }))
	]);
	const blockedNames = $derived(categories.map((c) => c.label));
</script>

<section class="block">
	<SectionHeading label="Cover image" />
	<CoverImageUploader bind:value={featuredImage} />
</section>

<section class="block">
	<SectionHeading label="Details" />
	<div class="fields">
		<div class="field">
			<label class="field-label" for="author">Author</label>
			<SelectInput
				id="author"
				name={authorFieldName}
				bind:value={authorId}
				options={authorOptions}
			/>
		</div>
		<div class="field">
			<label class="field-label" for="category">Category</label>
			<SelectInput
				id="category"
				name="categoryId"
				bind:value={categoryId}
				options={categoryOptions}
			/>
		</div>
		<div class="field">
			<label class="field-label" for={tagInputId}>Tags</label>
			<TagInput bind:value={selectedTags} {allTags} {blockedNames} inputId={tagInputId} />
		</div>
	</div>
</section>

<style>
	.block {
		display: flex;
		flex-direction: column;
	}

	.block :global(.section-heading) {
		margin-bottom: 1rem;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 1.125rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
	}

	@media (max-width: 1023px) {
		.field :global(.select) {
			min-height: 44px;
		}
	}
</style>
