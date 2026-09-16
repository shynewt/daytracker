<script lang="ts">
	import { appState, getStats } from '$lib/store.svelte';
	import type { CountryStats } from '$lib/types';
	import IconChartBar       from '@tabler/icons-svelte/icons/chart-bar';
	import IconChevronDown   from '@tabler/icons-svelte/icons/chevron-down';
	import IconLuggage       from '@tabler/icons-svelte/icons/luggage';
	import IconCalendarStats from '@tabler/icons-svelte/icons/calendar-stats';
	import IconAlertTriangle from '@tabler/icons-svelte/icons/alert-triangle';
	import IconCircleCheck   from '@tabler/icons-svelte/icons/circle-check';
	import IconTarget        from '@tabler/icons-svelte/icons/target';
	import IconArrowBarToDown from '@tabler/icons-svelte/icons/arrow-bar-to-down';
	import IconArrowBarToUp  from '@tabler/icons-svelte/icons/arrow-bar-to-up';
	import IconCalendarEvent from '@tabler/icons-svelte/icons/calendar-event';
	import { daysInYear, getCountryEmoji, getTrips, formatShort, todayStr, getDatesInRange } from '$lib/utils';

	let {
		selectedYear,
		activeMobileTab,
	}: {
		selectedYear: number;
		activeMobileTab: 'countries' | 'calendar' | 'stats';
	} = $props();

	let expanded = $state<Record<string, boolean>>({});

	const yearStr = $derived(String(selectedYear));
	const today = $derived(todayStr());

	const tracked = $derived(Object.keys(appState.entries).filter(d => d.startsWith(yearStr + '-')));
	const pastUntracked = $derived.by(() => {
		if (yearStr > today.slice(0, 4)) return 0;
		const end = yearStr === today.slice(0, 4) ? today : `${yearStr}-12-31`;
		const set = new Set(tracked);
		return getDatesInRange(`${yearStr}-01-01`, end).filter(d => !set.has(d)).length;
	});

	type Status = {
		tone: 'red' | 'amber' | 'emerald' | 'neutral';
		icon: 'warn' | 'max' | 'min' | 'goal' | 'check';
		count: string | null;
		label: string;
		date: string | null;
	};

	function getStatus(s: CountryStats): Status | null {
		if (s.max > 0) {
			if (s.overMax) return { tone: 'red', icon: 'warn', count: `${s.total - s.max}d`, label: 'over the limit', date: null };
			if (s.toMax === 0) return { tone: 'red', icon: 'warn', count: null, label: 'At the limit', date: null };
			const hits = s.maxHitDate && s.maxHitDate > today ? `hits ${formatShort(s.maxHitDate, selectedYear)}` : null;
			return { tone: s.toMax <= 14 ? 'amber' : 'neutral', icon: 'max', count: `${s.toMax}d`, label: 'to the limit', date: hits };
		}
		if (s.min > 0 && s.past < s.min) {
			if (s.minMetSim) return { tone: 'neutral', icon: 'min', count: `${s.toMin}d`, label: 'to minimum, covered by plans', date: null };
			return { tone: 'amber', icon: 'min', count: `${s.toMin}d`, label: 'to minimum', date: null };
		}
		if (s.target > 0) {
			// only actual past days earn the goal; plans don't make you free yet
			if (s.past >= s.target) return { tone: 'emerald', icon: 'check', count: null, label: 'Goal reached. Free to roam.', date: null };
			const toGoal = s.target - s.past;
			const free = s.targetHitDate && s.targetHitDate > today ? `free ${formatShort(s.targetHitDate, selectedYear)}` : null;
			if (s.total >= s.target) return { tone: 'neutral', icon: 'goal', count: `${toGoal}d`, label: 'to goal, covered by plans', date: free };
			return { tone: 'neutral', icon: 'goal', count: `${toGoal}d`, label: 'to goal', date: null };
		}
		if (s.min > 0) return { tone: 'emerald', icon: 'check', count: null, label: 'Minimum reached', date: null };
		return null;
	}

	// bar scale: the budget itself (max > goal > min > whole year)
	function scale(s: CountryStats): number {
		return s.max > 0 ? s.max : s.target > 0 ? s.target : s.min > 0 ? s.min : daysInYear(selectedYear);
	}
	function pctOf(n: number, sc: number): number {
		return Math.min(100, n / sc * 100);
	}

	const statusIcon = {
		warn: IconAlertTriangle,
		max: IconArrowBarToUp,
		min: IconArrowBarToDown,
		goal: IconTarget,
		check: IconCircleCheck
	};

	const toneWrap: Record<string, string> = {
		red: 'bg-red-500/10 text-red-600 dark:text-red-400',
		amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
		emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
		neutral: 'bg-stone-500/10 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300'
	};
</script>

