<script lang="ts">
	import { enhance } from '$app/forms';
	import { uploadImage } from '$lib/utils/upload-image';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const user = $derived(data.user);
	const isReaderOnly = $derived(user.role === 'reader');

	let loading = $state(false);
	let avatarUploading = $state(false);
	let avatarPreview = $state(user.avatarUrl ?? '');

	let usernameValue = $state(user.username ?? '');
	let usernameStatus = $state<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('available');
	let checkTimeout: ReturnType<typeof setTimeout> | undefined;

	const initials = $derived(
		(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name)
			.split(' ')
			.slice(0, 2)
			.map((w: string) => w[0])
			.join('')
			.toUpperCase()
	);

	function onUsernameInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		usernameValue = value;
		clearTimeout(checkTimeout);

		// No check if unchanged from current
		if (value === (user.username ?? '')) {
			usernameStatus = 'available';
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
				const data = (await res.json()) as { available: boolean; reason?: string };
				usernameStatus = data.available
					? 'available'
					: data.reason === 'invalid_format'
						? 'invalid'
						: 'taken';
			} catch {
				usernameStatus = 'idle';
			}
		}, 400);
	}

	async function onAvatarChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		avatarUploading = true;
		try {
			const url = await uploadImage(file);
			avatarPreview = url;

			// Auto-submit updateAvatar action
			const fd = new FormData();
			fd.append('avatarUrl', url);
			await fetch('?/updateAvatar', { method: 'POST', body: fd });
		} catch {
			// Non-fatal
		} finally {
			avatarUploading = false;
		}
	}

	function handleSubmit(e: SubmitEvent) {
		if (usernameStatus !== 'available' && usernameStatus !== 'idle') {
			e.preventDefault();
		}
	}
</script>

