<script lang="ts">
	import { appState, getStats } from '$lib/store.svelte';
	import IconChartBar      from '@tabler/icons-svelte/icons/chart-bar';
	import IconAlertTriangle from '@tabler/icons-svelte/icons/alert-triangle';
	import IconCheck         from '@tabler/icons-svelte/icons/check';
	import IconCalendarEvent from '@tabler/icons-svelte/icons/calendar-event';
	import { daysInYear } from '$lib/utils';

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
	<div class="flex items-center gap-1.5 px-4 pt-4 pb-2">
		<IconChartBar size={13} class="text-stone-400 dark:text-zinc-600" />
		<span class="text-[10px] font-semibold tracking-widest uppercase text-stone-400 dark:text-zinc-600">Stats · {selectedYear}</span>
	</div>

	<div class="flex flex-col gap-2 px-3 pb-3">
		{#each Object.entries(appState.countries) as [code, country]}
		{@const stats   = getStats(appState, code, selectedYear)}
		{@const rule    = appState.rules[String(selectedYear)]?.[code]}
		{@const min     = rule?.min ?? 0}
		{@const max     = rule?.max}
		{@const total   = stats.past + stats.upcoming}
		<div class="rounded-xl border border-stone-200 dark:border-zinc-800 overflow-hidden">
			<!-- Header with country name and big number -->
			<div class="flex items-center gap-2.5 px-3 pt-2.5 pb-2" style="border-left: 3px solid {country.color}">
				<div class="flex-1 min-w-0">
					<div class="flex items-baseline gap-1.5">
						<span class="text-[13px] font-semibold truncate">{country.name}</span>
						<span class="font-mono text-[10px] text-stone-400 dark:text-zinc-600 shrink-0">{code}</span>
					</div>
				</div>
				<span class="font-mono text-2xl font-semibold tabular-nums leading-none shrink-0" style="color: {country.color}">{stats.past}</span>
			</div>

			<!-- Progress bar -->
			<div class="px-3 pb-2">
				<div class="relative h-1.5 mb-1.5">
					<div class="absolute inset-0 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
						<div class="absolute left-0 top-0 h-full rounded-full" style="width:{pct(stats.past)}%;background:{country.color}"></div>
						{#if stats.upcoming > 0}
						<div class="absolute top-0 h-full rounded-full opacity-20" style="left:{pct(stats.past)}%;width:{Math.min(100-pct(stats.past),pct(stats.upcoming))}%;background:{country.color}"></div>
						{/if}
					</div>
					{#if min > 0}
					<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 bg-amber-500 rounded-full" style="left:{pct(min)}%" title="Min: {min}"></div>
					{/if}
					{#if max && max < 366}
					<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 bg-red-500 rounded-full" style="left:{pct(max)}%" title="Max: {max}"></div>
					{/if}
				</div>

				<!-- Counts row -->
				<div class="flex items-center gap-3 text-[10px] font-mono tabular-nums text-stone-400 dark:text-zinc-600">
					<span>{stats.past} past</span>
					{#if stats.upcoming > 0}<span>{stats.upcoming} upcoming</span>{/if}
					<span class="ml-auto font-semibold text-stone-500 dark:text-zinc-500">{total}</span>
				</div>
			</div>

			<!-- Status alerts -->
			{#if stats.overMax || stats.toMin > 0 || (min > 0 && stats.toMin === 0) || (max && max < 366 && !stats.overMax && stats.toMax > 0) || (stats.upcoming > 0 && ((stats.overMaxSim && !stats.overMax) || stats.toMin > 0))}
			<div class="flex flex-col gap-1 px-3 py-2 border-t border-stone-100 dark:border-zinc-800/60 bg-stone-50/50 dark:bg-zinc-800/20">
				{#if stats.overMax}
				<div class="flex items-center gap-1.5 text-[11px] font-medium text-red-500"><span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>Over maximum</div>
				{:else if stats.toMin > 0}
				<div class="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"><IconAlertTriangle size={11} class="shrink-0" />{stats.toMin}d to minimum</div>
				{:else if min > 0}
				<div class="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"><IconCheck size={11} class="shrink-0" />Min reached</div>
				{/if}
				{#if max && max < 366 && !stats.overMax && stats.toMax > 0}
				<div class="text-[11px] text-stone-400 dark:text-zinc-600 font-mono tabular-nums">{stats.toMax}d until max</div>
				{/if}
				{#if stats.upcoming > 0}
					{#if stats.overMaxSim && !stats.overMax}
					<div class="flex items-center gap-1.5 text-[10px] text-red-400/80 dark:text-red-500/70"><IconCalendarEvent size={10} class="shrink-0" />+upcoming exceeds max</div>
					{/if}
					{#if stats.toMin > 0}
						{#if stats.toMinSim === 0}
						<div class="flex items-center gap-1.5 text-[10px] text-emerald-600/80 dark:text-emerald-400/70"><IconCalendarEvent size={10} class="shrink-0" />+upcoming reaches min</div>
						{:else}
						<div class="flex items-center gap-1.5 text-[10px] text-amber-500/80 dark:text-amber-400/70"><IconCalendarEvent size={10} class="shrink-0" />+upcoming: {stats.toMinSim} short</div>
						{/if}
					{/if}
				{/if}
			</div>
			{/if}
		</div>
		{/each}

		{#if Object.keys(appState.countries).length === 0}
		<div class="text-center text-[13px] text-stone-300 dark:text-zinc-700 py-8">
			Add countries<br/>to see stats
		</div>
		{/if}
	</div>

	<div class="mt-auto px-4 py-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-mono text-stone-400 dark:text-zinc-600 tabular-nums">
		{totalTracked()} / {daysInYear(selectedYear)} days tracked
	</div>
</aside>
