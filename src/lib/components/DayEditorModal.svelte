<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { appState, setEntryRange, removeEntryRange } from '$lib/store.svelte';
	import IconCalendar from '@tabler/icons-svelte/icons/calendar';
	import IconX        from '@tabler/icons-svelte/icons/x';
	import { inp } from '$lib/styles';

	let {
		open = $bindable(),
		from = $bindable(),
		to = $bindable(),
	}: {
		open: boolean;
		from: string;
		to: string;
	} = $props();

	let popoverCountry = $state('');

	$effect(() => {
		if (open) {
			const ex = appState.entries[from];
			popoverCountry = ex?.country ?? Object.keys(appState.countries)[0] ?? '';
		}
	});

	function apply() {
		if (popoverCountry === '__none__') removeEntryRange(from, to);
		else setEntryRange(from, to, popoverCountry);
		open = false;
	}
</script>

{#if open}
<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center">
	<div
		transition:fade={{ duration: 150 }}
		class="absolute inset-0 bg-black/40 backdrop-blur-sm"
		role="button" tabindex="-1" onclick={() => open = false}
	></div>
	<div
		transition:fly={{ y: 24, duration: 220, opacity: 0 }}
		class="relative bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:w-[340px] p-5 z-10"
	>
		<div class="flex items-center gap-2 mb-4">
			<IconCalendar size={15} class="text-stone-400 dark:text-zinc-600" />
			<span class="font-mono text-sm font-medium">
				{from === to ? from : `${from} → ${to}`}
			</span>
			<button onclick={() => open = false} class="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>

		<div class="grid grid-cols-2 gap-2 mb-4">
			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">From</span>
				<input type="date" bind:value={from} class="{inp} font-mono text-xs" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">To</span>
				<input type="date" bind:value={to} class="{inp} font-mono text-xs" />
			</label>
		</div>

		<div class="flex flex-wrap gap-1.5 mb-4">
			<button
				onclick={() => popoverCountry = '__none__'}
				class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors
					{popoverCountry === '__none__'
						? 'border-stone-800 bg-stone-800 dark:border-zinc-200 dark:bg-zinc-200 text-white dark:text-zinc-900'
						: 'border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-500 hover:border-stone-400 dark:hover:border-zinc-500'}"
			><IconX size={11} /> None</button>
			{#each Object.entries(appState.countries) as [code, country]}
			<button
				onclick={() => popoverCountry = code}
				class="px-3 py-1.5 rounded-full text-xs font-semibold font-mono border-2 transition-all"
				style="border-color: {country.color}; background: {popoverCountry === code ? country.color : 'transparent'}; color: {popoverCountry === code ? 'white' : country.color}"
			>{code}</button>
			{/each}
		</div>

		<div class="flex gap-2">
			<button onclick={apply} class="flex-1 rounded-xl py-2.5 text-sm font-bold transition-opacity hover:opacity-90 {popoverCountry === '__none__' ? 'bg-red-500 text-white' : 'bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900'}">{popoverCountry === '__none__' ? 'Clear entries' : 'Apply'}</button>
			<button onclick={() => open = false} class="px-5 py-2.5 text-sm font-medium rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
		</div>
	</div>
</div>
{/if}