<svelte:head>
	<title>Edit Profile — Open Tabs</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="edit-shell">
	<div class="edit-card form-kit">
		<div class="ear"><h1>Edit profile</h1></div>

		<!-- Avatar -->
		<div class="avatar-section">
			<div class="avatar-circle">
				{#if avatarPreview}
					<img src={avatarPreview} alt="Avatar" class="avatar-img" />
				{:else}
					<span class="avatar-initials">{initials}</span>
				{/if}
			</div>
			<label class="change-photo-btn" class:uploading={avatarUploading}>
				{#if avatarUploading}
					Uploading…
				{:else}
					Change photo
				{/if}
				<input
					type="file"
					accept="image/*"
					onchange={onAvatarChange}
					class="sr-only"
					disabled={avatarUploading}
				/>
			</label>
		</div>

		<form
			method="POST"
			action="?/updateProfile"
			onsubmit={handleSubmit}
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			{#if (form as { errors?: { general?: string } } | null)?.errors?.general}
				<p class="error-banner">{(form as { errors: { general: string } }).errors.general}</p>
			{/if}

			{#if !isReaderOnly}
				<div class="role-notice">
					<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
						<circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.4" />
						<line
							x1="7.5"
							y1="5"
							x2="7.5"
							y2="7.5"
							stroke="currentColor"
							stroke-width="1.4"
							stroke-linecap="round"
						/>
						<circle cx="7.5" cy="10" r="0.75" fill="currentColor" />
					</svg>
					<span>
						Name and username can be changed from
						<a href="/dashboard/account" class="notice-link">Dashboard → My account</a>.
					</span>
				</div>
			{/if}

			<div class="name-row">
				<div class="field">
					<label for="firstName">First name</label>
					<input
						id="firstName"
						name="firstName"
						type="text"
						value={user.firstName ?? ''}
						required
						disabled={loading || !isReaderOnly}
						class:field-disabled={!isReaderOnly}
						class:field-error={!!(form as { errors?: { firstName?: string } } | null)?.errors
							?.firstName}
					/>
					{#if (form as { errors?: { firstName?: string } } | null)?.errors?.firstName}
						<span class="field-err"
							>{(form as { errors: { firstName: string } }).errors.firstName}</span
						>
					{/if}
				</div>
				<div class="field">
					<label for="lastName">Last name</label>
					<input
						id="lastName"
						name="lastName"
						type="text"
						value={user.lastName ?? ''}
						required
						disabled={loading || !isReaderOnly}
						class:field-disabled={!isReaderOnly}
						class:field-error={!!(form as { errors?: { lastName?: string } } | null)?.errors
							?.lastName}
					/>
					{#if (form as { errors?: { lastName?: string } } | null)?.errors?.lastName}
						<span class="field-err"
							>{(form as { errors: { lastName: string } }).errors.lastName}</span
						>
					{/if}
				</div>
			</div>

			<div class="field">
				<label for="username">Username</label>
				<div class="input-icon-wrap">
					<input
						id="username"
						name="username"
						type="text"
						value={usernameValue}
						oninput={isReaderOnly ? onUsernameInput : undefined}
						required
						disabled={loading || !isReaderOnly}
						class:field-disabled={!isReaderOnly}
						class:field-error={isReaderOnly &&
							(usernameStatus === 'taken' ||
								usernameStatus === 'invalid' ||
								!!(form as { errors?: { username?: string } } | null)?.errors?.username)}
						class:field-ok={isReaderOnly && usernameStatus === 'available'}
					/>
					{#if isReaderOnly}
						{#if usernameStatus === 'checking'}
							<span class="input-icon spinner" aria-hidden="true">
								<svg
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									class="spin"
								>
									<circle cx="7" cy="7" r="5" stroke-dasharray="20" stroke-dashoffset="5" />
								</svg>
							</span>
						{:else if usernameStatus === 'available'}
							<span class="input-icon ok" aria-hidden="true">✓</span>
						{:else if usernameStatus === 'taken' || usernameStatus === 'invalid'}
							<span class="input-icon err" aria-hidden="true">✕</span>
						{/if}
					{/if}
				</div>
				{#if isReaderOnly}
					{#if usernameStatus === 'taken'}
						<span class="field-err">Username is taken</span>
					{:else if usernameStatus === 'invalid' || (form as { errors?: { username?: string } } | null)?.errors?.username}
						<span class="field-err"
							>{(form as { errors?: { username?: string } } | null)?.errors?.username ??
								'Only lowercase letters, numbers and underscores. 3–20 characters.'}</span
						>
					{/if}
				{/if}
			</div>

			<div class="field">
				<label for="email">Email</label>
				<input id="email" type="email" value={user.email} disabled class="field-disabled" />
				<span class="field-hint">Email cannot be changed.</span>
			</div>

			<div class="form-actions">
				<button
					type="submit"
					class="btn-primary"
					disabled={loading || !isReaderOnly || usernameStatus === 'checking'}
				>
					{loading ? 'Saving…' : 'Save changes'}
				</button>
				<a href="/profile" class="btn-cancel">Cancel</a>
			</div>
		</form>
	</div>
</div>

<style>
	.edit-shell {
		width: min(480px, 100% - 40px);
		margin: 0 auto;
		padding-top: 56px;
	}

	.edit-card {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.ear {
		display: flex;
		border-bottom: 2px solid var(--ink);
	}

	.ear h1 {
		margin: 0;
		padding: 10px 16px 8px;
		background: var(--ink);
		color: var(--cream);
		border-radius: 8px 8px 0 0;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		line-height: 1;
	}

	.avatar-section {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.avatar-circle {
		width: 88px;
		height: 88px;
		border-radius: 50%;
		background: var(--paper2);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		font-family: var(--serif);
		font-style: italic;
		font-size: 32px;
		line-height: 1;
		color: var(--ink);
	}

	.change-photo-btn {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 18px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		color: var(--ink);
		border: 1px solid var(--border);
		border-radius: 10px;
		cursor: pointer;
		transition: background-color 120ms ease;
	}

	.change-photo-btn:hover {
		background: var(--ink-10);
	}

	.change-photo-btn:focus-within {
		outline: 2px solid var(--accent-ink);
		outline-offset: 2px;
	}

	.change-photo-btn.uploading {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}

	.role-notice {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		background: var(--paper2);
		border-radius: 10px;
		padding: 12px 14px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1.45;
		color: var(--ink-60);
	}

	.role-notice svg {
		color: var(--accent);
		flex-shrink: 0;
		margin-top: 3px;
	}

	.notice-link {
		font-weight: 600;
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
	}

	.notice-link:hover {
		color: var(--accent);
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-top: 8px;
	}

	.btn-cancel {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 18px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 16px;
		color: var(--ink-60);
		text-decoration: none;
		border-radius: 10px;
	}

	.btn-cancel:hover {
		color: var(--ink);
		background: var(--ink-10);
	}

	@media (max-width: 639px) {
		.edit-shell {
			padding-top: 32px;
		}
	}
</style>
