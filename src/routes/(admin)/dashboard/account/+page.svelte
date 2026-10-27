<script lang="ts">
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { uploadImage } from '$lib/utils/upload-image';
	import FormField from '$lib/components/admin/FormField.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import TextInput from '$lib/components/admin/TextInput.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';

	interface FieldErrors {
		firstName?: string;
		lastName?: string;
		username?: string;
		avatarUrl?: string;
	}

	type SaveState = 'idle' | 'saving' | 'saved' | 'error';
	type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

	const USERNAME_FORMAT_MESSAGE =
		'Only lowercase letters, numbers and underscores. 3–20 characters.';

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set('My account'));

	const user = $derived(data.user);
	const role = $derived(user.role);

	// The form starts from the saved values; typing then belongs to the form until it is saved.
	const saved = untrack(() => data.user);
	// Older accounts may have no first and last name saved yet, so start from the full name.
	const nameParts = saved.name.trim().split(/\s+/);
	let firstName = $state(saved.firstName ?? nameParts[0] ?? '');
	let lastName = $state(saved.lastName ?? nameParts.slice(1).join(' '));
	let usernameValue = $state(saved.username ?? '');

	let errors = $state<FieldErrors>({});
	let saveState = $state<SaveState>('idle');
	let statusMessage = $state('');
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	let usernameStatus = $state<UsernameStatus>('idle');
	let checkTimeout: ReturnType<typeof setTimeout> | undefined;

	let uploadedUrl = $state('');
	let brokenUrl = $state('');
	let avatarUrlField = $state('');
	let avatarForm: HTMLFormElement | undefined = $state();
	let avatarBusy = $state(false);
	let avatarMessage = $state('');
	let avatarFailed = $state(false);

	onDestroy(() => {
		clearTimeout(resetTimer);
		clearTimeout(checkTimeout);
	});

	const photo = $derived(uploadedUrl || user.avatarUrl || '');
	const displayName = $derived(
		user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name
	);
	const initials = $derived(
		displayName
			.split(' ')
			.slice(0, 2)
			.map((w: string) => w[0])
			.join('')
			.toUpperCase()
	);

	const roleNote = $derived(
		role === 'admin'
			? 'You can manage every story, comment, category, author, user and setting.'
			: 'You can write and publish your own stories. An admin can change your role.'
	);

	const usernameError = $derived(
		usernameStatus === 'taken'
			? 'Username is taken.'
			: usernameStatus === 'invalid'
				? USERNAME_FORMAT_MESSAGE
				: errors.username
	);

	const usernameHint = $derived(
		usernameStatus === 'checking'
			? 'Checking…'
			: usernameStatus === 'available'
				? 'That username is free.'
				: USERNAME_FORMAT_MESSAGE
	);

	const usernameLive = $derived(
		usernameStatus === 'checking'
			? 'Checking username'
			: usernameStatus === 'available'
				? 'Username is free'
				: ''
	);

	const blocked = $derived(
		usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'
	);

	function onUsernameInput(e: Event & { currentTarget: HTMLInputElement }) {
		const value = e.currentTarget.value;
		clearTimeout(checkTimeout);
		errors = { ...errors, username: undefined };

		// No check if unchanged from the saved username
		if (value === (user.username ?? '')) {
			usernameStatus = 'idle';
			return;
		}

		if (value.length < 3) {
			usernameStatus = 'idle';
			return;
		}

		usernameStatus = 'checking';
		checkTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/check-username?username=${encodeURIComponent(value)}`);
				const d = (await res.json()) as { available: boolean; reason?: string };
				usernameStatus = d.available
					? 'available'
					: d.reason === 'invalid_format'
						? 'invalid'
						: 'taken';
			} catch {
				usernameStatus = 'idle';
			}
		}, 400);
	}

	const saveProfile: SubmitFunction = () => {
		clearTimeout(resetTimer);
		saveState = 'saving';
		statusMessage = 'Saving…';

		return async ({ result, update }) => {
			if (result.type === 'success') {
				errors = {};
				usernameStatus = 'idle';
				saveState = 'saved';
				statusMessage = 'Saved.';
				resetTimer = setTimeout(() => {
					saveState = 'idle';
					statusMessage = '';
				}, 6000);
				await update({ reset: false });
			} else if (result.type === 'failure') {
				errors = (result.data as { errors?: FieldErrors } | undefined)?.errors ?? {};
				saveState = 'error';
				statusMessage =
					'Some details need fixing. Check the messages under the fields and try again.';
			} else {
				saveState = 'error';
				statusMessage = "Couldn't save. Check your connection and try again.";
			}
		};
	};

	const saveAvatar: SubmitFunction = () => {
		return async ({ result, update }) => {
			avatarBusy = false;
			if (result.type === 'success') {
				avatarFailed = false;
				avatarMessage = 'Photo saved.';
				await update({ reset: false });
			} else {
				avatarFailed = true;
				avatarMessage = "Couldn't save your photo. Try again.";
			}
		};
	};

	async function onPhotoChange(e: Event & { currentTarget: HTMLInputElement }) {
		const input = e.currentTarget;
		const file = input.files?.[0];
		if (!file) return;

		avatarBusy = true;
		avatarFailed = false;
		avatarMessage = 'Uploading…';
		try {
			const url = await uploadImage(file);
			uploadedUrl = url;
			avatarUrlField = url;
			avatarMessage = 'Saving…';
			await tick();
			avatarForm?.requestSubmit();
		} catch {
			avatarBusy = false;
			avatarFailed = true;
			avatarMessage =
				"Couldn't upload the photo. Use a JPEG, PNG or WebP under 5 MB and try again.";
		} finally {
			input.value = '';
		}
	}
</script>

<div class="account">
	<header class="who">
		<div class="avatar">
			{#if photo && photo !== brokenUrl}
				<img src={photo} alt="You" class="avatar-img" onerror={() => (brokenUrl = photo)} />
			{:else}
				<span class="avatar-initials" aria-hidden="true">{initials}</span>
			{/if}
		</div>
		<div class="who-text">
			<p class="who-name">{displayName}</p>
			<p class="who-meta ad-muted">
				{#if user.username}<span>@{user.username}</span>{/if}
				<span class="role">{role}</span>
			</p>
			<div class="photo-row">
				<label class="ad-btn ad-btn--quiet ad-btn--sm photo-btn" class:is-busy={avatarBusy}>
					{avatarBusy ? 'Working…' : 'Change photo'}
					<input
						type="file"
						accept="image/*"
						class="sr-only"
						disabled={avatarBusy}
						onchange={onPhotoChange}
					/>
				</label>
				<p
					class="photo-status"
					class:is-error={avatarFailed}
					role={avatarFailed ? 'alert' : 'status'}
				>
					{avatarMessage}
				</p>
			</div>
		</div>
		<form
			method="POST"
			action="?/updateAvatar"
			bind:this={avatarForm}
			use:enhance={saveAvatar}
			hidden
		>
			<input type="hidden" name="avatarUrl" value={avatarUrlField} />
		</form>
	</header>

	<section>
		<SectionHeading label="Your details" />
		<form method="POST" action="?/updateProfile" novalidate use:enhance={saveProfile}>
			<div class="fields">
				<div class="name-row">
					<FormField label="First name" fieldId="firstName" required error={errors.firstName}>
						<TextInput id="firstName" name="firstName" bind:value={firstName} />
					</FormField>
					<FormField label="Last name" fieldId="lastName" required error={errors.lastName}>
						<TextInput id="lastName" name="lastName" bind:value={lastName} />
					</FormField>
				</div>

				<FormField
					label="Username"
					fieldId="username"
					required
					hint={usernameHint}
					error={usernameError}
				>
					<TextInput
						id="username"
						name="username"
						bind:value={usernameValue}
						oninput={onUsernameInput}
					/>
				</FormField>
				<p class="sr-only" role="status">{usernameLive}</p>
			</div>

			<div class="footer">
				<div class="status">
					{#if saveState === 'error'}
						<p class="status-text is-error" role="alert">{statusMessage}</p>
					{:else}
						<p class="status-text" class:is-saved={saveState === 'saved'} role="status">
							{#if saveState === 'saved'}
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									aria-hidden="true"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							{/if}
							{statusMessage}
						</p>
					{/if}
				</div>
				<button type="submit" class="ad-btn" disabled={saveState === 'saving' || blocked}>
					{saveState === 'saving' ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</form>
	</section>

	<section>
		<SectionHeading label="Sign-in and role" />
		<dl class="facts">
			<div class="fact">
				<dt>Email</dt>
				<dd>
					{user.email}
					<span class="ad-muted fact-note">Your email can't be changed here.</span>
				</dd>
			</div>
			<div class="fact">
				<dt>Role</dt>
				<dd>
					<span class="role">{role}</span>
					<span class="ad-muted fact-note">{roleNote}</span>
				</dd>
			</div>
		</dl>
	</section>
</div>

<style>
	.account {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		max-width: 40rem;
	}

	/* Header */
	.who {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 96px;
		height: 96px;
		flex-shrink: 0;
		overflow: hidden;
		border-radius: 50%;
		background: var(--color-admin-sidebar);
		border: 1px solid var(--color-admin-border-strong);
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		font-family: var(--serif);
		font-style: italic;
		font-size: 2.25rem;
		line-height: 1;
		color: var(--color-admin-text);
	}

	.who-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.who-name {
		margin: 0;
		font-family: var(--serif);
		font-size: 1.75rem;
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.015em;
		color: var(--color-admin-text);
		overflow-wrap: anywhere;
	}

	.who-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.75rem;
		margin: 0;
		font-size: var(--text-sm);
	}

	.who-meta > span + span::before {
		content: '';
		display: inline-block;
		width: 3px;
		height: 3px;
		margin-right: 0.75rem;
		vertical-align: middle;
		border-radius: 50%;
		background: currentColor;
	}

	.role {
		text-transform: capitalize;
	}

	.photo-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		margin-top: 0.5rem;
	}

	.photo-btn {
		position: relative;
	}

	.photo-btn:focus-within {
		outline: 2px solid var(--accent-ink);
		outline-offset: 2px;
	}

	.photo-btn.is-busy {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.photo-status {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
	}

	.photo-status.is-error {
		color: var(--color-status-error);
	}

	/* Form */
	.fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-bottom: 1.75rem;
	}

	.name-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-admin-border);
	}

	.status {
		flex: 1;
		min-width: 0;
		min-height: 1.25rem;
	}

	.status-text {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-admin-text-muted);
	}

	.status-text.is-saved {
		color: var(--color-status-published);
	}

	.status-text.is-error {
		color: var(--color-status-error);
	}

	/* Email and role */
	.facts {
		margin: 0;
	}

	.fact {
		display: grid;
		grid-template-columns: 8rem 1fr;
		gap: 1rem;
		padding: 0.875rem 0;
		border-bottom: 1px solid var(--color-admin-border);
		font-size: var(--text-sm);
	}

	.fact:first-child {
		padding-top: 0;
	}

	.fact dt {
		font-weight: 600;
		color: var(--color-admin-text);
	}

	.fact dd {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		color: var(--color-admin-text);
		overflow-wrap: anywhere;
	}

	.fact-note {
		font-size: var(--text-xs);
	}

	@media (max-width: 599px) {
		.who {
			align-items: flex-start;
			gap: 1rem;
		}

		.avatar {
			width: 72px;
			height: 72px;
		}

		.avatar-initials {
			font-size: 1.75rem;
		}

		.who-name {
			font-size: 1.5rem;
		}

		.name-row {
			grid-template-columns: 1fr;
		}

		.footer {
			flex-direction: column-reverse;
			align-items: stretch;
		}

		.footer :global(.ad-btn) {
			width: 100%;
		}

		.fact {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}
</style>
