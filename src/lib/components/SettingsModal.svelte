<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { appState } from '$lib/store.svelte';
	import { getStoredRelayUrl, setRelayUrl } from '$lib/sync';
	import IconSettings from '@tabler/icons-svelte/icons/settings';
	import IconTrash    from '@tabler/icons-svelte/icons/trash';
	import IconX        from '@tabler/icons-svelte/icons/x';

	let { open = $bindable() }: { open: boolean } = $props();

	let relayUrl = $state('');

	$effect(() => {
		if (open) relayUrl = getStoredRelayUrl();
	});

	function clearAll() {
		if (confirm('Clear ALL data? This cannot be undone.')) {
			appState.countries = {}; appState.rules = {};
			appState.entries = {}; appState.settings = { weekStartsMonday: true };
		}
	}
</script>

{#if open}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
	<div
		transition:fade={{ duration: 150 }}
		class="absolute inset-0 bg-black/40 backdrop-blur-sm"
		role="button" tabindex="-1" onclick={() => open = false}
	></div>
	<div
		transition:fly={{ y: 24, duration: 220, opacity: 0 }}
		class="relative bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 z-10"
	>
		<div class="flex items-center gap-2 mb-5">
			<IconSettings size={16} class="text-stone-500 dark:text-zinc-500" />
			<span class="font-semibold text-base">Settings</span>
			<button onclick={() => open = false} class="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>

		<label class="flex items-center gap-3 mb-5 cursor-pointer group">
			<div class="relative w-10 h-5 rounded-full transition-colors {appState.settings.weekStartsMonday ? 'bg-amber-500' : 'bg-stone-200 dark:bg-zinc-700'}">
				<input type="checkbox" bind:checked={appState.settings.weekStartsMonday} class="sr-only" />
				<div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform {appState.settings.weekStartsMonday ? 'translate-x-5' : ''}"></div>
			</div>
			<span class="text-sm font-medium">Week starts on Monday</span>
		</label>

		<label class="flex flex-col gap-1.5 mb-5">
			<span class="text-sm font-medium">Sync relay URL</span>
			<input
				type="text"
				bind:value={relayUrl}
				oninput={() => setRelayUrl(relayUrl)}
				placeholder="Default relay"
				class="w-full bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-stone-700 dark:text-zinc-300 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
			/>
			<span class="text-[10px] text-stone-400 dark:text-zinc-600">Leave empty for default. Used for device sync.</span>
		</label>

		<div class="border-t border-stone-100 dark:border-zinc-800 pt-4">
			<button onclick={clearAll} class="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
				<IconTrash size={15} /> Clear all data
			</button>
		</div>
	</div>
</div>
{/if}
