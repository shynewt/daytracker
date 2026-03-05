<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		appState, initStore, setEntryRange, removeEntryRange,
		addCountry, updateCountry, removeCountry, setRule,
		exportJSON, importJSON, exportString, importString, replaceState, mergeState, getStats
	} from '$lib/store.svelte';
	import IconWorld        from '@tabler/icons-svelte/icons/world';
	import IconChevronLeft  from '@tabler/icons-svelte/icons/chevron-left';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import IconSun          from '@tabler/icons-svelte/icons/sun';
	import IconMoon         from '@tabler/icons-svelte/icons/moon';
	import IconShare        from '@tabler/icons-svelte/icons/share';
	import IconSettings     from '@tabler/icons-svelte/icons/settings';
	import IconMapPin       from '@tabler/icons-svelte/icons/map-pin';
	import IconPencil       from '@tabler/icons-svelte/icons/pencil';
	import IconTrash        from '@tabler/icons-svelte/icons/trash';
	import IconPlus         from '@tabler/icons-svelte/icons/plus';
	import IconCheck        from '@tabler/icons-svelte/icons/check';
	import IconCalendar     from '@tabler/icons-svelte/icons/calendar';
	import IconX            from '@tabler/icons-svelte/icons/x';
	import IconChartBar     from '@tabler/icons-svelte/icons/chart-bar';
	import IconAlertTriangle from '@tabler/icons-svelte/icons/alert-triangle';
	import {
		toDateStr, parseDate, getDaysInMonth,
		getFirstDayOfMonth, colorWithOpacity, daysInYear
	} from '$lib/utils';

	// ── Init ──────────────────────────────────────────────────────
	let isDark = $state(false);

	onMount(() => {
		initStore();
		isDark = document.documentElement.classList.contains('dark');
	});

	// ── UI state ──────────────────────────────────────────────────
	let selectedYear      = $state(new Date().getFullYear());
	let activeMobileTab   = $state<'countries' | 'calendar' | 'stats'>('calendar');

	// Sidebar
	let addingCountry   = $state(false);
	let newCode         = $state('');
	let newName         = $state('');
	let newColor        = $state('#6366f1');
	let editingCountry  = $state<string | null>(null);
	let editName        = $state('');
	let editColor       = $state('');

	// Day editor
	let popoverOpen    = $state(false);
	let popoverFrom    = $state('');
	let popoverTo      = $state('');
	let popoverCountry = $state('');

	// Range selection (airline-style two-click)
	let rangeAnchor = $state<string | null>(null);
	let hoverDay    = $state<string | null>(null);

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

	// Modals
	let settingsOpen = $state(false);
	let fileInput: HTMLInputElement;

	// Share modal
	let shareOpen     = $state(false);
	let shareTab      = $state<'export' | 'import'>('export');
	let importText    = $state('');
	let shareFileInput: HTMLInputElement;
	let preview       = $state<{ countries: string[]; entryCount: number; yearRange: string } | null>(null);
	let previewState  = $state<ReturnType<typeof importString> | null>(null);
	let previewError  = $state('');
	let copyDone      = $state(false);

	function openShare(tab: 'export' | 'import' = 'export') {
		shareTab = tab; importText = ''; preview = null; previewState = null; previewError = '';
		shareOpen = true;
	}

	function buildPreview(state: ReturnType<typeof importString>) {
		const countries = Object.entries(state.countries).map(([code, c]) => `${c.name} (${code})`);
		const entryCount = Object.keys(state.entries).length;
		const years = Object.keys(state.entries).map(d => d.slice(0, 4));
		const yearRange = years.length ? `${Math.min(...years.map(Number))}–${Math.max(...years.map(Number))}` : 'none';
		return { countries, entryCount, yearRange };
	}

	function parseImportText() {
		previewError = ''; preview = null; previewState = null;
		if (!importText.trim()) return;
		try {
			const s = importString(importText);
			previewState = s;
			preview = buildPreview(s);
		} catch (e: unknown) {
			previewError = e instanceof Error ? e.message : 'Invalid data';
		}
	}

	function handleShareFile(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0];
		if (!f) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const parsed = JSON.parse(ev.target?.result as string);
				if (parsed.version !== 1) throw new Error('Unsupported version');
				previewState = parsed;
				preview = buildPreview(parsed);
				previewError = '';
			} catch (err: unknown) {
				previewError = err instanceof Error ? err.message : 'Invalid file';
				preview = null; previewState = null;
			}
			(e.target as HTMLInputElement).value = '';
		};
		reader.readAsText(f);
	}

	function doReplace() {
		if (!previewState) return;
		replaceState(previewState);
		shareOpen = false;
	}

	function doMerge() {
		if (!previewState) return;
		mergeState(previewState);
		shareOpen = false;
	}

	async function copyExport() {
		await navigator.clipboard.writeText(exportString());
		copyDone = true;
		setTimeout(() => { copyDone = false; }, 1500);
	}

	// ── Constants ─────────────────────────────────────────────────
	const MONTHS = ['January','February','March','April','May','June',
	                'July','August','September','October','November','December'];
	const HDR_MON = ['Mo','Tu','We','Th','Fr','Sa','Su'];
	const HDR_SUN = ['Su','Mo','Tu','We','Th','Fr','Sa'];

	// ── Theme ─────────────────────────────────────────────────────
	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	// ── Year ──────────────────────────────────────────────────────
	function prevYear() { selectedYear--; }
	function nextYear() { selectedYear++; }

	// ── Helpers ───────────────────────────────────────────────────
	function pct(n: number): number {
		return Math.min(100, n / daysInYear(selectedYear) * 100);
	}

	function isToday(d: string): boolean {
		return d === toDateStr(new Date());
	}

	function totalTracked(): number {
		const y = String(selectedYear);
		return Object.keys(appState.entries).filter(d => d.startsWith(y + '-')).length;
	}

	// ── Calendar range selection ──────────────────────────────────
	function onDayClick(d: string) {
		if (rangeAnchor === null) {
			rangeAnchor = d;
		} else {
			const s = parseDate(rangeAnchor), e = parseDate(d);
			const [lo, hi] = s <= e ? [rangeAnchor, d] : [d, rangeAnchor];
			rangeAnchor = null;
			hoverDay = null;
			openPopover(lo, hi);
		}
	}

	function cancelRange() {
		rangeAnchor = null;
		hoverDay = null;
	}

	function openPopover(from: string, to: string) {
		popoverFrom = from; popoverTo = to;
		const ex = appState.entries[from];
		popoverCountry = ex?.country ?? Object.keys(appState.countries)[0] ?? '';
		popoverOpen    = true;
	}

	function applyPopover() {
		if (popoverCountry === '__none__') removeEntryRange(popoverFrom, popoverTo);
		else setEntryRange(popoverFrom, popoverTo, popoverCountry);
		popoverOpen = false;
	}

	// ── Countries ─────────────────────────────────────────────────
	function submitAddCountry() {
		const code = newCode.trim().toUpperCase();
		if (!code || !newName.trim()) return;
		addCountry(code, newName.trim(), newColor);
		newCode = ''; newName = ''; newColor = '#6366f1'; addingCountry = false;
	}

	function startEdit(code: string) {
		editingCountry = code;
		editName  = appState.countries[code].name;
		editColor = appState.countries[code].color;
	}

	function submitEdit() {
		if (!editingCountry) return;
		updateCountry(editingCountry, editName, editColor);
		editingCountry = null;
	}

	function deleteCountry(code: string) {
		if (confirm(`Delete "${appState.countries[code]?.name}"? All entries removed.`))
			removeCountry(code);
	}

	// ── Rules ─────────────────────────────────────────────────────
	function ruleMin(c: string)    { return appState.rules[String(selectedYear)]?.[c]?.min ?? 0; }
	function ruleMax(c: string)    { const v = appState.rules[String(selectedYear)]?.[c]?.max; return v ?? ''; }
	function setMin(c: string, v: string) { setRule(String(selectedYear), c, parseInt(v)||0, appState.rules[String(selectedYear)]?.[c]?.max ?? 366); }
	function setMax(c: string, v: string) { setRule(String(selectedYear), c, appState.rules[String(selectedYear)]?.[c]?.min ?? 0, parseInt(v)||366); }

	// ── Import ────────────────────────────────────────────────────
	function handleImport(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0];
		if (!f) return;
		importJSON(f).then(() => { (e.target as HTMLInputElement).value = ''; })
		             .catch(err => alert('Import failed: ' + err.message));
	}

	// ── Data clear ────────────────────────────────────────────────
	function clearAll() {
		if (confirm('Clear ALL data? This cannot be undone.')) {
			appState.countries = {}; appState.rules = {};
			appState.entries = {}; appState.settings = { weekStartsMonday: true };
		}
	}

	// ── Input class helper ────────────────────────────────────────
	const inp = 'w-full bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors';
	const inpSm = 'w-16 bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-md px-2 py-1 text-xs text-stone-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-colors font-mono';
	const iconBtn = 'w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-200 transition-colors cursor-pointer';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { cancelRange(); popoverOpen = false; settingsOpen = false; shareOpen = false; } }} />
