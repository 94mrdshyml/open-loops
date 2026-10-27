<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { toast } from '$lib/stores/toast';
	import { formatDate } from '$lib/utils/format-date';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import StatCard from '$lib/components/admin/StatCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set(data.targetUser?.name ?? ''));

	const roleOptions = ['reader', 'author', 'admin'] as const;
	type Role = (typeof roleOptions)[number];

	const ROLE_RESULT: Record<Role, string> = {
		reader: 'They will lose access to the dashboard and keep their reading account.',
		author: 'They will be able to write, publish and delete their own stories.',
		admin: 'They will be able to manage every story, comment, user and setting on the site.'
	};

	const user = $derived(data.targetUser);
	const isYou = $derived(user.id === data.user.id);

	function asRole(value: string): Role {
		return roleOptions.find((r) => r === value) ?? 'reader';
	}

	let chosen = $state<Role | null>(null);
	let confirming = $state(false);
	let saving = $state(false);
	let roleForm = $state<HTMLFormElement | undefined>(undefined);

	const role = $derived(chosen ?? asRole(user.role));
	const changed = $derived(role !== user.role);

	function article(r: Role): string {
		return r === 'admin' || r === 'author' ? 'an' : 'a';
	}

	// The role form posts to the Users page, which owns the action
	const saveRole: SubmitFunction = () => {
		saving = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			saving = false;
			if (result.type === 'success') {
				toast.success(`${user.name} is now ${article(role)} ${role}.`);
				chosen = null;
			} else {
				const message = result.type === 'failure' ? result.data?.error : null;
				toast.error(
					typeof message === 'string'
						? `${message}. Try again.`
						: 'Could not change the role. Check your connection and try again.'
				);
			}
		};
	};

	function confirmRole() {
		confirming = false;
		roleForm?.requestSubmit();
	}
</script>

<div class="user-detail">
	<a href="/dashboard/users" class="back">← All users</a>

	<section>
		<SectionHeading label="Profile" />
		<div class="profile">
			{#if user.avatarUrl}
				<img src={user.avatarUrl} alt="" class="avatar avatar-img" />
			{:else}
				<span class="avatar" aria-hidden="true">
					{((user.firstName ?? user.name) || 'U').charAt(0).toUpperCase()}
				</span>
			{/if}
			<dl class="facts">
				{#if user.username}
					<div>
						<dt>Username</dt>
						<dd>@{user.username}</dd>
					</div>
				{/if}
				<div>
					<dt>Email</dt>
					<dd class="email">{user.email}</dd>
				</div>
				<div>
					<dt>Joined</dt>
					<dd>{formatDate(user.createdAt)}</dd>
				</div>
				<div>
					<dt>Role</dt>
					<dd><span class="role role-{user.role}">{user.role}</span></dd>
				</div>
				<div>
					<dt>Newsletter</dt>
					<dd>
						{#if user.isNewsletterSubscriber}
							<span class="subscribed">Subscribed</span>
						{:else}
							<span class="not-subscribed">Not subscribed</span>
						{/if}
					</dd>
				</div>
			</dl>
		</div>
	</section>

	<section>
		<SectionHeading label="Reading account" />
		<div class="counts">
			<StatCard label="Saved stories" value={user.bookmarkCount} />
			<StatCard label="Comments" value={user.commentCount} />
		</div>
	</section>

	<section>
		<SectionHeading label="Change role" />
		<form
			bind:this={roleForm}
			method="POST"
			action="/dashboard/users?/updateRole"
			class="role-form"
			use:enhance={saveRole}
		>
			<input type="hidden" name="userId" value={user.id} />
			<input type="hidden" name="role" value={role} />
			<div class="role-row">
				<label class="role-label" for="user-role">Role for {user.name}</label>
				<select
					id="user-role"
					class="role-select"
					value={role}
					disabled={isYou || saving}
					aria-describedby={isYou ? 'own-role' : 'role-help'}
					onchange={(e) => (chosen = asRole(e.currentTarget.value))}
				>
					{#each roleOptions as r (r)}
						<option value={r}>{r}</option>
					{/each}
				</select>
				<button
					type="button"
					class="ad-btn"
					disabled={isYou || saving || !changed}
					onclick={() => (confirming = true)}
				>
					{saving ? 'Saving' : 'Save role'}
				</button>
			</div>
			{#if isYou}
				<p class="help" id="own-role">This is your own account, so you cannot change its role.</p>
			{:else}
				<p class="help" id="role-help">
					Readers can use the site. Authors can write their own stories. Admins can manage
					everything.
				</p>
			{/if}
		</form>
	</section>
</div>

<ConfirmModal
	open={confirming}
	title={`Make ${user.name} ${article(role)} ${role}?`}
	message={ROLE_RESULT[role]}
	confirmLabel="Change role"
	danger={false}
	onConfirm={confirmRole}
	onCancel={() => (confirming = false)}
/>

<style>
	.user-detail {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		max-width: 800px;
	}

	.back {
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		min-height: 44px;
		margin-bottom: -1.5rem;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text-muted);
		text-decoration: none;
	}

	.back:hover {
		color: var(--color-admin-accent);
	}

	/* Profile */
	.profile {
		display: flex;
		align-items: flex-start;
		gap: 1.5rem;
	}

	.avatar {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 50%;
		background: var(--color-admin-surface);
		color: var(--color-admin-text);
		font-family: var(--serif);
		font-size: 2rem;
		font-weight: 500;
	}

	.avatar-img {
		object-fit: cover;
	}

	.facts {
		flex: 1;
		min-width: 0;
		margin: 0;
	}

	.facts > div {
		display: grid;
		grid-template-columns: 8rem 1fr;
		gap: 0.75rem;
		align-items: center;
		min-height: 44px;
		border-bottom: 1px solid var(--color-admin-border);
	}

	.facts > div:first-child {
		border-top: 1px solid var(--color-admin-border);
	}

	dt {
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: var(--tracking-caps);
		text-transform: uppercase;
		color: var(--color-admin-text-muted);
	}

	dd {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-admin-text);
	}

	.email {
		overflow-wrap: anywhere;
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
		font-size: var(--text-sm);
		font-weight: 600;
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

	/* Counts */
	.counts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 14rem));
		gap: 1.5rem;
	}

	/* Role form */
	.role-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.role-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
	}

	.role-select {
		min-height: 40px;
		min-width: 10rem;
		padding: 0 0.75rem;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
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

	.help {
		margin: 0.75rem 0 0;
		max-width: 52ch;
		font-size: var(--text-xs);
		line-height: 1.5;
		color: var(--color-admin-text-muted);
	}

	@media (max-width: 1023px) {
		.role-select {
			min-height: 44px;
		}
	}

	@media (max-width: 599px) {
		.profile {
			flex-direction: column;
			gap: 1rem;
		}

		.facts {
			width: 100%;
		}

		.facts > div {
			grid-template-columns: 6.5rem 1fr;
		}

		.counts {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.role-row > * {
			flex: 1 1 100%;
		}
	}
</style>