<aside class="flex flex-col overflow-y-auto w-full md:w-72 md:shrink-0 bg-white dark:bg-zinc-900 border-l border-stone-200 dark:border-zinc-800 {activeMobileTab !== 'stats' ? 'max-md:hidden' : ''}">
	<div class="flex items-center gap-2 px-4 pt-5 pb-3">
		<IconChartBar size={12} class="text-stone-300 dark:text-zinc-700" />
		<span class="font-brand text-[11px] font-bold tracking-widest uppercase text-stone-400 dark:text-zinc-500">Budget · {selectedYear}</span>
	</div>

	<div class="flex flex-col gap-2 px-3 pb-3">
		{#each Object.entries(appState.countries) as [code, country]}
		{@const stats   = getStats(appState, code, selectedYear)}
		{@const flag    = getCountryEmoji(code, country)}
		{@const status  = getStatus(stats)}
		{@const sc      = scale(stats)}
		{@const trips   = expanded[code] ? getTrips(appState, selectedYear).filter(t => t.country === code) : []}
		<div class="rounded-2xl border border-stone-200 dark:border-zinc-800 overflow-hidden
			{stats.overMax ? 'border-red-300 dark:border-red-900/60' : ''}">
			<!-- Header: name + total -->
			<div class="flex items-center gap-2.5 px-3 pt-3 pb-2" style="border-left: 3px solid {country.color}">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-1.5">
						{#if flag}<span class="text-base leading-none shrink-0">{flag}</span>{/if}
						<span class="font-brand text-[13px] font-bold truncate text-stone-800 dark:text-zinc-100">{country.name}</span>
					</div>
					<div class="text-[10px] font-mono tabular-nums text-stone-400 dark:text-zinc-500 mt-0.5">
						{stats.past} past{#if stats.upcoming > 0}{' '}+ {stats.upcoming} planned{/if}
					</div>
				</div>
				<span class="font-mono text-2xl font-semibold tabular-nums leading-none shrink-0" style="color: {country.color}">{stats.total}<span class="text-[10px] font-normal text-stone-300 dark:text-zinc-600">d</span></span>
			</div>

			<!-- bar scaled to the budget (only when the country has rules) -->
			{#if stats.min > 0 || stats.target > 0 || stats.max > 0}
			<div class="px-3 pb-2">
				<div class="relative h-1.5">
					<div class="absolute inset-0 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
						<div class="absolute left-0 top-0 h-full rounded-full transition-all {stats.overMax ? 'bg-red-400' : ''}"
							style="width:{pctOf(stats.past, sc)}%;{stats.overMax ? '' : `background:${country.color}`}"></div>
						{#if stats.upcoming > 0}
						<div class="absolute top-0 h-full opacity-25 transition-all {stats.overMax ? 'bg-red-400' : ''}"
							style="left:{pctOf(stats.past, sc)}%;width:{Math.min(100 - pctOf(stats.past, sc), pctOf(stats.upcoming, sc))}%;{stats.overMax ? '' : `background:${country.color}`}"></div>
						{/if}
					</div>
					{#if stats.min > 0 && stats.min < sc}
					<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-amber-400 rounded-full" style="left:{pctOf(stats.min, sc)}%" title="Min: {stats.min}"></div>
					{/if}
					{#if stats.target > 0 && stats.target < sc}
					<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-emerald-400 rounded-full" style="left:{pctOf(stats.target, sc)}%" title="Goal: {stats.target}"></div>
					{/if}
					{#if stats.max > 0 && stats.max < sc}
					<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-red-400 rounded-full" style="left:{pctOf(stats.max, sc)}%" title="Max: {stats.max}"></div>
					{/if}
				</div>
				<div class="text-right text-[9px] font-mono tabular-nums text-stone-300 dark:text-zinc-600 mt-0.5">of {sc}d</div>
			</div>
			{/if}

			<!-- The one thing that matters -->
			{#if status}
			{@const StatusIcon = statusIcon[status.icon]}
			<div class="mx-2 mb-2 flex flex-col gap-1 rounded-xl px-2.5 py-2 {toneWrap[status.tone]}">
				<div class="flex items-center gap-2">
					<StatusIcon size={13} class="shrink-0 opacity-80" />
					<span class="text-[12px] min-w-0">
						{#if status.count}<span class="font-mono font-semibold tabular-nums">{status.count}</span>{' '}{/if}{status.label}
					</span>
				</div>
				{#if status.date}
				<div class="flex items-center gap-2 text-[11px] font-medium">
					<IconCalendarEvent size={12} class="shrink-0 opacity-80" />
					<span class="font-mono tabular-nums">{status.date}</span>
				</div>
				{/if}
			</div>
			{/if}

			<!-- Trips toggle -->
			<button
				onclick={() => expanded[code] = !expanded[code]}
				class="w-full flex items-center gap-1.5 px-3 py-1.5 border-t border-stone-100 dark:border-zinc-800/60 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors"
			>
				<IconLuggage size={11} />
				Trips
				<IconChevronDown size={11} class="ml-auto transition-transform {expanded[code] ? 'rotate-180' : ''}" />
			</button>
			{#if expanded[code]}
			<div class="border-t border-stone-100 dark:border-zinc-800/60 bg-stone-50/50 dark:bg-zinc-800/20 max-h-44 overflow-y-auto">
				{#if trips.length === 0}
					<div class="px-3 py-2.5 text-[11px] text-stone-400 dark:text-zinc-600">No trips in {selectedYear}</div>
				{:else}
					{#each trips as trip}
					<div class="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono tabular-nums border-b border-stone-100 dark:border-zinc-800/40 last:border-0">
						<span class="text-stone-600 dark:text-zinc-300">
							{formatShort(trip.from, selectedYear)}{#if trip.from !== trip.to} – {formatShort(trip.to, selectedYear)}{/if}
						</span>
						<span class="ml-auto text-stone-400 dark:text-zinc-500">{trip.days}d</span>
						{#if trip.ongoing}
							<span class="text-[9px] font-sans font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">now</span>
						{/if}
					</div>
					{/each}
				{/if}
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

	<div class="mt-auto px-4 py-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-mono text-stone-400 dark:text-zinc-600 tabular-nums flex flex-col gap-0.5">
		<span class="flex items-center gap-1.5"><IconCalendarStats size={12} /> {tracked.length} / {daysInYear(selectedYear)} days tracked</span>
		{#if pastUntracked > 0}
		<span class="text-amber-600/80 dark:text-amber-500/70">{pastUntracked} past days unaccounted</span>
		{/if}
	</div>
</aside>
