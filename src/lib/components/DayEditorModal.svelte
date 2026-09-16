<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { appState, setEntryRange, removeEntryRange } from '$lib/store.svelte';
	import IconCalendar from '@tabler/icons-svelte/icons/calendar';
	import IconX        from '@tabler/icons-svelte/icons/x';
	import IconAlertTriangle from '@tabler/icons-svelte/icons/alert-triangle';
	import { inp } from '$lib/styles';
	import { getCountryEmoji, getDatesInRange, getStats, getRule } from '$lib/utils';

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

	// ── Planning impact preview ───────────────────────────────────────────
	const impact = $derived.by(() => {
		// note: intentionally not gated on `open` — must stay stable during the close transition
		if (!from || !to || from > to) return null;
		const dates = getDatesInRange(from, to);

		if (popoverCountry === '__none__') {
			const removed: Record<string, number> = {};
			for (const d of dates) {
				const c = appState.entries[d]?.country;
				if (c) removed[c] = (removed[c] ?? 0) + 1;
			}
			return { clearing: true as const, removed, days: dates.length };
		}

		if (!popoverCountry) return null;

		const years = [...new Set(dates.map(d => parseInt(d.slice(0, 4))))];
		const projections = years.map(y => {
			const yd = dates.filter(d => d.startsWith(String(y)));
			const added = yd.filter(d => appState.entries[d]?.country !== popoverCountry).length;
			const before = getStats(appState, popoverCountry, y).total;
			const rule = getRule(appState, y, popoverCountry);
			const overwritten: Record<string, number> = {};
			for (const d of yd) {
				const c = appState.entries[d]?.country;
				if (c && c !== popoverCountry) overwritten[c] = (overwritten[c] ?? 0) + 1;
			}
			return { year: y, before, after: before + added, added, rule, overwritten };
		}).filter(p => p.added > 0);

		return { clearing: false as const, projections, days: dates.length };
	});

	function apply() {
		if (from > to) return;
		if (popoverCountry === '__none__') removeEntryRange(from, to);
		else if (popoverCountry) setEntryRange(from, to, popoverCountry);
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
		class="relative bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:w-[360px] p-5 z-10 max-h-[85dvh] overflow-y-auto"
	>
		<div class="flex items-center gap-2 mb-5">
			<IconCalendar size={15} class="text-stone-400 dark:text-zinc-600" />
			<span class="font-mono text-sm font-medium text-stone-700 dark:text-zinc-300">
				{from === to ? from : `${from} → ${to}`}
			</span>
			<button onclick={() => open = false} class="ml-auto w-7 h-7 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>

		<div class="grid grid-cols-2 gap-2 mb-5">
			<label class="flex flex-col gap-1.5">
				<span class="text-[10px] font-brand font-bold uppercase tracking-widest text-stone-400 dark:text-zinc-600">From</span>
				<input type="date" bind:value={from} class="{inp} font-mono text-xs" />
			</label>
			<label class="flex flex-col gap-1.5">
				<span class="text-[10px] font-brand font-bold uppercase tracking-widest text-stone-400 dark:text-zinc-600">To</span>
				<input type="date" bind:value={to} class="{inp} font-mono text-xs" />
			</label>
		</div>

		<div class="mb-4">
			<span class="text-[10px] font-brand font-bold uppercase tracking-widest text-stone-400 dark:text-zinc-600 block mb-2">Country</span>
			<div class="flex flex-wrap gap-1.5">
				<button
					onclick={() => popoverCountry = '__none__'}
					class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
						{popoverCountry === '__none__'
							? 'border-stone-800 bg-stone-800 dark:border-zinc-200 dark:bg-zinc-200 text-white dark:text-zinc-900'
							: 'border-stone-200 dark:border-zinc-700 text-stone-400 dark:text-zinc-500 hover:border-stone-300 dark:hover:border-zinc-600'}"
				><IconX size={11} /> None</button>
				{#each Object.entries(appState.countries) as [code, country]}
				{@const flag = getCountryEmoji(code, country)}
				<button
					onclick={() => popoverCountry = code}
					class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all"
					style="border-color: {country.color}; background: {popoverCountry === code ? country.color : 'transparent'}; color: {popoverCountry === code ? 'white' : country.color}"
				>
					{#if flag}<span class="text-sm leading-none">{flag}</span>{:else}<span class="font-mono">{code}</span>{/if}
				</button>
				{/each}
			</div>
		</div>

		<!-- Impact preview -->
		{#if impact}
		<div class="mb-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50/60 dark:bg-zinc-800/40 px-3 py-2.5 flex flex-col gap-1.5">
			{#if impact.clearing}
				{#if Object.keys(impact.removed).length === 0}
					<span class="text-[12px] text-stone-400 dark:text-zinc-500">Nothing to clear in this range</span>
				{:else}
					{#each Object.entries(impact.removed) as [code, n]}
					<div class="flex items-center gap-2 text-[12px]">
						<span class="w-2 h-2 rounded-full shrink-0" style="background:{appState.countries[code]?.color ?? '#999'}"></span>
						<span class="text-stone-600 dark:text-zinc-300">{appState.countries[code]?.name ?? code}</span>
						<span class="ml-auto font-mono tabular-nums text-red-500">−{n}d</span>
					</div>
					{/each}
				{/if}
			{:else}
				{#if impact.projections.length === 0}
					<span class="text-[12px] text-stone-400 dark:text-zinc-500">Already assigned. No change.</span>
				{:else}
					{#each impact.projections as p}
					<div class="flex items-center gap-2 text-[12px]">
						<span class="font-mono text-[10px] text-stone-400 dark:text-zinc-500 w-8 shrink-0">{p.year}</span>
						<span class="font-mono tabular-nums text-stone-700 dark:text-zinc-200">{p.before} → <span class="font-semibold">{p.after}</span>d</span>
						<span class="ml-auto"></span>
						{#if p.rule.max < 366 && p.after > p.rule.max}
							<span class="flex items-center gap-1 font-semibold text-red-500"><IconAlertTriangle size={11} /> {p.after - p.rule.max}d over max</span>
						{:else if p.rule.max < 366 && p.after >= p.rule.max - 7}
							<span class="font-semibold text-amber-600 dark:text-amber-400">{p.rule.max - p.after}d to max</span>
						{:else if p.rule.target > 0 && p.before < p.rule.target && p.after >= p.rule.target}
							<span class="font-semibold text-emerald-600 dark:text-emerald-400">goal reached ✓</span>
						{:else if p.rule.target > 0 && p.after < p.rule.target}
							<span class="text-stone-400 dark:text-zinc-500">{p.rule.target - p.after}d to goal</span>
						{:else if p.rule.min > 0 && p.after < p.rule.min}
							<span class="text-stone-400 dark:text-zinc-500">{p.rule.min - p.after}d to min</span>
						{/if}
					</div>
					{#each Object.entries(p.overwritten) as [code, n]}
					<div class="flex items-center gap-2 text-[11px] pl-10 text-stone-400 dark:text-zinc-500">
						<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:{appState.countries[code]?.color ?? '#999'}"></span>
						overwrites {n}d of {appState.countries[code]?.name ?? code}
					</div>
					{/each}
					{/each}
				{/if}
			{/if}
		</div>
		{/if}

		<div class="flex gap-2">
			<button onclick={apply} class="flex-1 rounded-xl py-2.5 text-sm font-bold transition-opacity hover:opacity-90
				{popoverCountry === '__none__' ? 'bg-red-500 text-white' : 'bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900'}"
			>{popoverCountry === '__none__' ? 'Clear entries' : 'Apply'}</button>
			<button onclick={() => open = false} class="px-5 py-2.5 text-sm font-medium rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
		</div>
	</div>
</div>
{/if}
