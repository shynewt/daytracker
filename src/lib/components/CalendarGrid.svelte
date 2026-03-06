<script lang="ts">
	import { appState } from '$lib/store.svelte';
	import IconPlus     from '@tabler/icons-svelte/icons/plus';
	import IconCalendar from '@tabler/icons-svelte/icons/calendar';
	import {
		toDateStr, parseDate, getDaysInMonth,
		getFirstDayOfMonth, colorWithOpacity, getCountryFlag
	} from '$lib/utils';


	let {
		selectedYear,
		activeMobileTab,
		onRangeSelected,
		onRequestAddCountry,
	}: {
		selectedYear: number;
		activeMobileTab: 'countries' | 'calendar' | 'stats';
		onRangeSelected: (from: string, to: string) => void;
		onRequestAddCountry: () => void;
	} = $props();

	type View = 'default' | 'compact' | 'rows';
	let view = $state<View>('default');

	const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	const HDR_MON = ['Mo','Tu','We','Th','Fr','Sa','Su'];
	const HDR_SUN = ['Su','Mo','Tu','We','Th','Fr','Sa'];
	const todayStr = toDateStr(new Date());

	let rangeAnchor        = $state<string | null>(null);
	let hoverDay           = $state<string | null>(null);
	let hoveredMi          = $state<number | null>(null);
	let hoveredDayOfMonth  = $state<number | null>(null);

	const rangePreview = $derived.by(() => {
		if (!rangeAnchor) return new Set<string>();
		const end = hoverDay ?? rangeAnchor;
		const s = parseDate(rangeAnchor), e = parseDate(end);
		const [lo, hi] = s <= e ? [s, e] : [e, s];
		const set = new Set<string>();
		const cur = new Date(lo);
		while (cur <= hi) { set.add(toDateStr(cur)); cur.setDate(cur.getDate() + 1); }
		return set;
	});


	export function cancelRange() {
		rangeAnchor = null;
		hoverDay = null;
	}

	function onDayClick(d: string) {
		if (rangeAnchor === null) {
			rangeAnchor = d;
		} else {
			const s = parseDate(rangeAnchor), e = parseDate(d);
			const [lo, hi] = s <= e ? [rangeAnchor, d] : [d, rangeAnchor];
			rangeAnchor = null;
			hoverDay = null;
			onRangeSelected(lo, hi);
		}
	}
</script>

