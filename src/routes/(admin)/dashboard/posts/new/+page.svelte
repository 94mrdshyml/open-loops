<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto, replaceState } from '$app/navigation';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { createAutosave } from '$lib/utils/autosave';
	import PostEditorLayout from '$lib/components/admin/PostEditorLayout.svelte';
	import TiptapEditor from '$lib/components/admin/TiptapEditor.svelte';
	import EditorTitleFields from '$lib/components/admin/EditorTitleFields.svelte';
	import EditorTabs from '$lib/components/admin/EditorTabs.svelte';
	import PostMetaPanel from '$lib/components/admin/PostMetaPanel.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import SeoPanel from '$lib/components/admin/SeoPanel.svelte';
	import TldrPanel from '$lib/components/admin/TldrPanel.svelte';
	import PublishControls from '$lib/components/admin/PublishControls.svelte';
	import type { Tag, PostStatus } from '$lib/types/index';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();
	const { authors: _authors, categories: _categories, allTags: _allTags, defaultAuthorId } = data;

	onMount(() => pageTitle.set('New Post'));

	// Form state
	let title = $state('');
	let subtitle = $state('');
	let slug = $state('');
	let content = $state('');
	let featuredImage = $state<string | null>(null);
	let isFeatured = $state(false);
	let status = $state<PostStatus>('draft');
	let publishedAt = $state<Date | null>(null);
	let categoryId = $state('');
	let authorId = $state(defaultAuthorId ?? _authors[0]?.id ?? '');
	let selectedTags = $state<Tag[]>([]);
	let excerpt = $state('');
	let ogTitle = $state('');
	let ogDescription = $state('');
	let twitterTitle = $state('');
	let twitterDescription = $state('');
	let saving = $state(false);
	let unsaved = $state(false);
	let savedAt = $state<Date | null>(null);
	// Set by the first auto-save, which creates the draft. From then on, saves go to that story.
	let createdId = $state<string | null>(null);
	let autoSubmitting = false;

	// Auto-generate slug from title
	let slugEdited = $state(false);
	$effect(() => {
		if (!slugEdited && title) {
			slug = title
				.toLowerCase()
				.trim()
				.replace(/[^\w\s-]/g, '')
				.replace(/[\s_]+/g, '-')
				.replace(/^-+|-+$/g, '');
		}
	});

	// Auto-save. Once the story has a title, the first save quietly creates a draft and the page
	// stays as it is. After that every save goes into that draft. A save never starts on top of
	// another, so two drafts can never be made by mistake.
	let formEl: HTMLFormElement;

	const autosave = createAutosave({
		delayMs: 3000,
		submit: () => {
			autoSubmitting = true;
			formEl?.requestSubmit();
		},
		busy: () => saving,
		// Nothing can be saved until there is a title to name the draft
		dirty: () => unsaved && title.trim() !== ''
	});

	function scheduleAutoSave() {
		unsaved = true;
		autosave.schedule();
	}

	// Every field that is saved with the story starts an auto-save when it changes. The first run
	// just records where things start.
	let fieldsSeen: string | null = null;
	$effect(() => {
		const now = JSON.stringify([
			featuredImage,
			categoryId,
			authorId,
			isFeatured,
			excerpt,
			selectedTags.map((t) => t.id),
			tldrPoints
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
				? title.trim()
					? 'Unsaved changes'
					: 'Add a title to start saving'
				: saveState === 'error'
					? 'Not saved'
					: savedAt
						? `Saved ${savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
						: ''
	);

	// Points the writer types here are saved as they are, and the model is not asked.
	let tldrPoints = $state<string[]>([]);
</script>

<svelte:window onkeydown={handleKeydown} onbeforeunload={onBeforeUnload} />
<svelte:document onvisibilitychange={onVisibilityChange} />

<div class="page-bar">
	<a href="/dashboard/posts" class="back-link"><span aria-hidden="true">←</span> All posts</a>
</div>

<form
	method="POST"
	action={createdId ? `/dashboard/posts/${createdId}/edit?/save` : '?/save'}
	bind:this={formEl}
	use:enhance={({ formData }) => {
		const wasAuto = autoSubmitting;
		autoSubmitting = false;
		saving = true;
		unsaved = false;
		// An auto-save only ever saves a draft. Publishing is always the writer's own click.
		formData.set('autosave', wasAuto ? '1' : '');
		formData.set('status', wasAuto ? 'draft' : status);
		formData.set('content', content);
		formData.set('tags', tagsToString(selectedTags));
		formData.set('isFeatured', String(isFeatured));
		formData.set('tldr', JSON.stringify(tldrPoints));
		// The edit page's save only keeps hand-written points when they are marked as edited
		if (createdId) formData.set('tldrDirty', tldrPoints.length > 0 ? '1' : '');
		if (featuredImage) formData.set('featuredImage', featuredImage);
		if (publishedAt) formData.set('publishedAt', publishedAt.toISOString());
		return async ({ result, update }) => {
			saving = false;

			if (result.type === 'redirect') {
				const id = /^\/dashboard\/posts\/([^/]+)\/edit/.exec(result.location)?.[1];
				if (wasAuto && id) {
					// The draft now exists. Stay here, so typing is not interrupted, and point the
					// address at the real edit page so a refresh opens it.
					createdId = id;
					savedAt = new Date();
					replaceState(`/dashboard/posts/${id}/edit`, {});
					return;
				}
				await update();
				return;
			}

			if (result.type !== 'success') {
				unsaved = true;
			} else {
				savedAt = new Date();
				if (createdId && !wasAuto) {
					// Saved or published by hand after the draft existed: open the real edit page
					await goto(`/dashboard/posts/${createdId}/edit`);
					return;
				}
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
				oninput={(field) => {
					if (field === 'slug') slugEdited = true;
					scheduleAutoSave();
				}}
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
				shortcuts="Saved automatically. Ctrl+S saves now."
				onSaveDraft={() => {
					autosave.cancel();
					formEl?.requestSubmit();
				}}
				onPublish={() => {
					autosave.cancel();
					formEl?.requestSubmit();
				}}
				onStatusChange={(s) => (status = s)}
				onFeaturedChange={(v) => (isFeatured = v)}
			/>
			<input type="hidden" name="status" value={status} />

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
						authorFieldName="authorId"
						tagInputId="tag-input"
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
						<p class="tldr-note">
							Write your own below, or leave it empty and one is written automatically when you
							publish. You can edit or regenerate it afterwards.
						</p>
						<TldrPanel bind:points={tldrPoints} canGenerate={false} />
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

	.tldr-note {
		margin: 0 0 0.75rem;
		font-size: var(--text-xs);
		line-height: 1.5;
		color: var(--color-admin-text-muted);
	}
</style>
