<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import ReadingProgressBar from '$lib/components/blog/ReadingProgressBar.svelte';
	import AuthorCard from '$lib/components/blog/AuthorCard.svelte';
	import PostContent from '$lib/components/blog/PostContent.svelte';
	import SocialShare from '$lib/components/blog/SocialShare.svelte';
	import BookmarkButton from '$lib/components/blog/BookmarkButton.svelte';
	import TldrBox from '$lib/components/blog/TldrBox.svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';
	import StoryRow from '$lib/components/blog/StoryRow.svelte';
	import NewsletterForm from '$lib/components/blog/NewsletterForm.svelte';
	import { heroImage } from '$lib/utils/image-url';
	import { formatDate, formatDateCompact } from '$lib/utils/format-date';
	import { clipText, jsonLdScript } from '$lib/utils/seo';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const { post, relatedPosts, seo, siteUrl, approvedComments, user } = $derived(data);

	let isSaved = $state(data.isSaved);

	let articleEl = $state<HTMLElement | null>(null);
	let commentBody = $state('');
	let submitting = $state(false);
	let posted = $state(false);

	$effect(() => {
		if (form?.commentSuccess) {
			commentBody = '';
			posted = true;
		}
	});

	$effect(() => {
		if (posted) {
			const t = setTimeout(() => {
				posted = false;
			}, 3200);
			return () => clearTimeout(t);
		}
	});

	// The "In brief" points as one passage, for the Article's `abstract`.
	const abstract = $derived(
		post.tldr?.length ? post.tldr.map((p) => (/[.!?]$/.test(p) ? p : `${p}.`)).join(' ') : ''
	);

	const jsonLdTag = $derived(
		jsonLdScript({
			'@context': 'https://schema.org',
			'@type': 'NewsArticle',
			headline: clipText(post.title, 110),
			...(seo.description ? { description: seo.description } : {}),
			...(abstract ? { abstract } : {}),
			...(seo.ogImageUrl ? { image: [seo.ogImageUrl] } : {}),
			...(seo.publishedTime ? { datePublished: seo.publishedTime } : {}),
			...(seo.modifiedTime ? { dateModified: seo.modifiedTime } : {}),
			author: {
				'@type': 'Person',
				name: post.author?.name ?? 'Open Tabs',
				...(post.author?.slug ? { url: `${siteUrl}/authors/${post.author.slug}` } : {})
			},
			publisher: {
				'@type': 'Organization',
				name: 'Open Tabs',
				url: siteUrl
			},
			mainEntityOfPage: {
				'@type': 'WebPage',
				'@id': seo.canonicalUrl
			}
		})
	);

	const breadcrumbJsonLd = $derived.by((): string => {
		const items: object[] = [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl }];
		if (post.category) {
			items.push({
				'@type': 'ListItem',
				position: 2,
				name: post.category.name,
				item: `${siteUrl}/categories/${post.category.slug}`
			});
			items.push({ '@type': 'ListItem', position: 3, name: post.title, item: seo.canonicalUrl });
		} else {
			items.push({ '@type': 'ListItem', position: 2, name: post.title, item: seo.canonicalUrl });
		}
		return jsonLdScript({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: items
		});
	});

	function commentInitials(name: string): string {
		return name
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase();
	}
</script>

