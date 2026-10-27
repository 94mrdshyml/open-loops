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
	import Textarea from '$lib/components/admin/Textarea.svelte';
	import TextInput from '$lib/components/admin/TextInput.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set('Authors'));

	type AuthorRow = PageData['authors'][number];

	let panelOpen = $state(false);
	let panelEl = $state<HTMLElement | null>(null);
	let opener: HTMLElement | null = null;
	let editingAuthor = $state<AuthorRow | null>(null);
	let formName = $state('');
	let formPublicName = $state('');
	let formBio = $state('');
	let formRole = $state('writer');
	let formAvatarUrl = $state('');
	let formError = $state<string | null>(null);
	let saving = $state(false);
	let deleteTarget = $state<AuthorRow | null>(null);
	let deleteFormEl: HTMLFormElement;

	const roleOptions = [
		{ value: 'writer', label: 'Writer' },
		{ value: 'editor', label: 'Editor' },
		{ value: 'admin', label: 'Admin' }
	];

	const FOCUSABLE =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

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

	function initials(name: string): string {
		return name
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase();
	}

	function openCreate() {
		opener = document.activeElement as HTMLElement | null;
		editingAuthor = null;
		formName = '';
		formPublicName = '';
		formBio = '';
		formRole = 'writer';
		formAvatarUrl = '';
		formError = null;
		panelOpen = true;
	}

	function openEdit(author: AuthorRow) {
		opener = document.activeElement as HTMLElement | null;
		editingAuthor = author;
		formName = author.displayName;
		formPublicName = author.publicName ?? '';
		formBio = author.bio ?? '';
		formRole = author.role ?? 'writer';
		formAvatarUrl = author.avatarUrl ?? '';
		formError = null;
		panelOpen = true;
	}

	async function closePanel() {
		panelOpen = false;
		editingAuthor = null;
		formError = null;
		await tick();
		if (opener?.isConnected) opener.focus();
	}

	// Focus moves into the panel when it opens
	function focusFirstField(node: HTMLElement) {
		node.querySelector<HTMLElement>('input, textarea, select')?.focus();
	}

	// Escape closes the panel, and Tab stays inside it while it is open
	function handleKeydown(e: KeyboardEvent) {
		if (!panelOpen || !panelEl || deleteTarget) return;
		if (e.key === 'Escape') {
			void closePanel();
			return;
		}
		if (e.key !== 'Tab') return;
		const items = [...panelEl.querySelectorAll<HTMLElement>(FOCUSABLE)];
		if (items.length === 0) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	const saveAuthor: SubmitFunction = () => {
		const wasEditing = editingAuthor !== null;
		saving = true;
		formError = null;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') {
				toast.success(wasEditing ? 'Author updated' : 'Author added');
				await closePanel();
				await invalidateAll();
			} else if (result.type === 'failure') {
				formError = errorOf(result.data, "Couldn't save. Check the details and try again.");
			} else {
				formError = "Couldn't save. Check your connection and try again.";
			}
			await update({ reset: false });
		};
	};
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet avatar(url: string | null, name: string, large: boolean)}
	{#if url}
		<img src={url} alt="" class="avatar" class:large />
	{:else}
		<span class="avatar avatar-initials" class:large aria-hidden="true">{initials(name)}</span>
	{/if}
{/snippet}

<div class="page">
	<section aria-label="Author profiles">
		<SectionHeading
			label="Author profiles"
			meta="{data.authors.length} {data.authors.length === 1 ? 'author' : 'authors'}"
		>
			{#snippet actions()}
				<button type="button" id="add-author" class="ad-btn ad-btn--sm" onclick={openCreate}>
					Add author
				</button>
			{/snippet}
		</SectionHeading>

		{#if data.authors.length > 0}
			<div class="author-table">
				<AdminTable columns={['Author', 'About', 'Role', 'Stories', 'Actions']}>
					{#each data.authors as author (author.id)}
						<tr>
							<td class="c-author">
								<div class="who">
									{@render avatar(author.avatarUrl, author.displayName, false)}
									<div class="who-text">
										<span class="name">{author.displayName}</span>
										{#if author.publicName}
											<span class="sub">Readers see: {author.publicName}</span>
										{/if}
										<span class="sub slug">{author.slug}</span>
										<span class="sub">
											{author.userId ? 'Linked to a site account' : 'No site account linked'}
										</span>
									</div>
								</div>
							</td>
							<td class="c-bio" class:empty={!author.bio}>
								{#if author.bio}
									<p class="bio">{author.bio}</p>
								{:else}
									<span class="ad-muted">No bio yet</span>
								{/if}
							</td>
							<td class="c-role">
								<span class="role" class:role-admin={author.role === 'admin'}>
									{author.role ?? 'writer'}
								</span>
							</td>
							<td class="c-count">
								<span class="n">{author.postCount}</span><span class="unit"
									>&nbsp;{author.postCount === 1 ? 'story' : 'stories'}</span
								>
							</td>
							<td class="c-actions">
								<div class="actions">
									<button type="button" class="row-action" onclick={() => openEdit(author)}>
										Edit<span class="sr-only"> {author.displayName}</span>
									</button>
									<button
										type="button"
										class="row-action row-action--danger"
										onclick={() => (deleteTarget = author)}
									>
										Delete<span class="sr-only"> {author.displayName}</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</AdminTable>
			</div>
		{:else}
			<EmptyState
				message="No authors yet"
				sublabel="Add the first author profile. Every story needs an author before it can be published."
			/>
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
				toast.error(errorOf(result.data, "Couldn't delete the author. Try again."));
			} else {
				toast.success('Author deleted');
				await invalidateAll();
			}
			await update({ reset: false });
		};
	}}
>
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>

<!-- Slide-over panel -->
{#if panelOpen}
	<div class="backdrop" onclick={closePanel} role="presentation"></div>
	<div
		class="panel"
		role="dialog"
		aria-modal="true"
		aria-labelledby="author-panel-title"
		bind:this={panelEl}
		use:focusFirstField
	>
		<div class="panel-header">
			<h2 class="panel-title" id="author-panel-title">
				{editingAuthor ? `Edit ${editingAuthor.displayName}` : 'Add author'}
			</h2>
			<button type="button" class="panel-close" onclick={closePanel} aria-label="Close panel">
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		<form
			method="POST"
			action={editingAuthor ? '?/update' : '?/create'}
			class="panel-form"
			use:enhance={saveAuthor}
		>
			{#if editingAuthor}
				<input type="hidden" name="id" value={editingAuthor.id} />
			{/if}

			<div class="panel-body">
				{#if formError}
					<p class="form-error" role="alert">{formError}</p>
				{/if}

				<FormField label="Name" required fieldId="author-name">
					<TextInput id="author-name" name="name" bind:value={formName} required />
				</FormField>

				<FormField
					label="Shown to readers as"
					fieldId="author-public-name"
					hint="Optional. The name readers see on stories, the author box and the author page. The Name above stays for the dashboard. Leave empty to show the Name."
				>
					<TextInput id="author-public-name" name="publicName" bind:value={formPublicName} />
				</FormField>

				<FormField
					label="Bio"
					fieldId="author-bio"
					hint="A line or two about the writer, shown on the public site."
				>
					<Textarea id="author-bio" name="bio" bind:value={formBio} rows={4} />
				</FormField>

				<FormField label="Role" fieldId="author-role">
					<SelectInput id="author-role" name="role" bind:value={formRole} options={roleOptions} />
				</FormField>

				<div class="photo">
					{@render avatar(formAvatarUrl.trim() || null, formName, true)}
					<div class="photo-field">
						<FormField
							label="Photo link"
							fieldId="author-avatar"
							hint="Paste the link to an image from the media library. Leave it empty to show initials."
						>
							<TextInput
								id="author-avatar"
								name="avatarUrl"
								bind:value={formAvatarUrl}
								placeholder="https://"
							/>
						</FormField>
					</div>
				</div>

				{#if editingAuthor}
					<p class="account-note">
						{editingAuthor.userId
							? 'This profile is linked to a site account.'
							: 'This profile is not linked to a site account.'}
					</p>
				{/if}
			</div>

			<div class="panel-footer">
				<button type="button" class="ad-btn ad-btn--quiet" onclick={closePanel}>Cancel</button>
				<button type="submit" class="ad-btn" disabled={saving}>
					{#if saving}Saving…{:else if editingAuthor}Save changes{:else}Add author{/if}
				</button>
			</div>
		</form>
	</div>
{/if}

<ConfirmModal
	open={deleteTarget !== null}
	title="Delete author"
	message={deleteTarget
		? deleteTarget.postCount > 0
			? `Delete ${deleteTarget.displayName}? They have ${storyCount(deleteTarget.postCount)}, and an author with stories cannot be deleted. Move the stories to another author first, or the delete will be refused.`
			: `Delete ${deleteTarget.displayName}? They have no stories. This cannot be undone.`
		: ''}
	confirmLabel="Delete author"
	danger
	onConfirm={() => {
		deleteFormEl.requestSubmit();
		deleteTarget = null;
	}}
	onCancel={() => (deleteTarget = null)}
/>

<style>
	.hidden {
		display: none;
	}

	/* Avatar: a photo, or initials in ink */
	.avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--color-admin-border-strong);
	}

	.avatar.large {
		width: 56px;
		height: 56px;
	}

	.avatar-initials {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--serif);
		font-size: 1rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--color-admin-bg);
		background: var(--color-admin-text);
		border-color: var(--color-admin-text);
	}

	.avatar-initials.large {
		font-size: 1.25rem;
	}

	/* Table cells */
	.who {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}

	.who-text {
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
		min-width: 0;
	}

	.name {
		font-family: var(--serif);
		font-size: 1.1875rem;
		font-weight: 500;
		line-height: 1.25;
		letter-spacing: -0.005em;
	}

	.sub {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	.slug {
		font-family: var(--font-mono);
	}

	.c-bio {
		max-width: 26rem;
	}

	.bio {
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		color: var(--color-admin-text-muted);
		line-height: 1.45;
	}

	.role {
		display: inline-flex;
		align-items: center;
		padding: 0.1875rem 0.625rem;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 999px;
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: capitalize;
		color: var(--color-admin-text);
	}

	.role-admin {
		color: var(--color-admin-accent);
		background: var(--color-admin-accent-light);
		border-color: var(--color-admin-accent);
	}

	.c-count {
		font-variant-numeric: tabular-nums;
	}

	.unit {
		display: none;
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

	/* Slide-over panel */
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: var(--color-admin-overlay);
	}

	.panel {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		width: min(30rem, 100vw);
		height: 100dvh;
		background: var(--color-admin-bg);
		border-left: 1px solid var(--color-admin-border-strong);
		animation: slide-panel 0.2s ease;
	}

	@keyframes slide-panel {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.panel {
			animation: none;
		}
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.5rem 1rem;
		border-bottom: 2px solid var(--color-admin-text);
		flex-shrink: 0;
	}

	.panel-title {
		margin: 0;
		font-family: var(--serif);
		font-size: 1.5rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
	}

	.panel-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		color: var(--color-admin-text);
		background: transparent;
		border: 0;
		border-radius: 10px;
		cursor: pointer;
	}

	.panel-close:hover {
		background: var(--color-admin-surface-hover);
	}

	.panel-form {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.panel-body {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.form-error {
		margin: 0;
		padding: 0.75rem 1rem;
		font-size: var(--text-sm);
		font-weight: 500;
		border: 1px solid var(--color-status-error);
		border-radius: 8px;
	}

	.photo {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.photo .avatar {
		margin-top: 1.75rem;
	}

	.photo-field {
		flex: 1;
		min-width: 0;
	}

	.account-note {
		margin: 0;
		padding-top: 1rem;
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
		border-top: 1px solid var(--color-admin-border);
	}

	.panel-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		padding-bottom: max(1rem, env(safe-area-inset-bottom));
		border-top: 1px solid var(--color-admin-border-strong);
		flex-shrink: 0;
	}

	@media (max-width: 1023px) {
		.row-action {
			min-height: 44px;
		}
	}

	@media (max-width: 1023px) {
		.c-bio,
		.author-table :global(th:nth-child(2)) {
			display: none;
		}
	}

	/* Stacked rows on a phone: who they are and how many stories first */
	@media (max-width: 767px) {
		.author-table :global(thead) {
			display: none;
		}

		.author-table :global(table),
		.author-table :global(tbody) {
			display: block;
		}

		.author-table :global(tbody tr) {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				'author count'
				'bio bio'
				'role actions';
			align-items: center;
			gap: 0.5rem 1rem;
			padding: 1rem 0;
		}

		.author-table :global(tbody td) {
			padding: 0;
			border: 0;
		}

		.c-author {
			grid-area: author;
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

		.author-table .c-bio {
			display: block;
			grid-area: bio;
			max-width: none;
			font-size: var(--text-sm);
		}

		.author-table .c-bio.empty {
			display: none;
		}

		.c-role {
			grid-area: role;
		}

		.c-actions {
			grid-area: actions;
			justify-self: end;
		}

		.panel {
			width: 100vw;
		}

		.panel-header,
		.panel-body,
		.panel-footer {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.panel-footer :global(.ad-btn) {
			flex: 1;
		}
	}
</style>
