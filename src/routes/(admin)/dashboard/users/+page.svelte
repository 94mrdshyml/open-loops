<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { toast } from '$lib/stores/toast';
	import { formatDate } from '$lib/utils/format-date';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import type { PageData } from './$types';

	interface UserRow {
		id: string;
		name: string;
		email: string;
	}

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set('Users'));

	const roleOptions = ['reader', 'author', 'admin'] as const;
	type Role = (typeof roleOptions)[number];

	const ROLE_RESULT: Record<Role, string> = {
		reader: 'They will lose access to the dashboard and keep their reading account.',
		author: 'They will be able to write, publish and delete their own stories.',
		admin: 'They will be able to manage every story, comment, user and setting on the site.'
	};

	// The role picked in each row, before it is saved
	let chosen = $state<Record<string, Role>>({});
	let pendingRole = $state<{ user: UserRow; role: Role } | null>(null);
	let pendingDelete = $state<UserRow | null>(null);
	let busy = $state(false);
	let doneMessage = $state('');

	let roleForm = $state<HTMLFormElement | undefined>(undefined);
	let deleteForm = $state<HTMLFormElement | undefined>(undefined);

	function asRole(value: string): Role {
		return roleOptions.find((r) => r === value) ?? 'reader';
	}

	function picked(id: string, current: string): Role {
		return chosen[id] ?? asRole(current);
	}

	function initial(name: string): string {
		return (name.trim().charAt(0) || '?').toUpperCase();
	}

	function article(role: Role): string {
		return role === 'admin' || role === 'author' ? 'an' : 'a';
	}

	function runAction(): SubmitFunction {
		return () => {
			busy = true;
			return async ({ result, update }) => {
				await update();
				busy = false;
				if (result.type === 'failure') {
					const message = result.data?.error;
					toast.error(
						typeof message === 'string'
							? `${message}. Try again.`
							: 'That did not work. Check your connection and try again.'
					);
				} else if (result.type === 'success') {
					toast.success(doneMessage);
				} else if (result.type === 'error') {
					toast.error('That did not work. Check your connection and try again.');
				}
			};
		};
	}

	function confirmRole() {
		if (!pendingRole) return;
		doneMessage = `${pendingRole.user.name} is now ${article(pendingRole.role)} ${pendingRole.role}.`;
		roleForm?.requestSubmit();
		pendingRole = null;
	}

	function confirmDeleteUser() {
		if (!pendingDelete) return;
		doneMessage = `${pendingDelete.name} was deleted.`;
		deleteForm?.requestSubmit();
		pendingDelete = null;
	}
</script>

