<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		const saved = localStorage.getItem('theme');
		if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
			document.documentElement.classList.add('dark');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="theme-color" content="#1c1917" />
	<title>Day Counter</title>
</svelte:head>

{@render children()}
