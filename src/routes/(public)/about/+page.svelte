<script lang="ts">
	import { page } from '$app/state';
	import NewsletterForm from '$lib/components/blog/NewsletterForm.svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';

	/** The 37 tabs in the picture: the same number as the line under the title. */
	const closedTabs = Array.from({ length: 37 }, (_, i) => i);

	const expect = [
		{
			title: 'Plain words, full picture',
			text: 'Each story takes one big, tangled subject and lays it out in order: what happened, how we got here, and who gains or loses. No jargon, and no need to open ten more tabs to follow it.'
		},
		{
			title: 'Stories you can finish',
			text: 'Most stories take between 4 and 10 minutes to read. Many open with an “In brief” box, a few lines that give you the main points before you decide to read on.'
		},
		{
			title: 'Keep these tabs open',
			text: 'At the end of each story you will find a few related ones, so you can carry on with the same subject instead of starting again from a search box.'
		},
		{
			title: 'A newsletter, if you want one',
			text: 'Put your email in the box at the bottom of this page and new stories come to you. You can leave at any time.'
		}
	];
</script>

<div class="page">
	<!-- Hero: the title and the idea, with a picture of the idea -->
	<header class="hero">
		<div class="hero-text">
			<p class="kicker">About</p>
			<h1>Welcome to Open Tabs</h1>
			<p class="dek">The place where your 37 open browser tabs finally get some peace.</p>
			<p class="intro">
				You know that feeling: you start researching one thing, open a few tabs, fall into three
				unrelated rabbit holes, and suddenly it’s 2 AM.
			</p>
		</div>

		<!-- Decorative: thirty-seven cramped tabs, and the one that is open -->
		<div class="win" aria-hidden="true">
			<div class="strip">
				{#each closedTabs as i (i)}
					<span class="t" style="--i: {i}; --h: {22 + ((i * 7) % 13)}px"></span>
				{/each}
				<span class="t open"><i></i>Open Tabs</span>
			</div>
			<div class="view">
				<p class="v-kicker">37 tabs in, one story out</p>
				<ul class="v-list">
					<li>Reports</li>
					<li>Filings</li>
					<li>Numbers</li>
					<li>Backstories</li>
				</ul>
				<span class="v-line"></span>
				<p class="v-story">One story that makes sense.</p>
			</div>
		</div>
	</header>

	<!-- The promise -->
	<section class="promise" aria-label="What we do">
		<p class="statement">We do the digging for you.</p>
		<p class="promise-text">
			We read the reports, filings, numbers, backstories, and all the stuff you probably wouldn’t
			have time to read. Then we turn it into one story that actually makes sense.
		</p>
	</section>

	<!-- Who -->
	<section class="block" aria-label="Who is behind Open Tabs">
		<SectionHead label="Who is behind it" />
		<div class="who">
			<div class="who-text">
				<p class="lead">
					I am Anurag Singh Jakhar, a storyteller from India and the founder of IndexDaily Media.
				</p>
				<p class="text">
					I like to talk about the place where business, tech and geopolitics meet, which is money.
					I make both short and long form content.
				</p>
			</div>
			<ul class="facts">
				<li>
					<span class="fact-num">5 lakh</span>
					<span class="fact-label"
						>Close to 5 lakh (500K) people in my community, across social media.</span
					>
				</li>
				<li>
					<span class="fact-num">Millions</span>
					<span class="fact-label">Reached every month across these channels.</span>
				</li>
			</ul>
		</div>
	</section>

	<!-- What and why, side by side -->
	<div class="pair">
		<section aria-label="What Open Tabs is">
			<SectionHead label="What Open Tabs is" />
			<div class="text">
				<p>
					Open Tabs is an explainer blog on business, politics and geopolitics, written through a
					money lens. It has an Indian focus and a global scope, so a story about a border, a budget
					or a battle always comes back to one question: where does the money go?
				</p>
				<p>
					The name is the idea. A tab you leave open is something you mean to come back to, and
					never quite do. This is where we do it for you.
				</p>
			</div>
		</section>

		<section aria-label="Why I created Open Tabs">
			<SectionHead label="Why I created it" />
			<div class="text">
				<p>
					Short videos and posts travel far, but they leave little room for the full picture. The
					full picture sits in reports, filings, numbers and backstories that most people have no
					time to read.
				</p>
				<p>
					I made Open Tabs to be the home for that longer version. The work gets done once,
					properly, and then it is shared with everyone.
				</p>
			</div>
		</section>
	</div>

	<!-- What to expect: four folder tabs -->
	<section class="block" aria-label="What to expect">
		<SectionHead label="What to expect" />
		<ol class="expect">
			{#each expect as item, i (item.title)}
				<li style="--i: {i}">
					<span class="ear" aria-hidden="true">Tab {String(i + 1).padStart(2, '0')}</span>
					<h3>{item.title}</h3>
					<p>{item.text}</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- Close -->
	<section class="close" aria-label="Start reading">
		<p class="close-line">Less tab chaos. <span>More context.</span></p>
		<div class="go">
			<a href="/" class="btn">Read the latest stories</a>
			<a href="/categories" class="link">Browse all topics</a>
		</div>
	</section>

	<NewsletterForm
		isSubscribed={page.data.isNewsletterSubscriber ?? false}
		user={page.data.user ?? null}
	/>
</div>

<style>
	.page {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
	}

	.block {
		margin-bottom: 72px;
	}

	/* ── Hero ───────────────────────────────────────────── */
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 56px;
		align-items: center;
		padding: 64px 0 72px;
	}

	.hero-text {
		display: flex;
		flex-direction: column;
		gap: 18px;
		min-width: 0;
	}

	.kicker {
		margin: 0;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		line-height: 1;
		color: var(--accent);
	}

	h1 {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 60px;
		line-height: 1.02;
		letter-spacing: -0.028em;
		text-wrap: balance;
		color: var(--ink);
	}

	.dek {
		margin: 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 22px;
		line-height: 1.4;
		color: var(--ink-60);
		text-wrap: pretty;
	}

	.intro {
		margin: 10px 0 0;
		padding-top: 22px;
		border-top: 1px solid var(--border);
		font-family: var(--serif);
		font-size: 19px;
		line-height: 1.65;
		color: var(--ink);
		text-wrap: pretty;
	}

	/* ── The picture: a browser window with too many tabs ── */
	.win {
		position: relative;
		width: 100%;
		max-width: 440px;
		justify-self: end;
	}

	/* A second window peeking out behind, so it reads as a stack */
	.win::before {
		content: '';
		position: absolute;
		inset: 12px -12px -12px 12px;
		border: 1px solid var(--border);
		border-radius: 14px;
		z-index: 0;
	}

	.strip,
	.view {
		position: relative;
		z-index: 1;
		border: 1px solid var(--border);
	}

	.strip {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		padding: 14px 14px 0;
		background: var(--paper2);
		border-bottom: 0;
		border-radius: 14px 14px 0 0;
	}

	.t {
		flex: 1 1 0;
		min-width: 0;
		height: var(--h);
		background: var(--ink-60);
		border-radius: 4px 4px 0 0;
		opacity: 0.32;
	}

	.t:nth-child(3n) {
		opacity: 0.2;
	}

	.t:nth-child(5n) {
		opacity: 0.45;
	}

	.t.open {
		flex: 0 0 38%;
		display: flex;
		align-items: center;
		gap: 8px;
		height: 36px;
		padding: 0 12px;
		margin-left: 6px;
		background: var(--cream);
		border: 1px solid var(--border);
		border-bottom: 0;
		border-radius: 9px 9px 0 0;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 13px;
		white-space: nowrap;
		color: var(--ink);
		opacity: 1;
		/* sits on top of the page edge so tab and page join */
		position: relative;
		margin-bottom: -1px;
		border-top: 3px solid var(--accent);
	}

	.t.open i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		flex-shrink: 0;
	}

	.view {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 28px 28px 30px;
		background: var(--cream);
		border-radius: 0 0 12px 12px;
	}

	.v-kicker {
		margin: 0;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 13px;
		letter-spacing: 0.04em;
		color: var(--ink-60);
	}

	.v-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.v-list li {
		font-family: var(--serif);
		font-style: italic;
		font-size: 22px;
		line-height: 1.2;
		color: var(--ink-60);
		text-decoration: line-through;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 2px;
	}

	.v-line {
		width: 2px;
		height: 22px;
		margin-left: 4px;
		background: var(--accent);
	}

	.v-story {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 30px;
		line-height: 1.1;
		letter-spacing: -0.02em;
		text-wrap: balance;
		color: var(--ink);
	}

	/* ── The promise ───────────────────────────────────── */
	.promise {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 56px;
		align-items: start;
		padding: 40px 0 72px;
		margin-bottom: 8px;
		border-top: 2px solid var(--ink);
	}

	.statement {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 56px;
		line-height: 1.04;
		letter-spacing: -0.028em;
		text-wrap: balance;
		color: var(--ink);
	}

	.promise-text {
		margin: 6px 0 0;
		font-family: var(--serif);
		font-size: 20px;
		line-height: 1.65;
		color: var(--ink-60);
		text-wrap: pretty;
	}

	/* ── Shared reading text ───────────────────────────── */
	.text p {
		margin: 0 0 1.1em;
		max-width: 60ch;
		font-family: var(--serif);
		font-size: 19px;
		line-height: 1.7;
		color: var(--ink);
		text-wrap: pretty;
	}

	.text p:last-child {
		margin-bottom: 0;
	}

	/* ── Who ───────────────────────────────────────────── */
	.who {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 56px;
		align-items: start;
	}

	.who-text {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.lead {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 30px;
		line-height: 1.2;
		letter-spacing: -0.018em;
		text-wrap: balance;
		color: var(--ink);
	}

	.who-text .text {
		margin: 0;
		font-family: var(--serif);
		font-size: 19px;
		line-height: 1.7;
		color: var(--ink-60);
		max-width: 52ch;
		text-wrap: pretty;
	}

	.facts {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.facts li {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 20px 0 22px;
		border-top: 1px solid var(--border);
	}

	.facts li:first-child {
		border-top: 2px solid var(--ink);
	}

	.fact-num {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 56px;
		line-height: 1;
		letter-spacing: -0.03em;
		color: var(--ink);
	}

	.fact-label {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1.45;
		color: var(--ink-60);
	}

	/* ── What and why ──────────────────────────────────── */
	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 56px;
		margin-bottom: 72px;
	}

	/* ── What to expect: folder tabs ───────────────────── */
	.expect {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 52px 24px;
	}

	.expect li {
		position: relative;
		padding: 30px 28px 30px;
		background: var(--paper2);
		border: 1px solid var(--border);
		border-radius: 0 14px 14px 14px;
		transition:
			transform 0.2s ease,
			background-color 0.2s ease;
	}

	.expect li:hover {
		transform: translateY(-3px);
		background: var(--accent-light);
	}

	.ear {
		position: absolute;
		left: -1px;
		bottom: 100%;
		display: flex;
		align-items: center;
		height: 30px;
		padding: 0 16px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 13px;
		letter-spacing: 0.04em;
		color: var(--ink-60);
		background: var(--paper2);
		border: 1px solid var(--border);
		border-bottom: 0;
		border-radius: 10px 10px 0 0;
		margin-bottom: -1px;
		transition: background-color 0.2s ease;
	}

	.expect li:hover .ear {
		background: var(--accent-light);
	}

	.expect h3 {
		margin: 0 0 10px;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 28px;
		line-height: 1.12;
		letter-spacing: -0.015em;
		color: var(--ink);
	}

	.expect p {
		margin: 0;
		font-family: var(--serif);
		font-size: 18px;
		line-height: 1.6;
		color: var(--ink-60);
		text-wrap: pretty;
	}

	/* ── Close ─────────────────────────────────────────── */
	.close {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 32px 48px;
		margin-top: 8px;
		padding: 56px 56px 60px;
		background: var(--paper2);
		border-radius: 16px;
	}

	.close-line {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 52px;
		line-height: 1.04;
		letter-spacing: -0.028em;
		text-wrap: balance;
		color: var(--ink);
	}

	.close-line span {
		font-style: italic;
		color: var(--accent);
	}

	.go {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		flex-shrink: 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 24px;
		background: var(--ink);
		color: var(--cream);
		border: 1px solid var(--ink);
		border-radius: 2px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 13px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
	}

	.btn:hover {
		opacity: 0.85;
	}

	.btn:active {
		transform: translateY(1px);
	}

	.link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 5px;
	}

	.link:hover {
		color: var(--accent);
	}

	/* ── Motion: the tabs arrive one by one ────────────── */
	@media (prefers-reduced-motion: no-preference) {
		.t {
			animation: tab-in 0.4s ease-out both;
			animation-delay: calc(var(--i, 37) * 22ms);
		}

		.t.open {
			animation-delay: 0.9s;
		}

		.v-list li,
		.v-story {
			animation: rise 0.5s ease-out both;
		}

		.v-list li:nth-child(1) {
			animation-delay: 0.2s;
		}
		.v-list li:nth-child(2) {
			animation-delay: 0.35s;
		}
		.v-list li:nth-child(3) {
			animation-delay: 0.5s;
		}
		.v-list li:nth-child(4) {
			animation-delay: 0.65s;
		}

		.v-story {
			animation-delay: 1s;
		}
	}

	@keyframes tab-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.expect li {
			transition: none;
		}

		.expect li:hover {
			transform: none;
		}
	}

	/* ── Tablet ────────────────────────────────────────── */
	@media (max-width: 1023px) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
			gap: 48px;
			padding: 48px 0 56px;
		}

		h1 {
			font-size: 48px;
		}

		.win {
			justify-self: start;
			max-width: 480px;
			margin-right: 12px;
		}

		.promise,
		.who {
			grid-template-columns: minmax(0, 1fr);
			gap: 24px;
		}

		.promise {
			padding-bottom: 56px;
		}

		.statement {
			font-size: 46px;
		}

		.pair {
			grid-template-columns: minmax(0, 1fr);
			gap: 56px;
		}

		.close {
			flex-direction: column;
			align-items: flex-start;
			padding: 44px 40px 48px;
		}

		.close-line {
			font-size: 44px;
		}
	}

	/* ── Phone ─────────────────────────────────────────── */
	@media (max-width: 639px) {
		.page {
			width: calc(100% - 40px);
		}

		.block,
		.pair {
			margin-bottom: 56px;
		}

		.hero {
			gap: 40px;
			padding: 32px 0 48px;
		}

		.hero-text {
			gap: 14px;
		}

		.kicker {
			font-size: 14px;
		}

		h1 {
			font-size: 38px;
			line-height: 1.05;
			letter-spacing: -0.022em;
		}

		.dek {
			font-size: 19px;
		}

		.intro {
			font-size: 18px;
		}

		.win {
			margin-right: 10px;
		}

		.win::before {
			inset: 10px -10px -10px 10px;
		}

		.strip {
			padding: 12px 12px 0;
		}

		.t.open {
			flex-basis: 44%;
		}

		.view {
			padding: 22px 20px 24px;
		}

		.v-list li {
			font-size: 20px;
		}

		.v-story {
			font-size: 26px;
		}

		.promise {
			padding: 28px 0 48px;
		}

		.statement {
			font-size: 38px;
		}

		.promise-text {
			font-size: 18px;
		}

		.text p,
		.who-text .text {
			font-size: 18px;
		}

		.lead {
			font-size: 26px;
		}

		.fact-num {
			font-size: 46px;
		}

		.expect {
			grid-template-columns: minmax(0, 1fr);
			gap: 46px;
		}

		.expect li {
			padding: 26px 22px 28px;
		}

		.expect h3 {
			font-size: 25px;
		}

		.expect p {
			font-size: 17px;
		}

		.close {
			padding: 36px 24px 40px;
			border-radius: 14px;
		}

		.close-line {
			font-size: 36px;
		}

		.go {
			width: 100%;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
