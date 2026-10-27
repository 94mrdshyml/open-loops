<script lang="ts">
	import { page } from '$app/state';
	import Navbar from '$lib/components/blog/Navbar.svelte';
	import Footer from '$lib/components/blog/Footer.svelte';
	import { jsonLdScript } from '$lib/utils/seo';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	// Pages describe themselves through `seo` in their load data. This layout is the only place
	// that turns it into <head> tags, so no tag is ever emitted twice.
	type PageSeo = {
		title?: string;
		description?: string;
		canonicalUrl?: string;
		ogType?: string;
		ogImageUrl?: string | null;
		robots?: string;
	};
	const seo = $derived((page.data as { seo?: PageSeo }).seo ?? {});
	const pageTitle = $derived(seo.title ?? 'Open Tabs');
	const pageDescription = $derived(
		seo.description ?? 'Clarity on business, politics, and geopolitics.'
	);
	// Tracking or filter query strings never become part of the canonical URL; only ?page=N does.
	const canonicalUrl = $derived.by(() => {
		if (seo.canonicalUrl) return seo.canonicalUrl;
		const pageNumber = Number(page.url.searchParams.get('page'));
		const suffix = Number.isInteger(pageNumber) && pageNumber > 1 ? `?page=${pageNumber}` : '';
		return page.url.origin + page.url.pathname + suffix;
	});
	const ogImage = $derived(seo.ogImageUrl ?? data.ogImageUrl);
	const robots = $derived(seo.robots ?? 'max-image-preview:large');

	const sc = '<' + '/script>';

	const orgJsonLd = $derived(
		jsonLdScript({
			'@context': 'https://schema.org',
			'@type': 'NewsMediaOrganization',
			name: data.siteName,
			url: data.siteUrl,
			...(data.ogImageUrl ? { logo: data.ogImageUrl } : {}),
			description: data.siteTagline,
			foundingLocation: { '@type': 'Place', name: 'Delhi, India' }
		})
	);

	function umamiSnippet(id: string): string {
		return (
			'<script defer src="https://cloud.umami.is/script.js" data-website-id="' + id + '">' + sc
		);
	}

	function gtmSnippet(id: string): string {
		return (
			"<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" +
			id +
			"');" +
			sc
		);
	}

	function ga4Snippet(id: string): string {
		return (
			'<script async src="https://www.googletagmanager.com/gtag/js?id=' +
			id +
			'">' +
			sc +
			"<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','" +
			id +
			"');" +
			sc
		);
	}

	function pixelSnippet(id: string): string {
		return (
			"<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','" +
			id +
			"');fbq('track','PageView');" +
			sc
		);
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:site_name" content="Open Tabs" />
	<meta property="og:locale" content="en_IN" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content={seo.ogType ?? 'website'} />
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
	{/if}
	<meta name="robots" content={robots} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@indextabsin" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	{#if ogImage}
		<meta name="twitter:image" content={ogImage} />
	{/if}

	{#if data.umamiWebsiteId}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html umamiSnippet(data.umamiWebsiteId)}
	{/if}

	{#if data.gtmId}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html gtmSnippet(data.gtmId)}
	{/if}

	{#if data.ga4Id}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html ga4Snippet(data.ga4Id)}
	{/if}

	{#if data.metaPixelId}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html pixelSnippet(data.metaPixelId)}
	{/if}

	<link rel="alternate" type="application/rss+xml" href="/feed.xml" title="Open Tabs RSS Feed" />

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html orgJsonLd}
</svelte:head>

<a class="skip-link" href="#main">Skip to content</a>

<Navbar navCategories={data.navCategories} navAuthors={data.navAuthors} user={data.user} />

<main class="public-main" id="main">
	{@render children()}
</main>

<Footer navCategories={data.navCategories} navAuthors={data.navAuthors} />

<style>
	.public-main {
		min-height: 100dvh;
	}

	/* First Tab stop on every page */
	.skip-link {
		position: absolute;
		left: 16px;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0 18px;
		background: var(--ink);
		color: var(--cream);
		border-radius: 0 0 10px 10px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		transform: translateY(-110%);
	}

	.skip-link:focus {
		transform: none;
	}
</style>