<svelte:head>
	{#if seo.publishedTime}
		<meta property="article:published_time" content={seo.publishedTime} />
	{/if}
	{#if seo.modifiedTime}
		<meta property="article:modified_time" content={seo.modifiedTime} />
	{/if}
	<meta property="article:author" content={seo.authorName} />
	{#if post.category}
		<meta property="article:section" content={post.category.name} />
	{/if}
	{#each post.tags as tag (tag.slug)}
		<meta property="article:tag" content={tag.name} />
	{/each}

	<!-- JSON-LD -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdTag}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html breadcrumbJsonLd}
</svelte:head>

<ReadingProgressBar {articleEl} />

<!-- Article header: 896px column -->
<header class="post-header">
	<div class="meta">
		{#if post.category}
			<a class="kicker" href="/categories/{encodeURIComponent(post.category.slug)}"
				>{post.category.name}</a
			>
		{/if}
		{#if post.category && post.readingTimeMinutes}<span aria-hidden="true">·</span>{/if}
		{#if post.readingTimeMinutes}<span>{post.readingTimeMinutes} min read</span>{/if}
	</div>

	<h1 class="post-title">{post.title}</h1>

	{#if post.subtitle}
		<p class="post-subtitle">{post.subtitle}</p>
	{/if}

	<div class="post-byline">
		{#if post.author}
			<span
				>By {#if post.author.slug}<a class="byline-author" href="/authors/{post.author.slug}"
						>{post.author.name}</a
					>{:else}<strong class="byline-author">{post.author.name}</strong>{/if}</span
			>
		{/if}
		<span class="byline-end">
			{#if post.publishedAt}
				<time datetime={post.publishedAt.toISOString()}>
					<span class="date-long">{formatDate(post.publishedAt)}</span>
					<span class="date-short">{formatDateCompact(post.publishedAt, true)}</span>
				</time>
			{/if}
			<BookmarkButton postSlug={post.slug} bind:isSaved {user} />
		</span>
	</div>
</header>

<!-- Cover image breaks out to 1100px -->
{#if post.coverImageUrl}
	<figure class="cover-wrap">
		<img
			src={heroImage(post.coverImageUrl) ?? post.coverImageUrl}
			alt={post.title}
			class="cover-image"
			loading="eager"
			fetchpriority="high"
			width="1200"
			height="630"
		/>
	</figure>
{/if}

<!-- Article body: 680px column -->
<div class="post-body-wrap">
	{#if post.tldr?.length}
		<TldrBox points={post.tldr} />
	{/if}

	<article class="post-body" bind:this={articleEl}>
		<PostContent content={post.content} />
		<span class="end-mark" aria-hidden="true"></span>
	</article>

	<footer class="post-footer">
		{#if post.tags.length > 0}
			<div class="filed">
				<span>Filed under</span>
				{#each post.tags as tag (tag.slug)}
					<a href="/tags/{tag.slug}">{tag.name}</a>
				{/each}
			</div>
		{/if}

		<div class="share-section">
			<span class="share-label">Share this story</span>
			<SocialShare title={post.title} url={seo.canonicalUrl} />
			<div class="bookmark-divider" aria-hidden="true"></div>
			<BookmarkButton postSlug={post.slug} bind:isSaved {user} />
		</div>

		{#if post.author}
			<div class="author-section">
				<AuthorCard
					author={{
						name: post.author.name,
						avatarUrl: post.author.avatarUrl,
						bio: post.author.bio ?? null,
						role: post.author.role ?? null,
						slug: post.author.slug ?? null
					}}
					variant="full"
				/>
			</div>
		{/if}
	</footer>
</div>

<NewsletterForm
	isSubscribed={page.data.isNewsletterSubscriber ?? false}
	user={page.data.user ?? null}
/>

<!-- Discussion section -->
<section class="discussion-section">
	<div class="discussion-inner">
		<SectionHead label="Discussion · {approvedComments.length}" />

		<!-- Comment form / CTA -->
		<div class="comment-form-wrap">
			{#if user}
				{#if posted}
					<p class="post-flash" role="status">Comment posted ✓</p>
				{/if}

				<form
					method="POST"
					action="?/addComment"
					class="comment-form"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					{#if form?.commentError}
						<p class="form-error" role="alert">{form.commentError}</p>
					{/if}

					<textarea
						name="body"
						bind:value={commentBody}
						class="comment-textarea"
						placeholder="Share your thoughts…"
						rows={4}
						maxlength={1000}
						disabled={submitting}
						required
					></textarea>

					<div class="form-actions">
						<button type="submit" class="post-btn" disabled={submitting || commentBody.length < 10}>
							{submitting ? 'Posting…' : 'Post comment'}
						</button>
					</div>
				</form>
			{:else}
				<p class="signin-cta">
					<a href="/login?redirect=/posts/{post.slug}" class="signin-link">Sign in</a> to join the discussion.
				</p>
			{/if}
		</div>

		<!-- Approved comments list -->
		{#if approvedComments.length > 0}
			<div class="comments-list">
				{#each approvedComments as comment (comment.id)}
					<div class="comment-item">
						<div class="comment-monogram" aria-hidden="true">
							{commentInitials(comment.userName)}
						</div>
						<div class="comment-content">
							<div class="comment-meta">
								<span class="comment-author"
									>{comment.userUsername ? `@${comment.userUsername}` : comment.userName}</span
								>
								<span class="comment-date">{formatDate(comment.createdAt)}</span>
							</div>
							<p class="comment-body">{comment.body}</p>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="no-comments">No comments yet. Be the first.</p>
		{/if}
	</div>
</section>

<!-- Related posts -->
{#if relatedPosts.length > 0}
	<section class="related-section" aria-label="Keep reading">
		<SectionHead label="Keep reading" flush />
		{#each relatedPosts as related (related.slug)}
			<StoryRow post={related} />
		{/each}
	</section>
{/if}

<style>
	/* ── Header ─────────────────────────────────────────────────── */
	.post-header {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
		padding: 64px 0 40px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1;
		color: var(--ink-60);
	}

	.kicker {
		color: var(--accent);
		font-weight: 600;
		text-decoration: none;
	}

	.kicker:hover {
		color: var(--ink);
	}

	.post-title {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 58px;
		line-height: 1.03;
		letter-spacing: -0.025em;
		max-width: 860px;
		text-wrap: balance;
		color: var(--ink);
		margin: 0;
	}

	.post-subtitle {
		font-family: var(--serif);
		font-style: italic;
		font-size: 23px;
		line-height: 1.45;
		color: var(--ink-60);
		max-width: var(--article-w);
		text-wrap: pretty;
		margin: 0;
	}

	.post-byline {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		border-top: 1px solid var(--border);
		padding-top: 12px;
		margin-top: 8px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1.3;
		color: var(--ink-60);
	}

	.byline-author {
		color: var(--ink);
		font-weight: 600;
		text-decoration: none;
	}

	a.byline-author:hover {
		color: var(--accent);
	}

	.byline-end {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.date-short {
		display: none;
	}

	/* ── Cover image ────────────────────────────────────────────── */
	.cover-wrap {
		width: min(1100px, 100% - 48px);
		margin: 0 auto;
	}

	.cover-image {
		width: 100%;
		aspect-ratio: 1200 / 630;
		object-fit: cover;
		display: block;
	}

	/* ── Body ───────────────────────────────────────────────────── */
	.post-body-wrap {
		width: min(var(--article-w), 100% - 80px);
		margin: 0 auto;
		padding-top: 56px;
	}

	/* A small accent square closes the story */
	.end-mark {
		display: block;
		width: 10px;
		height: 10px;
		background: var(--accent);
		margin-top: 8px;
	}

	/* ── Footer ─────────────────────────────────────────────────── */
	.post-footer {
		margin-top: 40px;
	}

	.filed {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 12px;
		padding-top: 4px;
		border-top: 1px solid var(--border);
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1.3;
		color: var(--ink-60);
	}

	.filed a {
		display: flex;
		align-items: center;
		min-height: 44px;
		font-weight: 600;
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
	}

	.filed a:hover {
		color: var(--accent);
	}

	.share-section {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		padding: 16px 0;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		margin-top: 16px;
	}

	.bookmark-divider {
		width: 1px;
		height: 16px;
		background: var(--border);
		margin: 0 -4px;
		flex-shrink: 0;
	}

	.share-label {
		font-family: var(--ui);
		font-weight: 600;
		font-size: 14px;
		color: var(--ink-60);
		white-space: nowrap;
	}

	.author-section {
		margin-top: 32px;
	}

	/* ── Discussion section ─────────────────────────────────────── */
	.discussion-section {
		width: min(var(--article-w), 100% - 80px);
		margin: 80px auto 0;
	}

	.comment-form-wrap {
		margin-bottom: 48px;
	}

	.post-flash {
		font-family: var(--ui);
		font-weight: 600;
		font-size: 14px;
		color: var(--accent-ink);
		margin: 0 0 18px;
	}

	.comment-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.form-error {
		font-family: var(--ui);
		font-weight: 600;
		font-size: 14px;
		color: var(--accent-ink);
		margin: 0;
	}

	.comment-textarea {
		width: 100%;
		font-family: var(--ui);
		font-size: 16px;
		color: var(--ink);
		background: var(--cream);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 12px 14px;
		line-height: 1.6;
		min-height: 96px;
		resize: vertical;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}

	.comment-textarea:focus {
		border-color: var(--ink);
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.comment-textarea:disabled {
		opacity: 0.6;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
	}

	.post-btn {
		background: var(--ink);
		color: var(--cream);
		border: 1px solid var(--ink);
		border-radius: 10px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		min-height: 44px;
		padding: 0 22px;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.post-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.post-btn:active:not(:disabled) {
		opacity: 0.7;
	}

	.post-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.signin-cta {
		font-family: var(--ui);
		font-size: 0.9375rem;
		color: var(--ink-60);
		margin: 0;
	}

	.signin-link {
		font-weight: 600;
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
	}

	.signin-link:hover {
		color: var(--accent);
	}

	/* ── Comments list ──────────────────────────────────────────── */
	.comments-list {
		border-top: 1px solid var(--border);
	}

	.comment-item {
		display: grid;
		grid-template-columns: 36px 1fr;
		gap: 0 16px;
		align-items: start;
		border-bottom: 1px solid var(--border);
		padding: 24px 0;
	}

	.comment-monogram {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--ink-10);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 12px;
		color: var(--ink-60);
		line-height: 1;
		user-select: none;
	}

	.comment-content {
		min-width: 0;
	}

	.comment-meta {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}

	.comment-author {
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		color: var(--ink);
	}

	.comment-date {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 14px;
		color: var(--ink-60);
	}

	.comment-body {
		font-family: var(--serif);
		font-size: 17px;
		line-height: 1.72;
		color: var(--ink);
		margin: 0;
	}

	.no-comments {
		font-family: var(--serif);
		font-style: italic;
		font-size: 17px;
		color: var(--ink-60);
		margin: 0;
	}

	/* ── Related ────────────────────────────────────────────────── */
	.related-section {
		width: min(var(--max-w), 100% - 80px);
		margin: 80px auto 0;
	}

	@media (max-width: 1023px) {
		.post-header {
			padding: 48px 0 32px;
			gap: 18px;
		}

		.post-title {
			font-size: 46px;
			line-height: 1.04;
			letter-spacing: -0.022em;
		}

		.post-subtitle {
			font-size: 21px;
		}
	}

	@media (max-width: 639px) {
		.post-header {
			width: calc(100% - 40px);
			padding: 32px 0 24px;
			gap: 16px;
		}

		.meta {
			font-size: 14px;
			gap: 8px;
		}

		.post-title {
			font-size: 36px;
			line-height: 1.06;
			letter-spacing: -0.02em;
			text-wrap: pretty;
		}

		.post-subtitle {
			font-size: 19px;
		}

		.post-byline {
			margin-top: 4px;
			font-size: 13px;
		}

		.date-long {
			display: none;
		}

		.date-short {
			display: inline;
		}

		.cover-wrap {
			width: 100%;
		}

		.post-body-wrap {
			width: calc(100% - 40px);
			padding-top: 32px;
		}

		.end-mark {
			width: 9px;
			height: 9px;
		}

		.post-footer {
			margin-top: 32px;
		}

		.filed {
			font-size: 14px;
		}

		.discussion-section,
		.related-section {
			width: calc(100% - 40px);
			margin-top: 48px;
		}
	}
</style>
