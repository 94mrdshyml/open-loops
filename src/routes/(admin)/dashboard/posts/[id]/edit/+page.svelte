<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { createAutosave } from '$lib/utils/autosave';
	import PostEditorLayout from '$lib/components/admin/PostEditorLayout.svelte';
	import TiptapEditor from '$lib/components/admin/TiptapEditor.svelte';
	import EditorTitleFields from '$lib/components/admin/EditorTitleFields.svelte';
	import EditorTabs from '$lib/components/admin/EditorTabs.svelte';
	import PostMetaPanel from '$lib/components/admin/PostMetaPanel.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import SeoPanel from '$lib/components/admin/SeoPanel.svelte';
	import PublishControls from '$lib/components/admin/PublishControls.svelte';
	import TldrPanel from '$lib/components/admin/TldrPanel.svelte';
	import type { Tag, PostStatus } from '$lib/types/index';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();
	const { authors: _authors, categories: _categories, allTags: _allTags } = data;

	onMount(() => pageTitle.set('Edit Post'));

	const {
		title: _title,
		subtitle: _subtitle,
		slug: _slug,
		content: _content,
		featuredImage: _featuredImage,
		isFeatured: _isFeatured,
		status: _status,
		publishedAt: _publishedAt,
		categoryId: _categoryId,
		authorId: _authorId,
		tags: _tags,
		excerpt: _excerpt,
		tldr: _tldr
	} = data.post;

	// Form state initialised from post
	let title = $state(_title);
	let subtitle = $state(_subtitle ?? '');
	let slug = $state(_slug);
	let content = $state(_content);
	let featuredImage = $state<string | null>(_featuredImage);
	let isFeatured = $state(_isFeatured);
	let status = $state<PostStatus>(_status);
	let publishedAt = $state<Date | null>(_publishedAt);
	let categoryId = $state(_categoryId ?? '');
	let authorId = $state(_authorId);
	let selectedTags = $state<Tag[]>(_tags);
	let excerpt = $state(_excerpt ?? '');
	let ogTitle = $state('');
	let ogDescription = $state('');
	let twitterTitle = $state('');
	let twitterDescription = $state('');
	let saving = $state(false);
	let unsaved = $state(false);
	let savedAt = $state<Date | null>(null);

	// TL;DR. `tldrDirty` is true only after the writer has typed in the box, so an autosave
	// never sends stale text over a TL;DR the server has just written.
	let tldrPoints = $state<string[]>(_tldr ?? []);
	let tldrDirty = $state(false);
	let tldrEdits = 0;
	let tldrGenerating = $state(false);
	let tldrError = $state<string | null>(null);

	function handleTldrEdit() {
		tldrDirty = true;
		tldrEdits += 1;
		scheduleAutoSave();
	}

	let formEl: HTMLFormElement;
	// True while a save started by the auto-save timer is on its way, so the server can tell it
	// from a click on Update. Search engines are only told about clicks.
	let autoSubmitting = false;

	// Auto-save: 3 seconds after the writer stops changing anything. A save never starts on top of
	// another, and the tab being put in the background saves straight away.
	const autosave = createAutosave({
		delayMs: 3000,
		submit: () => {
			autoSubmitting = true;
			formEl?.requestSubmit();
		},
		busy: () => saving,
		dirty: () => unsaved
	});

	function scheduleAutoSave() {
		unsaved = true;
		autosave.schedule();
	}

	// Every field that is saved with the story starts an auto-save when it changes, not only the
	// title and the text (those two call scheduleAutoSave themselves). The first run just records
	// where things start.
	let fieldsSeen: string | null = null;
	$effect(() => {
		const now = JSON.stringify([
			featuredImage,
			categoryId,
			authorId,
			isFeatured,
			excerpt,
			selectedTags.map((t) => t.id)
		]);
		if (fieldsSeen === null) {
			fieldsSeen = now;
			return;
		}
		if (now !== fieldsSeen) {
			fieldsSeen = now;
			untrack(scheduleAutoSave);
		}
	});

	function onVisibilityChange() {
		if (document.visibilityState === 'hidden') autosave.flush();
	}

	// A refresh or closing the tab with unsaved changes asks first
	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (unsaved || saving) e.preventDefault();
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			autosave.cancel();
			formEl?.requestSubmit();
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			status = 'published';
			autosave.cancel();
			formEl?.requestSubmit();
		}
	}

	function tagsToString(tags: Tag[]): string {
		return tags.map((t) => (t.id.startsWith('new:') ? t.id : t.name)).join(',');
	}

	let sidebarSection = $state<'meta' | 'seo' | 'tldr'>('meta');

	// What the last save did, for the badge beside the Publish heading
	const saveState = $derived(
		saving ? 'saving' : form?.error ? 'error' : unsaved ? 'unsaved' : savedAt ? 'saved' : 'idle'
	);
	const saveText = $derived(
		saveState === 'saving'
			? 'Saving…'
			: saveState === 'unsaved'
				? 'Unsaved changes'
				: saveState === 'error'
					? 'Not saved'
					: savedAt
						? `Saved ${savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
						: ''
	);

	let deleteForm: HTMLFormElement;
	let confirmingDelete = $state(false);
	function handleDelete() {
		confirmingDelete = false;
		autosave.cancel();
		unsaved = false;
		deleteForm.requestSubmit();
	}
</script>

<svelte:window onkeydown={handleKeydown} onbeforeunload={onBeforeUnload} />
<svelte:document onvisibilitychange={onVisibilityChange} />

<div class="page-bar">
	<a href="/dashboard/posts" class="back-link"><span aria-hidden="true">←</span> All posts</a>
	<button
		type="button"
		class="ad-btn ad-btn--danger ad-btn--sm"
		onclick={() => (confirmingDelete = true)}
	>
		Delete
	</button>
</div>

<ConfirmModal
	open={confirmingDelete}
	title="Delete this post?"
	message={`"${title.trim() || 'Untitled'}" will be deleted for good. This cannot be undone.`}
	confirmLabel="Delete post"
	onConfirm={handleDelete}
	onCancel={() => (confirmingDelete = false)}
/>

<form
	method="POST"
	action="?/delete"
	bind:this={deleteForm}
	use:enhance={() => {
		return async ({ result }) => {
			if (result.type === 'success') goto('/dashboard/posts');
		};
	}}
></form>

<!-- Runs the Generate TL;DR button, which sits inside the main form below -->
<form
	method="POST"
	action="?/generateTldr"
	id="generate-tldr-form"
	use:enhance={({ formData }) => {
		tldrGenerating = true;
		tldrError = null;
		formData.set('content', content);
		return async ({ result }) => {
			tldrGenerating = false;
			if (result.type === 'success') {
				const generated = (result.data as { tldr?: string[] } | undefined)?.tldr;
				if (generated) {
					tldrPoints = generated;
					tldrDirty = false;
				}
			} else if (result.type === 'failure') {
				tldrError =
					(result.data as { tldrError?: string } | undefined)?.tldrError ??
					'Could not generate a TL;DR.';
			} else {
				tldrError = 'Could not reach the server. Try again.';
			}
		};
	}}
></form>

<form
	method="POST"
	action="?/save"
	bind:this={formEl}
	use:enhance={({ formData }) => {
		saving = true;
		unsaved = false;
		const editsSent = tldrEdits;
		formData.set('autosave', autoSubmitting ? '1' : '');
		autoSubmitting = false;
		formData.set('status', status);
		formData.set('content', content);
		formData.set('tags', tagsToString(selectedTags));
		formData.set('isFeatured', String(isFeatured));
		formData.set('tldr', JSON.stringify(tldrPoints));
		formData.set('tldrDirty', tldrDirty ? '1' : '');
		if (featuredImage) formData.set('featuredImage', featuredImage);
		else formData.delete('featuredImage');
		if (publishedAt) formData.set('publishedAt', publishedAt.toISOString());
		return async ({ result, update }) => {
			saving = false;
			if (result.type !== 'success') unsaved = true;
			if (result.type === 'success') {
				savedAt = new Date();
				const saved = result.data as { tldr?: string[]; tldrError?: string } | undefined;
				// Take the server's TL;DR unless the writer has typed in it since this save began.
				if (saved?.tldr && tldrEdits === editsSent) {
					tldrPoints = saved.tldr;
					tldrDirty = false;
				}
				tldrError = saved?.tldrError ?? null;
				if (saved?.tldrError) sidebarSection = 'tldr';
			}
			await update({ reset: false });
		};
	}}
>
	<input type="hidden" name="content" value="" />
	<input type="hidden" name="tags" value="" />
	<input type="hidden" name="isFeatured" value="" />

	<PostEditorLayout>
		{#snippet editor()}
			<EditorTitleFields
				bind:title
				bind:subtitle
				bind:slug
				error={form?.error ?? null}
				oninput={scheduleAutoSave}
			/>

			<TiptapEditor
				{content}
				onchange={(json) => {
					content = json;
					scheduleAutoSave();
				}}
			/>
		{/snippet}

		{#snippet sidebar()}
			<PublishControls
				bind:status
				bind:publishedAt
				bind:isFeatured
				{saving}
				{saveState}
				{saveText}
				shortcuts="Ctrl+S saves. Ctrl+Enter publishes."
				onSaveDraft={() => {
					autosave.cancel();
					formEl?.requestSubmit();
				}}
				onPublish={() => {
					status = 'published';
					autosave.cancel();
					formEl?.requestSubmit();
				}}
				onUnpublish={() => {
					status = 'draft';
					autosave.cancel();
					formEl?.requestSubmit();
				}}
				onStatusChange={(s) => (status = s)}
				onFeaturedChange={(v) => (isFeatured = v)}
			/>
			<input type="hidden" name="status" value={status} />
			<input type="hidden" name="authorId" value={authorId} />

			<EditorTabs bind:active={sidebarSection}>
				{#snippet meta()}
					<PostMetaPanel
						bind:featuredImage
						bind:authorId
						bind:categoryId
						bind:selectedTags
						authors={_authors.map((a) => ({ id: a.id, label: a.displayName }))}
						categories={_categories.map((c) => ({ id: c.id, label: c.name }))}
						allTags={_allTags}
						authorFieldName="authorId-display"
						tagInputId="tag-input-edit"
					/>
				{/snippet}
				{#snippet seo()}
					<SeoPanel
						bind:excerpt
						bind:ogTitle
						bind:ogDescription
						bind:twitterTitle
						bind:twitterDescription
						postTitle={title}
						{slug}
						coverImageUrl={featuredImage}
					/>
					<input type="hidden" name="excerpt" value={excerpt} />
				{/snippet}
				{#snippet tldr()}
					<section class="block">
						<SectionHeading label="In brief" />
						<TldrPanel
							bind:points={tldrPoints}
							generating={tldrGenerating}
							error={tldrError}
							formId="generate-tldr-form"
							onedit={handleTldrEdit}
						/>
					</section>
				{/snippet}
			</EditorTabs>
		{/snippet}
	</PostEditorLayout>
</form>

<style>
	.page-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text-muted);
	}

	.back-link:hover {
		color: var(--color-admin-accent);
	}

	.block {
		display: flex;
		flex-direction: column;
	}

	.block :global(.section-heading) {
		margin-bottom: 1rem;
	}
</style>