<div
	class="h-dvh overflow-hidden flex flex-col bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100"
>

<!-- ══ HEADER ════════════════════════════════════════════════════ -->
<header class="h-12 shrink-0 flex items-center gap-2 px-4 bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-zinc-800 z-20">

	<!-- Brand -->
	<span class="flex items-center gap-1.5 font-brand font-bold text-[15px] tracking-tight text-stone-900 dark:text-zinc-100 select-none">
		<IconWorld size={18} class="text-amber-500" />
		<span class="hidden sm:inline">Day Counter</span>
	</span>

	<!-- Year nav -->
	<div class="flex items-center gap-0.5 ml-3">
		<button onclick={prevYear} class={iconBtn} title="Previous year"><IconChevronLeft size={16} /></button>
		<span class="font-mono text-sm font-medium w-12 text-center tabular-nums select-none">{selectedYear}</span>
		<button onclick={nextYear} class={iconBtn} title="Next year"><IconChevronRight size={16} /></button>
	</div>

	<!-- Actions -->
	<div class="ml-auto flex items-center gap-0.5">
		<button onclick={toggleTheme} class={iconBtn} title="Toggle theme">
			{#if isDark}<IconSun size={17} />{:else}<IconMoon size={17} />{/if}
		</button>
		<button onclick={() => openShare()} class={iconBtn} title="Share / Import"><IconShare size={17} /></button>
		<button onclick={() => settingsOpen = true} class={iconBtn} title="Settings"><IconSettings size={17} /></button>
	</div>
</header>

<!-- ══ CONTENT ROW ═══════════════════════════════════════════════ -->
<div class="flex flex-1 overflow-hidden">

<!-- ── SIDEBAR ─────────────────────────────────────────────────── -->
<aside class="flex flex-col overflow-y-auto w-full md:w-60 md:shrink-0 bg-white dark:bg-zinc-900 border-r border-stone-200 dark:border-zinc-800 {activeMobileTab !== 'countries' ? 'max-md:hidden' : ''}">

	<!-- Section header -->
	<div class="flex items-center gap-1.5 px-4 pt-4 pb-2">
		<IconMapPin size={13} class="text-stone-400 dark:text-zinc-600" />
		<span class="text-[10px] font-semibold tracking-widest uppercase text-stone-400 dark:text-zinc-600">Countries</span>
	</div>

	<!-- Country list -->
	{#each Object.entries(appState.countries) as [code, country]}
	<div class="border-b border-stone-100 dark:border-zinc-800/60">

		{#if editingCountry === code}
		<!-- Edit form -->
		<div class="px-3 py-2.5 flex flex-col gap-2">
			<input bind:value={editName} class={inp} placeholder="Country name" />
			<div class="flex items-center gap-2">
				<input bind:value={editColor} type="color" class="w-8 h-8 rounded-lg border border-stone-200 dark:border-zinc-700 cursor-pointer p-0.5 bg-stone-50 dark:bg-zinc-800" />
				<button onclick={submitEdit} class="flex-1 bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity">Save</button>
				<button onclick={() => editingCountry = null} class="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
			</div>
		</div>
		{:else}
		<!-- Country row -->
		<div class="flex items-center gap-2.5 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors group" style="border-left: 3px solid {country.color}">
			<span class="flex-1 text-sm font-medium truncate">{country.name}</span>
			<span class="font-mono text-[10px] bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-stone-500 dark:text-zinc-400 shrink-0">{code}</span>
			<button onclick={() => startEdit(code)} class="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-stone-400 hover:text-blue-500 transition-all rounded"><IconPencil size={13} /></button>
			<button onclick={() => deleteCountry(code)} class="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-stone-400 hover:text-red-500 transition-all rounded"><IconTrash size={13} /></button>
		</div>
		<!-- Min / Max rules -->
		<div class="flex items-center gap-2 px-4 pb-2.5 text-[11px] text-stone-400 dark:text-zinc-600" style="padding-left: 19px">
			<span class="w-6">Min</span>
			<input type="number" min="0" max="366" value={ruleMin(code)} oninput={(e) => setMin(code, (e.target as HTMLInputElement).value)} class={inpSm} />
			<span class="w-6 ml-1">Max</span>
			<input type="number" min="0" max="366" value={ruleMax(code)} oninput={(e) => setMax(code, (e.target as HTMLInputElement).value)} class={inpSm} />
		</div>
		{/if}
	</div>
	{/each}

	<!-- Add country -->
	{#if addingCountry}
	<div class="px-3 py-2.5 flex flex-col gap-2 border-b border-stone-100 dark:border-zinc-800/60">
		<input bind:value={newCode} maxlength="4" class={inp} placeholder="Code (e.g. DE)" />
		<input bind:value={newName} class={inp} placeholder="Country name" />
		<div class="flex items-center gap-2">
			<input bind:value={newColor} type="color" class="w-8 h-8 rounded-lg border border-stone-200 dark:border-zinc-700 cursor-pointer p-0.5 bg-stone-50 dark:bg-zinc-800" />
			<button onclick={submitAddCountry} class="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors">Add</button>
			<button onclick={() => addingCountry = false} class="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>
	</div>
	{:else}
	<button onclick={() => addingCountry = true} class="m-3 flex items-center justify-center gap-2 text-[13px] font-medium text-stone-400 dark:text-zinc-600 border border-dashed border-stone-300 dark:border-zinc-700 rounded-xl py-2.5 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
		<IconPlus size={15} /> Add Country
	</button>
	{/if}
</aside>

<!-- ── CALENDAR ─────────────────────────────────────────────────── -->
<main class="flex-1 overflow-y-auto select-none {activeMobileTab !== 'calendar' ? 'max-md:hidden' : ''}">
	{#if rangeAnchor}
	<div class="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2 bg-blue-500 text-white text-[13px] font-medium">
		<span>📅 <span class="font-mono">{rangeAnchor}</span> — now click an end date</span>
		<button onclick={cancelRange} class="text-white/80 hover:text-white underline text-[12px]">Cancel (Esc)</button>
	</div>
	{/if}
	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
		{#each Array.from({length: 12}, (_, i) => i) as mi}
		{@const dc   = getDaysInMonth(selectedYear, mi)}
		{@const fd   = getFirstDayOfMonth(selectedYear, mi, appState.settings.weekStartsMonday)}
		{@const hdrs = appState.settings.weekStartsMonday ? HDR_MON : HDR_SUN}
		<div class="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-zinc-800 p-3">
			<!-- Month name -->
			<div class="text-[11px] font-semibold tracking-widest uppercase text-stone-400 dark:text-zinc-600 text-center mb-2 pb-2 border-b border-stone-100 dark:border-zinc-800">{MONTHS[mi]}</div>
			<!-- Day grid -->
			<div class="grid grid-cols-7 gap-[3px]">
				<!-- Day-of-week headers -->
				{#each hdrs as h, hi}
				<div class="text-center text-[9px] font-semibold tracking-wider pb-1 {hi >= (appState.settings.weekStartsMonday ? 5 : 0) && hi <= (appState.settings.weekStartsMonday ? 6 : 0) ? 'text-stone-300 dark:text-zinc-700' : 'text-stone-400 dark:text-zinc-600'}">{h}</div>
				{/each}
				<!-- Empty offset cells -->
				{#each Array.from({length: fd}) as _}<div></div>{/each}
				<!-- Day cells -->
				{#each Array.from({length: dc}, (_, d) => d + 1) as day}
				{@const ds      = `${selectedYear}-${String(mi+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
				{@const entry    = appState.entries[ds]}
				{@const country  = entry ? appState.countries[entry.country] : null}
				{@const inRange  = rangePreview.has(ds)}
				{@const isAnchor = rangeAnchor === ds}
				{@const today    = isToday(ds)}
				{@const isPast   = ds <= toDateStr(new Date())}
				{@const bgColor  = country ? colorWithOpacity(country.color, isPast ? 0.65 : 0.12) : 'transparent'}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="aspect-square flex items-center justify-center font-mono text-[11px] rounded-md cursor-pointer relative hover:z-10
						{!inRange ? 'transition-transform hover:scale-110' : ''}
						{today    ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 font-bold' : ''}
						{isAnchor ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 scale-110 z-10' : ''}
						{inRange && !isAnchor ? 'bg-blue-100 dark:bg-blue-950/60 rounded-none' : ''}
						{entry && !isPast && !inRange ? 'border border-dashed border-stone-300 dark:border-zinc-600' : ''}"
					style={inRange && !isAnchor ? '' : `background-color: ${bgColor}`}
					onmouseenter={() => { if (rangeAnchor) hoverDay = ds; }}
					onmouseleave={() => { if (rangeAnchor) hoverDay = rangeAnchor; }}
					onclick={() => onDayClick(ds)}
					title={ds}
				>{day}</div>
				{/each}
			</div>
		</div>
		{/each}
	</div>
</main>

<!-- ── STATS ────────────────────────────────────────────────────── -->
<aside class="flex flex-col overflow-y-auto w-full md:w-56 md:shrink-0 bg-white dark:bg-zinc-900 border-l border-stone-200 dark:border-zinc-800 {activeMobileTab !== 'stats' ? 'max-md:hidden' : ''}">
	<div class="flex items-center gap-1.5 px-4 pt-4 pb-2">
		<IconChartBar size={13} class="text-stone-400 dark:text-zinc-600" />
		<span class="text-[10px] font-semibold tracking-widest uppercase text-stone-400 dark:text-zinc-600">Stats · {selectedYear}</span>
	</div>

	<div class="flex flex-col gap-3 px-3 pb-3">
		{#each Object.entries(appState.countries) as [code, country]}
		{@const stats   = getStats(appState, code, selectedYear)}
		{@const rule    = appState.rules[String(selectedYear)]?.[code]}
		{@const min     = rule?.min ?? 0}
		{@const max     = rule?.max}
		{@const yd      = daysInYear(selectedYear)}
		<div class="rounded-xl border border-stone-200 dark:border-zinc-800 p-3" style="border-left: 3px solid {country.color}">
			<!-- Header -->
			<div class="flex items-center justify-between mb-1">
				<span class="text-sm font-semibold truncate">{country.name}</span>
				<span class="font-mono text-[10px] text-stone-400 dark:text-zinc-600 shrink-0 ml-2">{code}</span>
			</div>
			<!-- Big number -->
			<div class="font-mono text-3xl font-medium leading-none mb-1" style="color: {country.color}">{stats.past}</div>
			<div class="text-[11px] text-stone-400 dark:text-zinc-600 mb-2 font-mono tabular-nums">
				{stats.past} past · {stats.upcoming} upcoming
			</div>
			<!-- Progress bar -->
			<div class="relative h-1.5 mb-1">
				<div class="absolute inset-0 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
					<div class="absolute left-0 top-0 h-full rounded-full" style="width:{pct(stats.past)}%;background:{country.color}"></div>
					<div class="absolute top-0 h-full rounded-full opacity-20" style="left:{pct(stats.past)}%;width:{Math.min(100-pct(stats.past),pct(stats.upcoming))}%;background:{country.color}"></div>
				</div>
				{#if min > 0}
				<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 bg-amber-500 rounded-full" style="left:{pct(min)}%"></div>
				{/if}
				{#if max && max < 366}
				<div class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 bg-red-500 rounded-full" style="left:{pct(max)}%"></div>
				{/if}
			</div>
			<!-- Status — real (past only) -->
			{#if stats.overMax}
			<div class="flex items-center gap-1 text-[11px] font-medium text-red-500 mt-1.5"><span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span> Over maximum</div>
			{:else if stats.toMin > 0}
			<div class="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1.5"><IconAlertTriangle size={11} /> {stats.toMin} days to minimum</div>
			{:else if min > 0}
			<div class="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1.5"><IconCheck size={11} /> Minimum reached</div>
			{/if}
			{#if max && max < 366 && !stats.overMax && stats.toMax > 0}
			<div class="text-[11px] text-stone-400 dark:text-zinc-600 mt-0.5 font-mono">{stats.toMax} days until max</div>
			{/if}
			<!-- Status — simulated (includes upcoming) -->
			{#if stats.upcoming > 0}
				{#if stats.overMaxSim && !stats.overMax}
				<div class="text-[10px] text-red-400/70 dark:text-red-500/60 mt-1 font-mono">📅 +upcoming: would exceed max</div>
				{/if}
				{#if stats.toMin > 0}
					{#if stats.toMinSim === 0}
					<div class="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 mt-1 font-mono">📅 +upcoming: would reach min</div>
					{:else}
					<div class="text-[10px] text-amber-500/70 dark:text-amber-400/60 mt-1 font-mono">📅 +upcoming: still {stats.toMinSim} short</div>
					{/if}
				{/if}
			{/if}
		</div>
		{/each}

		{#if Object.keys(appState.countries).length === 0}
		<div class="text-center text-[13px] text-stone-300 dark:text-zinc-700 py-8">
			Add countries<br/>to see stats
		</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="mt-auto px-4 py-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-mono text-stone-400 dark:text-zinc-600 tabular-nums">
		{totalTracked()} / {daysInYear(selectedYear)} days tracked
	</div>
</aside>

</div><!-- end content row -->

<!-- ══ MOBILE BOTTOM NAV ══════════════════════════════════════════ -->
<nav class="md:hidden h-14 shrink-0 flex border-t border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
	{#each [
		{ id: 'countries', label: 'Countries', Icon: IconMapPin },
		{ id: 'calendar',  label: 'Calendar',  Icon: IconCalendar },
		{ id: 'stats',     label: 'Stats',     Icon: IconChartBar },
	] as tab}
	<button
		onclick={() => activeMobileTab = tab.id as 'countries' | 'calendar' | 'stats'}
		class="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wider uppercase transition-colors
			{activeMobileTab === tab.id
				? 'text-amber-500 dark:text-amber-400'
				: 'text-stone-400 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-400'}"
	>
		<tab.Icon size={20} />
		{tab.label}
	</button>
	{/each}
</nav>

<!-- ══ DAY EDITOR MODAL ══════════════════════════════════════════ -->
{#if popoverOpen}
<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center">
	<!-- Backdrop -->
	<div
		transition:fade={{ duration: 150 }}
		class="absolute inset-0 bg-black/40 backdrop-blur-sm"
		role="button" tabindex="-1" onclick={() => popoverOpen = false}
	></div>
	<!-- Card -->
	<div
		transition:fly={{ y: 24, duration: 220, opacity: 0 }}
		class="relative bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:w-[340px] p-5 z-10"
	>
		<!-- Title -->
		<div class="flex items-center gap-2 mb-4">
			<IconCalendar size={15} class="text-stone-400 dark:text-zinc-600" />
			<span class="font-mono text-sm font-medium">
				{popoverFrom === popoverTo ? popoverFrom : `${popoverFrom} → ${popoverTo}`}
			</span>
			<button onclick={() => popoverOpen = false} class="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>

		<!-- Date range inputs -->
		<div class="grid grid-cols-2 gap-2 mb-4">
			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">From</span>
				<input type="date" bind:value={popoverFrom} class="{inp} font-mono text-xs" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">To</span>
				<input type="date" bind:value={popoverTo} class="{inp} font-mono text-xs" />
			</label>
		</div>

		<!-- Country chips -->
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

		<!-- Actions -->
		<div class="flex gap-2">
			<button onclick={applyPopover} class="flex-1 bg-stone-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 rounded-xl py-2.5 text-sm font-bold transition-opacity">Apply</button>
			<button onclick={() => popoverOpen = false} class="px-5 py-2.5 text-sm font-medium rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
		</div>
	</div>
</div>
{/if}

<!-- ══ SETTINGS MODAL ════════════════════════════════════════════ -->
{#if settingsOpen}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
	<div
		transition:fade={{ duration: 150 }}
		class="absolute inset-0 bg-black/40 backdrop-blur-sm"
		role="button" tabindex="-1" onclick={() => settingsOpen = false}
	></div>
	<div
		transition:fly={{ y: 24, duration: 220, opacity: 0 }}
		class="relative bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-xs p-5 z-10"
	>
		<div class="flex items-center gap-2 mb-5">
			<IconSettings size={16} class="text-stone-500 dark:text-zinc-500" />
			<span class="font-semibold text-base">Settings</span>
			<button onclick={() => settingsOpen = false} class="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>

		<label class="flex items-center gap-3 mb-5 cursor-pointer group">
			<div class="relative w-10 h-5 rounded-full transition-colors {appState.settings.weekStartsMonday ? 'bg-amber-500' : 'bg-stone-200 dark:bg-zinc-700'}">
				<input type="checkbox" bind:checked={appState.settings.weekStartsMonday} class="sr-only" />
				<div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform {appState.settings.weekStartsMonday ? 'translate-x-5' : ''}"></div>
			</div>
			<span class="text-sm font-medium">Week starts on Monday</span>
		</label>

		<div class="border-t border-stone-100 dark:border-zinc-800 pt-4">
			<button onclick={clearAll} class="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
				<IconTrash size={15} /> Clear all data
			</button>
		</div>
	</div>
</div>
{/if}

<!-- ══ SHARE MODAL ═══════════════════════════════════════════════ -->
{#if shareOpen}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
	<div
		transition:fade={{ duration: 150 }}
		class="absolute inset-0 bg-black/40 backdrop-blur-sm"
		role="button" tabindex="-1" onclick={() => shareOpen = false}
	></div>
	<div
		transition:fly={{ y: 24, duration: 220, opacity: 0 }}
		class="relative bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-5 z-10"
	>
		<!-- Header -->
		<div class="flex items-center gap-2 mb-4">
			<IconShare size={16} class="text-stone-500 dark:text-zinc-500" />
			<span class="font-semibold text-base">Share / Import</span>
			<button onclick={() => shareOpen = false} class="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>

		<!-- Tabs -->
		<div class="flex gap-1 mb-4 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1">
			{#each ['export', 'import'] as t}
			<button
				onclick={() => shareTab = t as 'export' | 'import'}
				class="flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors {shareTab === t ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 shadow-sm' : 'text-stone-400 dark:text-zinc-600 hover:text-stone-700 dark:hover:text-zinc-300'}"
			>{t === 'export' ? 'Export' : 'Import'}</button>
			{/each}
		</div>

		{#if shareTab === 'export'}
		<!-- Export tab -->
		<div class="flex flex-col gap-3">
			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">Encoded string</span>
				<textarea
					readonly
					rows={4}
					value={exportString()}
					class="w-full font-mono text-xs bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-stone-700 dark:text-zinc-300 resize-none focus:outline-none select-all"
				></textarea>
			</label>
			<div class="flex gap-2">
				<button
					onclick={copyExport}
					class="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
				>
					{#if copyDone}<IconCheck size={15} /> Copied!{:else}Copy to clipboard{/if}
				</button>
				<button
					onclick={exportJSON}
					class="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
				>Download JSON</button>
			</div>
		</div>

		{:else}
		<!-- Import tab -->
		<div class="flex flex-col gap-3">
			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">Paste encoded string</span>
				<textarea
					rows={3}
					bind:value={importText}
					oninput={parseImportText}
					placeholder="Paste exported string here…"
					class="w-full font-mono text-xs bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-stone-700 dark:text-zinc-300 placeholder:text-stone-400 dark:placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
				></textarea>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">Or upload JSON file</span>
				<input bind:this={shareFileInput} type="file" accept=".json" onchange={handleShareFile}
					class="text-sm text-stone-600 dark:text-zinc-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-100 dark:file:bg-zinc-800 file:text-stone-700 dark:file:text-zinc-300 hover:file:bg-stone-200 dark:hover:file:bg-zinc-700 cursor-pointer" />
			</label>

			{#if previewError}
			<div class="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
				{previewError}
			</div>
			{/if}

			{#if preview}
			<div class="rounded-xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 px-3 py-2.5 flex flex-col gap-1.5">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">Preview</span>
				<div class="text-sm text-stone-700 dark:text-zinc-300">
					<span class="font-semibold">{preview.entryCount}</span> entries · <span class="font-semibold">{preview.yearRange}</span>
				</div>
				<div class="flex flex-wrap gap-1">
					{#each preview.countries as c}
					<span class="text-xs bg-stone-200 dark:bg-zinc-700 rounded px-2 py-0.5 text-stone-600 dark:text-zinc-400">{c}</span>
					{/each}
					{#if preview.countries.length === 0}
					<span class="text-xs text-stone-400 dark:text-zinc-600">No countries</span>
					{/if}
				</div>
			</div>
			{/if}

			<div class="flex gap-2 mt-1">
				<button
					onclick={doReplace}
					disabled={!previewState}
					class="flex-1 py-2 text-sm font-semibold rounded-xl bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
				>Replace all</button>
				<button
					onclick={doMerge}
					disabled={!previewState}
					class="flex-1 py-2 text-sm font-semibold rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				>Merge</button>
			</div>
		</div>
		{/if}
	</div>
</div>
{/if}

</div>