<div class="users-page">
	<section>
		<SectionHeading
			label="All users"
			meta={`${data.users.length} ${data.users.length === 1 ? 'user' : 'users'}`}
		/>

		{#if data.users.length === 0}
			<EmptyState
				message="No users yet"
				sublabel="People appear here once they create an account on the site."
			/>
		{:else}
			<div class="users">
				<AdminTable columns={['User', 'Role', 'Newsletter', 'Joined', 'Change role', '']}>
					{#each data.users as u (u.id)}
						{@const isYou = u.id === data.currentUserId}
						{@const role = picked(u.id, u.role)}
						<tr>
							<td class="c-user">
								<a href="/dashboard/users/{u.id}" class="person">
									<span class="avatar" aria-hidden="true">{initial(u.name)}</span>
									<span class="who">
										<span class="who-line">
											<span class="who-name">{u.name}</span>
											{#if isYou}<span class="you">You</span>{/if}
											{#if u.username}<span class="ad-muted handle">@{u.username}</span>{/if}
										</span>
										<span class="who-email">{u.email}</span>
									</span>
								</a>
							</td>
							<td class="c-role">
								<span class="role role-{u.role}">{u.role}</span>
							</td>
							<td class="c-news">
								{#if u.isNewsletterSubscriber}
									<span class="subscribed">Subscribed</span>
								{:else}
									<span class="not-subscribed">Not subscribed</span>
								{/if}
							</td>
							<td class="c-joined">
								<span class="mobile-label" aria-hidden="true">Joined</span>
								{formatDate(u.createdAt)}
							</td>
							<td class="c-change">
								<div class="change">
									<label class="sr-only" for="role-{u.id}">Role for {u.name}</label>
									<select
										id="role-{u.id}"
										class="role-select"
										value={role}
										disabled={isYou || busy}
										aria-describedby={isYou ? `own-${u.id}` : undefined}
										onchange={(e) => (chosen[u.id] = asRole(e.currentTarget.value))}
									>
										{#each roleOptions as r (r)}
											<option value={r}>{r}</option>
										{/each}
									</select>
									<button
										type="button"
										class="ad-btn ad-btn--sm"
										disabled={isYou || busy || role === u.role}
										onclick={() => (pendingRole = { user: u, role })}
									>
										Save<span class="sr-only"> role for {u.name}</span>
									</button>
								</div>
								{#if isYou}
									<p class="own" id="own-{u.id}">You cannot change or delete your own account.</p>
								{/if}
							</td>
							<td class="c-del">
								<button
									type="button"
									class="ad-btn ad-btn--sm ad-btn--danger"
									disabled={isYou || busy}
									onclick={() => (pendingDelete = u)}
								>
									Delete<span class="sr-only"> {u.name}</span>
								</button>
							</td>
						</tr>
					{/each}
				</AdminTable>
			</div>
		{/if}
	</section>
</div>

<!-- One form for each action, submitted once the person confirms -->
<form
	bind:this={roleForm}
	method="POST"
	action="?/updateRole"
	class="sr-only"
	use:enhance={runAction()}
>
	<input type="hidden" name="userId" value={pendingRole?.user.id ?? ''} />
	<input type="hidden" name="role" value={pendingRole?.role ?? ''} />
</form>
<form
	bind:this={deleteForm}
	method="POST"
	action="?/deleteUser"
	class="sr-only"
	use:enhance={runAction()}
>
	<input type="hidden" name="userId" value={pendingDelete?.id ?? ''} />
</form>

<ConfirmModal
	open={pendingRole !== null}
	title={pendingRole
		? `Make ${pendingRole.user.name} ${article(pendingRole.role)} ${pendingRole.role}?`
		: ''}
	message={pendingRole ? ROLE_RESULT[pendingRole.role] : ''}
	confirmLabel="Change role"
	danger={false}
	onConfirm={confirmRole}
	onCancel={() => (pendingRole = null)}
/>

<ConfirmModal
	open={pendingDelete !== null}
	title={pendingDelete ? `Delete ${pendingDelete.name}?` : ''}
	message={pendingDelete
		? `This removes the account for ${pendingDelete.email}, with their sessions, comments and saved stories. This cannot be undone.`
		: ''}
	confirmLabel="Delete user"
	onConfirm={confirmDeleteUser}
	onCancel={() => (pendingDelete = null)}
/>

<style>
	.users-page {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* The ear's heavy rule is the top rule of the table */
	.users :global(.table-wrap) {
		border-top: none;
	}

	/* Person: initials, name and email */
	.person {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}

	.avatar {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 50%;
		background: var(--color-admin-surface);
		color: var(--color-admin-text);
		font-family: var(--serif);
		font-size: 1.125rem;
		font-weight: 500;
	}

	.who {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.who-line {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.125rem 0.5rem;
	}

	.who-name {
		font-family: var(--serif);
		font-size: 1.0625rem;
		font-weight: 500;
		line-height: 1.25;
		color: var(--color-admin-text);
		overflow-wrap: anywhere;
	}

	.person:hover .who-name {
		color: var(--color-admin-accent);
	}

	.handle,
	.who-email {
		font-size: var(--text-xs);
	}

	.who-email {
		color: var(--color-admin-text-muted);
		overflow-wrap: anywhere;
	}

	.you {
		padding: 0.0625rem 0.4375rem;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-admin-accent);
		border: 1px solid var(--color-admin-accent);
		border-radius: 999px;
	}

	/* Role: text and a shape, never colour alone */
	.role {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.2em 0.65em 0.2em 0.55em;
		border: 1px solid transparent;
		border-radius: 999px;
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: capitalize;
		white-space: nowrap;
	}

	.role::before {
		content: '';
		width: 7px;
		height: 7px;
		background: currentColor;
	}

	.role-admin {
		color: var(--color-admin-bg);
		background: var(--color-admin-text);
	}

	.role-admin::before {
		border-radius: 1px;
	}

	.role-author {
		color: var(--color-admin-text);
		border-color: var(--color-admin-border-strong);
	}

	.role-author::before {
		border-radius: 1px;
		transform: rotate(45deg);
	}

	.role-reader {
		color: var(--color-status-draft);
		background: var(--color-status-draft-bg);
	}

	.role-reader::before {
		border-radius: 50%;
		background: transparent;
		box-shadow: inset 0 0 0 1.5px currentColor;
	}

	.subscribed,
	.not-subscribed {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}

	.subscribed {
		color: var(--color-status-published);
	}

	.subscribed::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}

	.not-subscribed {
		color: var(--color-admin-text-muted);
		font-weight: 500;
	}

	.c-joined {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		white-space: nowrap;
	}

	.mobile-label {
		display: none;
	}

	/* Change role */
	.change {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.role-select {
		min-height: 32px;
		padding: 0 0.5rem;
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 500;
		text-transform: capitalize;
		color: var(--color-admin-text);
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		cursor: pointer;
	}

	.role-select:hover:not(:disabled) {
		border-color: var(--color-admin-text-muted);
	}

	.role-select:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.own {
		margin: 0.375rem 0 0;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	.c-del {
		text-align: right;
	}

	@media (max-width: 1023px) {
		.role-select {
			min-height: 44px;
			padding: 0 0.75rem;
			font-size: var(--text-sm);
		}
	}

	/* Mobile: each person is a stacked row, name and role first */
	@media (max-width: 767px) {
		.users :global(.table-wrap) {
			overflow-x: visible;
		}

		.users :global(table),
		.users :global(tbody) {
			display: block;
		}

		.users :global(thead) {
			display: none;
		}

		.users :global(tbody tr) {
			display: grid;
			grid-template-columns: auto auto 1fr auto;
			grid-template-areas:
				'user user user user'
				'role news joined joined'
				'change change change del';
			gap: 0.75rem 1rem;
			align-items: center;
			padding: 1rem 0;
			border-bottom: 1px solid var(--color-admin-border);
		}

		.users :global(tbody tr:hover) {
			background: transparent;
		}

		.users :global(tbody td) {
			display: block;
			padding: 0;
		}

		.c-user {
			grid-area: user;
			min-width: 0;
		}

		.c-role {
			grid-area: role;
		}

		.c-news {
			grid-area: news;
		}

		.c-joined {
			grid-area: joined;
			text-align: right;
		}

		.mobile-label {
			display: inline;
			margin-right: 0.25rem;
		}

		.c-change {
			grid-area: change;
			align-self: start;
		}

		.change {
			flex-wrap: wrap;
		}

		.role-select {
			flex: 1;
			min-width: 8rem;
		}

		.c-del {
			grid-area: del;
			align-self: start;
			text-align: left;
		}
	}
</style>