<main class="flex-1 overflow-y-auto select-none relative {activeMobileTab !== 'calendar' ? 'max-md:hidden' : ''}">

	{#if Object.keys(appState.countries).length === 0}
	<div class="sticky top-0 z-10 flex items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 text-[13px] text-amber-700 dark:text-amber-400">
		<IconPlus size={14} class="shrink-0" />
		<span>Add a country in the sidebar to start tracking days</span>
		<button onclick={onRequestAddCountry} class="md:hidden ml-auto px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold">Add</button>
	</div>
	{/if}
	{#if rangeAnchor}
	<div class="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2.5 bg-blue-500 text-white text-[13px] font-medium shadow-sm">
		<span class="flex items-center gap-1.5"><IconCalendar size={14} /> <span class="font-mono">{rangeAnchor}</span> — click an end date</span>
		<button onclick={cancelRange} class="px-2.5 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[12px] transition-colors">Cancel <span class="opacity-60 text-[11px]">Esc</span></button>
	</div>
	{/if}

	<!-- Legend + view switcher -->
	{#if Object.keys(appState.countries).length > 0}
	<div class="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-stone-100 dark:border-zinc-800/60">
		<div class="flex items-center gap-3 overflow-x-auto no-scrollbar min-w-0 flex-1">
			{#each Object.entries(appState.countries) as [code, country]}
			<div class="flex items-center gap-1.5 shrink-0">
				<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{country.color}"></span>
				{#if getCountryFlag(code)}<span class="text-sm leading-none">{getCountryFlag(code)}</span>{/if}
				<span class="text-[12px] font-medium text-stone-600 dark:text-zinc-400 hidden sm:block">{country.name}</span>
			</div>
			{/each}
		</div>
		<div class="flex items-center bg-stone-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5 shrink-0">
			{#each [['default','Grid'],['compact','Compact'],['rows','Rows']] as [v, label]}
			<button
				onclick={() => view = v as View}
				class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all
					{view === v ? 'bg-white dark:bg-zinc-700 text-stone-800 dark:text-zinc-100 shadow-sm' : 'text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300'}"
			>{label}</button>
			{/each}
		</div>
	</div>
	{/if}

	<!-- ── DEFAULT / COMPACT ─────────────────────────────────────── -->
	{#if view === 'default' || view === 'compact'}
	{@const c = view === 'compact'}
	<div class="grid gap-2 p-2
		{c
			? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
			: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3'}">
		{#each Array.from({length: 12}, (_, i) => i) as mi}
		{@const dc   = getDaysInMonth(selectedYear, mi)}
		{@const fd   = getFirstDayOfMonth(selectedYear, mi, appState.settings.weekStartsMonday)}
		{@const hdrs = appState.settings.weekStartsMonday ? HDR_MON : HDR_SUN}
		<div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-zinc-800 {c ? 'p-2' : 'p-3.5'}">
			<div class="flex items-baseline justify-between border-b border-stone-100 dark:border-zinc-800 {c ? 'mb-2 pb-1.5' : 'mb-3 pb-2.5'}">
				<span class="font-brand font-bold tracking-wide text-stone-700 dark:text-zinc-200 {c ? 'text-[11px]' : 'text-[13px]'}">{c ? MONTHS_SHORT[mi] : MONTHS[mi]}</span>
				<span class="font-mono text-[10px] text-stone-300 dark:text-zinc-700 tabular-nums">{String(mi + 1).padStart(2, '0')}</span>
			</div>
			<div class="grid grid-cols-7 {c ? 'gap-[2px]' : 'gap-[3px]'}">
				{#each hdrs as h, hi}
				{@const isWeekend = appState.settings.weekStartsMonday ? hi >= 5 : hi === 0 || hi === 6}
				<div class="text-center font-semibold tracking-wider {c ? 'text-[8px] pb-1' : 'text-[9px] pb-1.5'} {isWeekend ? 'text-stone-300 dark:text-zinc-700' : 'text-stone-400 dark:text-zinc-600'}">{h}</div>
				{/each}
				{#each Array.from({length: fd}) as _}<div></div>{/each}
				{#each Array.from({length: dc}, (_, d) => d + 1) as day}
				{@const ds      = `${selectedYear}-${String(mi+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
				{@const entry   = appState.entries[ds]}
				{@const country = entry ? appState.countries[entry.country] : null}
				{@const inRange  = rangePreview.has(ds)}
				{@const isAnchor = rangeAnchor === ds}
				{@const today    = ds === todayStr}
				{@const isPast   = ds <= todayStr}
				{@const bgColor  = country ? colorWithOpacity(country.color, isPast ? 0.65 : 0.18) : 'transparent'}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="aspect-square flex items-center justify-center font-mono rounded-md cursor-pointer relative
						{c ? 'text-[9px]' : 'text-[11px]'}
						{!inRange ? 'hover:ring-2 hover:ring-inset hover:ring-white/40 dark:hover:ring-white/20' : ''}
						{today    ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 font-bold' : ''}
						{isAnchor ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 z-10' : ''}
						{inRange && !isAnchor ? 'bg-blue-100 dark:bg-blue-950/60 rounded-none' : ''}
						{entry && !isPast && !inRange ? 'border border-dashed border-stone-300 dark:border-zinc-600' : ''}"
					style={inRange && !isAnchor ? '' : `background-color: ${bgColor}`}
					onmouseenter={() => { if (rangeAnchor) hoverDay = ds; }}
					onmouseleave={() => { if (rangeAnchor) hoverDay = rangeAnchor; }}
					onclick={() => onDayClick(ds)}
					title={country ? `${ds} · ${country.name}` : ds}
				>{day}</div>
				{/each}
			</div>
		</div>
		{/each}
	</div>

	<!-- ── MONTHS AS ROWS ────────────────────────────────────────── -->
	{:else if view === 'rows'}
	{@const anchorDayOfMonth = rangeAnchor ? parseInt(rangeAnchor.slice(8)) : null}
	<div class="p-3 flex flex-col gap-1">
		<!-- X-axis: day numbers -->
		<div class="flex items-center gap-2 mb-0.5">
			<div class="w-8 shrink-0"></div>
			<div class="flex-1 grid gap-[2px]" style="grid-template-columns: repeat(31, minmax(0, 1fr))">
				{#each Array.from({length: 31}, (_, i) => i + 1) as d}
				<div class="h-5 flex items-center justify-center rounded text-[8px] font-mono tabular-nums transition-colors
					{hoveredDayOfMonth === d || anchorDayOfMonth === d
						? 'bg-stone-200 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300'
						: 'text-stone-300 dark:text-zinc-700'}">{d}</div>
				{/each}
			</div>
		</div>

		<!-- Month rows -->
		{#each Array.from({length: 12}, (_, i) => i) as mi}
		{@const dc = getDaysInMonth(selectedYear, mi)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex items-center gap-2 rounded-lg transition-colors {hoveredMi === mi ? 'bg-stone-50 dark:bg-zinc-800/40' : ''}"
			onmouseenter={() => hoveredMi = mi}
			onmouseleave={() => { hoveredMi = null; hoveredDayOfMonth = null; }}
		>
			<span class="font-brand text-[11px] font-bold w-8 shrink-0 uppercase tracking-wide text-right transition-colors
				{hoveredMi === mi ? 'text-stone-600 dark:text-zinc-300' : 'text-stone-400 dark:text-zinc-600'}">{MONTHS_SHORT[mi]}</span>
			<div class="flex-1 grid gap-[2px]" style="grid-template-columns: repeat(31, minmax(0, 1fr))">
				{#each Array.from({length: dc}, (_, d) => d + 1) as day}
				{@const ds      = `${selectedYear}-${String(mi+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
				{@const entry   = appState.entries[ds]}
				{@const country = entry ? appState.countries[entry.country] : null}
				{@const inRange  = rangePreview.has(ds)}
				{@const isAnchor = rangeAnchor === ds}
				{@const today    = ds === todayStr}
				{@const isPast   = ds <= todayStr}
				{@const bgColor  = country ? colorWithOpacity(country.color, isPast ? 0.65 : 0.18) : ''}
				{@const colHover  = hoveredDayOfMonth === day}
				{@const cellHover = hoveredMi === mi && hoveredDayOfMonth === day}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="h-6 sm:h-8 flex items-center justify-center font-mono rounded-[3px] cursor-pointer transition-colors
						{cellHover && !inRange ? 'ring-2 ring-inset ring-white/60 dark:ring-white/40' : ''}
						{colHover && !cellHover && !inRange ? 'ring-1 ring-stone-300 dark:ring-zinc-600' : ''}
						{today    ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 font-bold' : ''}
						{isAnchor ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900' : ''}
						{inRange && !isAnchor ? 'bg-blue-100 dark:bg-blue-950/60 rounded-none' : ''}
						{!entry && !inRange ? 'bg-stone-100 dark:bg-zinc-800' : ''}"
					style={inRange && !isAnchor ? '' : (bgColor ? `background-color: ${bgColor}` : '')}
					onmouseenter={() => { hoveredDayOfMonth = day; if (rangeAnchor) hoverDay = ds; }}
					onmouseleave={() => { if (rangeAnchor) hoverDay = rangeAnchor; }}
					onclick={() => onDayClick(ds)}
					title={country ? `${ds} · ${country.name}` : ds}
				><span class="hidden sm:block text-[10px]">{day}</span></div>
				{/each}
				{#each Array.from({length: 31 - dc}) as _}
				<div class="h-6 sm:h-8 rounded-[3px]"></div>
				{/each}
			</div>
		</div>
		{/each}
	</div>
	{/if}

</main>
