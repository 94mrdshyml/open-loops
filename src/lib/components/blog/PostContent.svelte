<script lang="ts">
	import { tiptapToHtml } from '$lib/utils/tiptap-to-html';

	interface Props {
		content: unknown;
	}

	let { content }: Props = $props();

	const html = $derived.by(() => {
		const json =
			typeof content === 'string'
				? (() => {
						try {
							return JSON.parse(content);
						} catch {
							return null;
						}
					})()
				: content;
		return tiptapToHtml(json);
	});
</script>

<!-- eslint-disable svelte/no-at-html-tags -->
<div class="prose prose-drop-cap">
	{@html html}
</div>
<!-- eslint-enable svelte/no-at-html-tags -->
