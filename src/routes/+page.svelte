<script lang="ts">
	import { onMount } from 'svelte';
	import { initStore } from '$lib/store.svelte';
	import IconMapPin   from '@tabler/icons-svelte/icons/map-pin';
	import IconCalendar from '@tabler/icons-svelte/icons/calendar';
	import IconChartBar from '@tabler/icons-svelte/icons/chart-bar';
	import Header          from '$lib/components/Header.svelte';
	import CountrySidebar  from '$lib/components/CountrySidebar.svelte';
	import CalendarGrid    from '$lib/components/CalendarGrid.svelte';
	import StatsSidebar    from '$lib/components/StatsSidebar.svelte';
	import DayEditorModal  from '$lib/components/DayEditorModal.svelte';
	import SettingsModal   from '$lib/components/SettingsModal.svelte';
	import ShareModal      from '$lib/components/ShareModal.svelte';
	import SyncModal       from '$lib/components/SyncModal.svelte';

	let isDark          = $state(false);
	let selectedYear    = $state(new Date().getFullYear());
	let activeMobileTab = $state<'countries' | 'calendar' | 'stats'>('calendar');

	let popoverOpen = $state(false);
	let popoverFrom = $state('');
	let popoverTo   = $state('');
	let settingsOpen = $state(false);
	let shareOpen    = $state(false);
	let syncOpen     = $state(false);
	let shareInitialTab = $state<'export' | 'import'>('export');

	let calendarGrid: CalendarGrid;

	onMount(() => {
		initStore();
		isDark = document.documentElement.classList.contains('dark');
	});

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	function openShare(tab: 'export' | 'import' = 'export') {
		shareInitialTab = tab;
		shareOpen = true;
	}

	function onRangeSelected(from: string, to: string) {
		popoverFrom = from;
		popoverTo = to;
		popoverOpen = true;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { calendarGrid?.cancelRange(); popoverOpen = false; settingsOpen = false; shareOpen = false; syncOpen = false; } }} />
<div class="h-dvh overflow-hidden flex flex-col bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100">

<Header bind:selectedYear {isDark} onToggleTheme={toggleTheme} onOpenShare={() => openShare()} onOpenSync={() => syncOpen = true} onOpenSettings={() => settingsOpen = true} />

<div class="flex flex-1 overflow-hidden">
	<CountrySidebar {selectedYear} {activeMobileTab} />
	<CalendarGrid bind:this={calendarGrid} {selectedYear} {activeMobileTab} {onRangeSelected} onRequestAddCountry={() => activeMobileTab = 'countries'} />
	<StatsSidebar {selectedYear} {activeMobileTab} />
</div>

<nav class="md:hidden h-14 shrink-0 flex border-t border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
	{#each [
		{ id: 'countries', label: 'Countries', Icon: IconMapPin },
		{ id: 'calendar',  label: 'Calendar',  Icon: IconCalendar },
		{ id: 'stats',     label: 'Stats',     Icon: IconChartBar },
	] as tab}
	<button
		onclick={() => activeMobileTab = tab.id as 'countries' | 'calendar' | 'stats'}
		class="flex-1 flex flex-col items-center justify-center gap-1 transition-colors
			{activeMobileTab === tab.id
				? 'text-amber-500 dark:text-amber-400'
				: 'text-stone-400 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-400'}"
	>
		<tab.Icon size={19} />
		<span class="font-brand text-[9px] font-bold tracking-widest uppercase">{tab.label}</span>
	</button>
	{/each}
</nav>

<DayEditorModal bind:open={popoverOpen} bind:from={popoverFrom} bind:to={popoverTo} />
<SettingsModal bind:open={settingsOpen} />
<ShareModal bind:open={shareOpen} initialTab={shareInitialTab} />
<SyncModal bind:open={syncOpen} />

</div>
