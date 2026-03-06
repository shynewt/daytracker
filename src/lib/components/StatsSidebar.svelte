<script lang="ts">
	import { appState, getStats } from '$lib/store.svelte';
	import IconChartBar      from '@tabler/icons-svelte/icons/chart-bar';
	import { daysInYear, getCountryFlag } from '$lib/utils';

	let {
		selectedYear,
		activeMobileTab,
	}: {
		selectedYear: number;
		activeMobileTab: 'countries' | 'calendar' | 'stats';
	} = $props();

	function pct(n: number): number {
		return Math.min(100, n / daysInYear(selectedYear) * 100);
	}

	function totalTracked(): number {
		const y = String(selectedYear);
		return Object.keys(appState.entries).filter(d => d.startsWith(y + '-')).length;
	}
</script>

<aside class="flex flex-col overflow-y-auto w-full md:w-56 md:shrink-0 bg-white dark:bg-zinc-900 border-l border-stone-200 dark:border-zinc-800 {activeMobileTab !== 'stats' ? 'max-md:hidden' : ''}">
	<div class="flex items-center gap-2 px-4 pt-5 pb-3">
		<IconChartBar size={12} class="text-stone-300 dark:text-zinc-700" />
		<span class="font-brand text-[11px] font-bold tracking-widest uppercase text-stone-400 dark:text-zinc-500">Stats · {selectedYear}</span>
	</div>

	<div class="flex flex-col gap-2 px-3 pb-3">
		{#each Object.entries(appState.countries) as [code, country]}
		{@const stats   = getStats(appState, code, selectedYear)}
		{@const rule    = appState.rules[String(selectedYear)]?.[code]}
		{@const min     = rule?.min ?? 0}
		{@const max     = rule?.max}
		{@const total   = stats.past + stats.upcoming}
		{@const flag    = getCountryFlag(code)}
		<div class="rounded-2xl border border-stone-200 dark:border-zinc-800 overflow-hidden">
			<div class="flex items-center gap-2.5 px-3 pt-3 pb-2.5" style="border-left: 3px solid {country.color}">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-1.5">
						{#if flag}<span class="text-base leading-none shrink-0">{flag}</span>{/if}
						<span class="font-brand text-[13px] font-bold truncate text-stone-800 dark:text-zinc-100">{country.name}</span>
					</div>
				</div>
				<span class="font-mono text-2xl font-semibold tabular-nums leading-none shrink-0" style="color: {country.color}">{stats.past}</span>
			</div>

			<div class="px-3 pb-2.5">
				<div class="relative h-1 mb-2">
					<div class="absolute inset-0 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
						<div class="absolute left-0 top-0 h-full rounded-full transition-all" style="width:{pct(stats.past)}%;background:{country.color}"></div>
						{#if stats.upcoming > 0}
						<div class="absolute top-0 h-full rounded-full opacity-20 transition-all" style="left:{pct(stats.past)}%;width:{Math.min(100-pct(stats.past),pct(stats.upcoming))}%;background:{country.color}"></div>
						{/if}
					</div>
					{#if min > 0}
					<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 bg-amber-400 rounded-full" style="left:{pct(min)}%" title="Min: {min}"></div>
					{/if}
					{#if max && max < 366}
					<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 bg-red-400 rounded-full" style="left:{pct(max)}%" title="Max: {max}"></div>
					{/if}
				</div>

				<div class="flex items-center gap-3 font-mono tabular-nums">
					<span class="text-[13px] font-semibold text-stone-700 dark:text-zinc-200">{stats.past}<span class="text-[10px] font-normal text-stone-400 dark:text-zinc-500 ml-1">past</span></span>
					{#if stats.upcoming > 0}<span class="text-[13px] font-semibold text-stone-700 dark:text-zinc-200">{stats.upcoming}<span class="text-[10px] font-normal text-stone-400 dark:text-zinc-500 ml-1">upcoming</span></span>{/if}
					<span class="ml-auto text-[13px] font-semibold text-stone-500 dark:text-zinc-400">{total}</span>
				</div>
			</div>

			{#if min > 0 || (max && max < 366)}
			{@const hasUpcoming = stats.upcoming > 0}
			{@const cols = hasUpcoming ? 'grid-cols-[2rem_1fr_1fr]' : 'grid-cols-[2rem_1fr]'}
			<div class="border-t border-stone-100 dark:border-zinc-800/60 bg-stone-50/50 dark:bg-zinc-800/20 overflow-hidden">
				<div class="grid {cols} divide-x divide-stone-100 dark:divide-zinc-800/60">
					<!-- Header -->
					{#if hasUpcoming}
					<div class="border-b border-stone-100 dark:border-zinc-800/60"></div>
					<div class="border-b border-stone-100 dark:border-zinc-800/60 px-3 py-1 text-[8px] font-semibold uppercase tracking-widest text-stone-300 dark:text-zinc-700">now</div>
					<div class="border-b border-stone-100 dark:border-zinc-800/60 px-3 py-1 text-[8px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-600">total</div>
					{/if}
					<!-- Min row -->
					{#if min > 0}
					{@const minOk = stats.past >= min}
					{@const minOkSim = total >= min}
					{@const hasBorder = max && max < 366}
					<div class="px-2 py-2 font-mono text-[9px] uppercase tracking-wider text-stone-400 dark:text-zinc-600 flex items-center {hasBorder ? 'border-b border-stone-100 dark:border-zinc-800/60' : ''}">Min</div>
					<div class="px-3 py-2 text-[12px] font-semibold {minOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} {hasBorder ? 'border-b border-stone-100 dark:border-zinc-800/60' : ''}">
						{minOk ? 'reached' : `${stats.toMin}d to go`}
					</div>
					{#if hasUpcoming}
					<div class="px-3 py-2 text-[12px] font-semibold {minOkSim ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} {hasBorder ? 'border-b border-stone-100 dark:border-zinc-800/60' : ''}">
						{minOkSim ? 'reached' : `${stats.toMinSim}d to go`}
					</div>
					{/if}
					{/if}
					<!-- Max row -->
					{#if max && max < 366}
					{@const maxOver = stats.past > max}
					{@const maxOverSim = total > max}
					<div class="px-2 py-2 font-mono text-[9px] uppercase tracking-wider text-stone-400 dark:text-zinc-600 flex items-center">Max</div>
					<div class="px-3 py-2 text-[12px] font-semibold {maxOver ? 'text-red-500' : stats.toMax === 0 ? 'text-red-400 dark:text-red-500' : 'text-stone-600 dark:text-zinc-300'}">
						{maxOver ? `${stats.past - max}d over` : stats.toMax === 0 ? 'at limit' : `${stats.toMax}d left`}
					</div>
					{#if hasUpcoming}
					{@const totalOverBy = total - max}
					<div class="px-3 py-2 text-[12px] font-semibold {maxOverSim ? 'text-red-500' : max - total === 0 ? 'text-red-400 dark:text-red-500' : 'text-stone-600 dark:text-zinc-300'}">
						{maxOverSim ? `${totalOverBy}d over` : max - total === 0 ? 'at limit' : `${max - total}d left`}
					</div>
					{/if}
					{/if}
				</div>
			</div>
			{/if}
		</div>
		{/each}

		{#if Object.keys(appState.countries).length === 0}
		<div class="text-center text-[13px] text-stone-300 dark:text-zinc-700 py-10">
			Add countries<br/>to see stats
		</div>
		{/if}
	</div>

	<div class="mt-auto px-4 py-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-mono text-stone-400 dark:text-zinc-600 tabular-nums">
		{totalTracked()} / {daysInYear(selectedYear)} days tracked
	</div>
</aside>
