<script lang="ts">
	import { avatarImage } from '$lib/utils/image-url';

	interface AuthorLike {
		name: string;
		bio?: string | null;
		avatarUrl?: string | null;
		role?: string | null;
		slug?: string | null;
	}

	interface Props {
		author: AuthorLike | null;
		variant?: 'inline' | 'full';
	}

	let { author, variant = 'inline' }: Props = $props();

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0][0].toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
</script>

{#if author}
	{#if variant === 'inline'}
		<div class="inline-card">
			<div class="avatar avatar-sm">
				{#if author.avatarUrl}
					<img
						src={avatarImage(author.avatarUrl) ?? author.avatarUrl}
						alt={author.name}
						class="avatar-img"
						width="32"
						height="32"
						loading="lazy"
					/>
				{:else}
					<span class="avatar-initials">{initials(author.name)}</span>
				{/if}
			</div>
			<div class="inline-meta">
				{#if author.slug}
					<a href="/authors/{author.slug}" class="inline-name inline-name--link">{author.name}</a>
				{:else}
					<span class="inline-name">{author.name}</span>
				{/if}
				{#if author.role}
					<span class="inline-role">{author.role}</span>
				{/if}
			</div>
		</div>
	{:else}
		<div class="full-card">
			<div class="avatar avatar-lg">
				{#if author.avatarUrl}
					<img
						src={avatarImage(author.avatarUrl) ?? author.avatarUrl}
						alt={author.name}
						class="avatar-img"
						width="64"
						height="64"
						loading="lazy"
					/>
				{:else}
					<span class="avatar-initials">{initials(author.name)}</span>
				{/if}
			</div>
			<div class="full-meta">
				{#if author.slug}
					<a href="/authors/{author.slug}" class="full-name full-name--link">{author.name}</a>
				{:else}
					<p class="full-name">{author.name}</p>
				{/if}
				{#if author.role}
					<p class="full-role">{author.role}</p>
				{/if}
				{#if author.bio}
					<p class="full-bio">{author.bio}</p>
				{/if}
			</div>
		</div>
	{/if}
{/if}

<style>
	/* ── Shared avatar ──────────────────────────────────────────── */
	.avatar {
		border-radius: 50%;
		overflow: hidden;
		background: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.avatar-sm {
		width: 32px;
		height: 32px;
	}

	.avatar-lg {
		width: 64px;
		height: 64px;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar-initials {
		font-family: var(--ui);
		font-weight: 700;
		color: #fff;
	}

	.avatar-sm .avatar-initials {
		font-size: 12px;
	}

	.avatar-lg .avatar-initials {
		font-size: 22px;
	}

	/* ── Inline variant ─────────────────────────────────────────── */
	.inline-card {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.inline-meta {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.inline-name {
		font-family: var(--ui);
		font-size: 13px;
		font-weight: 500;
		color: var(--ink);
	}

	.inline-name--link {
		text-decoration: none;
	}

	.inline-name--link:hover {
		color: var(--accent-ink);
	}

	.inline-role {
		font-family: var(--mono);
		font-size: 10.5px;
		color: var(--ink-30);
	}

	/* ── Full variant ───────────────────────────────────────────── */
	.full-card {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.full-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.full-name {
		font-family: var(--serif);
		font-size: 1.0625rem;
		font-weight: 500;
		color: var(--ink);
		margin: 0;
	}

	.full-name--link {
		text-decoration: none;
		display: block;
		width: fit-content;
	}

	.full-name--link:hover {
		color: var(--accent-ink);
	}

	.full-role {
		font-family: var(--mono);
		font-size: 10.5px;
		color: var(--ink-30);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		margin: 0;
	}

	.full-bio {
		font-family: var(--ui);
		font-size: 0.875rem;
		color: var(--ink-60);
		line-height: 1.65;
		margin: 4px 0 0;
	}
</style>
